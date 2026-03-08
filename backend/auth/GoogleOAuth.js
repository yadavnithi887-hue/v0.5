// backend/auth/GoogleOAuth.js
// Google OAuth 2.0 PKCE flow for Gemini API access
// No external SDK - raw HTTP with fetch
// ============================================================================
// HARD TAG: ANTIGRAVITY OAUTH LOCKED
// This file contains a known-working Google Antigravity OAuth flow.
// Do NOT change scopes, endpoints, PKCE/state validation, redirect pattern,
// or token exchange payload unless explicitly requested by project owner.
// ============================================================================

import http from 'http';
import crypto from 'crypto';
import { URL } from 'url';
import { exec } from 'child_process';

class GoogleOAuth {
    constructor(tokenManager, io) {
        this.tokenManager = tokenManager;
        this.io = io;
        this.callbackServer = null;
        this.pendingAuth = null;

        this.AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
        this.TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
        // Use v1 with alt=json (same as OpenClaw)
        this.USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json';

        // HARD TAG: ANTIGRAVITY SCOPES LOCKED
        // Scopes for Antigravity (EXACT match with OpenClaw - no extra scopes!)
        this.SCOPES = [
            'https://www.googleapis.com/auth/cloud-platform',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/cclog',
            'https://www.googleapis.com/auth/experimentsandconfigs'
        ];
    }

    generatePKCE() {
        const verifier = crypto.randomBytes(32).toString('hex');
        const codeChallenge = crypto.createHash('sha256')
            .update(verifier)
            .digest('base64url');

        return { codeVerifier: verifier, codeChallenge };
    }

    parseRedirectUrl(input) {
        const value = String(input || '').trim();
        if (!value) return {};
        try {
            const url = new URL(value);
            return {
                code: url.searchParams.get('code') ?? undefined,
                state: url.searchParams.get('state') ?? undefined,
                error: url.searchParams.get('error') ?? undefined,
            };
        } catch {
            return {};
        }
    }

    /**
     * Read credentials from environment Ã¢â€ â€™ saved config Ã¢â€ â€™ fallback defaults
     * Secrets are NEVER hardcoded in source code!
     */
    _resolveOAuthConfig(clientId, clientSecret) {
        const ENV_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
        const ENV_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
        
        const appConfig = this.tokenManager.getAppConfig?.() || {};
        
        // Priority: passed args > saved config > env vars
        const resolvedClientId = (clientId || appConfig.clientId || ENV_CLIENT_ID).trim();
        const resolvedClientSecret = (clientSecret || appConfig.clientSecret || ENV_CLIENT_SECRET).trim();

        if (!resolvedClientId) {
            throw new Error('Google Client ID not configured. Set GOOGLE_CLIENT_ID in backend/.env');
        }

        return { clientId: resolvedClientId, clientSecret: resolvedClientSecret };
    }

    buildAuthURL(port, codeChallenge, verifier, clientId) {
        // HARD TAG: DO NOT ALTER redirect_uri/state/code_challenge contract.
        // Use EXACT scopes from OpenClaw - no extra!
        const scopes = [
            'https://www.googleapis.com/auth/cloud-platform',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/cclog',
            'https://www.googleapis.com/auth/experimentsandconfigs'
        ];
        
        const params = new URLSearchParams({
            client_id: clientId,
            response_type: 'code',
            redirect_uri: `http://localhost:${port}/oauth-callback`,
            scope: scopes.join(' '),
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            state: verifier,
            access_type: 'offline',
            prompt: 'consent'
        });
        return `${this.AUTH_ENDPOINT}?${params.toString()}`;
    }

