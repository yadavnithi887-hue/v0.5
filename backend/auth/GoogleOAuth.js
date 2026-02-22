// backend/auth/GoogleOAuth.js
// Google OAuth 2.0 PKCE flow for Gemini API access
// No external SDK — raw HTTP with fetch

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
        this.USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';

        // Scopes for Antigravity (Strictly these, or 403 error occurs)
        this.SCOPES = [
            'https://www.googleapis.com/auth/cloud-platform',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/cclog',
            'https://www.googleapis.com/auth/experimentsandconfigs',
            'openid'
        ];
    }

    generatePKCE() {
        const codeVerifier = crypto.randomBytes(32).toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        const codeChallenge = crypto.createHash('sha256')
            .update(codeVerifier)
            .digest('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        return { codeVerifier, codeChallenge };
    }

    buildAuthURL(port, codeChallenge, clientId) {
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: `http://localhost:${port}/oauth-callback`,
            response_type: 'code',
            scope: this.SCOPES.join(' '),
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            access_type: 'offline',
            prompt: 'consent',
            state: crypto.randomBytes(16).toString('hex')
        });
        return `${this.AUTH_ENDPOINT}?${params.toString()}`;
    }

    async exchangeCode(code, codeVerifier, port, clientId, clientSecret) {
        const params = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: `http://localhost:${port}/oauth-callback`,
            code_verifier: codeVerifier
        });

        const response = await fetch(this.TOKEN_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error_description || 'Failed to exchange code for tokens');
        }
        return await response.json();
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

        // PORT 51121 IS MANDATORY FOR ANTIGRAVITY CLIENT ID
        const port = 51121;

        const appConfig = this.tokenManager.getAppConfig();
        const effectiveClientId = clientId || appConfig.clientId || process.env.GOOGLE_CLIENT_ID;
        const effectiveSecret = clientSecret || appConfig.clientSecret || process.env.GOOGLE_CLIENT_SECRET;

        if (!effectiveClientId || !effectiveSecret) {
            console.error('[AUTH] Missing Google OAuth credentials.');
            throw new Error('Google OAuth Client ID and Secret are required. Please set them in your ~/.vsdev/config.json file.');
        }

        this.pendingAuth = { codeVerifier, clientId: effectiveClientId, clientSecret: effectiveSecret, port };

        await this._startCallbackServer(port, effectiveClientId);
        const authURL = this.buildAuthURL(port, codeChallenge, effectiveClientId);

        // Open the URL automatically in the default browser (Chrome)
        console.log(`[AUTH] Opening Browser for Authentication...`);
        const openCmd = process.platform === 'win32' ? `start "" "${authURL}"` :
            (process.platform === 'darwin' ? `open "${authURL}"` : `xdg-open "${authURL}"`);
        exec(openCmd, (err) => {
            if (err) console.error(`[AUTH] Failed to open browser automatically:`, err.message);
        });

        if (this.io) this.io.emit('auth:flow-started', { port, authURL });
        return { authURL, port };
    }

    _startCallbackServer(port, clientId) {
        return new Promise((resolve, reject) => {
            this.callbackServer = http.createServer(async (req, res) => {
                const url = new URL(req.url, `http://localhost:${port}`);
                if (url.pathname === '/oauth-callback') {
                    await this._handleCallback(url, res, port, clientId);
                } else {
                    res.writeHead(404); res.end('Not found');
                }
            });
            this.callbackServer.listen(port, () => resolve());
        });
    }

    async _handleCallback(url, res, port, clientId) {
        const code = url.searchParams.get('code');
        if (!code || !this.pendingAuth) return;

        try {
            const tokens = await this.exchangeCode(code, this.pendingAuth.codeVerifier, port, clientId, this.pendingAuth.clientSecret);
            const userInfo = await this.getUserInfo(tokens.access_token);

            // PROJECT DISCOVERY
            console.log('🔍 Discovering Project ID...');
            let projectId = 'rising-fact-p41fc';
            try {
                const discRes = await fetch('https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${tokens.access_token}`,
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1'
                    },
                    body: JSON.stringify({ metadata: { ideType: "IDE_UNSPECIFIED", platform: "PLATFORM_UNSPECIFIED", pluginType: "GEMINI" } })
                });
                if (discRes.ok) {
                    const data = await discRes.json();
                    projectId = data.cloudaicompanionProject?.id || projectId;
                }
            } catch (e) { console.warn('Project discovery failed', e); }

            await this.tokenManager.saveTokens({
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: Date.now() + (tokens.expires_in * 1000),
                clientId,
                clientSecret: this.pendingAuth.clientSecret,
                projectId,
                userEmail: userInfo.email,
                userName: userInfo.name
            });

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<h1>Login Success! Return to DevStudio.</h1>');
            if (this.io) this.io.emit('auth:success', { email: userInfo.email });
        } catch (err) {
            res.end(`Error: ${err.message}`);
        } finally {
            this.stopCallbackServer();
        }
    }

    /**
     * Stop the callback server
     */
    stopCallbackServer() {
        if (this.callbackServer) {
            this.callbackServer.close();
            this.callbackServer = null;
            console.log('🔐 OAuth callback server stopped');
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
    <div class="icon">✅</div>
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
    <div class="icon">❌</div>
    <h1>Authentication Failed</h1>
    <p>${error}</p>
    <p class="hint">Please try again from DevStudio Settings.</p>
  </div>
</body></html>`;
    }
}

export default GoogleOAuth;
