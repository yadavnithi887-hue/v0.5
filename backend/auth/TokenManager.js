// backend/auth/TokenManager.js
// Manages OAuth token lifecycle and profile-based auth storage
// Tokens are stored in ~/.vsdev/config.json
// ============================================================================
// HARD TAG: ANTIGRAVITY OAUTH TOKEN LIFECYCLE LOCKED
// This file stores/refreshes OAuth credentials used by Google Antigravity flow.
// Do NOT modify token field mapping, refresh contract, or profile activation
// behavior unless explicitly requested by project owner.
// ============================================================================

import fs from 'fs';
import path from 'path';
import os from 'os';

class TokenManager {
    constructor() {
        this.dataDir = path.join(os.homedir(), '.vsdev');
        this.configPath = path.join(this.dataDir, 'config.json');
        this.DEFAULT_CLIENT_ID = '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com';
        this._ensureDataDir();
    }

    _ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

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

    _saveConfig(config) {
        this._ensureDataDir();
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    }

    _ensureProfileStore(config) {
        if (!config.version || typeof config.version !== 'number') {
            config.version = 1;
        }
        if (!config.profiles || typeof config.profiles !== 'object') {
            config.profiles = {};
        }
        if (!config.lastGood || typeof config.lastGood !== 'object') {
            config.lastGood = {};
        }
        if (!config.usageStats || typeof config.usageStats !== 'object') {
            config.usageStats = {};
        }
    }

    _profileKey(provider, email) {
        return `${provider}:${String(email || '').toLowerCase()}`;
    }

    _touchUsage(config, profileKey, isFailure = false) {
        const prev = config.usageStats[profileKey] || { errorCount: 0, lastFailureAt: Date.now() };
        config.usageStats[profileKey] = {
            errorCount: isFailure ? Number(prev.errorCount || 0) + 1 : Number(prev.errorCount || 0),
            lastFailureAt: isFailure ? Date.now() : Number(prev.lastFailureAt || Date.now()),
            lastUsed: Date.now()
        };
    }

    _activateProfile(config, profileKey) {
        const profile = config.profiles?.[profileKey];
        if (!profile || profile.type !== 'oauth') {
            return false;
        }

        config.oauth = {
            accessToken: profile.access,
            refreshToken: profile.refresh,
            expiresAt: profile.expires,
            tokenType: 'Bearer',
            scope: undefined,
            clientId: profile.clientId || config.app?.clientId || this.DEFAULT_CLIENT_ID,
            clientSecret: profile.clientSecret || config.app?.clientSecret,
            projectId: profile.projectId || 'rising-fact-p41fc',
            userEmail: profile.email,
            userName: profile.name,
            userPicture: profile.picture,
            provider: profile.provider || 'google-antigravity',
            profileKey,
            savedAt: Date.now()
        };

        const provider = config.oauth.provider;
        config.lastGood[provider] = profileKey;
        this._touchUsage(config, profileKey, false);
        return true;
    }

    _ensureActiveOAuth(config, provider = 'google-antigravity') {
        if (config.oauth?.accessToken) {
            return true;
        }

        const profileKey = config.lastGood?.[provider];
        if (profileKey && this._activateProfile(config, profileKey)) {
            this._saveConfig(config);
            return true;
        }

        return false;
    }

    async saveTokens(tokenData) {
        // HARD TAG: OAuth token persistence contract - do not break key names.
        const config = this._loadConfig();
        this._ensureProfileStore(config);

        const provider = tokenData.provider || 'google-antigravity';
        const profileKey = this._profileKey(provider, tokenData.userEmail);
        const profile = {
            type: 'oauth',
            provider,
            access: tokenData.accessToken,
            refresh: tokenData.refreshToken,
            expires: tokenData.expiresAt,
            email: tokenData.userEmail,
            projectId: tokenData.projectId || 'rising-fact-p41fc',
            ...(tokenData.clientId ? { clientId: tokenData.clientId } : {}),
            ...(tokenData.clientSecret ? { clientSecret: tokenData.clientSecret } : {}),
            ...(tokenData.userName ? { name: tokenData.userName } : {}),
            ...(tokenData.userPicture ? { picture: tokenData.userPicture } : {})
        };

        config.profiles[profileKey] = profile;
        config.lastGood[provider] = profileKey;
        this._touchUsage(config, profileKey, false);

        config.oauth = {
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            expiresAt: tokenData.expiresAt,
            tokenType: tokenData.tokenType || 'Bearer',
            scope: tokenData.scope,
            clientId: tokenData.clientId || config.app?.clientId || this.DEFAULT_CLIENT_ID,
            clientSecret: tokenData.clientSecret || config.app?.clientSecret,
            projectId: tokenData.projectId || 'rising-fact-p41fc',
            userEmail: tokenData.userEmail,
            userName: tokenData.userName,
            userPicture: tokenData.userPicture,
            provider,
            profileKey,
            savedAt: Date.now()
        };

        // Keep app config in sync only for fields we received.
        if (tokenData.clientId || tokenData.clientSecret) {
            config.app = {
                ...(config.app || {}),
                ...(tokenData.clientId ? { clientId: tokenData.clientId } : {}),
                ...(tokenData.clientSecret ? { clientSecret: tokenData.clientSecret } : {})
            };
        }

        this._saveConfig(config);
        console.log(`[AUTH] Tokens saved for ${tokenData.userEmail}`);
    }

