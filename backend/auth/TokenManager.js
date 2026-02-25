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

    _profileKey(provider, email) {
        return `${provider}:${String(email || '').toLowerCase()}`;
    }

    _ensureAuthProfiles(config) {
        if (!config.authProfiles || typeof config.authProfiles !== 'object') {
            config.authProfiles = {};
        }
        if (!config.authProfiles.profiles || typeof config.authProfiles.profiles !== 'object') {
            config.authProfiles.profiles = {};
        }
        if (!config.authProfiles.lastGood || typeof config.authProfiles.lastGood !== 'object') {
            config.authProfiles.lastGood = {};
        }
        if (!config.authProfiles.usageStats || typeof config.authProfiles.usageStats !== 'object') {
            config.authProfiles.usageStats = {};
        }
    }

    _touchProfileUsage(config, profileKey, isFailure = false) {
        this._ensureAuthProfiles(config);
        const now = Date.now();
        const prev = config.authProfiles.usageStats[profileKey] || { errorCount: 0 };
        config.authProfiles.usageStats[profileKey] = {
            ...prev,
            lastUsed: now,
            lastFailureAt: isFailure ? now : (prev.lastFailureAt || now),
            errorCount: isFailure ? Number(prev.errorCount || 0) + 1 : Number(prev.errorCount || 0),
        };
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
        if (tokenData.clientId || tokenData.clientSecret) {
            config.app = {
                ...(config.app || {}),
                ...(tokenData.clientId ? { clientId: tokenData.clientId } : {}),
                ...(tokenData.clientSecret ? { clientSecret: tokenData.clientSecret } : {}),
            };
        }
        this._ensureAuthProfiles(config);

        const provider = tokenData.provider || 'google-antigravity';
        const profileKey = this._profileKey(provider, tokenData.userEmail);
        config.authProfiles.profiles[profileKey] = {
            type: 'oauth',
            provider,
            access: tokenData.accessToken,
            refresh: tokenData.refreshToken,
            expires: tokenData.expiresAt,
            email: tokenData.userEmail,
            projectId: tokenData.projectId || 'rising-fact-p41fc',
            clientId: tokenData.clientId,
            clientSecret: tokenData.clientSecret,
            name: tokenData.userName,
            picture: tokenData.userPicture,
            savedAt: Date.now(),
        };
        config.authProfiles.lastGood[provider] = profileKey;
        this._touchProfileUsage(config, profileKey, false);

        config.oauth = {
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            expiresAt: tokenData.expiresAt,
            tokenType: tokenData.tokenType || 'Bearer',
            scope: tokenData.scope,
            clientId: tokenData.clientId,
            clientSecret: tokenData.clientSecret,
            projectId: tokenData.projectId,
            userEmail: tokenData.userEmail,
            userName: tokenData.userName,
            userPicture: tokenData.userPicture,
            provider,
            profileKey,
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
                if (oauth.profileKey) {
                    this._touchProfileUsage(config, oauth.profileKey, true);
                    this._saveConfig(config);
                }
                return null;
            }
        }

        if (oauth.profileKey) {
            this._touchProfileUsage(config, oauth.profileKey, false);
            this._saveConfig(config);
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

        // Keep profile store in sync with active oauth token.
        if (config.oauth.profileKey) {
            this._ensureAuthProfiles(config);
            const profile = config.authProfiles.profiles[config.oauth.profileKey] || {};
            config.authProfiles.profiles[config.oauth.profileKey] = {
                ...profile,
                type: 'oauth',
                provider: config.oauth.provider || profile.provider || 'google-antigravity',
                email: config.oauth.userEmail || profile.email,
                access: tokens.access_token,
                refresh: tokens.refresh_token || config.oauth.refreshToken || profile.refresh,
                expires: config.oauth.expiresAt,
                projectId: config.oauth.projectId || profile.projectId || 'rising-fact-p41fc',
                clientId: config.oauth.clientId || profile.clientId,
                clientSecret: config.oauth.clientSecret || profile.clientSecret,
                name: config.oauth.userName || profile.name,
                picture: config.oauth.userPicture || profile.picture,
                lastRefreshed: config.oauth.lastRefreshed,
            };
            this._touchProfileUsage(config, config.oauth.profileKey, false);
        }

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
        if (config.oauth?.projectId) return config.oauth.projectId;
        const profileKey = config.authProfiles?.lastGood?.['google-antigravity'];
        if (profileKey && config.authProfiles?.profiles?.[profileKey]?.projectId) {
            return config.authProfiles.profiles[profileKey].projectId;
        }
        return 'rising-fact-p41fc';
    }

    /**
     * Logout — clear stored tokens
     */
    logout() {
        const config = this._loadConfig();
        this._ensureAuthProfiles(config);
        if (config.oauth?.clientId || config.oauth?.clientSecret) {
            config.app = {
                ...(config.app || {}),
                ...(config.oauth?.clientId ? { clientId: config.oauth.clientId } : {}),
                ...(config.oauth?.clientSecret ? { clientSecret: config.oauth.clientSecret } : {}),
            };
        }

        // Keep last active profile available for future sign-in selection.
        if (config.oauth?.profileKey && config.oauth?.provider) {
            config.authProfiles.lastGood[config.oauth.provider] = config.oauth.profileKey;
            this._touchProfileUsage(config, config.oauth.profileKey, false);
        }
        delete config.oauth;
        this._saveConfig(config);
        console.log('🔓 Logged out, tokens cleared');
    }

    /**
     * List saved OAuth profiles (safe metadata only)
     */
    getAuthProfiles(provider = null) {
        const config = this._loadConfig();
        this._ensureAuthProfiles(config);
        const entries = Object.entries(config.authProfiles.profiles)
            .filter(([, profile]) => !provider || profile.provider === provider)
            .map(([key, profile]) => ({
                key,
                provider: profile.provider,
                email: profile.email,
                name: profile.name || '',
                picture: profile.picture || '',
                expires: profile.expires || null,
                projectId: profile.projectId || '',
                lastUsed: config.authProfiles.usageStats?.[key]?.lastUsed || null,
                errorCount: config.authProfiles.usageStats?.[key]?.errorCount || 0,
            }));
        return {
            version: 1,
            profiles: entries,
            lastGood: config.authProfiles.lastGood || {},
            activeProfileKey: config.oauth?.profileKey || null,
        };
    }

    /**
     * Activate one saved profile as current oauth session
     */
    useAuthProfile(profileKey) {
        const config = this._loadConfig();
        this._ensureAuthProfiles(config);
        const profile = config.authProfiles.profiles?.[profileKey];
        if (!profile) throw new Error(`Profile not found: ${profileKey}`);

        config.oauth = {
            accessToken: profile.access,
            refreshToken: profile.refresh,
            expiresAt: profile.expires,
            tokenType: 'Bearer',
            scope: undefined,
            clientId: profile.clientId || config.app?.clientId,
            clientSecret: profile.clientSecret || config.app?.clientSecret,
            projectId: profile.projectId || 'rising-fact-p41fc',
            userEmail: profile.email,
            userName: profile.name,
            userPicture: profile.picture,
            provider: profile.provider || 'google-antigravity',
            profileKey,
            savedAt: Date.now(),
        };

        const provider = config.oauth.provider;
        config.authProfiles.lastGood[provider] = profileKey;
        this._touchProfileUsage(config, profileKey, false);
        this._saveConfig(config);
        return this.getAuthStatus();
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
