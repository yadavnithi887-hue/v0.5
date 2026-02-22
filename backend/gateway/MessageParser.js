// backend/gateway/MessageParser.js
// Formats messages between Telegram and AI
// Handles Telegram's markdown quirks and character limits

class MessageParser {
    constructor() {
        this.TELEGRAM_MAX_LENGTH = 4096;
    }

    /**
     * Parse an incoming Telegram message
     */
    parseIncoming(telegramMessage) {
        return {
            chatId: telegramMessage.chatId,
            text: telegramMessage.text?.trim() || '',
            from: {
                id: telegramMessage.from?.id,
                name: telegramMessage.from?.first_name || 'User',
                username: telegramMessage.from?.username
            },
            messageId: telegramMessage.messageId,
            timestamp: telegramMessage.date ? telegramMessage.date * 1000 : Date.now(),
            isCommand: telegramMessage.text?.startsWith('/')
        };
    }

    /**
     * Parse a slash command (e.g., /start, /status, /stop)
     */
    parseCommand(text) {
        if (!text || !text.startsWith('/')) return null;

        const parts = text.split(/\s+/);
        const command = parts[0].replace('/', '').toLowerCase();
        const args = parts.slice(1).join(' ');

        return { command, args };
    }

    /**
     * Format AI response for Telegram
     * Converts standard markdown to Telegram-friendly markdown
     */
    formatOutgoing(aiResponse) {
        let text = aiResponse;

        // Telegram MarkdownV2 is tricky, so we use basic Markdown
        // But we need to escape some characters for basic Markdown mode

        // Convert triple backtick code blocks — Telegram supports these
        // No conversion needed for ```lang\ncode\n```

        // Convert inline code (single backticks) — Telegram supports these
        // No conversion needed

        // Convert **bold** — Telegram uses *bold* in Markdown mode
        text = text.replace(/\*\*(.+?)\*\*/g, '*$1*');

        // Convert ## headers to bold text (Telegram doesn't support headers)
        text = text.replace(/^#{1,6}\s+(.+)$/gm, '*$1*');

        // Convert - [ ] / - [x] checkboxes to emoji
        text = text.replace(/^- \[ \]/gm, '⬜');
        text = text.replace(/^- \[x\]/gm, '✅');

        return text;
    }

    /**
     * Format a diff/change summary for Telegram
     */
    formatChangeSummary(toolCalls) {
        if (!toolCalls || toolCalls.length === 0) return '';

        const groups = {
            read: [],
            modified: [],
            created: [],
            commands: [],
            search: [],
            errors: []
        };

        for (const call of toolCalls) {
            if (!call.success) {
                groups.errors.push(`❌ ${call.tool}: ${call.error}`);
                continue;
            }

            switch (call.tool) {
                case 'view_file':
                case 'view_file_outline':
                case 'view_code_item':
                case 'list_dir':
                    groups.read.push(`📂 ${call.tool}(${this._extractPath(call.args)})`);
                    break;
                case 'replace_file_content':
                case 'multi_replace_file_content':
                    groups.modified.push(`✏️ ${this._extractPath(call.args)}`);
                    break;
                case 'write_to_file':
                    groups.created.push(`📝 ${this._extractPath(call.args)}`);
                    break;
                case 'run_command':
                    groups.commands.push(`⚡ \`${call.args?.CommandLine || 'command'}\``);
                    break;
                case 'grep_search':
                case 'find_by_name':
                    groups.search.push(`🔍 ${call.tool}("${call.args?.Query || call.args?.Pattern || ''}")`);
                    break;
                default:
                    groups.read.push(`🔧 ${call.tool}`);
            }
        }

        let summary = '';

        if (groups.read.length > 0) {
            summary += `\n📖 *Read:* ${groups.read.length} files`;
        }
        if (groups.search.length > 0) {
            summary += `\n🔍 *Searched:* ${groups.search.length} queries`;
        }
        if (groups.modified.length > 0) {
            summary += `\n✏️ *Modified:*\n${groups.modified.join('\n')}`;
        }
        if (groups.created.length > 0) {
            summary += `\n📝 *Created:*\n${groups.created.join('\n')}`;
        }
        if (groups.commands.length > 0) {
            summary += `\n⚡ *Commands:*\n${groups.commands.join('\n')}`;
        }
        if (groups.errors.length > 0) {
            summary += `\n\n⚠️ *Errors:*\n${groups.errors.join('\n')}`;
        }

        return summary;
    }

    /**
     * Format a status message
     */
    formatStatus(status) {
        const lines = ['🤖 *DevStudio AI Status*\n'];

        lines.push(`🔐 Auth: ${status.authenticated ? '✅ Connected' : '❌ Not connected'}`);
        if (status.email) lines.push(`📧 ${status.email}`);
        lines.push(`📱 Gateway: ${status.gatewayActive ? '🟢 Active' : '🔴 Stopped'}`);
        lines.push(`🧠 Model: ${status.model || 'Not set'}`);
        if (status.workspacePath) lines.push(`📁 Workspace: \`${status.workspacePath}\``);
        if (status.sessionMessages !== undefined) {
            lines.push(`💬 Messages in session: ${status.sessionMessages}`);
        }

        return lines.join('\n');
    }

    /**
     * Extract file path from tool args for display
     */
    _extractPath(args) {
        const path = args?.AbsolutePath || args?.TargetFile || args?.DirectoryPath
            || args?.SearchPath || args?.SearchDirectory || args?.File || '';
        // Show only the last 2-3 segments of the path
        const parts = path.replace(/\\/g, '/').split('/');
        return parts.slice(-3).join('/');
    }
}

export default MessageParser;