    async getAccessToken() {
        const config = this._loadConfig();
        this._ensureProfileStore(config);

        if (!this._ensureActiveOAuth(config)) {
            return null;
        }

        const oauth = config.oauth;
        const profileKey = oauth.profileKey;

        const bufferMs = 5 * 60 * 1000;
        if (oauth.expiresAt && Date.now() > (oauth.expiresAt - bufferMs)) {
            console.log('[AUTH] Access token expired, refreshing...');
            try {
                const refreshed = await this.refreshToken();
                return refreshed;
            } catch (err) {
                console.error('[AUTH] Token refresh failed:', err.message);
                if (profileKey) {
                    this._touchUsage(config, profileKey, true);
                    this._saveConfig(config);
                }
                return null;
            }
        }

        if (profileKey) {
            this._touchUsage(config, profileKey, false);
            this._saveConfig(config);
        }

        return oauth.accessToken;
    }

    async refreshToken() {
        // HARD TAG: Refresh flow fallback is intentional for Antigravity compatibility.
        const config = this._loadConfig();
        this._ensureProfileStore(config);

        if (!this._ensureActiveOAuth(config)) {
            throw new Error('No OAuth session available. Please authenticate.');
        }

        const oauth = config.oauth;
        if (!oauth.refreshToken) {
            throw new Error('No refresh token available. Please re-authenticate.');
        }

        const clientId = oauth.clientId || config.app?.clientId || this.DEFAULT_CLIENT_ID;
        const clientSecret = oauth.clientSecret || config.app?.clientSecret || '';

        const refresh = async (includeSecret) => {
            const body = new URLSearchParams({
                client_id: clientId,
                grant_type: 'refresh_token',
                refresh_token: oauth.refreshToken
            });

            if (includeSecret && clientSecret) {
                body.append('client_secret', clientSecret);
            }

            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString()
            });

            if (response.ok) {
                return await response.json();
            }

            const error = await response.json().catch(() => ({}));
            const message = error.error_description || error.error || 'Token refresh failed';
            const isInvalidClient = String(error.error || '').toLowerCase() === 'invalid_client' ||
                String(message).toLowerCase().includes('unauthorized');

            if (includeSecret && clientSecret && isInvalidClient) {
                return await refresh(false);
            }

