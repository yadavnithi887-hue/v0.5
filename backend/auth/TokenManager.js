// backend/auth/TokenManager.js
// Manages OAuth token lifecycle — store, refresh, validate
// Tokens stored in ~/.vsdev/config.json

import fs from 'fs';
import path from 'path';
import os from 'os';

class TokenManager {
    constructor() {
        this.dataDir = path.join(os.homedir(), '.vsdev');
        this.configPath = path.join(this.dataDir, 'config.json');
        this._ensureDataDir();
    }

    /**
     * Ensure data directory exists
     */
    _ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Load the config file
     */
    _loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                return JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
            }
        } catch (e) {
            console.error('[AUTH] Failed to load config:', e.message);
        }
        return {};
    }

    /**
     * Save the config file
     */
    _saveConfig(config) {
        this._ensureDataDir();
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    }

    /**
     * Save OAuth tokens
     */
    async saveTokens(tokenData) {
        const config = this._loadConfig();
        config.oauth = {
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            expiresAt: tokenData.expiresAt,
            tokenType: tokenData.tokenType || 'Bearer',
            scope: tokenData.scope,
            clientId: tokenData.clientId,
            clientSecret: tokenData.clientSecret,
            userEmail: tokenData.userEmail,
            userName: tokenData.userName,
            userPicture: tokenData.userPicture,
            savedAt: Date.now()
        };
        this._saveConfig(config);
        console.log(`💾 Tokens saved for ${tokenData.userEmail}`);
    }

    /**
     * Get a valid access token, auto-refreshing if expired
     */
    async getAccessToken() {
        const config = this._loadConfig();
        const oauth = config.oauth;

        if (!oauth || !oauth.accessToken) {
            return null;
        }

        // Check if token is expired (with 5 minute buffer)
        const bufferMs = 5 * 60 * 1000;
        if (oauth.expiresAt && Date.now() > (oauth.expiresAt - bufferMs)) {
            console.log('🔄 Access token expired, refreshing...');
            try {
                const refreshed = await this.refreshToken();
                return refreshed;
            } catch (err) {
                console.error('[AUTH] Token refresh failed:', err.message);
                return null;
            }
        }

        return oauth.accessToken;
    }

    /**
     * Refresh the access token using refresh_token
     */
    async refreshToken() {
        const config = this._loadConfig();
        const oauth = config.oauth;

        if (!oauth || !oauth.refreshToken || !oauth.clientId) {
            throw new Error('No refresh token available. Please re-authenticate.');
        }

        const body = new URLSearchParams({
            client_id: oauth.clientId,
            grant_type: 'refresh_token',
            refresh_token: oauth.refreshToken
        });

        if (oauth.clientSecret) {
            body.append('client_secret', oauth.clientSecret);
        }

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
        }

        const tokens = await response.json();

        // Update stored tokens (refresh_token may or may not be returned)
        config.oauth.accessToken = tokens.access_token;
        config.oauth.expiresAt = Date.now() + (tokens.expires_in * 1000);
        if (tokens.refresh_token) {
            config.oauth.refreshToken = tokens.refresh_token;
        }
        config.oauth.lastRefreshed = Date.now();
        this._saveConfig(config);

        console.log('[AUTH] Token refreshed successfully');
        return tokens.access_token;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const config = this._loadConfig();
        return !!(config.oauth && config.oauth.accessToken);
    }

    /**
     * Get auth status for frontend
     */
    getAuthStatus() {
        const config = this._loadConfig();
        const oauth = config.oauth;

        if (!oauth || !oauth.accessToken) {
            return { authenticated: false };
        }

        return {
            authenticated: true,
            email: oauth.userEmail,
            name: oauth.userName,
            picture: oauth.userPicture,
            expiresAt: oauth.expiresAt,
            isExpired: Date.now() > oauth.expiresAt
        };
    }

    /**
     * Get Project ID (for Antigravity)
     */
    getProjectId() {
        const config = this._loadConfig();
        return config.oauth?.projectId || 'rising-fact-p41fc';
    }

    /**
     * Logout — clear stored tokens
     */
    logout() {
        const config = this._loadConfig();
        delete config.oauth;
        this._saveConfig(config);
        console.log('🔓 Logged out, tokens cleared');
    }

    // ========================================
    // Gateway Config (Telegram bot token, chat ID)
    // ========================================

    /**
     * Save gateway config (bot token, chat ID, model)
     */
    saveGatewayConfig(gatewayConfig) {
        const config = this._loadConfig();
        config.gateway = {
            botToken: gatewayConfig.botToken,
            chatId: gatewayConfig.chatId,
            model: gatewayConfig.model || 'google-antigravity/gemini-3-flash',
            savedAt: Date.now(),
            ...(gatewayConfig.extra || {})
        };
        this._saveConfig(config);
        console.log('💾 Gateway config saved');
    }

    /**
     * Get gateway config
     */
    getGatewayConfig() {
        const config = this._loadConfig();
        return config.gateway || null;
    }

    /**
     * Get full config for debugging
     */
    getFullConfig() {
        const config = this._loadConfig();
        // Mask sensitive data
        const masked = JSON.parse(JSON.stringify(config));
        if (masked.oauth?.accessToken) masked.oauth.accessToken = '***';
        if (masked.oauth?.refreshToken) masked.oauth.refreshToken = '***';
        if (masked.gateway?.botToken) masked.gateway.botToken = '***' + masked.gateway.botToken.slice(-4);
        if (masked.app?.clientSecret) masked.app.clientSecret = '***';
        return masked;
    }

    // ========================================
    // App Config (OAuth Client IDs, Provider Keys)
    // ========================================

    /**
     * Save app config 
     */
    saveAppConfig(appConfig) {
        const config = this._loadConfig();
        config.app = { ...(config.app || {}), ...appConfig };
        this._saveConfig(config);
        console.log('💾 App config saved to ~/.vsdev/config.json');
    }

    /**
     * Get app config
     */
    getAppConfig() {
        const config = this._loadConfig();
        return config.app || {};
    }
}

export default TokenManager;
