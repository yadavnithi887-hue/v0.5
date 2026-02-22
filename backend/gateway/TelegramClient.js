// backend/gateway/TelegramClient.js
// Telegram Bot API integration via long polling
// No external SDK — raw HTTP with fetch

class TelegramClient {
    constructor() {
        this.API_BASE = 'https://api.telegram.org/bot';
        this.botToken = null;
        this.polling = false;
        this.lastUpdateId = 0;
        this.pollTimeout = 30; // Long polling timeout in seconds
        this.messageHandlers = [];
        this.callbackHandlers = [];
        this.pollController = null;
    }

    /**
     * Start the Telegram bot with polling
     */
    async start(botToken) {
        this.botToken = botToken;

        // Verify bot token
        const me = await this._apiCall('getMe');
        if (!me.ok) {
            throw new Error(`Invalid bot token: ${me.description || 'Unknown error'}`);
        }

        console.log(`[TELEGRAM] Bot started: @${me.result.username} (${me.result.first_name})`);
        this.polling = true;
        this._pollLoop();

        return me.result;
    }

    /**
     * Stop polling
     */
    stop() {
        this.polling = false;
        if (this.pollController) {
            this.pollController.abort();
            this.pollController = null;
        }
        console.log('[TELEGRAM] Bot stopped');
    }

    /**
     * Register a message handler
     */
    onMessage(callback) {
        this.messageHandlers.push(callback);
    }

    /**
     * Register a callback query handler (inline keyboard button presses)
     */
    onCallback(callback) {
        this.callbackHandlers.push(callback);
    }

    /**
     * Send a text message
     */
    async sendMessage(chatId, text, options = {}) {
        // Telegram has a 4096 char limit per message
        if (text.length > 4000) {
            // Split into multiple messages
            const chunks = this._splitMessage(text, 4000);
            const results = [];
            for (const chunk of chunks) {
                const result = await this._sendSingleMessage(chatId, chunk, options);
                results.push(result);
            }
            return results[0]; // Return first message
        }
        return this._sendSingleMessage(chatId, text, options);
    }

    /**
     * Send a single message
     */
    async _sendSingleMessage(chatId, text, options = {}) {
        const body = {
            chat_id: chatId,
            text: text,
            parse_mode: options.parseMode || 'Markdown',
            disable_web_page_preview: true,
            ...options.extra
        };

        const result = await this._apiCall('sendMessage', body);
        if (!result.ok) {
            // Try without markdown if parsing failed
            if (result.description?.includes('parse')) {
                body.parse_mode = undefined;
                return await this._apiCall('sendMessage', body);
            }
            console.error('[TELEGRAM] Failed to send message:', result.description);
        }
        return result;
    }

    /**
     * Send a message with inline keyboard (for confirmations)
     */
    async sendConfirmation(chatId, text, buttons) {
        const body = {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: buttons.map(row =>
                    row.map(btn => ({
                        text: btn.text,
                        callback_data: btn.data
                    }))
                )
            }
        };

        return await this._apiCall('sendMessage', body);
    }

    /**
     * Answer a callback query (required after button press)
     */
    async answerCallback(callbackQueryId, text = '') {
        return await this._apiCall('answerCallbackQuery', {
            callback_query_id: callbackQueryId,
            text: text
        });
    }

    /**
     * Edit an existing message
     */
    async editMessage(chatId, messageId, text) {
        return await this._apiCall('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'Markdown'
        });
    }

    /**
     * Send a "typing..." indicator
     */
    async sendTyping(chatId) {
        return await this._apiCall('sendChatAction', {
            chat_id: chatId,
            action: 'typing'
        });
    }

    // ==================== Internal Methods ====================

    /**
     * Long polling loop
     */
    async _pollLoop() {
        while (this.polling) {
            try {
                this.pollController = new AbortController();
                const updates = await this._getUpdates();

                if (updates && updates.length > 0) {
                    for (const update of updates) {
                        this.lastUpdateId = update.update_id + 1;
                        await this._processUpdate(update);
                    }
                }
            } catch (err) {
                if (err.name === 'AbortError') {
                    // Polling was intentionally stopped
                    break;
                }
                console.error('[TELEGRAM] Polling error:', err.message);
                // Wait a bit before retrying on error
                await this._sleep(3000);
            }
        }
    }

    /**
     * Get updates from Telegram (long polling)
     */
    async _getUpdates() {
        const result = await this._apiCall('getUpdates', {
            offset: this.lastUpdateId,
            timeout: this.pollTimeout,
            allowed_updates: ['message', 'callback_query']
        }, this.pollController?.signal);

        if (!result.ok) {
            throw new Error(`getUpdates failed: ${result.description}`);
        }

        return result.result;
    }

    /**
     * Process a single update
     */
    async _processUpdate(update) {
        try {
            if (update.message) {
                // Regular message
                const msg = {
                    chatId: update.message.chat.id,
                    text: update.message.text || '',
                    from: update.message.from,
                    messageId: update.message.message_id,
                    date: update.message.date
                };

                for (const handler of this.messageHandlers) {
                    await handler(msg);
                }
            } else if (update.callback_query) {
                // Inline keyboard button press
                const cb = {
                    id: update.callback_query.id,
                    chatId: update.callback_query.message?.chat.id,
                    data: update.callback_query.data,
                    from: update.callback_query.from,
                    messageId: update.callback_query.message?.message_id
                };

                for (const handler of this.callbackHandlers) {
                    await handler(cb);
                }
            }
        } catch (err) {
            console.error('[TELEGRAM] Error processing update:', err.message);
        }
    }

    /**
     * Make a Telegram Bot API call
     */
    async _apiCall(method, body = null, signal = null) {
        const url = `${this.API_BASE}${this.botToken}/${method}`;

        const options = {
            method: body ? 'POST' : 'GET',
            headers: body ? { 'Content-Type': 'application/json' } : {},
            signal: signal
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        // For long polling, set a higher timeout
        const timeoutMs = method === 'getUpdates'
            ? (this.pollTimeout + 10) * 1000
            : 30000;

        const controller = signal ? null : new AbortController();
        const timeout = setTimeout(() => controller?.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                ...options,
                signal: signal || controller?.signal
            });
            return await response.json();
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * Split a long message into chunks
     */
    _splitMessage(text, maxLen) {
        const chunks = [];
        let remaining = text;

        while (remaining.length > 0) {
            if (remaining.length <= maxLen) {
                chunks.push(remaining);
                break;
            }

            // Try to split at a newline
            let splitIdx = remaining.lastIndexOf('\n', maxLen);
            if (splitIdx < maxLen * 0.5) {
                // No good newline, split at space
                splitIdx = remaining.lastIndexOf(' ', maxLen);
            }
            if (splitIdx < maxLen * 0.3) {
                // No good split point, force split
                splitIdx = maxLen;
            }

            chunks.push(remaining.slice(0, splitIdx));
            remaining = remaining.slice(splitIdx).trimStart();
        }

        return chunks;
    }

    /**
     * Sleep utility
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default TelegramClient;
