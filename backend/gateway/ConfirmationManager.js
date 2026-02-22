// backend/gateway/ConfirmationManager.js
// Handles destructive action approval flow via Telegram
// Pauses execution until user confirms or rejects

class ConfirmationManager {
    constructor(telegramClient) {
        this.telegramClient = telegramClient;
        this.pendingConfirmations = new Map(); // chatId -> { resolve, reject, timeout, details }
        this.TIMEOUT_MS = 5 * 60 * 1000; // 5 minute timeout

        // Destructive tool patterns
        this.DESTRUCTIVE_PATTERNS = {
            'write_to_file': (args) => args.Overwrite === true,
            'replace_file_content': () => true, // Always confirm file edits for safety
            'multi_replace_file_content': () => true,
            'run_command': (args) => this._isDestructiveCommand(args.CommandLine)
        };
    }

    /**
     * Check if a tool call needs confirmation
     */
    needsConfirmation(toolName, args) {
        const checker = this.DESTRUCTIVE_PATTERNS[toolName];
        if (!checker) return false;
        return checker(args);
    }

    /**
     * Request confirmation from user via Telegram
     * Returns a promise that resolves when user confirms or rejects
     */
    async requestConfirmation(chatId, toolName, args) {
        // Build confirmation message
        const message = this._buildConfirmationMessage(toolName, args);

        // Create a unique callback ID
        const confirmId = `confirm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        // Send confirmation buttons
        await this.telegramClient.sendConfirmation(chatId, message, [
            [
                { text: '✅ Approve', data: `${confirmId}:approve` },
                { text: '❌ Reject', data: `${confirmId}:reject` }
            ]
        ]);

        // Wait for user response
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingConfirmations.delete(confirmId);
                reject(new Error('Confirmation timed out after 5 minutes. Action cancelled.'));
            }, this.TIMEOUT_MS);

            this.pendingConfirmations.set(confirmId, {
                resolve,
                reject,
                timeout,
                toolName,
                args,
                chatId
            });
        });
    }

    /**
     * Handle a callback query (button press)
     */
    handleCallback(callbackData) {
        const [confirmId, action] = callbackData.split(':');

        const pending = this.pendingConfirmations.get(confirmId);
        if (!pending) return false;

        clearTimeout(pending.timeout);
        this.pendingConfirmations.delete(confirmId);

        if (action === 'approve') {
            pending.resolve(true);
            return { approved: true, toolName: pending.toolName };
        } else {
            pending.resolve(false);
            return { approved: false, toolName: pending.toolName };
        }
    }

    /**
     * Build a human-readable confirmation message
     */
    _buildConfirmationMessage(toolName, args) {
        let message = '⚠️ *Confirmation Required*\n\n';

        switch (toolName) {
            case 'write_to_file':
                message += `📝 *Overwrite file:*\n\`${this._shortPath(args.TargetFile)}\``;
                if (args.CodeContent) {
                    message += `\n\n📏 Content: ${args.CodeContent.length} characters`;
                }
                break;

            case 'replace_file_content':
                message += `✏️ *Edit file:*\n\`${this._shortPath(args.TargetFile)}\``;
                if (args.TargetContent) {
                    const preview = args.TargetContent.slice(0, 100);
                    message += `\n\n🔍 Find: \`${preview}${args.TargetContent.length > 100 ? '...' : ''}\``;
                }
                break;

            case 'multi_replace_file_content':
                message += `✏️ *Multiple edits in:*\n\`${this._shortPath(args.TargetFile)}\``;
                if (args.ReplacementChunks) {
                    message += `\n\n📊 ${args.ReplacementChunks.length} edit(s)`;
                }
                break;

            case 'run_command':
                message += `⚡ *Run command:*\n\`${args.CommandLine}\``;
                if (args.Cwd) {
                    message += `\n📂 In: \`${this._shortPath(args.Cwd)}\``;
                }
                break;

            default:
                message += `🔧 *Tool:* ${toolName}\n${JSON.stringify(args, null, 2).slice(0, 500)}`;
        }

        message += '\n\nDo you approve this action?';
        return message;
    }

    /**
     * Check if a command is potentially destructive
     */
    _isDestructiveCommand(cmd) {
        if (!cmd) return false;
        const lower = cmd.toLowerCase();
        const destructivePatterns = [
            'rm ', 'rm -', 'rmdir', 'del ', 'delete',
            'format', 'drop ', 'truncate',
            'npm uninstall', 'pip uninstall',
            'git reset --hard', 'git clean',
            'shutdown', 'reboot'
        ];
        return destructivePatterns.some(p => lower.includes(p));
    }

    /**
     * Show shortened file path
     */
    _shortPath(fullPath) {
        if (!fullPath) return '';
        const parts = fullPath.replace(/\\/g, '/').split('/');
        return parts.slice(-3).join('/');
    }

    /**
     * Clear all pending confirmations
     */
    clearAll() {
        for (const [, pending] of this.pendingConfirmations) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('All confirmations cleared'));
        }
        this.pendingConfirmations.clear();
    }
}

export default ConfirmationManager;
