// backend/session/MemoryEngine.js
// Intelligent memory management — sliding window + auto-summary
// Keeps conversation context tight while preserving important information

class MemoryEngine {
    constructor(tokenManager) {
        this.tokenManager = tokenManager;
        this.WINDOW_SIZE = 15; // Keep last 15 messages in full
        this.SUMMARIZE_THRESHOLD = 20; // Trigger summarization at 20 messages
        this.API_BASE = 'https://cloudcode-pa.googleapis.com';
        this.summaryModel = 'gemini-3-flash';
    }

    /**
     * Get recent messages for context (sliding window)
     */
    getRecentMessages(session) {
        if (!session.messages || session.messages.length === 0) {
            return [];
        }

        // Return the last WINDOW_SIZE messages
        return session.messages.slice(-this.WINDOW_SIZE);
    }

    /**
     * Manage session memory — summarize old messages if threshold exceeded
     */
    async manage(session) {
        if (!session.messages || session.messages.length < this.SUMMARIZE_THRESHOLD) {
            return; // Not enough messages to trigger summarization
        }

        // Messages to summarize (everything except the recent window)
        const messagesToSummarize = session.messages.slice(0, -this.WINDOW_SIZE);

        if (messagesToSummarize.length < 5) {
            return; // Not enough old messages to summarize
        }

        try {
            console.log(`[MEMORY] Summarizing ${messagesToSummarize.length} old messages...`);

            // Build the existing summary + old messages for summarization
            const existingSummary = session.summary || '';
            const newSummary = await this._generateSummary(existingSummary, messagesToSummarize);

            // Update session
            session.summary = newSummary;

            // Remove summarized messages, keep only the recent window
            session.messages = session.messages.slice(-this.WINDOW_SIZE);

            console.log(`[MEMORY] Compacted: ${messagesToSummarize.length} messages -> summary`);
        } catch (err) {
            console.error('[MEMORY] Summary generation failed:', err.message);
            // Fallback: just do a basic trim without summarization
            if (session.messages.length > this.SUMMARIZE_THRESHOLD * 2) {
                session.messages = session.messages.slice(-this.WINDOW_SIZE);
                console.log('[MEMORY] Fallback: trimmed old messages without summarization');
            }
        }
    }

    /**
     * Generate a summary using Antigravity internal API
     */
    async _generateSummary(existingSummary, messages) {
        const accessToken = await this.tokenManager.getAccessToken();
        const projectId = this.tokenManager.getProjectId();

        if (!accessToken || !projectId) {
            return this._basicSummary(existingSummary, messages);
        }

        const conversationText = messages.map(m => {
            const role = m.role === 'assistant' ? 'AI' : 'User';
            const content = m.content.length > 500 ? m.content.slice(0, 500) + '...' : m.content;
            return `${role}: ${content}`;
        }).join('\n\n');

        const prompt = existingSummary
            ? `Update this existing summary with the new conversation below.\n\nExisting Summary:\n${existingSummary}\n\nNew Conversation:\n${conversationText}\n\nProvide an updated, concise summary (max 300 words) covering:\n1. What the user wanted\n2. What actions were taken (files changed, commands run)\n3. Key decisions made\n4. Any pending items\n\nIMPORTANT: This summary is HISTORICAL CONTEXT only. Do NOT phrase it as current state. Use past tense (e.g., "User asked to create X", "AI modified Y"). Never say "there are files" — say "files were created/modified".\n\nBe factual and concise.`
            : `Summarize this conversation concisely (max 300 words):\n\n${conversationText}\n\nCover:\n1. What the user wanted\n2. What actions were taken (files changed, commands run)\n3. Key decisions made\n4. Any pending items\n\nIMPORTANT: This summary is HISTORICAL CONTEXT only. Use past tense throughout (e.g., "User requested...", "AI created..."). Never describe current file state — only describe what actions were performed.\n\nBe factual and concise.`;

        const url = `${this.API_BASE}/v1internal:streamGenerateContent?alt=sse`;
        const body = {
            project: projectId,
            model: this.summaryModel,
            requestType: "agent",
            userAgent: "antigravity",
            request: {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 1024
                }
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'User-Agent': 'antigravity/1.15.8 darwin/arm64',
                'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Summary API error: ${response.status}`);
        }

        // Parse SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let resultText = '';
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.startsWith('data:')) continue;
                try {
                    const chunk = JSON.parse(line.slice(5).trim());
                    const parts = chunk.response?.candidates?.[0]?.content?.parts;
                    if (parts) {
                        for (const part of parts) {
                            if (part.text) resultText += part.text;
                        }
                    }
                } catch (e) { }
            }
        }

        return resultText || this._basicSummary(existingSummary, messages);
    }

    /**
     * Basic summary fallback (no AI)
     */
    _basicSummary(existingSummary, messages) {
        const userMessages = messages
            .filter(m => m.role === 'user')
            .map(m => m.content.slice(0, 100))
            .join('; ');

        const assistantActions = messages
            .filter(m => m.role === 'assistant')
            .length;

        let summary = existingSummary ? existingSummary + '\n\n--- Recent ---\n' : '';
        summary += `User requests: ${userMessages}\n`;
        summary += `AI responses: ${assistantActions}`;

        return summary;
    }
}

export default MemoryEngine;