    async exchangeCode(code, codeVerifier, port, clientId, clientSecret) {
        // HARD TAG: ANTIGRAVITY TOKEN EXCHANGE LOCKED
        // Keep grant_type/client_secret/code_verifier/redirect_uri contract unchanged.
        // Read from env if not provided
        const ENV_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
        const ENV_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
        
        const resolvedClientId = clientId || ENV_CLIENT_ID;
        const resolvedClientSecret = clientSecret || ENV_CLIENT_SECRET;
        
        if (!resolvedClientId || !resolvedClientSecret) {
            throw new Error('OAuth credentials missing. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env');
        }

        const params = new URLSearchParams({
            client_id: resolvedClientId,
            client_secret: resolvedClientSecret,  // ALWAYS send - Antigravity requires it!
            code,
            grant_type: 'authorization_code',
            redirect_uri: `http://localhost:${port}/oauth-callback`,
            code_verifier: codeVerifier
        });

        const response = await fetch(this.TOKEN_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'google-api-nodejs-client/9.15.1'
            },
            body: params.toString()
        });

        if (!response.ok) {
            const raw = await response.text();
            console.error('[AUTH] Token exchange failed:', raw);
            let errorMsg = 'Failed to exchange code for tokens';
            try {
                const parsed = JSON.parse(raw);
                errorMsg = parsed.error_description || parsed.error || errorMsg;
            } catch (e) {}
            throw new Error(errorMsg);
        }
        
        const tokenData = await response.json();
        
        // CRITICAL: Antigravity MUST return refresh_token
        if (!tokenData.refresh_token) {
            throw new Error('No refresh token received. Please try again with prompt=consent.');
        }
        
        return tokenData;
    }

    async getUserInfo(accessToken) {
        const response = await fetch(this.USERINFO_ENDPOINT, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error('Failed to fetch user info');
        return await response.json();
    }

    async startAuthFlow(clientId, clientSecret) {
        if (this.callbackServer) this.stopCallbackServer();
        const { codeVerifier, codeChallenge } = this.generatePKCE();

        const requestedPort = Number(process.env.OAUTH_CALLBACK_PORT || 51121);

        const resolvedOAuth = this._resolveOAuthConfig(clientId, clientSecret);

        // Persist credentials in app config
        this.tokenManager.saveAppConfig({
            clientId: resolvedOAuth.clientId,
            ...(resolvedOAuth.clientSecret ? { clientSecret: resolvedOAuth.clientSecret } : {}),
        });

        this.pendingAuth = {
            codeVerifier,
            clientId: resolvedOAuth.clientId,
            clientSecret: resolvedOAuth.clientSecret,
            port: requestedPort,
            startedAt: Date.now(),
            completed: false,
            completionPromise: null,
        };

        let callbackServerStarted = false;
        let port = requestedPort;
        try {
            await this._startCallbackServer(port, resolvedOAuth.clientId);
            callbackServerStarted = true;
        } catch (err) {
            // If local callback port is blocked, keep flow alive using manual paste mode.
            if (err.code === 'EACCES' || err.code === 'EADDRINUSE') {
                callbackServerStarted = false;
                console.warn(`[AUTH] Callback server unavailable on localhost:${port} (${err.code}). Falling back to manual URL paste.`);
            } else {
                throw err;
            }
        }

        this.pendingAuth.port = port;
        const authURL = this.buildAuthURL(port, codeChallenge, codeVerifier, resolvedOAuth.clientId);

        // Open the URL automatically in the default browser
        console.log('[AUTH] Opening Browser for Authentication...');
        const openCmd = process.platform === 'win32' ? `start "" "${authURL}"` :
            (process.platform === 'darwin' ? `open "${authURL}"` : `xdg-open "${authURL}"`);

        exec(openCmd, (err) => {
            if (err) console.error('[AUTH] Failed to open browser automatically:', err.message);
        });

        if (this.io) this.io.emit('auth:flow-started', { port, authURL, callbackServerStarted });
        return { authURL, port, callbackServerStarted };
    }

    _startCallbackServer(port, clientId) {
        return new Promise((resolve, reject) => {
            this.callbackServer = http.createServer(async (req, res) => {
                const url = new URL(req.url, `http://localhost:${port}`);
                if (url.pathname === '/oauth-callback') {
                    await this._handleCallback(url, res, port, clientId);
                } else {
                    res.writeHead(404);
                    res.end('Not found');
                }
            });
            this.callbackServer.once('error', (err) => {
                this.callbackServer = null;
                reject(err);
            });
            this.callbackServer.listen(port, '127.0.0.1', () => resolve());
        });
    }

    async _handleCallback(url, res) {
        const parsed = this.parseRedirectUrl(url.toString());
        try {
            const result = await this._completeAuthWithParsed(parsed, 'callback');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(this._getSuccessPage(result.name || 'User', result.email || 'Authenticated'));
        } catch (err) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(this._getErrorPage(err.message));
        }
    }

    /**
     * Handle manually pasted redirect URL (for mobile/no-browser flows)
     */
    async handleManualUrl(urlStr) {
        const parsed = this.parseRedirectUrl(urlStr);
        const result = await this._completeAuthWithParsed(parsed, 'manual');
        return { success: true, email: result.email, name: result.name, projectId: result.projectId };
    }

    async _completeAuthWithParsed(parsed, source) {
        // HARD TAG: PKCE + STATE VALIDATION MUST STAY IN PLACE.
        if (!this.pendingAuth) {
            throw new Error('No pending auth flow. Please start OAuth first.');
        }

        if (this.pendingAuth.completed && this.pendingAuth.completionPromise) {
            return await this.pendingAuth.completionPromise;
        }

        const { code, state, error } = parsed || {};
        if (error) {
            throw new Error(`Google OAuth Error: ${error}`);
        }
        if (!code) {
            throw new Error('No authorization code found in redirect URL.');
        }
        if (state && state !== this.pendingAuth.codeVerifier) {
            throw new Error('OAuth state mismatch - possible CSRF attack.');
        }

        this.pendingAuth.completed = true;
        this.pendingAuth.completedBy = source;

        this.pendingAuth.completionPromise = (async () => {
            const tokens = await this.exchangeCode(
                code,
                this.pendingAuth.codeVerifier,
                this.pendingAuth.port,
                this.pendingAuth.clientId,
                this.pendingAuth.clientSecret
            );
            const userInfo = await this.getUserInfo(tokens.access_token);
            const projectId = await this._discoverProjectId(tokens.access_token);

            await this.tokenManager.saveTokens({
                provider: 'google-antigravity',
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: Date.now() + (tokens.expires_in * 1000),
                clientId: this.pendingAuth.clientId,
                clientSecret: this.pendingAuth.clientSecret,
                projectId,
                userEmail: userInfo.email,
                userName: userInfo.name
            });

            this.pendingAuth.userEmail = userInfo.email;
            this.pendingAuth.userName = userInfo.name;
            this.pendingAuth.projectId = projectId;

            this.stopCallbackServer();
            if (this.io) this.io.emit('auth:success', { email: userInfo.email, source });
            return { email: userInfo.email, name: userInfo.name, projectId, source };
        })();

        try {
            return await this.pendingAuth.completionPromise;
        } catch (err) {
            // Allow retry from the other path if exchange fails
            this.pendingAuth.completed = false;
            this.pendingAuth.completedBy = null;
            this.pendingAuth.completionPromise = null;
            throw err;
        }
    }

    async _discoverProjectId(accessToken) {
        console.log('[AUTH] Discovering Project ID...');
        let projectId = 'rising-fact-p41fc';
        const projectEndpoints = [
            'https://cloudcode-pa.googleapis.com',
            'https://daily-cloudcode-pa.sandbox.googleapis.com'
        ];

        for (const endpoint of projectEndpoints) {
            try {
                const discRes = await fetch(`${endpoint}/v1internal:loadCodeAssist`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'User-Agent': 'google-api-nodejs-client/9.15.1',
                        'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
                        'Client-Metadata': JSON.stringify({
                            ideType: 'IDE_UNSPECIFIED',
                            platform: 'PLATFORM_UNSPECIFIED',
                            pluginType: 'GEMINI'
                        })
                    },
                    body: JSON.stringify({
                        metadata: { ideType: 'IDE_UNSPECIFIED', platform: 'PLATFORM_UNSPECIFIED', pluginType: 'GEMINI' }
                    })
                });
                if (!discRes.ok) continue;

                const data = await discRes.json();
                if (data.cloudaicompanionProject) {
                    projectId = typeof data.cloudaicompanionProject === 'string'
                        ? data.cloudaicompanionProject
                        : (data.cloudaicompanionProject.id || projectId);
                    console.log(`[AUTH] Project discovered: ${projectId}`);
                    break;
                }
            } catch (e) {
                console.warn(`Project discovery failed on ${endpoint}`, e.message);
            }
        }

        return projectId;
    }

    /**
     * Stop the callback server
     */
    stopCallbackServer() {
        if (this.callbackServer) {
            this.callbackServer.close();
            this.callbackServer = null;
            console.log('OAuth callback server stopped');
        }
    }

    /**
     * Find an available port
     */
    _findAvailablePort() {
        return new Promise((resolve, reject) => {
            const server = http.createServer();
            server.listen(0, () => {
                const port = server.address().port;
                server.close(() => resolve(port));
            });
            server.on('error', reject);
        });
    }

    /**
     * Success HTML page shown after OAuth
     */
    _getSuccessPage(name, email) {
        return `<!DOCTYPE html>
<html>
<head><title>DevStudio - Auth Success</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; background: #1e1e1e; color: #d4d4d4;
    display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
  .card { background: #252526; border: 1px solid #3c3c3c; border-radius: 12px;
    padding: 40px; text-align: center; max-width: 400px; }
  .icon { font-size: 48px; margin-bottom: 16px; }
  h1 { color: #4ec9b0; margin: 0 0 8px; font-size: 24px; }
  p { color: #9cdcfe; margin: 4px 0; }
  .hint { color: #6a9955; margin-top: 20px; font-size: 14px; }
</style></head>
<body>
  <div class="card">
    <div class="icon">OK</div>
    <h1>Authentication Successful!</h1>
    <p>Welcome, <strong>${name}</strong></p>
    <p>${email}</p>
    <p class="hint">You can close this tab and return to DevStudio.</p>
  </div>
</body></html>`;
    }

    /**
     * Error HTML page
     */
    _getErrorPage(error) {
        return `<!DOCTYPE html>
<html>
<head><title>DevStudio - Auth Error</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; background: #1e1e1e; color: #d4d4d4;
    display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
  .card { background: #252526; border: 1px solid #3c3c3c; border-radius: 12px;
    padding: 40px; text-align: center; max-width: 400px; }
  .icon { font-size: 48px; margin-bottom: 16px; }
  h1 { color: #f44747; margin: 0 0 8px; font-size: 24px; }
  p { color: #ce9178; }
  .hint { color: #6a9955; margin-top: 20px; font-size: 14px; }
</style></head>
<body>
  <div class="card">
    <div class="icon">X</div>
    <h1>Authentication Failed</h1>
    <p>${error}</p>
    <p class="hint">Please try again from DevStudio Settings.</p>
  </div>
</body></html>`;
    }
}

export default GoogleOAuth;
