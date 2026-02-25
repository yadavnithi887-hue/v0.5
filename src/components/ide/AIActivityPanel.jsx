import React, { useState, useEffect, useRef } from 'react';
import {
    Brain,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    Loader2,
    Square,
    Mic,
    ArrowRight,
    Plus,
    MessageSquare,
    Wifi,
    WifiOff,
    Clock3,
    AlertTriangle,
} from 'lucide-react';
import { io } from 'socket.io-client';
import ReactMarkdown from 'react-markdown';

const SUPPORTED_MODELS = [
    { id: 'gemini-3-flash', label: 'Gemini 3 Flash' },
    { id: 'gemini-3-pro-high', label: 'Gemini 3.1 Pro (High)' },
    { id: 'gemini-3-pro-low', label: 'Gemini 3.1 Pro (Low)' },
    { id: 'claude-sonnet-4.6', label: 'Claude Sonnet 4.6' },
    { id: 'claude-opus-4.6', label: 'Claude Opus 4.6' },
    { id: 'gpt-oss-120b', label: 'GPT-OSS 120B' },
];

const STORAGE_KEYS = {
    sessions: 'ide-chat-sessions-v1',
    activeSession: 'ide-chat-active-session-v1',
    messagesBySession: 'ide-chat-messages-by-session-v1',
};
const REQUEST_TIMEOUT_MS = 90000;

function nowIso() {
    return new Date().toISOString();
}

function makeSession(title = 'New Chat') {
    const ts = Date.now();
    return {
        id: `ide-chat-${ts}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        createdAt: nowIso(),
        updatedAt: nowIso(),
    };
}

function sanitizeMessagesMap(rawMap) {
    if (!rawMap || typeof rawMap !== 'object') return {};
    const cleaned = {};
    for (const [sid, list] of Object.entries(rawMap)) {
        if (!Array.isArray(list)) continue;
        cleaned[sid] = list.filter(Boolean).map((m) => ({ ...m, streaming: false }));
    }
    return cleaned;
}

function titleFromText(text) {
    const v = (text || '').trim();
    if (!v) return 'New Chat';
    return v.length > 44 ? `${v.slice(0, 44)}...` : v;
}

function prettyAge(iso) {
    const t = new Date(iso).getTime();
    const diff = Math.max(0, Date.now() - t);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
}

function formatAiError(err) {
    const code = err?.code || 'AI_ERROR';
    const stage = err?.stage || 'unknown';
    const status = err?.status ? ` (HTTP ${err.status})` : '';

    let headline = `AI failed: ${code}${status}`;
    if (code === 'QUOTA_EXCEEDED') headline = `AI quota exceeded${status}`;
    if (code === 'RATE_LIMITED') headline = `AI rate limit reached${status}`;
    if (code === 'NETWORK_ERROR') headline = 'Network issue while calling AI API';
    if (code === 'AUTH_ERROR' || code === 'AUTH_REQUIRED') headline = 'Authentication issue with AI API';

    const lines = [headline];
    if (err?.error) lines.push(`Reason: ${err.error}`);
    if (stage) lines.push(`Stage: ${stage}`);
    if (Array.isArray(err?.toolFailures) && err.toolFailures.length > 0) {
        const tools = err.toolFailures.slice(0, 3).map((t) => `${t.tool}: ${t.error}`).join(' | ');
        lines.push(`Tool failures: ${tools}`);
    }
    if (err?.details) {
        const d = String(err.details).replace(/\s+/g, ' ').slice(0, 220);
        lines.push(`API details: ${d}`);
    }
    if (err?.retryable === true) lines.push('You can retry this request.');
    return lines.join('\n');
}

function splitThinkFromText(text) {
    const src = String(text || '');
    const re = /<think>([\s\S]*?)<\/think>/gi;
    const thinks = [];
    let cleaned = src;
    let m;
    while ((m = re.exec(src)) !== null) {
        if (m[1]) thinks.push(m[1].trim());
    }
    cleaned = cleaned.replace(re, '').trim();
    return { cleanedText: cleaned, thinkText: thinks.join('\n\n').trim() };
}

function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function nodeText(children) {
    if (children == null) return '';
    if (typeof children === 'string' || typeof children === 'number') return String(children);
    if (Array.isArray(children)) return children.map(nodeText).join('');
    if (children?.props?.children != null) return nodeText(children.props.children);
    return '';
}

function looksLikeFileRef(value) {
    const v = String(value || '').trim();
    if (!v) return false;
    if (/^(https?:|mailto:|tel:)/i.test(v)) return false;
    if (/^(artifact:\/\/|file:\/\/)/i.test(v)) return true;
    if (/^[A-Za-z]:[\\/]/.test(v)) return true;
    return /[A-Za-z0-9_\-/\\.]+\.[A-Za-z0-9]+$/.test(v);
}

function autoLinkCommonFiles(text) {
    let out = String(text || '');
    const fileRe = /\b([A-Za-z0-9_\-./\\]+\.(?:html|css|js|jsx|ts|tsx|json|md|txt|yml|yaml|xml|svg|png|jpg|jpeg|gif|py|java|go|rs|php|c|cpp|h|hpp|sql|sh|bat|ps1))\b/g;
    out = out.replace(fileRe, (m, p1, offset, src) => {
        const left = src.slice(Math.max(0, offset - 2), offset + 2);
        if (left.includes('](') || left.includes('`')) return m;
        return `[${p1}](${encodeURIComponent(p1).replace(/%2F/g, '/').replace(/%5C/g, '\\')})`;
    });
    return out;
}

