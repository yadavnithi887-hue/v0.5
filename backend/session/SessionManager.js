// backend/session/SessionManager.js
// Per-chat session management
// Stores sessions as JSON files in sessions/ directory

import fs from 'fs';
import path from 'path';
import os from 'os';

class SessionManager {
    constructor(memoryEngine) {
        this.memoryEngine = memoryEngine;
        this.sessionsDir = path.join(os.homedir(), '.vsdev', 'sessions');
        this._ensureDir();

        // In-memory cache for active sessions
        this.cache = new Map();
    }

    /**
     * Ensure sessions directory exists
     */
    _ensureDir() {
        if (!fs.existsSync(this.sessionsDir)) {
            fs.mkdirSync(this.sessionsDir, { recursive: true });
        }
    }

    /**
     * Get or create a session for a chat ID
     */
    async getSession(chatId) {
        const strChatId = String(chatId);

        // Check cache first
        if (this.cache.has(strChatId)) {
            return this.cache.get(strChatId);
        }

        // Try loading from file
        const filePath = this._getFilePath(strChatId);
        let session;

        if (fs.existsSync(filePath)) {
            try {
                const data = fs.readFileSync(filePath, 'utf-8');
                session = JSON.parse(data);
                session.lastActive = Date.now();
            } catch (err) {
                console.error(`[SESSION] Failed to load ${strChatId}:`, err.message);
                session = this._createNewSession(strChatId);
            }
        } else {
            session = this._createNewSession(strChatId);
        }

        this.cache.set(strChatId, session);
        return session;
    }

    /**
     * Create a new empty session
     */
    _createNewSession(chatId) {
        return {
            chatId: String(chatId),
            createdAt: Date.now(),
            lastActive: Date.now(),
            summary: '',
            goals: [],
            techStack: [],
            messages: [],
            metadata: {}
        };
    }

    /**
     * Save a session to disk
     */
    async saveSession(chatId) {
        const strChatId = String(chatId);
        const session = this.cache.get(strChatId);
        if (!session) return;

        session.lastActive = Date.now();
        const filePath = this._getFilePath(strChatId);

        try {
            fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
        } catch (err) {
            console.error(`[SESSION] Failed to save ${strChatId}:`, err.message);
        }
    }

    /**
     * Clear/Delete a session
     */
    async clearSession(chatId) {
        const strChatId = String(chatId);
        const filePath = this._getFilePath(strChatId);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        this.cache.delete(strChatId);
        console.log(`🧹 Session cleared for ${strChatId}`);
        return true;
    }

    /**
     * Add a message to the session and persist
     */
    async addMessage(chatId, role, content) {
        const strChatId = String(chatId);
        const session = await this.getSession(strChatId);

        session.messages.push({
            role,
            content,
            timestamp: Date.now()
        });

        // Trigger memory management (summarize old messages if needed)
        if (this.memoryEngine) {
            await this.memoryEngine.manage(session);
        }

        // Persist
        await this.saveSession(strChatId);
    }

    /**
     * Build context object for AI Brain
     * Returns summary + recent messages + workspace info
     */
    async buildContext(chatId) {
        const session = await this.getSession(String(chatId));

        const recentMessages = this.memoryEngine
            ? this.memoryEngine.getRecentMessages(session)
            : session.messages.slice(-15);

        return {
            summary: session.summary || '',
            recentMessages: recentMessages,
            goals: session.goals || [],
            techStack: session.techStack || []
        };
    }

    /**
     * Clear a session (reset memory)
     */
    async clearSession(chatId) {
        const strChatId = String(chatId);
        const session = await this.getSession(strChatId);

        session.summary = '';
        session.messages = [];
        session.goals = [];

        await this.saveSession(strChatId);
        console.log(`[SESSION] Cleared: ${strChatId}`);
    }

    /**
     * Delete a session completely
     */
    async deleteSession(chatId) {
        const strChatId = String(chatId);
        this.cache.delete(strChatId);

        const filePath = this._getFilePath(strChatId);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        console.log(`[SESSION] Deleted: ${strChatId}`);
    }

    /**
     * List all sessions with basic info
     */
    listSessions() {
        this._ensureDir();
        const files = fs.readdirSync(this.sessionsDir)
            .filter(f => f.endsWith('.json'));

        return files.map(f => {
            try {
                const data = JSON.parse(fs.readFileSync(path.join(this.sessionsDir, f), 'utf-8'));
                return {
                    chatId: data.chatId,
                    createdAt: data.createdAt,
                    lastActive: data.lastActive,
                    messageCount: data.messages?.length || 0,
                    summary: data.summary?.slice(0, 100) || ''
                };
            } catch {
                return { chatId: f.replace('.json', ''), error: 'Failed to load' };
            }
        });
    }

    /**
     * Get the file path for a session
     */
    _getFilePath(chatId) {
        return path.join(this.sessionsDir, `${chatId}.json`);
    }
}

export default SessionManager;
