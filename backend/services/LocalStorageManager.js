// backend/services/LocalStorageManager.js
// File-based local storage system (OpenClaw-style)
// All data stored in ~/.vsdev/ folder

import fs from 'fs';
import path from 'path';
import os from 'os';

class LocalStorageManager {
    constructor() {
        this.dataDir = this.getDataDir();
        this.configPath = path.join(this.dataDir, 'config.json');
        this.initialized = false;
    }

    // Get the data directory path based on OS
    getDataDir() {
        const homeDir = os.homedir();
        return path.join(homeDir, '.vsdev');
    }

    // Initialize folder structure on first run
    initialize() {
        if (this.initialized) return;

        console.log(`[STORAGE] Initializing at: ${this.dataDir}`);

        // Create main directory and subdirectories
        const dirs = [
            this.dataDir,
            path.join(this.dataDir, 'workspace'),
            path.join(this.dataDir, 'sessions'),
            path.join(this.dataDir, 'projects'),
            path.join(this.dataDir, 'logs')
        ];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`  [STORAGE] Created: ${dir}`);
            }
        });

        // Create default config if not exists
        if (!fs.existsSync(this.configPath)) {
            const defaultConfig = {
                version: '1.0.0',
                createdAt: new Date().toISOString(),
                apiKeys: {
                    gemini: [],
                    openrouter: []
                },
                settings: {
                    defaultProvider: 'gemini',
                    defaultModel: 'gemini-2.5-flash-lite',
                    theme: 'dark'
                },
                user: {
                    name: '',
                    preferences: {}
                }
            };
            this.saveConfig(defaultConfig);
            console.log('  [STORAGE] Created default config.json');
        }

        // Create default workspace files
        this.createWorkspaceFiles();

        this.initialized = true;
        console.log('[STORAGE] Initialized successfully');
        console.log(`[STORAGE] Data location: ${this.dataDir}`);
    }

    // Create default workspace files
    createWorkspaceFiles() {
        const workspaceDir = path.join(this.dataDir, 'workspace');

        const files = {
            'AGENT.md': `# AI Agent Instructions

You are VS Dev AI Assistant, helping users with coding tasks.

## Capabilities
- Code generation and editing
- Project analysis
- Bug fixing
- Code explanation

## Behavior
- Be helpful and concise
- Explain your reasoning
- Follow best practices
`,
            'USER.md': `# User Profile

## Preferences
- Language: Hindi/English
- Experience: Developer

## Notes
Add any personal notes here...
`,
            'MEMORY.md': `# Long-term Memory

## Important Notes
- 

## Project Context
- 

## User Preferences
- 
`
        };

        Object.entries(files).forEach(([filename, content]) => {
            const filePath = path.join(workspaceDir, filename);
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, content, 'utf-8');
            }
        });
    }

    // ==================== CONFIG MANAGEMENT ====================

    // Load config from file
    loadConfig() {
        try {
            if (!fs.existsSync(this.configPath)) {
                return null;
            }
            const data = fs.readFileSync(this.configPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error('[STORAGE] Error loading config:', error.message);
            return null;
        }
    }

    // Save config to file
    saveConfig(config) {
        try {
            const data = JSON.stringify(config, null, 2);
            fs.writeFileSync(this.configPath, data, 'utf-8');
            return true;
        } catch (error) {
            console.error('[STORAGE] Error saving config:', error.message);
            return false;
        }
    }

    // Update specific config values
    updateConfig(updates) {
        const config = this.loadConfig() || {};
        const merged = this.deepMerge(config, updates);
        return this.saveConfig(merged);
    }

    // Deep merge helper
    deepMerge(target, source) {
        const result = { ...target };
        for (const key of Object.keys(source)) {
            if (source[key] instanceof Object && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    // ==================== API KEYS ====================

    // Get API keys
    getApiKeys() {
        const config = this.loadConfig();
        return config?.apiKeys || { gemini: [], openrouter: [] };
    }

    // Save API keys
    saveApiKeys(geminiKeys = [], openrouterKeys = []) {
        return this.updateConfig({
            apiKeys: {
                gemini: geminiKeys,
                openrouter: openrouterKeys
            }
        });
    }

    // ==================== SETTINGS ====================

    // Get settings
    getSettings() {
        const config = this.loadConfig();
        return config?.settings || {
            defaultProvider: 'gemini',
            defaultModel: 'gemini-2.5-flash-lite'
        };
    }

    // Save settings
    saveSettings(settings) {
        return this.updateConfig({ settings });
    }

    // ==================== SESSIONS ====================

    // Save a chat session
    saveSession(sessionId, sessionData) {
        try {
            const sessionsDir = path.join(this.dataDir, 'sessions');
            const sessionPath = path.join(sessionsDir, `${sessionId}.json`);

            const data = {
                id: sessionId,
                updatedAt: new Date().toISOString(),
                ...sessionData
            };

            fs.writeFileSync(sessionPath, JSON.stringify(data, null, 2), 'utf-8');

            // Update session index
            this.updateSessionIndex(sessionId, data);

            return true;
        } catch (error) {
            console.error('[STORAGE] Error saving session:', error.message);
            return false;
        }
    }

    // Load a chat session
    loadSession(sessionId) {
        try {
            const sessionPath = path.join(this.dataDir, 'sessions', `${sessionId}.json`);
            if (!fs.existsSync(sessionPath)) {
                return null;
            }
            const data = fs.readFileSync(sessionPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error('[STORAGE] Error loading session:', error.message);
            return null;
        }
    }

    // Update session index
    updateSessionIndex(sessionId, sessionData) {
        const indexPath = path.join(this.dataDir, 'sessions', 'index.json');
        let index = {};

        if (fs.existsSync(indexPath)) {
            try {
                index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
            } catch (e) {
                index = {};
            }
        }

        index[sessionId] = {
            id: sessionId,
            title: sessionData.title || 'Untitled Chat',
            updatedAt: sessionData.updatedAt,
            projectPath: sessionData.projectPath
        };

        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    }

    // Get all sessions for a project
    getAllSessions(projectPath = null) {
        try {
            const indexPath = path.join(this.dataDir, 'sessions', 'index.json');
            if (!fs.existsSync(indexPath)) {
                return [];
            }

            const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
            let sessions = Object.values(index);

            if (projectPath) {
                sessions = sessions.filter(s => s.projectPath === projectPath);
            }

            return sessions.sort((a, b) =>
                new Date(b.updatedAt) - new Date(a.updatedAt)
            );
        } catch (error) {
            console.error('[STORAGE] Error getting sessions:', error.message);
            return [];
        }
    }

    // ==================== LOGGING ====================

    // Write to log file
    log(message, level = 'INFO') {
        try {
            const logPath = path.join(this.dataDir, 'logs', 'vsdev.log');
            const timestamp = new Date().toISOString();
            const logLine = `[${timestamp}] [${level}] ${message}\n`;
            fs.appendFileSync(logPath, logLine, 'utf-8');
        } catch (error) {
            // Silent fail for logging
        }
    }

    // ==================== UTILITY ====================

    // Get storage info
    getStorageInfo() {
        return {
            dataDir: this.dataDir,
            configPath: this.configPath,
            exists: fs.existsSync(this.dataDir),
            initialized: this.initialized
        };
    }

    // Delete all data (for testing/reset)
    reset() {
        if (fs.existsSync(this.dataDir)) {
            fs.rmSync(this.dataDir, { recursive: true, force: true });
            this.initialized = false;
            console.log('[STORAGE] Reset complete');
        }
    }
}

// Export singleton instance
const localStorage = new LocalStorageManager();
export default localStorage;