function formatActivityLine(activity) {
    const type = activity?.type || 'activity';
    const message = String(activity?.message || '').trim();
    if (type === 'thinking') return 'thinking...';
    if (type === 'tool_call') return `calling ${message || 'tool'}`;
    if (type === 'tool_result') return message ? `result ${message}` : 'tool result';
    if (type === 'tool_warning') return message || 'tool warning';
    if (type === 'model_fallback') return message || 'model fallback';
    return message || type;
}

function normalizeFileRef(raw) {
    let v = String(raw || '').trim();
    if (!v) return '';
    if (/%[0-9A-Fa-f]{2}/.test(v)) {
        try {
            v = decodeURIComponent(v);
        } catch {
            // keep raw if decode fails
        }
    }
    if (v.startsWith('file://')) {
        try {
            v = decodeURIComponent(v.replace(/^file:\/\//i, ''));
        } catch {
            v = v.replace(/^file:\/\//i, '');
        }
    }
    return v;
}

function extractFileRefsFromText(value) {
    const src = String(value || '');
    const refs = [];
    const re = /([A-Za-z0-9_\-./\\]+\.(?:html|css|js|jsx|ts|tsx|json|md|txt|yml|yaml|xml|svg|png|jpg|jpeg|gif|py|java|go|rs|php|c|cpp|h|hpp|sql|sh|bat|ps1))/g;
    let m;
    while ((m = re.exec(src)) !== null) {
        refs.push(m[1]);
    }
    return Array.from(new Set(refs)).slice(0, 5);
}

export default function AIActivityPanel() {
    const [gatewayStatus, setGatewayStatus] = useState({ active: false, authenticated: false, model: 'gemini-3-flash' });
    const [sessions, setSessions] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions) || '[]');
            return Array.isArray(saved) ? saved : [];
        } catch {
            return [];
        }
    });
    const [messagesBySession, setMessagesBySession] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.messagesBySession) || '{}');
            return sanitizeMessagesMap(saved);
        } catch {
            return {};
        }
    });
    const [activeSessionId, setActiveSessionId] = useState(() => localStorage.getItem(STORAGE_KEYS.activeSession) || '');

    const [pendingQueue, setPendingQueue] = useState([]);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState('');
    const [modelOpen, setModelOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const [artifacts, setArtifacts] = useState([]);
    const [activityBySession, setActivityBySession] = useState({});
    const [taskBoundaryBySession, setTaskBoundaryBySession] = useState({});

    const socketRef = useRef(null);
    const modelRef = useRef(null);
    const feedEndRef = useRef(null);
    const textareaRef = useRef(null);
    const activeRequestRef = useRef(null);
    const streamingSessionRef = useRef('');
    const requestTimeoutRef = useRef(null);
    const BACKEND_URL = 'http://localhost:3001';

    useEffect(() => {
        if (sessions.length === 0) {
            const s = makeSession();
            setSessions([s]);
            setActiveSessionId(s.id);
            return;
        }
        if (!activeSessionId || !sessions.some((s) => s.id === activeSessionId)) {
            setActiveSessionId(sessions[0].id);
        }
    }, [sessions, activeSessionId]);

    useEffect(() => { localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions)); }, [sessions]);
    useEffect(() => { localStorage.setItem(STORAGE_KEYS.activeSession, activeSessionId || ''); }, [activeSessionId]);
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.messagesBySession, JSON.stringify(sanitizeMessagesMap(messagesBySession)));
    }, [messagesBySession]);
    useEffect(() => {
        loadArtifacts(activeSessionId);
    }, [activeSessionId]);

    const activeMessages = activeSessionId ? (messagesBySession[activeSessionId] || []) : [];

    const appendMessage = (sessionId, msg) => {
        setMessagesBySession((prev) => ({ ...prev, [sessionId]: [...(prev[sessionId] || []), msg] }));
    };

    const updateMessage = (sessionId, msgId, updater) => {
        setMessagesBySession((prev) => {
            const list = [...(prev[sessionId] || [])];
            const idx = list.findIndex((m) => m.id === msgId);
            if (idx === -1) return prev;
            const old = list[idx];
            list[idx] = typeof updater === 'function' ? updater(old) : { ...old, ...updater };
            return { ...prev, [sessionId]: list };
        });
    };

    const patchSession = (sid, patch) => {
        setSessions((prev) => prev.map((s) => (s.id === sid ? { ...s, ...patch, updatedAt: nowIso() } : s)));
    };

    const sessionMessageCount = (sid) => (messagesBySession[sid] || []).filter(Boolean).length;

    const loadArtifacts = async (sid = activeSessionId) => {
        if (!sid) {
            setArtifacts([]);
            return [];
        }
        try {
            const r = await fetch(`${BACKEND_URL}/api/artifacts/${encodeURIComponent(sid)}`);
            const d = await r.json();
            const items = Array.isArray(d?.items) ? d.items : [];
            setArtifacts(items);
            return items;
        } catch {
            setArtifacts([]);
            return [];
        }
    };

    const readArtifact = async (sid, artifactName) => {
        if (!sid || !artifactName) return '';
        try {
            const r = await fetch(`${BACKEND_URL}/api/artifacts/${encodeURIComponent(sid)}/${encodeURIComponent(artifactName)}`);
            const d = await r.json();
            return d?.success ? String(d.content || '') : '';
        } catch {
            return '';
        }
    };

    const openArtifactPage = async (sid, artifactName) => {
        const content = await readArtifact(sid, artifactName);
        window.dispatchEvent(new CustomEvent('devstudio:open-ai-artifact', {
            detail: {
                sessionId: sid,
                artifactName,
                content,
            }
        }));
    };

    const attachArtifactsToLatestAssistant = (sid, items = [], baselineNames = []) => {
        if (!sid || !Array.isArray(items) || items.length === 0) return;
        const baseline = new Set((baselineNames || []).map((n) => String(n)));
        const newItems = items.filter((a) => !baseline.has(String(a.name || '')));
        const attach = (newItems.length > 0 ? newItems : items)
            .map((a) => ({ name: String(a.name || ''), path: String(a.path || '') }))
            .filter((a) => a.name);
        if (attach.length === 0) return;

        setMessagesBySession((prev) => {
            const list = [...(prev[sid] || [])];
            const ridx = [...list].reverse().findIndex((m) => m.role === 'assistant');
            if (ridx === -1) return prev;
            const idx = list.length - 1 - ridx;
            const old = list[idx] || {};
            const current = Array.isArray(old.artifacts) ? old.artifacts : [];
            const merged = [...current];
            for (const a of attach) {
                if (!merged.find((x) => x.name === a.name)) merged.push(a);
            }
            list[idx] = { ...old, artifacts: merged };
            return { ...prev, [sid]: list };
        });
    };

    const openReference = async ({ href, label, sessionId }) => {
        const raw = String(href || label || '').trim();
        if (!raw) return;

        const sid = sessionId || activeSessionId;
        const artifactNames = (artifacts || []).map((a) => a.name);

        if (/^artifact:\/\//i.test(raw)) {
            const artifactName = decodeURIComponent(raw.replace(/^artifact:\/\//i, '').split('?')[0] || '');
            if (artifactName) await openArtifactPage(sid, artifactName);
            return;
        }

        if (artifactNames.includes(raw)) {
            await openArtifactPage(sid, raw);
            return;
        }

        const path = normalizeFileRef(raw);
        if (!path) return;
        window.dispatchEvent(new CustomEvent('devstudio:open-file-ref', {
            detail: { path }
        }));
    };

    const createNewChat = () => {
        const s = makeSession();
        setSessions((prev) => [s, ...prev]);
        setActiveSessionId(s.id);
        setInputText('');
        setError('');

        // Create backend session file immediately, even before first message.
        if (socketRef.current) {
            socketRef.current.emit('ide:new-session', {
                chatId: s.id,
                workspacePath: localStorage.getItem('devstudio-last-project') || '',
            });
        }
    };

    const sortedHistory = sessions
        .filter((s) => sessionMessageCount(s.id) > 0)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const appendTaskBoundary = (sid, entry) => {
        if (!sid || !entry?.taskName) return;
        setTaskBoundaryBySession((prev) => {
            const list = [...(prev[sid] || [])];
            const last = list[list.length - 1];
            if (
                last &&
                last.mode === entry.mode &&
                last.taskName === entry.taskName &&
                last.taskStatus === entry.taskStatus &&
                Math.abs((entry.ts || 0) - (last.ts || 0)) < 400
            ) {
                return prev;
            }
            return { ...prev, [sid]: [...list, entry] };
        });
    };

    useEffect(() => {
        fetchStatus();
        const sock = io(BACKEND_URL);
        socketRef.current = sock;

        sock.on('gateway:status', (s) => setGatewayStatus(s));
        sock.on('auth:status', (s) => setGatewayStatus((p) => ({ ...p, authenticated: s.authenticated })));
        sock.on('ai:activity', (evt) => {
            const sid = streamingSessionRef.current || activeSessionId;
            if (!sid) return;
            const type = evt?.type || 'activity';
            const message = evt?.data?.message || evt?.data?.tool || '';
            if (type === 'tool_call' && evt?.data?.tool === 'task_boundary') {
                const args = evt?.data?.args || {};
                appendTaskBoundary(sid, {
                    mode: String(args.Mode || 'EXECUTION').toUpperCase(),
                    taskName: String(args.TaskName || '').trim(),
                    taskSummary: String(args.TaskSummary || '').trim(),
                    taskStatus: String(args.TaskStatus || '').trim(),
                    ts: evt?.timestamp || Date.now(),
                });
            }
            setActivityBySession((prev) => {
                const payload = evt?.data || {};
                const fileRefs = Array.from(new Set([
                    ...extractFileRefsFromText(message),
                    ...extractFileRefsFromText(JSON.stringify(payload || {})),
                ])).slice(0, 5);
                const list = [...(prev[sid] || []), {
                    type,
                    message,
                    ts: evt?.timestamp || Date.now(),
                    data: payload,
                    fileRefs,
                }];
                return { ...prev, [sid]: list };
            });
        });
        sock.on('ai:task-boundary', (evt) => {
            const sid = String(evt?.sessionId || streamingSessionRef.current || activeSessionId || '');
            if (!sid) return;
            appendTaskBoundary(sid, {
                mode: String(evt?.mode || 'EXECUTION').toUpperCase(),
                taskName: String(evt?.taskName || '').trim(),
                taskSummary: String(evt?.taskSummary || '').trim(),
                taskStatus: String(evt?.taskStatus || '').trim(),
                ts: evt?.timestamp || Date.now(),
            });
        });

        sock.on('chat:stream', (data) => {
            const targetSessionId = streamingSessionRef.current || activeSessionId;
            if (!targetSessionId) return;

            setMessagesBySession((prev) => {
                const list = [...(prev[targetSessionId] || [])];
                let msg = list.find((m) => m.id === data.id);
                if (!msg) {
                    msg = { id: data.id, role: 'assistant', text: '', thought: '', thoughtTime: 0, streaming: true };
                    list.push(msg);
                }

                if (data.type === 'thought') {
                    msg.thought = data.content;
                    msg.thoughtTime = data.durationMs;
                } else if (data.type === 'text') {
                    msg.text = data.content;
                } else if (data.type === 'done') {
                    msg.text = data.content;
                    msg.thought = data.thoughtContent;
                    msg.thoughtTime = data.durationMs;
                    msg.streaming = false;
                }

                return { ...prev, [targetSessionId]: list };
            });
        });

        sock.on('ide:chat-complete', async () => {
            if (requestTimeoutRef.current) {
                clearTimeout(requestTimeoutRef.current);
                requestTimeoutRef.current = null;
            }
            const req = activeRequestRef.current;
            if (req) {
                updateMessage(req.sessionId, req.userMsgId, { queueState: 'sent' });
                patchSession(req.sessionId, {});
                const items = await loadArtifacts(req.sessionId);
                attachArtifactsToLatestAssistant(req.sessionId, items, req.artifactBaseline || []);
            }
            activeRequestRef.current = null;
            setSending(false);
        });

        sock.on('ide:chat-error', (errPayload) => {
            if (requestTimeoutRef.current) {
                clearTimeout(requestTimeoutRef.current);
                requestTimeoutRef.current = null;
            }
            const req = activeRequestRef.current;
            const sessionId = req?.sessionId || activeSessionId;

            if (req) updateMessage(req.sessionId, req.userMsgId, { queueState: 'failed' });

            if (sessionId) {
                setMessagesBySession((prev) => {
                    const list = [...(prev[sessionId] || [])];
                    let changed = false;
                    for (let i = 0; i < list.length; i++) {
                        if (list[i]?.role === 'assistant' && list[i]?.streaming) {
                            list[i] = { ...list[i], streaming: false };
                            changed = true;
                        }
                    }
                    return changed ? { ...prev, [sessionId]: list } : prev;
                });
                appendMessage(sessionId, {
                    id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    role: 'error',
                    text: formatAiError(errPayload),
                    meta: errPayload,
                });
                patchSession(sessionId, {});
            }

            setError(errPayload?.error || 'Chat error');
            activeRequestRef.current = null;
            setSending(false);
        });

        const t = setInterval(fetchStatus, 10000);
        return () => {
            if (requestTimeoutRef.current) {
                clearTimeout(requestTimeoutRef.current);
                requestTimeoutRef.current = null;
            }
            sock.disconnect();
            clearInterval(t);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setTimeout(() => feedEndRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
    }, [activeMessages, pendingQueue.length]);

    useEffect(() => {
        const fn = (e) => {
            if (modelRef.current && !modelRef.current.contains(e.target)) setModelOpen(false);
        };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }, [inputText]);

    useEffect(() => {
        if (sending) return;
        if (pendingQueue.length === 0) return;

        const next = pendingQueue[0];
        setPendingQueue((prev) => prev.slice(1));

        if (!socketRef.current) {
            updateMessage(next.sessionId, next.userMsgId, { queueState: 'failed' });
            appendMessage(next.sessionId, {
                id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                role: 'error',
                text: 'AI request failed: socket connection is not available. Please reconnect gateway and retry.',
            });
            return;
        }

        activeRequestRef.current = {
            ...next,
            artifactBaseline: (artifacts || []).map((a) => String(a.name || '')),
        };
        streamingSessionRef.current = next.sessionId;
        setSending(true);
        updateMessage(next.sessionId, next.userMsgId, { queueState: 'processing' });

        if (requestTimeoutRef.current) {
            clearTimeout(requestTimeoutRef.current);
        }
        requestTimeoutRef.current = setTimeout(() => {
            const req = activeRequestRef.current;
            if (!req) return;

            updateMessage(req.sessionId, req.userMsgId, { queueState: 'failed' });
            appendMessage(req.sessionId, {
                id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                role: 'error',
                text: 'AI request timed out (no response). Queue has been released. You can retry.',
            });

            activeRequestRef.current = null;
            setSending(false);
            requestTimeoutRef.current = null;
        }, REQUEST_TIMEOUT_MS);

        socketRef.current.emit('ide:chat', {
            chatId: next.sessionId,
            message: next.text,
            workspacePath: localStorage.getItem('devstudio-last-project') || '',
        });
    }, [pendingQueue, sending]);

    const fetchStatus = async () => {
        try {
            const r = await fetch(`${BACKEND_URL}/api/gateway/status`);
            setGatewayStatus(await r.json());
        } catch {
            // ignore
        }
    };

    const startGateway = async () => {
        setConnecting(true);
        setError('');
        try {
            const wp = localStorage.getItem('devstudio-last-project') || '';
            const r = await fetch(`${BACKEND_URL}/api/gateway/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspacePath: wp }),
            });
            const d = await r.json();
            if (d.success) fetchStatus();
            else setError(d.error || 'Failed to connect gateway');
        } catch {
            setError('Failed to connect gateway');
        } finally {
            setConnecting(false);
        }
    };

    const stopGateway = async () => {
        try {
            await fetch(`${BACKEND_URL}/api/gateway/stop`, { method: 'POST' });
            fetchStatus();
        } catch {
            setError('Failed to stop gateway');
        }
    };

    const switchModel = async (id) => {
        setModelOpen(false);
        try {
            const r = await fetch(`${BACKEND_URL}/api/gateway/model`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: id }),
            });
            const d = await r.json();
            if (d.success) setGatewayStatus((p) => ({ ...p, model: id }));
        } catch {
            setError('Failed to switch model');
        }
    };

    const handleSend = () => {
        const text = inputText.trim();
        if (!text || !activeSessionId) return;

        const queueId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const userMsgId = `msg_user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        appendMessage(activeSessionId, {
            id: userMsgId,
            role: 'user',
            text,
            queueId,
            queueState: 'queued',
        });

        const currentSession = sessions.find((s) => s.id === activeSessionId);
        const currentCount = sessionMessageCount(activeSessionId);
        if (currentSession && currentCount === 0) {
            patchSession(activeSessionId, { title: titleFromText(text) });
        } else {
            patchSession(activeSessionId, {});
        }

        setPendingQueue((prev) => [
            ...prev,
            { id: queueId, sessionId: activeSessionId, text, userMsgId, createdAt: Date.now() },
        ]);

        setInputText('');
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const modelLabel = SUPPORTED_MODELS.find((m) => m.id === gatewayStatus.model)?.label || gatewayStatus.model;
    const hasMessages = activeMessages.length > 0;
    const activeArtifacts = artifacts.map((a) => a.name);
    const liveTaskBoundaries = sending ? (taskBoundaryBySession[activeSessionId] || []).slice(-8) : [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#111214', color: '#d4d4d4', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 13 }}>
            <style>{`
                @keyframes queueShine {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                .ai-chat-markdown p, .ai-chat-markdown li {
                    margin: 0 0 8px 0;
                    line-height: 1.6;
                }
                .ai-chat-markdown h1, .ai-chat-markdown h2, .ai-chat-markdown h3 {
                    margin: 10px 0 8px;
                    color: #f0f0f2;
                    font-size: 14px;
                }
                .ai-chat-markdown pre {
                    margin: 8px 0;
                    padding: 9px 10px;
                    border: 1px solid rgba(255,255,255,0.09);
                    border-radius: 7px;
                    background: #17181b;
                    overflow-x: auto;
                }
                .ai-chat-markdown code {
                    background: rgba(255,255,255,0.08);
                    border-radius: 4px;
                    padding: 1px 5px;
                }
                .ai-chat-markdown pre code {
                    background: transparent;
                    padding: 0;
                }
            `}</style>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#16171a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <Brain size={15} style={{ color: '#cfcfcf' }} />
                    <span style={{ fontWeight: 600, color: '#e5e5e5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sessions.find((s) => s.id === activeSessionId)?.title || 'Agent'}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        onClick={createNewChat}
                        title="New chat"
                        style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: '#1f2024', color: '#d4d4d4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                        <Plus size={14} />
                    </button>

                    {!gatewayStatus.active ? (
                        <button
                            onClick={startGateway}
                            disabled={connecting}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 6,
                                border: '1px solid rgba(255,255,255,0.12)', cursor: connecting ? 'wait' : 'pointer',
                                background: '#232429', color: '#d4d4d4', fontSize: 11, fontWeight: 600,
                            }}
                        >
                            {connecting ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <Wifi size={10} />}
                            Connect
                        </button>
                    ) : (
                        <button
                            onClick={stopGateway}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 6,
                                border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer',
                                background: '#1f2024', color: '#d4d4d4', fontSize: 11, fontWeight: 600,
                            }}
                        >
                            <WifiOff size={10} />
                            Disconnect
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div style={{ margin: '8px 12px 0', padding: '7px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d1d1', fontSize: 11 }}>
                    {error}
                </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {!hasMessages ? (
                    <>
                        <div style={{ padding: '6px 2px 2px', color: '#a1a1aa', fontSize: 12 }}>
                            {gatewayStatus.active ? 'Start a new chat or open previous history.' : 'Connect gateway and start a new chat.'}
                        </div>

                        {sortedHistory.length > 0 && (
                            <div style={{ marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b8b8b8', fontSize: 11, marginBottom: 8 }}>
                                    <MessageSquare size={12} />
                                    <span>History</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {sortedHistory.map((s) => {
                                        const active = s.id === activeSessionId;
                                        return (
                                            <button
                                                key={s.id}
                                                onClick={() => setActiveSessionId(s.id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                                                    width: '100%', border: '1px solid rgba(255,255,255,0.08)',
                                                    background: active ? '#24262b' : '#17181b', color: '#d4d4d4',
                                                    borderRadius: 8, padding: '8px 10px', textAlign: 'left', cursor: 'pointer',
                                                }}
                                            >
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                                                <span style={{ color: '#8d8d95', fontSize: 11, flexShrink: 0 }}>{prettyAge(s.updatedAt)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    activeMessages.map((msg) => (
                        <ChatMessage
                            key={msg.id}
                            msg={msg}
                            sessionId={activeSessionId}
                            artifactNames={activeArtifacts}
                            onOpenReference={openReference}
                            onOpenArtifact={openArtifactPage}
                        />
                    ))
                )}
                {liveTaskBoundaries.length > 0 && (
                    <TaskBoundaryFeed events={liveTaskBoundaries} />
                )}
                <div ref={feedEndRef} />
            </div>

            <div style={{ padding: '0 12px 14px' }}>
                <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.09)', background: '#1f2126', boxShadow: '0 2px 12px rgba(0,0,0,0.35)', overflow: 'visible' }}>
                    <textarea
                        ref={textareaRef}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Ask anything, @ to mention, / for workflows"
                        rows={1}
                        style={{
                            display: 'block', width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none',
                            padding: '11px 14px 6px', fontSize: 13, lineHeight: 1.6, color: '#d4d4d4', fontFamily: 'inherit',
                            overflowY: 'auto', maxHeight: 160, scrollbarWidth: 'none', msOverflowStyle: 'none',
                        }}
                        className="scrollbar-hide"
                    />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 10px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                                onClick={createNewChat}
                                style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5, border: 'none', background: 'none', cursor: 'pointer', color: '#9a9aa1' }}
                            >
                                <Plus size={14} />
                            </button>

                            {pendingQueue.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#9a9aa1', fontSize: 11 }}>
                                    <Clock3 size={11} />
                                    <span>{pendingQueue.length} waiting</span>
                                </div>
                            )}

                            <div style={{ position: 'relative' }} ref={modelRef}>
                                <button
                                    onClick={() => setModelOpen(!modelOpen)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 5, border: 'none', background: 'none', cursor: 'pointer', color: '#9a9aa1', fontSize: 11 }}
                                >
                                    <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{modelLabel}</span>
                                    <ChevronDown size={9} style={{ opacity: 0.7, transform: modelOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                </button>

                                {modelOpen && (
                                    <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 4, width: 200, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#1a1b1f', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 1000, overflow: 'hidden' }}>
                                        {SUPPORTED_MODELS.map((m) => {
                                            const selected = gatewayStatus.model === m.id;
                                            return (
                                                <button
                                                    key={m.id}
                                                    onClick={() => switchModel(m.id)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        width: '100%', padding: '8px 12px', border: 'none',
                                                        background: selected ? 'rgba(255,255,255,0.08)' : 'transparent',
                                                        color: '#d0d0d0', fontSize: 11, textAlign: 'left', cursor: 'pointer',
                                                    }}
                                                >
                                                    {m.label}
                                                    {selected && <Square size={8} fill="currentColor" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#9a9aa1' }}>
                                <Mic size={13} />
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={!inputText.trim()}
                                style={{
                                    width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6,
                                    border: '1px solid rgba(255,255,255,0.12)', cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                                    background: inputText.trim() ? '#d8d8d8' : 'rgba(255,255,255,0.07)', color: inputText.trim() ? '#111214' : '#6f6f77',
                                }}
                            >
                                {sending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={13} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ChatMessage({ msg, sessionId, artifactNames, onOpenReference, onOpenArtifact }) {
    const isUser = msg.role === 'user';
    const isError = msg.role === 'error';
    const extracted = splitThinkFromText(msg.text || '');
    const thinkingText = (msg.thought || extracted.thinkText || '').trim();
    const answerText = extracted.cleanedText || msg.text || '';
    const artifactLinks = (artifactNames || []).filter(Boolean);

    const toArtifactMarkdown = (text) => {
        let out = autoLinkCommonFiles(String(text || ''));
        for (const name of artifactLinks) {
            const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'g');
            out = out.replace(re, `[${name}](artifact://${encodeURIComponent(name)})`);
        }
        return out;
    };

    const renderMarkdown = (value) => {
        const content = toArtifactMarkdown(value);
        return (
            <ReactMarkdown
                components={{
                    a: ({ href, children }) => (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                onOpenReference({ href: href || '', label: nodeText(children), sessionId });
                            }}
                            style={{ border: 'none', background: 'none', padding: 0, margin: 0, color: '#7db3ff', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                            {children}
                        </button>
                    ),
                    code: ({ inline, className, children }) => {
                        const isInline = inline !== undefined ? inline : !className;
                        const text = nodeText(children).trim();
                        if (isInline && looksLikeFileRef(text)) {
                            return (
                                <button
                                    type="button"
                                    onClick={() => onOpenReference({ href: text, label: text, sessionId })}
                                    style={{ border: 'none', background: 'rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 5px', color: '#9ac6ff', cursor: 'pointer' }}
                                >
                                    {text}
                                </button>
                            );
                        }
                        return <code>{children}</code>;
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        );
    };

    if (isUser) {
        const queued = msg.queueState === 'queued';
        const processing = msg.queueState === 'processing';
        const failed = msg.queueState === 'failed';
        const waiting = queued || processing;

        return (
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                <div style={{
                    background: waiting
                        ? 'linear-gradient(110deg, #27292e 25%, #3a3e49 50%, #27292e 75%)'
                        : '#27292e',
                    backgroundSize: waiting ? '220% 100%' : 'auto',
                    animation: waiting ? 'queueShine 1.7s linear infinite' : 'none',
                    color: '#e5e5e5',
                    padding: '8px 12px',
                    borderRadius: '12px 12px 2px 12px',
                    maxWidth: '85%',
                    fontSize: 13,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    boxShadow: waiting ? '0 0 0 1px rgba(255,255,255,0.12) inset, 0 8px 24px rgba(0,0,0,0.2)' : 'none',
                }}>
                    {msg.text}
                    {(queued || processing || failed) && (
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#b4b4ba' }}>
                            {queued && <><Clock3 size={10} /><span>Waiting</span></>}
                            {processing && <><Clock3 size={10} /></>}
                            {failed && <><AlertTriangle size={10} /><span>Failed</span></>}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div style={{ width: '100%', maxWidth: '95%' }}>
                <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.08)', color: '#f5c2c2', fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <AlertTriangle size={12} />
                        <span style={{ fontWeight: 600 }}>AI Error</span>
                    </div>
                    {msg.text}
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: '95%' }}>
            {thinkingText && (
                <div style={{ padding: '8px 12px', borderLeft: '2px solid #3f3f46', color: '#a1a1aa', fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', marginLeft: 4, background: 'rgba(255,255,255,0.02)', borderRadius: '0 4px 4px 0' }}>
                    <div style={{ color: '#9a9aa1', fontSize: 11, marginBottom: 5 }}>
                        Thinking {msg.thoughtTime > 0 && !msg.streaming ? `(${Math.round(msg.thoughtTime / 1000)}s)` : ''}
                    </div>
                    <div className="ai-chat-markdown">
                        {renderMarkdown(thinkingText)}
                    </div>
                </div>
            )}

            {answerText && (
                <div style={{ color: '#d4d4d4', fontSize: 13, lineHeight: 1.6 }}>
                    <div className="ai-chat-markdown">
                        {renderMarkdown(answerText)}
                    </div>
                    {msg.streaming && <span style={{ display: 'inline-block', width: 4, height: 12, background: '#cfcfcf', marginLeft: 4, animation: 'pulse 1s infinite' }} />}
                </div>
            )}
            {Array.isArray(msg.artifacts) && msg.artifacts.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {msg.artifacts.map((a) => (
                        <div key={`${msg.id}-${a.name}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, maxWidth: 420 }}>
                            <span style={{ color: '#c8d2e1', fontSize: 12 }}>{a.name}</span>
                            <button
                                type="button"
                                onClick={() => onOpenArtifact(sessionId, a.name)}
                                style={{ border: '1px solid rgba(255,255,255,0.12)', background: '#232429', color: '#d4d4d4', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
                            >
                                Open
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function TaskBoundaryFeed({ events }) {
    const [openIndex, setOpenIndex] = useState(0);
    const toggle = (idx) => setOpenIndex((prev) => (prev === idx ? -1 : idx));
    const firstTs = events[0]?.ts || Date.now();

    return (
        <div style={{ width: '100%', maxWidth: '95%', marginTop: 2 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {events.map((evt, idx) => {
                    const opened = openIndex === idx;
                    const elapsedMs = Math.max(0, (evt.ts || Date.now()) - firstTs);
                    const elapsed = elapsedMs < 1000 ? '<1s' : `${Math.round(elapsedMs / 1000)}s`;
                    return (
                    <div key={`${evt.ts || Date.now()}-${idx}`} style={{ fontSize: 11, color: '#bfc3cb' }}>
                        <button
                            type="button"
                            onClick={() => toggle(idx)}
                            style={{ width: '100%', border: 'none', background: 'none', color: 'inherit', padding: 0, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left' }}
                        >
                            {opened ? <ChevronUp size={12} /> : <ChevronRight size={12} />}
                            <span style={{ color: '#9fa6b2', fontSize: 12 }}>{`Thought for ${elapsed}`}</span>
                        </button>
                        {opened && (
                            <div style={{ marginLeft: 20, marginTop: 4, fontSize: 12, lineHeight: 1.55 }}>
                                <div style={{ color: '#d6dce6', fontWeight: 600 }}>{evt.taskName}</div>
                                {evt.taskStatus && <div style={{ color: '#b8c2d2' }}>{evt.taskStatus}</div>}
                                {evt.taskSummary && <div style={{ color: '#9ba8bc', marginTop: 2 }}>{evt.taskSummary}</div>}
                            </div>
                        )}
                    </div>
                )})}
            </div>
        </div>
    );
}
