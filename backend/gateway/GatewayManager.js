// backend/gateway/GatewayManager.js
// Main orchestrator — the brain manager
// Routes: Telegram → Session → AI → Tools → Response → Telegram

import TelegramClient from './TelegramClient.js';
import MessageParser from './MessageParser.js';
import ConfirmationManager from './ConfirmationManager.js';

class GatewayManager {
    constructor(aiBrain, sessionManager, tokenManager, io, toolRouter) {
        this.aiBrain = aiBrain;
        this.sessionManager = sessionManager;
        this.tokenManager = tokenManager;
        this.io = io; // Socket.IO for frontend updates
        this.toolRouter = toolRouter; // For workspace path locking

        this.telegramClient = new TelegramClient();
        this.messageParser = new MessageParser();
        this.confirmationManager = new ConfirmationManager(this.telegramClient);

        this.active = false;
        this.workspacePath = null;
        this.messageQueues = new Map(); // chatId -> promise chain (serial processing)
        this.activeSessionByChat = new Map(); // chatId -> sessionId

        // Ensure default model is valid for current API endpoint
        this.aiBrain.setModel('gemini-3-flash');

        // Register handlers
        this.telegramClient.onMessage(this._handleMessage.bind(this));
        this.telegramClient.onCallback(this._handleCallback.bind(this));
    }

    /**
     * Start the gateway with bot token
     */
    async start(botToken, workspacePath) {
        if (this.active) {
            throw new Error('Gateway is already running');
        }

        this.workspacePath = workspacePath;

        // 🔒 Lock ToolRouter to workspace path
        if (this.toolRouter) {
            this.toolRouter.setWorkspacePath(workspacePath);
        }

        try {
            const botInfo = await this.telegramClient.start(botToken);
            this.active = true;

            this._emitStatus('started', {
                botUsername: botInfo.username,
                botName: botInfo.first_name
            });

            console.log(`[GATEWAY] Started - Bot: @${botInfo.username}`);
            return botInfo;
        } catch (err) {
            this._emitStatus('error', { error: err.message });
            throw err;
        }
    }

    /**
     * Stop the gateway
     */
    stop() {
        this.telegramClient.stop();
        this.confirmationManager.clearAll();
        this.active = false;
        this._emitStatus('stopped');
        console.log('[GATEWAY] Stopped');
    }

    /**
     * Get current gateway status
     */
    getStatus() {
        const authStatus = this.tokenManager.getAuthStatus();
        const gatewayConfig = this.tokenManager.getGatewayConfig();

        return {
            active: this.active,
            authenticated: authStatus.authenticated || !!authStatus.modalConfigured,
            email: authStatus.email,
            authProvider: authStatus.provider || (authStatus.modalConfigured ? 'modal' : null),
            model: this.aiBrain.model,
            workspacePath: this.workspacePath,
            botToken: gatewayConfig?.botToken ? '***' + gatewayConfig.botToken.slice(-4) : null,
            chatId: gatewayConfig?.chatId || null
        };
    }

    /**
     * Handle incoming Telegram message
     * Uses message queue for serial processing per chat
     */
    async _handleMessage(rawMessage) {
        const msg = this.messageParser.parseIncoming(rawMessage);

        if (!msg.text) return; // Ignore empty messages

        // Check if it's a command
        const command = this.messageParser.parseCommand(msg.text);
        if (command) {
            await this._handleCommand(msg.chatId, command);
            return;
        }

        // Queue the message for serial processing
        const currentQueue = this.messageQueues.get(msg.chatId) || Promise.resolve();
        const newQueue = currentQueue.then(() => this._processMessage(msg)).catch(err => {
            console.error(`[GATEWAY] Queue error for chat ${msg.chatId}:`, err.message);
        });
        this.messageQueues.set(msg.chatId, newQueue);
    }

    /**
     * Process a user message through the full pipeline
     */
    async _processMessage(msg) {
        const chatId = msg.chatId;
        const sessionId = this.activeSessionByChat.get(String(chatId)) || String(chatId);

        try {
            // Show typing indicator
            await this.telegramClient.sendTyping(chatId);

            // Emit to IDE that we're processing
            this._emitActivity('message_received', {
                chatId,
                text: msg.text,
                from: msg.from.name
            });

            // Get or create session
            const session = await this.sessionManager.getSession(sessionId);

            // Build context from memory
            const context = await this.sessionManager.buildContext(sessionId);
            context.workspacePath = this.workspacePath;
            if (this.toolRouter && typeof this.toolRouter.setSessionId === 'function') {
                this.toolRouter.setSessionId(sessionId);
            }

            // Send to AI Brain
            this._emitActivity('ai_thinking', { chatId, message: msg.text });

            const result = await this.aiBrain.think(msg.text, context);

            // Format response for Telegram
            let telegramResponse = this.messageParser.formatOutgoing(result.response);

            // Add change summary if tools were used
            if (result.toolCalls.length > 0) {
                const changeSummary = this.messageParser.formatChangeSummary(result.toolCalls);
                if (changeSummary) {
                    telegramResponse += `\n\n---\n📊 *Actions performed:*${changeSummary}`;
                }
            }

            // Send response to Telegram
            await this.telegramClient.sendMessage(chatId, telegramResponse);

            // Save to session memory
            await this.sessionManager.addMessage(sessionId, 'user', msg.text);
            await this.sessionManager.addMessage(sessionId, 'assistant', result.response);

            // Emit completion to IDE
            this._emitActivity('response_sent', {
                chatId,
                sessionId,
                toolCalls: result.toolCalls.length,
                tokens: result.tokensUsed,
                iterations: result.iterations
            });

        } catch (err) {
            console.error(`[GATEWAY] Error processing message:`, err.message);

            // Send error to Telegram
            await this.telegramClient.sendMessage(chatId,
                `❌ *Error:* ${err.message}\n\nPlease try again.`
            );

            // Emit error to IDE
            this._emitActivity('error', {
                chatId,
                sessionId,
                error: err.message
            });
        }
    }

