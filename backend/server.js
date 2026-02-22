// backend/server.js
// Unified Backend — IDE Agent + AI Gateway + Auth
// This is the heart of DevStudio AI

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// IDE Agent (existing)
import ToolRouter from './tools/ToolRouter.js';

// Auth Module (new)
import GoogleOAuth from './auth/GoogleOAuth.js';
import TokenManager from './auth/TokenManager.js';

// AI Brain (new)
import AIBrain from './ai/AIBrain.js';

// Session & Memory (new)
import SessionManager from './session/SessionManager.js';
import MemoryEngine from './session/MemoryEngine.js';

// Gateway (new)
import GatewayManager from './gateway/GatewayManager.js';

// ==================== Initialize Express ====================
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:4173'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

app.use(cors());
app.use(express.json());

// ==================== Initialize Modules ====================
const toolRouter = new ToolRouter(io);
const tokenManager = new TokenManager();
const googleOAuth = new GoogleOAuth(tokenManager, io);
const memoryEngine = new MemoryEngine(tokenManager);
const sessionManager = new SessionManager(memoryEngine);
const aiBrain = new AIBrain(tokenManager, toolRouter, io);
const gatewayManager = new GatewayManager(aiBrain, sessionManager, tokenManager, io, toolRouter);

// ==================== REST API Routes ====================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'DevStudio AI Backend is running',
        timestamp: Date.now(),
        modules: {
            toolRouter: true,
            auth: tokenManager.isAuthenticated(),
            gateway: gatewayManager.active
        }
    });
});

// --- Auth Routes ---

// Get auth status
app.get('/api/auth/status', (req, res) => {
    res.json(tokenManager.getAuthStatus());
});