            throw new Error(`Token refresh failed: ${message}`);
        };

        const tokens = clientSecret ? await refresh(true) : await refresh(false);

        config.oauth.accessToken = tokens.access_token;
        config.oauth.expiresAt = Date.now() + (tokens.expires_in * 1000);
        if (tokens.refresh_token) {
            config.oauth.refreshToken = tokens.refresh_token;
        }
        config.oauth.clientId = clientId;
        config.oauth.lastRefreshed = Date.now();

        if (config.oauth.profileKey && config.profiles[config.oauth.profileKey]) {
            const key = config.oauth.profileKey;
            config.profiles[key] = {
                ...config.profiles[key],
                access: config.oauth.accessToken,
                refresh: config.oauth.refreshToken,
                expires: config.oauth.expiresAt,
                clientId,
                ...(clientSecret ? { clientSecret } : {})
            };
            this._touchUsage(config, key, false);
        }

        this._saveConfig(config);
        console.log('[AUTH] Token refreshed successfully');
        return tokens.access_token;
    }

    isAuthenticated() {
        const config = this._loadConfig();
        return !!(config.oauth && config.oauth.accessToken);
    }

    getAuthStatus() {
        const config = this._loadConfig();
        this._ensureProfileStore(config);
        this._ensureActiveOAuth(config);
        const modalConfigured = !!config.providers?.modal?.apiKey;

        const oauth = config.oauth;
        if (!oauth || !oauth.accessToken) {
            return { authenticated: false, modalConfigured };
        }

        return {
            authenticated: true,
            email: oauth.userEmail,
            name: oauth.userName,
            picture: oauth.userPicture,
            provider: oauth.provider || 'google-antigravity',
            profileKey: oauth.profileKey || null,
            expiresAt: oauth.expiresAt,
            isExpired: Date.now() > oauth.expiresAt,
            modalConfigured
        };
    }

    getProjectId() {
        const config = this._loadConfig();
        this._ensureProfileStore(config);

        if (config.oauth?.projectId) {
            return config.oauth.projectId;
        }

        const key = config.lastGood?.['google-antigravity'];
        if (key && config.profiles[key]?.projectId) {
            return config.profiles[key].projectId;
        }

        return 'rising-fact-p41fc';
    }

    logout() {
        const config = this._loadConfig();
        delete config.oauth;
        this._saveConfig(config);
        console.log('[AUTH] Logged out (profiles preserved)');
    }

    getAuthProfiles(provider = null) {
        const config = this._loadConfig();
        this._ensureProfileStore(config);

        const list = Object.entries(config.profiles)
            .filter(([, profile]) => !provider || profile.provider === provider)
            .map(([key, profile]) => ({
                key,
                provider: profile.provider,
                type: profile.type,
                email: profile.email || '',
                name: profile.name || '',
                picture: profile.picture || '',
                projectId: profile.projectId || '',
                expires: profile.expires || null,
                errorCount: config.usageStats?.[key]?.errorCount || 0,
                lastFailureAt: config.usageStats?.[key]?.lastFailureAt || null,
                lastUsed: config.usageStats?.[key]?.lastUsed || null
            }));

        return {
            version: config.version || 1,
            profiles: list,
            lastGood: config.lastGood || {},
            activeProfileKey: config.oauth?.profileKey || null
        };
    }

    useAuthProfile(profileKey) {
        const config = this._loadConfig();
        this._ensureProfileStore(config);

        if (!profileKey || !config.profiles[profileKey]) {
            throw new Error(`Profile not found: ${profileKey}`);
        }

        const ok = this._activateProfile(config, profileKey);
        if (!ok) {
            throw new Error(`Profile is not OAuth: ${profileKey}`);
        }

        this._saveConfig(config);
        return this.getAuthStatus();
    }

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
        console.log('[GATEWAY] Config saved');
    }

    saveModalConfig(modalConfig) {
        const config = this._loadConfig();
        config.providers = config.providers || {};
        config.providers.modal = {
            ...(config.providers.modal || {}),
            ...(modalConfig.apiKey !== undefined ? { apiKey: modalConfig.apiKey } : {}),
            endpoint: modalConfig.endpoint || config.providers.modal?.endpoint || 'https://api.us-west-2.modal.direct/v1/chat/completions',
            model: modalConfig.model || config.providers.modal?.model || 'zai-org/GLM-5-FP8',
            savedAt: Date.now(),
        };
        this._saveConfig(config);
        console.log('[PROVIDER] Modal config saved');
    }

    getModalConfig() {
        const config = this._loadConfig();
        return config.providers?.modal || {
            endpoint: 'https://api.us-west-2.modal.direct/v1/chat/completions',
            model: 'zai-org/GLM-5-FP8',
        };
    }

    getGatewayConfig() {
        const config = this._loadConfig();
        return config.gateway || null;
    }

    getFullConfig() {
        const config = this._loadConfig();
        const masked = JSON.parse(JSON.stringify(config));

        if (masked.oauth?.accessToken) masked.oauth.accessToken = '***';
        if (masked.oauth?.refreshToken) masked.oauth.refreshToken = '***';
        if (masked.app?.clientSecret) masked.app.clientSecret = '***';
        if (masked.gateway?.botToken) masked.gateway.botToken = '***' + masked.gateway.botToken.slice(-4);
        if (masked.providers?.modal?.apiKey) masked.providers.modal.apiKey = '***';

        if (masked.profiles && typeof masked.profiles === 'object') {
            for (const key of Object.keys(masked.profiles)) {
                if (masked.profiles[key]?.access) masked.profiles[key].access = '***';
                if (masked.profiles[key]?.refresh) masked.profiles[key].refresh = '***';
                if (masked.profiles[key]?.clientSecret) masked.profiles[key].clientSecret = '***';
                if (masked.profiles[key]?.key) {
                    const value = String(masked.profiles[key].key);
                    masked.profiles[key].key = value.length > 4 ? `***${value.slice(-4)}` : '***';
                }
            }
        }

        return masked;
    }

    saveAppConfig(appConfig) {
        const config = this._loadConfig();
        config.app = { ...(config.app || {}), ...appConfig };
        this._saveConfig(config);
        console.log('[AUTH] App config saved to ~/.vsdev/config.json');
    }

    getAppConfig() {
        const config = this._loadConfig();
        return config.app || {};
    }
}

export default TokenManager;