    /**
     * Handle slash commands
     */
    async _handleCommand(chatId, { command, args }) {
        switch (command) {
            case 'start':
                await this.telegramClient.sendMessage(chatId,
                    '👋 *Welcome to DevStudio AI!*\n\n' +
                    'I\'m your local AI coding assistant. Send me any coding task and I\'ll work on it in your IDE.\n\n' +
                    '*Commands:*\n' +
                    '/status — View connection status\n' +
                    '/workspace — Show current workspace\n' +
                    '/clear — Clear session memory\n' +
                    '/help — Show help'
                );
                break;

            case 'status': {
                const status = this.getStatus();
                const sessionId = this.activeSessionByChat.get(String(chatId)) || String(chatId);
                const sessionMsgCount = (await this.sessionManager.getSession(sessionId))?.messages?.length || 0;
                const statusMsg = this.messageParser.formatStatus({
                    ...status,
                    gatewayActive: this.active,
                    sessionId,
                    sessionMessages: sessionMsgCount
                });
                await this.telegramClient.sendMessage(chatId, statusMsg);
                break;
            }

            case 'workspace':
                await this.telegramClient.sendMessage(chatId,
                    `📁 *Current Workspace:*\n\`${this.workspacePath || 'Not set'}\``
                );
                break;

            case 'clear':
            case 'reset': {
                const sessionId = this.activeSessionByChat.get(String(chatId)) || String(chatId);
                await this.sessionManager.clearSession(sessionId);
                await this.telegramClient.sendMessage(chatId,
                    '🧹 *Session Reset!* \nMemory cleared. I\'m ready for a fresh start.'
                );
                this._emitActivity('session_cleared', { chatId, sessionId });
                break;
            }

            case 'newsession': {
                const previousSessionId = this.activeSessionByChat.get(String(chatId)) || String(chatId);
                const newSessionId = `${chatId}-${Date.now()}`;
                this.activeSessionByChat.set(String(chatId), newSessionId);

                await this.sessionManager.createSession(newSessionId, {
                    source: 'telegram',
                    parentChatId: String(chatId),
                    previousSessionId
                });

                await this.telegramClient.sendMessage(chatId,
                    `🆕 *New Session Created!*\n\nSession ID: \`${newSessionId}\`\nOld session remains saved separately.`
                );
                this._emitActivity('session_created', { chatId, sessionId: newSessionId, previousSessionId });
                break;
            }

            case 'help':
                await this.telegramClient.sendMessage(chatId,
                    '🤖 *DevStudio AI Help*\n\n' +
                    '*What I can do:*\n' +
                    '• Read and understand your code\n' +
                    '• Create new files and edit existing ones\n' +
                    '• Run terminal commands\n' +
                    '• Search your codebase\n' +
                    '• Answer questions about your project\n\n' +
                    '*Tips:*\n' +
                    '• Be specific about file names and paths\n' +
                    '• I\'ll ask for confirmation before destructive actions\n' +
                    '• I always inspect files before editing them\n\n' +
                    '*Commands:*\n' +
                    '/status — View connection status\n' +
                    '/workspace — Show workspace path\n' +
                    '/clear — Clear conversation memory\n' +
                    '/help — This help message'
                );
                break;

            default:
                await this.telegramClient.sendMessage(chatId,
                    `❓ Unknown command: /${command}\nType /help for available commands.`
                );
        }
    }

    /**
     * Handle callback query (inline keyboard button presses)
     */
    async _handleCallback(callback) {
        // Try confirmation manager first
        const result = this.confirmationManager.handleCallback(callback.data);
        if (result) {
            await this.telegramClient.answerCallback(callback.id,
                result.approved ? '✅ Approved' : '❌ Rejected'
            );

            // Edit the confirmation message to show result
            const statusText = result.approved
                ? `✅ *Approved:* ${result.toolName}`
                : `❌ *Rejected:* ${result.toolName}`;

            await this.telegramClient.editMessage(
                callback.chatId,
                callback.messageId,
                statusText
            );

            this._emitActivity('confirmation_response', {
                chatId: callback.chatId,
                tool: result.toolName,
                approved: result.approved
            });
            return;
        }

        // Unknown callback
        await this.telegramClient.answerCallback(callback.id, 'Unknown action');
    }

    /**
     * Emit activity to IDE frontend via Socket.IO
     */
    _emitActivity(type, data) {
        if (this.io) {
            this.io.emit('gateway:activity', {
                type,
                data,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Emit status change to frontend
     */
    _emitStatus(status, data = {}) {
        if (this.io) {
            this.io.emit('gateway:status', { status, ...data, timestamp: Date.now() });
        }
    }
}

export default GatewayManager;