// Start OAuth flow
app.post('/api/auth/start', async (req, res) => {
    try {
        const { clientId, clientSecret } = req.body;
        // clientId and clientSecret are optional - GoogleOAuth will use default if not provided
        const { authURL, port } = await googleOAuth.startAuthFlow(clientId, clientSecret);
        res.json({ authURL, port, message: 'Open the URL in your browser to sign in' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Manual Callback (for Antigravity/Copy-Paste flow)
app.post('/api/auth/manual-callback', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        const result = await googleOAuth.handleManualUrl(url);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    tokenManager.logout();
    res.json({ success: true, message: 'Logged out successfully' });
});

// --- Gateway Routes ---

// Get gateway status
app.get('/api/gateway/status', (req, res) => {
    res.json(gatewayManager.getStatus());
});

// Save gateway config (bot token, chat ID)
app.post('/api/gateway/config', (req, res) => {
    try {
        const { botToken, chatId, model } = req.body;
        if (!botToken) {
            return res.status(400).json({ error: 'botToken is required' });
        }
        tokenManager.saveGatewayConfig({ botToken, chatId, model });
        res.json({ success: true, message: 'Gateway config saved' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start gateway (Telegram polling)
app.post('/api/gateway/start', async (req, res) => {
    try {
        const config = tokenManager.getGatewayConfig();
        if (!config?.botToken) {
            return res.status(400).json({ error: 'No bot token configured. Set it first.' });
        }

        // Use workspace path from request or default
        const workspacePath = req.body.workspacePath || process.cwd();

        // Set model if configured
        if (config.model) {
            aiBrain.setModel(config.model);
        }

        const botInfo = await gatewayManager.start(config.botToken, workspacePath);
        res.json({ success: true, bot: botInfo });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Stop gateway
app.post('/api/gateway/stop', (req, res) => {
    gatewayManager.stop();
    res.json({ success: true, message: 'Gateway stopped' });
});

// Switch model
app.post('/api/gateway/model', (req, res) => {
    try {
        const { model } = req.body;
        if (!model) return res.status(400).json({ error: 'model is required' });
        aiBrain.setModel(model);
        res.json({ success: true, model: aiBrain.model });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Session Routes ---

// List all sessions
app.get('/api/sessions', (req, res) => {
    res.json(sessionManager.listSessions());
});

// Get specific session
app.get('/api/sessions/:chatId', async (req, res) => {
    const session = await sessionManager.getSession(req.params.chatId);
    res.json(session);
});

// Clear session
app.post('/api/sessions/:chatId/clear', async (req, res) => {
    await sessionManager.clearSession(req.params.chatId);
    res.json({ success: true, message: 'Session cleared' });
});

// --- Config Route (for debugging) ---
app.get('/api/config', (req, res) => {
    res.json(tokenManager.getFullConfig());
});

// ==================== WebSocket Handling ====================

io.on('connection', (socket) => {
    console.log('[CLIENT] Connected:', socket.id);

    // --- Existing: Tool execution ---
    socket.on('tool:execute', async (data) => {
        try {
            const result = await toolRouter.execute(data.tool, data.parameters);
            socket.emit('tool:result', { id: data.id, success: true, result });
        } catch (error) {
            socket.emit('tool:result', { id: data.id, success: false, error: error.message });
        }
    });

    // --- NEW: Auth events ---
    socket.on('auth:start', async (data) => {
        try {
            const { authURL, port } = await googleOAuth.startAuthFlow(data.clientId);
            socket.emit('auth:url', { authURL, port });
        } catch (err) {
            socket.emit('auth:error', { error: err.message });
        }
    });

    socket.on('auth:status', () => {
        socket.emit('auth:status', tokenManager.getAuthStatus());
    });

    socket.on('auth:logout', () => {
        tokenManager.logout();
        socket.emit('auth:status', { authenticated: false });
    });

    // --- NEW: Gateway events ---
    socket.on('gateway:config', (data) => {
        tokenManager.saveGatewayConfig(data);
        socket.emit('gateway:config-saved', { success: true });
    });

    socket.on('gateway:start', async (data) => {
        try {
            const config = tokenManager.getGatewayConfig();
            if (!config?.botToken) {
                socket.emit('gateway:error', { error: 'No bot token configured' });
                return;
            }
            if (config.model) aiBrain.setModel(config.model);
            const botInfo = await gatewayManager.start(config.botToken, data?.workspacePath || process.cwd());
            socket.emit('gateway:started', { bot: botInfo });
        } catch (err) {
            socket.emit('gateway:error', { error: err.message });
        }
    });

    socket.on('gateway:stop', () => {
        gatewayManager.stop();
        socket.emit('gateway:stopped');
    });

    socket.on('gateway:status', () => {
        socket.emit('gateway:status', gatewayManager.getStatus());
    });

    // --- Disconnection ---
    socket.on('disconnect', () => {
        console.log('[CLIENT] Disconnected:', socket.id);
    });
});

// ==================== Start Server ====================
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    const authStatus = tokenManager.isAuthenticated() ? 'Authenticated' : 'Not authenticated';
    const gatewayConfig = tokenManager.getGatewayConfig();
    const botStatus = gatewayConfig?.botToken ? 'Configured' : 'Not configured';

    console.log('');
    console.log('========================================');
    console.log('  DevStudio AI Backend v2.0');
    console.log('========================================');
    console.log(`  HTTP:      http://localhost:${PORT}`);
    console.log(`  WebSocket: ws://localhost:${PORT}`);
    console.log('----------------------------------------');
    console.log(`  [AUTH]     ${authStatus}`);
    console.log(`  [BOT]      ${botStatus}`);
    console.log('========================================');
    console.log('');
    console.log('[SERVER] Ready - Use /api/health to check status');
    console.log('');
});

// ==================== Graceful Shutdown ====================
const shutdown = () => {
    console.log('[SERVER] Shutting down...');
    gatewayManager.stop();
    googleOAuth.stopCallbackServer();
    server.close(() => {
        console.log('[SERVER] Closed');
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app, server, io };
