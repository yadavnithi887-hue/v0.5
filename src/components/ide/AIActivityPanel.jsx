import React, { useState, useEffect, useRef } from 'react';
import {
    Brain,
    ChevronLeft,
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
    Trash2,
    Search,
    FileText,
    ClipboardList,
    Edit,
    Terminal,
    BrainCircuit,
    XCircle,
    CheckCircle2,
    Info,
    Folder,
    Copy,
    ShieldCheck,
    ShieldX,
    ExternalLink,
    Image,
    AtSign,
    List,
    X,
    FolderOpen,
    Eye,
} from 'lucide-react';
import { io } from 'socket.io-client';
import ReactMarkdown from 'react-markdown';
import { getIconUrl } from '@/lib/fileIcons';
import { CachedFileIcon } from '@/components/ide/CachedFileIcon';

const SUPPORTED_MODELS = [
    { id: 'gemini-3-flash', label: 'Gemini 3 Flash' },
    { id: 'gemini-3.1-pro-high', label: 'Gemini 3.1 Pro (High)' },
    { id: 'gemini-3.1-pro-low', label: 'Gemini 3.1 Pro (Low)' },
    { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
    { id: 'gpt-oss-120b-medium', label: 'GPT-OSS 120B' },
    { id: 'zai-org/GLM-5-FP8', label: 'GLM-5 FP8 (Modal)' },
    { id: 'zai-org/GLM-5-Air', label: 'GLM-5 Air (Modal)' },
];

const INPUT_PLACEHOLDERS = [
    'Ask anything, @ to mention files, / for workflows',
    '@app.jsx explain this component quickly',
    '/fix resolve the current error from Problems panel',
    '/scaffold create a clean API route template',
];

const STORAGE_KEYS = {
    sessions: 'ide-chat-sessions-v1',
    activeSession: 'ide-chat-active-session-v1',
    messagesBySession: 'ide-chat-messages-by-session-v1',
};
const REQUEST_TIMEOUT_MS = 300000;

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
    if (code === 'AUTH_ERROR' || code === 'AUTH_REQUIRED') return 'Authentication issue with AI API.';
    if (code === 'RATE_LIMITED') return 'Rate limit reached. Please retry in a moment.';
    if (code === 'QUOTA_EXCEEDED') return 'Quota exceeded for current model/provider.';
    if (err?.status === 502) return 'Provider temporary issue (HTTP 502). Please retry.';
    return err?.error || 'AI request failed. Please retry.';
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
    const data = activity?.data || {};
    const tool = String(data?.tool || '').trim();
    const args = data?.args || {};
    const path = args.AbsolutePath || args.TargetFile || args.SearchPath || args.DirectoryPath || '';

    if (type === 'thinking') return 'thinking...';
    if (type === 'tool_call') {
        if (tool === 'view_file' && path) return `reading ${path}`;
        if ((tool === 'list_dir' || tool === 'find_by_name' || tool === 'grep_search') && path) return `${tool.replace('_', ' ')} ${path}`;
        return `calling ${tool || message || 'tool'}`;
    }
    if (type === 'tool_result') return message ? `result ${message}` : 'tool result';
    if (type === 'tool_warning') return message || 'tool warning';
    if (type === 'model_fallback') return message || 'model fallback';
    return message || type;
}

function pickPathFromArgs(args = {}) {
    return args.AbsolutePath || args.TargetFile || args.SearchPath || args.DirectoryPath || args.RootPath || '';
}

function shortPathLabel(rawPath = '') {
    const normalized = normalizeFileRef(rawPath).replace(/\\/g, '/');
    if (!normalized) return '';
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length <= 2) return normalized;
    return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

// Helper to calculate line diffs between two strings
function getLineDiffStats(targetStr, replacementStr) {
    if (!targetStr && !replacementStr) return { added: 0, removed: 0 };
    const tLines = (targetStr || '').split('\n');
    const rLines = (replacementStr || '').split('\n');
    // Simple line count diff since these are replacement chunks
    return {
        added: rLines.length,
        removed: tLines.length
    };
}

// Returns { action, detail, icon, lineRange, editStats, isFolder } for Antigravity-style activity rendering
function prettyToolAction(evt) {
    const type = evt?.type || '';
    const tool = String(evt?.data?.tool || '').trim();
    const args = evt?.data?.args || {};
    const path = pickPathFromArgs(args);
    const label = shortPathLabel(path);
    const query = args.Query || args.Pattern || '';

    // Extract line ranges if available
    let lineRange = '';
    if (args.StartLine && args.EndLine) {
        lineRange = `#L${args.StartLine}-${args.EndLine}`;
    } else if (args.StartLine) {
        lineRange = `#L${args.StartLine}`;
    }

    // Extract edit stats for file modifications
    let editStats = null;
    if (tool === 'replace_file_content' || tool === 'replace_text') {
        editStats = getLineDiffStats(args.TargetContent, args.ReplacementContent);
    } else if (tool === 'multi_replace_file_content') {
        const chunks = Array.isArray(args.ReplacementChunks) ? args.ReplacementChunks : [];
        let added = 0; let removed = 0;
        chunks.forEach(c => {
            const s = getLineDiffStats(c.TargetContent, c.ReplacementContent);
            added += s.added; removed += s.removed;
        });
        editStats = { added, removed };
    } else if (tool === 'write_file' || tool === 'write_to_file') {
        const lines = (args.CodeContent || args.content || '').split('\n').length;
        editStats = { added: lines, removed: 0 };
    }

    if (type === 'thinking') return { action: 'Thinking', detail: '', icon: 'think' };
    if (type === 'tool_result') return evt?.data?.success === false
        ? { action: 'Failed', detail: '', icon: 'error' }
        : { action: '', detail: '', icon: 'done' };
    if (type !== 'tool_call') return { action: formatActivityLine(evt), detail: '', icon: 'info' };

    if (tool === 'list_dir') return { action: 'Scanning', detail: label, icon: 'search', isFolder: true };
    if (tool === 'find_by_name') return { action: 'Searching', detail: query || label, icon: 'search', isFolder: true };
    if (tool === 'grep_search') return { action: 'Searched', detail: query, icon: 'search' };
    if (tool === 'view_file') return { action: 'Reading', detail: '', icon: 'read', lineRange };
    if (tool === 'view_file_outline') return { action: 'Analyzed', detail: '', icon: 'analyze', lineRange };
    if (tool === 'view_code_item') return { action: 'Analyzed', detail: '', icon: 'analyze', lineRange };
    if (tool === 'write_file' || tool === 'write_to_file') return { action: 'Writing', detail: '', icon: 'write', editStats };
    if (tool === 'replace_text' || tool === 'replace_file_content' || tool === 'multi_replace_file_content') return { action: 'Edited', detail: '', icon: 'edit', lineRange, editStats };
    if (tool === 'rename_path') return { action: 'Renamed', detail: '', icon: 'edit' };
    if (tool === 'delete_path') return { action: 'Deleted', detail: '', icon: 'delete' };
    if (tool === 'run_terminal_command' || tool === 'run_command') return { action: 'Running command', detail: '', icon: 'terminal' };
    if (tool === 'task_boundary') return { action: 'Planning', detail: '', icon: 'plan' };
    if (tool === 'read_agent_memory' || tool === 'read_user_profile') return { action: 'Reading memory', detail: '', icon: 'read' };
    if (tool === 'save_agent_memory' || tool === 'save_user_profile') return { action: 'Saving memory', detail: '', icon: 'write' };
    return { action: 'Processing', detail: '', icon: 'info' };
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

let globalPendingFileChanges = {};
let globalInputText = '';
let globalPendingConfirmations = [];

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
    const [inputText, setInputText] = useState(globalInputText);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [sending, setSending] = useState(false);
    const [artifacts, setArtifacts] = useState([]);
    const [activityBySession, setActivityBySession] = useState({});
    const [taskBoundaryBySession, setTaskBoundaryBySession] = useState({});
    const [showAllHistory, setShowAllHistory] = useState(false);
    const [pendingConfirmations, setPendingConfirmations] = useState(globalPendingConfirmations);
    const [pendingFileChanges, setPendingFileChanges] = useState(globalPendingFileChanges);

    useEffect(() => {
        globalPendingFileChanges = pendingFileChanges;
    }, [pendingFileChanges]);

    useEffect(() => {
        globalInputText = inputText;
    }, [inputText]);

    useEffect(() => {
        globalPendingConfirmations = pendingConfirmations;
    }, [pendingConfirmations]);

    const [terminalOutput, setTerminalOutput] = useState({});

    const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [mentionOpen, setMentionOpen] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [workspaceTree, setWorkspaceTree] = useState({ files: [], folders: [] });
    const [expandedMentionFolders, setExpandedMentionFolders] = useState(new Set());
    const [isDragOver, setIsDragOver] = useState(false);

    const attachmentMenuRef = useRef(null);
    const fileInputRef = useRef(null);
    const mentionRef = useRef(null);
    const socketRef = useRef(null);
    const modelRef = useRef(null);
    const feedEndRef = useRef(null);
    const textareaRef = useRef(null);
    const activeRequestRef = useRef(null);
    const streamingSessionRef = useRef('');
    const requestTimeoutRef = useRef(null);
    const BACKEND_URL = 'http://localhost:3001';
    const placeholderText = inputText ? INPUT_PLACEHOLDERS[0] : INPUT_PLACEHOLDERS[placeholderIndex];

    useEffect(() => {
        if (inputText) return undefined;
        const timer = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % INPUT_PLACEHOLDERS.length);
        }, 2400);
        return () => clearInterval(timer);
    }, [inputText]);

    const clearRequestTimeout = () => {
        if (requestTimeoutRef.current) {
            clearTimeout(requestTimeoutRef.current);
            requestTimeoutRef.current = null;
        }
    };

    const armRequestTimeout = () => {
        clearRequestTimeout();
        requestTimeoutRef.current = setTimeout(() => {
            const req = activeRequestRef.current;
            if (!req) return;

            updateMessage(req.sessionId, req.userMsgId, { queueState: 'failed' });
            if (req.assistantMsgId) {
                updateMessage(req.sessionId, req.assistantMsgId, { streaming: false });
            }
            appendMessage(req.sessionId, {
                id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                role: 'error',
                text: 'AI request timed out (no response). Queue has been released. You can retry.',
            });

            activeRequestRef.current = null;
            setSending(false);
            requestTimeoutRef.current = null;
        }, REQUEST_TIMEOUT_MS);
    };

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

    const appendActivityToAssistant = (sessionId, assistantId, entry) => {
        if (!sessionId || !assistantId || !entry) return;
        updateMessage(sessionId, assistantId, (old) => {
            const prevActivities = Array.isArray(old?.activities) ? old.activities : [];
            return {
                ...old,
                activities: [...prevActivities, entry],
            };
        });
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

    const recoverPendingResponseFromSession = async (sid, assistantMsgId) => {
        if (!sid || !assistantMsgId) return false;
        try {
            const r = await fetch(`${BACKEND_URL}/api/sessions/${encodeURIComponent(sid)}`);
            const session = await r.json();
            const list = Array.isArray(session?.messages) ? session.messages : [];
            for (let i = list.length - 1; i >= 0; i--) {
                const item = list[i];
                if (item?.role !== 'assistant') continue;
                const content = String(item?.content || '').trim();
                if (!content) continue;

                updateMessage(sid, assistantMsgId, (old) => {
                    if (!old) return old;
                    if (String(old.text || '').trim()) {
                        return { ...old, streaming: false };
                    }
                    return { ...old, text: content, streaming: false };
                });
                return true;
            }
            return false;
        } catch {
            return false;
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

    const deleteSession = (sessionId) => {
        if (!sessionId) return;
        setSessions((prev) => {
            const nextSessions = prev.filter((s) => s.id !== sessionId);
            if (nextSessions.length === 0) {
                const fresh = makeSession();
                setActiveSessionId(fresh.id);
                return [fresh];
            }
            if (activeSessionId === sessionId) {
                setActiveSessionId(nextSessions[0].id);
            }
            return nextSessions;
        });

        setMessagesBySession((prev) => {
            const next = { ...prev };
            delete next[sessionId];
            return next;
        });
        setActivityBySession((prev) => {
            const next = { ...prev };
            delete next[sessionId];
            return next;
        });
        setTaskBoundaryBySession((prev) => {
            const next = { ...prev };
            delete next[sessionId];
            return next;
        });
    };

    const clearAllHistory = () => {
        const keepSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
        const keepId = keepSession?.id || '';

        if (keepId) {
            const base = { ...keepSession, title: 'New Chat', updatedAt: nowIso() };
            setSessions([base]);
            setActiveSessionId(keepId);
            setMessagesBySession({ [keepId]: [] });
            setActivityBySession({ [keepId]: [] });
            setTaskBoundaryBySession({ [keepId]: [] });
        } else {
            const fresh = makeSession();
            setSessions([fresh]);
            setActiveSessionId(fresh.id);
            setMessagesBySession({});
            setActivityBySession({});
            setTaskBoundaryBySession({});
        }

        setShowAllHistory(false);
    };

    const clearCurrentChat = () => {
        if (!activeSessionId) return;
        setMessagesBySession((prev) => ({ ...prev, [activeSessionId]: [] }));
        setActivityBySession((prev) => ({ ...prev, [activeSessionId]: [] }));
        setTaskBoundaryBySession((prev) => ({ ...prev, [activeSessionId]: [] }));
        patchSession(activeSessionId, { title: 'New Chat' });
    };

    const sortedHistory = sessions
        .filter((s) => sessionMessageCount(s.id) > 0)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const visibleHistory = showAllHistory ? sortedHistory : sortedHistory.slice(0, 3);
    const hiddenHistoryCount = Math.max(0, sortedHistory.length - visibleHistory.length);

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
        const sock = io(BACKEND_URL, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 500,
            reconnectionDelayMax: 2500,
            timeout: 20000,
            query: { client: 'ai-activity-panel' },
        });
        socketRef.current = sock;

        sock.on('connect', async () => {
            setError('');
            fetchStatus();
            const req = activeRequestRef.current;
            if (!req?.sessionId || !req?.assistantMsgId) return;
            const recovered = await recoverPendingResponseFromSession(req.sessionId, req.assistantMsgId);
            if (recovered) {
                updateMessage(req.sessionId, req.userMsgId, { queueState: 'sent' });
                const items = await loadArtifacts(req.sessionId);
                attachArtifactsToLatestAssistant(req.sessionId, items, req.artifactBaseline || []);
                clearRequestTimeout();
                activeRequestRef.current = null;
                setSending(false);
            }
        });
        sock.on('disconnect', (reason) => {
            console.warn(`[SOCKET][ai-activity-panel] disconnected: ${reason}`);
            if (activeRequestRef.current) {
                setError('Connection lost. Reconnecting... stream will resume automatically.');
            }
        });

        sock.on('gateway:status', (s) => setGatewayStatus(s));
        sock.on('auth:status', (s) => setGatewayStatus((p) => ({ ...p, authenticated: s.authenticated })));
        sock.on('ai:activity', (evt) => {
            if (activeRequestRef.current) armRequestTimeout();
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
            const activeReq = activeRequestRef.current;
            if (activeReq?.sessionId === sid && activeReq?.assistantMsgId) {
                appendActivityToAssistant(sid, activeReq.assistantMsgId, {
                    type,
                    message,
                    ts: evt?.timestamp || Date.now(),
                    data: evt?.data || {},
                });

                // Track file changes for diff review
                if (type === 'tool_call') {
                    const info = prettyToolAction({ type, data: evt?.data });
                    if (info?.editStats && (info.icon === 'edit' || info.icon === 'write')) {
                        const file = pickPathFromArgs(evt?.data?.args || {});
                        if (file) {
                            setPendingFileChanges(prev => {
                                const map = { ...prev };
                                const old = map[file] || { filePath: file, added: 0, removed: 0, accepted: false };
                                map[file] = {
                                    ...old,
                                    added: old.added + (info.editStats.added || 0),
                                    removed: old.removed + (info.editStats.removed || 0)
                                };
                                return map;
                            });
                        }
                    }
                }
            }
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

        // ── File snapshots for safe Accept/Reject ──
        sock.on('ai:file-snapshot', (data) => {
            if (!data?.filePath) return;
            setPendingFileChanges(prev => {
                // Only save the first snapshot (the true original before any AI edits)
                if (prev[data.filePath]?.originalContent !== undefined) {
                    return prev;
                }
                const old = prev[data.filePath] || { filePath: data.filePath, added: 0, removed: 0, accepted: false };
                return {
                    ...prev,
                    [data.filePath]: {
                        ...old,
                        originalContent: data.originalContent,
                        isNewFile: data.isNewFile || false,
                        snapshotTs: data.timestamp || Date.now()
                    }
                };
            });
        });

        // ── Command confirmation requests ──
        sock.on('ai:request-confirmation', (data) => {
            if (!data?.confirmId) return;
            setPendingConfirmations((prev) => [
                ...prev.filter((c) => c.confirmId !== data.confirmId),
                {
                    confirmId: data.confirmId,
                    toolName: data.toolName || 'run_command',
                    command: data.command || '',
                    cwd: data.cwd || '',
                    fullCwd: data.fullCwd || '',
                    timestamp: data.timestamp || Date.now(),
                    status: 'pending', // pending | approved | rejected
                },
            ]);
        });

        // ── Live terminal output capture ──
        sock.on('terminal:ai-output', (data) => {
            if (!data?.commandId) return;
            const { commandId, event } = data;
            setTerminalOutput((prev) => {
                const existing = prev[commandId] || { output: '', command: data.command || '', cwd: data.cwd || '', exitCode: null, done: false };
                const updated = { ...existing };
                if (event === 'start') {
                    updated.command = data.command || updated.command;
                    updated.cwd = data.cwd || updated.cwd;
                }
                if (event === 'stdout' && data.data) {
                    updated.output += data.data;
                }
                if (event === 'stderr' && data.data) {
                    updated.output += data.data;
                }
                if (event === 'exit') {
                    updated.exitCode = data.exitCode;
                    updated.done = true;
                }
                if (event === 'error') {
                    updated.output += `\nError: ${data.error || 'Unknown error'}\n`;
                    updated.done = true;
                }
                return { ...prev, [commandId]: updated };
            });
        });

        // ── PTY Proxy: Run interactive commands in Electron ──
        sock.on('terminal:ai-request-pty', async (data) => {
            const { commandId, command, cwd } = data;
            if (!window.electronAPI) {
                sock.emit('terminal:pty-stream', { commandId, event: 'error', error: 'Electron API missing. Cannot spawn PTY.' });
                return;
            }

            try {
                // Initialize state
                sock.emit('terminal:pty-stream', { commandId, event: 'start', command, cwd });

                // Start the true PTY in Electron Main
                await window.electronAPI.executeAIPtyTerminal({ commandId, command, cwd });

                // Stream stdout/stderr back to the backend
                const unsubData = window.electronAPI.onAIPtyTerminalData(commandId, (ptyData) => {
                    sock.emit('terminal:pty-stream', { commandId, event: 'stdout', data: ptyData.data });
                });

                // Handle process exit
                const unsubExit = window.electronAPI.onAIPtyTerminalExit(commandId, (ptyExit) => {
                    sock.emit('terminal:pty-stream', { commandId, event: 'exit', exitCode: ptyExit.exitCode });
                    unsubData();
                    unsubExit();
                });
            } catch (err) {
                sock.emit('terminal:pty-stream', { commandId, event: 'error', error: err.message });
            }
        });

        sock.on('terminal:ai-kill-pty', (data) => {
            if (window.electronAPI && data?.commandId) {
                window.electronAPI.killAIPtyTerminal(data.commandId);
            }
        });

        sock.on('chat:stream', (data) => {
            if (activeRequestRef.current) armRequestTimeout();
            const targetSessionId = streamingSessionRef.current || activeSessionId;
            if (!targetSessionId) return;

            setMessagesBySession((prev) => {
                const list = [...(prev[targetSessionId] || [])];
                let msg = list.find((m) => m.id === data.id);
                const req = activeRequestRef.current;
                if (!msg && req?.sessionId === targetSessionId && req?.assistantMsgId) {
                    const pendingIdx = list.findIndex((m) => m.id === req.assistantMsgId);
                    if (pendingIdx !== -1) {
                        list[pendingIdx] = { ...list[pendingIdx], id: data.id };
                        req.assistantMsgId = data.id;
                        msg = list[pendingIdx];
                    }
                }
                if (!msg) {
                    msg = { id: data.id, role: 'assistant', text: '', thought: '', thoughtTime: 0, streaming: true, activities: [] };
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
            clearRequestTimeout();
            const req = activeRequestRef.current;
            if (req) {
                updateMessage(req.sessionId, req.userMsgId, { queueState: 'sent' });
                updateMessage(req.sessionId, req.assistantMsgId, { streaming: false });
                patchSession(req.sessionId, {});
                const items = await loadArtifacts(req.sessionId);
                attachArtifactsToLatestAssistant(req.sessionId, items, req.artifactBaseline || []);
            }
            activeRequestRef.current = null;
            setSending(false);
            setPendingConfirmations([]);
        });

        sock.on('ide:chat-error', (errPayload) => {
            clearRequestTimeout();
            const req = activeRequestRef.current;
            const sessionId = req?.sessionId || activeSessionId;

            if (req) updateMessage(req.sessionId, req.userMsgId, { queueState: 'failed' });

            if (sessionId) {
                if (req?.assistantMsgId) {
                    updateMessage(sessionId, req.assistantMsgId, { streaming: false });
                }
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
            setPendingConfirmations([]);
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
            if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(e.target)) setAttachmentMenuOpen(false);
            if (mentionRef.current && !mentionRef.current.contains(e.target) && !(textareaRef.current && textareaRef.current.contains(e.target))) { setMentionOpen(false); setMentionSearch(''); }
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
        const assistantMsgId = `msg_asst_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        appendMessage(next.sessionId, {
            id: assistantMsgId,
            role: 'assistant',
            text: '',
            thought: '',
            thoughtTime: 0,
            streaming: true,
            activities: [],
        });
        activeRequestRef.current.assistantMsgId = assistantMsgId;

        armRequestTimeout();

        socketRef.current.emit('ide:chat', {
            chatId: next.sessionId,
            message: next.text,
            attachments: next.attachments, // New property!
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

    const handleMediaClick = () => {
        setAttachmentMenuOpen(false);
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const base64 = evt.target.result;
            setMediaFiles(prev => [...prev, { name: file.name, dataUrl: base64 }]);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const removeMedia = (index) => {
        setMediaFiles(prev => prev.filter((_, i) => i !== index));
    };

    const loadWorkspaceTree = async () => {
        const rootPath = localStorage.getItem('devstudio-last-project');
        if (!rootPath || !window.electronAPI) return;
        try {
            const result = await window.electronAPI.openPath(rootPath);
            if (result) {
                setWorkspaceTree({ files: result.files || [], folders: result.folders || [] });
            }
        } catch { /* ignore */ }
    };

    const handleMentionClick = () => {
        setAttachmentMenuOpen(false);
        loadWorkspaceTree();
        setMentionOpen(true);
        setMentionSearch('');
        if (textareaRef.current) textareaRef.current.focus();
    };

    const handleWorkflowClick = () => {
        setAttachmentMenuOpen(false);
        setInputText(prev => prev + ' /');
        if (textareaRef.current) textareaRef.current.focus();
    };

    const handleMentionSelect = (item) => {
        const name = item.name || '';
        setInputText(prev => {
            const cleaned = prev.replace(/@[^\s]*$/, '');
            return (cleaned ? cleaned : '') + `@${name} `;
        });
        setMentionOpen(false);
        setMentionSearch('');
        if (textareaRef.current) textareaRef.current.focus();
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputText(val);
        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = val.slice(0, cursorPos);
        const atMatch = textBeforeCursor.match(/@([^\s]*)$/);
        if (atMatch) {
            if (!mentionOpen) {
                loadWorkspaceTree();
                setMentionOpen(true);
            }
            setMentionSearch(atMatch[1] || '');
        } else {
            if (mentionOpen) {
                setMentionOpen(false);
                setMentionSearch('');
            }
        }
    };

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
        const droppedFiles = e.dataTransfer.files;
        if (!droppedFiles || droppedFiles.length === 0) return;
        for (let i = 0; i < droppedFiles.length; i++) {
            const file = droppedFiles[i];
            if (!file.type.startsWith('image/')) continue;
            const reader = new FileReader();
            reader.onload = (evt) => { setMediaFiles(prev => [...prev, { name: file.name, dataUrl: evt.target.result }]); };
            reader.readAsDataURL(file);
        }
    };

    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (!file) continue;
                const reader = new FileReader();
                reader.onload = (evt) => { setMediaFiles(prev => [...prev, { name: file.name || `pasted-${Date.now()}.png`, dataUrl: evt.target.result }]); };
                reader.readAsDataURL(file);
            }
        }
    };

    const openImagePreview = (media, index) => {
        const allImages = mediaFiles.map(m => ({ name: m.name, dataUrl: m.dataUrl }));
        const startIdx = typeof index === 'number' ? index : allImages.findIndex(i => i.name === media.name && i.dataUrl === media.dataUrl);
        window.dispatchEvent(new CustomEvent('devstudio:open-ai-artifact', {
            detail: {
                sessionId: activeSessionId || 'image-preview',
                artifactName: media.name,
                content: `__IMAGE_PREVIEW__${JSON.stringify({ images: allImages, currentIndex: Math.max(0, startIdx) })}`,
            }
        }));
    };

    const handleMicToggle = () => {
        if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
            alert('Speech recognition is not supported in this browser.');
            return;
        }

        if (isRecording) {
            setIsRecording(false);
            return;
        }

        setIsRecording(true);
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInputText(prev => (prev ? prev + ' ' : '') + transcript);
        };

        recognition.onerror = () => {
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognition.start();
    };

    const handleSend = (overrideText = null) => {
        let text = (overrideText !== null && typeof overrideText === 'string' ? overrideText : inputText).trim();
        // Removed the inline appending of markdown `![name](dataUrl)`
        if (mediaFiles.length > 0 && !text) {
            text = '[Attached File]';
        }
        if (!text || !activeSessionId) return;

        const queueId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const userMsgId = `msg_user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        appendMessage(activeSessionId, {
            id: userMsgId,
            role: 'user',
            text,
            attachments: mediaFiles.length > 0 ? mediaFiles.map(m => ({ name: m.name, dataUrl: m.dataUrl })) : undefined,
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
            { id: queueId, sessionId: activeSessionId, text, attachments: mediaFiles.length > 0 ? mediaFiles.map(m => ({ name: m.name, dataUrl: m.dataUrl })) : undefined, userMsgId, createdAt: Date.now() },
        ]);

        setInputText('');
        setMediaFiles([]);
        setPendingFileChanges({});
    };

    const handleSendRef = useRef(handleSend);
    useEffect(() => {
        handleSendRef.current = handleSend;
    }, [handleSend]);

    useEffect(() => {
        const handleSendToAgent = (e) => {
            const data = e.detail;
            if (!data || !data.problems) return;

            let text = '';
            if (data.type === 'all') {
                text = `I have ${data.problems.length} problems in my workspace. Can you help me fix them?\n\n`;
            } else if (data.type === 'file') {
                text = `I have ${data.problems.length} problems in \`${data.file}\`. Can you help me fix them?\n\n`;
            }

            text += data.problems.map((p) => {
                const ln = p.line || 1;
                const col = p.column || 1;
                return `- **${p.file || p.filePath || 'Unknown'}** [Line ${ln}, Col ${col}]: ${p.message} (${p.code || ''})`;
            }).join('\n');

            // Set input and auto-send
            setInputText(text);

            setTimeout(() => {
                if (handleSendRef.current) handleSendRef.current(text);
                window.dispatchEvent(new Event('devstudio:open-ai-panel'));
            }, 100);
        };

        window.addEventListener('devstudio:send-to-agent', handleSendToAgent);
        return () => window.removeEventListener('devstudio:send-to-agent', handleSendToAgent);
    }, []);

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const modelLabel = SUPPORTED_MODELS.find((m) => m.id === gatewayStatus.model)?.label || gatewayStatus.model;
    const hasMessages = activeMessages.length > 0;
    const activeArtifacts = artifacts.map((a) => a.name);
    return (
        <div className="chat-panel-glass" style={{ display: 'flex', flexDirection: 'column', height: '100%', color: '#d4d4d4', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 13 }}>
            <style>{`
                @keyframes queueShine {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                @keyframes placeholderPulse {
                    0%, 100% { opacity: 0.55; letter-spacing: 0.01em; }
                    50% { opacity: 0.9; letter-spacing: 0.02em; }
                }
                .ai-input-animated::placeholder {
                    color: rgba(212, 212, 212, 0.55);
                    animation: placeholderPulse 2.2s ease-in-out infinite;
                }
                .ai-chat-markdown {
                    overflow-wrap: break-word;
                    word-break: break-word;
                    min-width: 0;
                    max-width: 100%;
                }
                .ai-chat-markdown p, .ai-chat-markdown li {
                    margin: 0 0 8px 0;
                    line-height: 1.6;
                    overflow-wrap: break-word;
                    word-break: break-word;
                }
                .ai-chat-markdown h1, .ai-chat-markdown h2, .ai-chat-markdown h3 {
                    margin: 10px 0 8px;
                    color: #f0f0f2;
                    font-size: 14px;
                    overflow-wrap: break-word;
                    word-break: break-word;
                }
                .ai-chat-markdown pre {
                    margin: 8px 0;
                    padding: 9px 10px;
                    border: 1px solid rgba(255,255,255,0.09);
                    border-radius: 7px;
                    background: #17181b;
                    overflow-x: auto;
                    max-width: 100%;
                    white-space: pre-wrap;
                    word-break: break-all;
                }
                .ai-chat-markdown code {
                    background: rgba(255,255,255,0.08);
                    border-radius: 4px;
                    padding: 1px 5px;
                    overflow-wrap: break-word;
                    word-break: break-all;
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
                        onClick={clearCurrentChat}
                        title="Clear current chat"
                        style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: '#1f2024', color: '#d4d4d4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                        <Trash2 size={13} />
                    </button>
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

            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, contain: 'layout style', willChange: 'scroll-position' }}>
                {!hasMessages ? (
                    <>
                        <div style={{ padding: '6px 2px 2px', color: '#a1a1aa', fontSize: 12 }}>
                            {gatewayStatus.active ? 'Start a new chat or open previous history.' : 'Connect gateway and start a new chat.'}
                        </div>

                        {sortedHistory.length > 0 && (
                            <div style={{ marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, color: '#b8b8b8', fontSize: 11, marginBottom: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <MessageSquare size={12} />
                                        <span>History</span>
                                    </div>
                                    <button
                                        onClick={clearAllHistory}
                                        style={{
                                            border: '1px solid rgba(255,255,255,0.12)',
                                            borderRadius: 6,
                                            background: '#1c1d21',
                                            color: '#b9b9c0',
                                            fontSize: 10,
                                            padding: '3px 7px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Clear all
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {visibleHistory.map((s) => {
                                        const active = s.id === activeSessionId;
                                        return (
                                            <div
                                                key={s.id}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                                                    width: '100%', border: '1px solid rgba(255,255,255,0.08)',
                                                    background: active ? '#24262b' : '#17181b', color: '#d4d4d4',
                                                    borderRadius: 8, padding: '8px 10px',
                                                }}
                                            >
                                                <button
                                                    onClick={() => setActiveSessionId(s.id)}
                                                    style={{
                                                        flex: 1,
                                                        minWidth: 0,
                                                        border: 'none',
                                                        background: 'transparent',
                                                        color: '#d4d4d4',
                                                        textAlign: 'left',
                                                        cursor: 'pointer',
                                                        padding: 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: 8,
                                                    }}
                                                >
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                                                    <span style={{ color: '#8d8d95', fontSize: 11, flexShrink: 0 }}>{prettyAge(s.updatedAt)}</span>
                                                </button>
                                                <button
                                                    onClick={() => deleteSession(s.id)}
                                                    title="Delete chat"
                                                    style={{
                                                        width: 22,
                                                        height: 22,
                                                        border: 'none',
                                                        borderRadius: 5,
                                                        background: 'rgba(255,255,255,0.04)',
                                                        color: '#9a9aa1',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                {sortedHistory.length > 3 && (
                                    <div style={{ marginTop: 8 }}>
                                        <button
                                            onClick={() => setShowAllHistory((v) => !v)}
                                            style={{
                                                border: '1px solid rgba(255,255,255,0.12)',
                                                borderRadius: 6,
                                                background: '#1c1d21',
                                                color: '#c0c0c8',
                                                fontSize: 11,
                                                padding: '4px 8px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {showAllHistory ? 'See less' : `... See more (${hiddenHistoryCount})`}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {activeMessages.map((msg) => (
                            <ChatMessage
                                key={msg.id}
                                msg={msg}
                                sessionId={activeSessionId}
                                artifactNames={activeArtifacts}
                                onOpenReference={openReference}
                                onOpenArtifact={openArtifactPage}
                                terminalOutput={terminalOutput}
                            />
                        ))}
                        {pendingConfirmations.filter((c) => c.status === 'pending').map((conf) => (
                            <CommandConfirmationBlock
                                key={conf.confirmId}
                                confirmation={conf}
                                socket={socketRef.current}
                                onRespond={(confirmId, approved) => {
                                    setPendingConfirmations((prev) =>
                                        prev.map((c) =>
                                            c.confirmId === confirmId
                                                ? { ...c, status: approved ? 'approved' : 'rejected' }
                                                : c
                                        )
                                    );
                                    if (socketRef.current) {
                                        socketRef.current.emit('ide:confirm-response', { confirmId, approved });
                                    }
                                }}
                            />
                        ))}
                    </>
                )}
                <div ref={feedEndRef} />
            </div>

            <DiffReviewBar
                pendingChanges={pendingFileChanges}
                onAcceptAll={() => {
                    setPendingFileChanges({});
                }}
                onRejectAll={async () => {
                    const entries = Object.values(pendingFileChanges);
                    if (entries.length === 0) return;
                    const api = window.electronAPI;
                    if (!api?.restoreSnapshot) {
                        console.error('[DiffReview] restoreSnapshot API not available');
                        setPendingFileChanges({});
                        return;
                    }
                    for (const entry of entries) {
                        try {
                            await api.restoreSnapshot(
                                entry.filePath,
                                entry.originalContent,
                                entry.isNewFile || false
                            );
                        } catch (err) {
                            console.error(`[DiffReview] Failed to restore ${entry.filePath}:`, err);
                        }
                    }
                    setPendingFileChanges({});
                }}
                onFileClick={(change) => {
                    // Dispatch event to Layout to open Monaco DiffEditor
                    window.dispatchEvent(new CustomEvent('devstudio:ai-diff-activate', {
                        detail: {
                            filePath: change.filePath,
                            originalContent: change.originalContent || '',
                            fileName: shortPathLabel(change.filePath)
                        }
                    }));
                }}
            />

            <div style={{ padding: '0 12px 14px', position: 'relative' }}>
                <div
                    style={{ borderRadius: 10, border: isDragOver ? '2px dashed rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.09)', background: isDragOver ? 'rgba(99,102,241,0.05)' : '#1f2126', boxShadow: '0 2px 12px rgba(0,0,0,0.35)', overflow: 'visible', transition: 'border 0.2s, background 0.2s', position: 'relative' }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {mediaFiles.length > 0 && (
                        <div style={{ padding: '8px 14px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {mediaFiles.map((m, i) => (
                                <div key={i} style={{ position: 'relative', width: 52, height: 52, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', transition: 'transform 0.15s' }}
                                    onClick={() => openImagePreview(m)}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <img src={m.dataUrl} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', opacity: 0, transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                        onMouseLeave={e => e.currentTarget.style.opacity = 0}
                                    >
                                        <Eye size={14} style={{ color: '#fff' }} />
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeMedia(i); }}
                                        style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', padding: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <textarea
                        ref={textareaRef}
                        value={inputText}
                        onChange={handleInputChange}
                        onKeyDown={handleKey}
                        onPaste={handlePaste}
                        placeholder={placeholderText}
                        rows={1}
                        style={{
                            display: 'block', width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none',
                            padding: '11px 14px 6px', fontSize: 13, lineHeight: 1.6, color: '#d4d4d4', fontFamily: 'inherit',
                            overflowY: 'auto', maxHeight: 160, scrollbarWidth: 'none', msOverflowStyle: 'none',
                        }}
                        className="scrollbar-hide ai-input-animated"
                    />

                    {/* @ Mention File Picker */}
                    {mentionOpen && (
                        <div ref={mentionRef} style={{ margin: '0 10px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#1a1b1f', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 1000, maxHeight: 220, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'thin' }}>
                            <MentionFilePicker
                                files={workspaceTree.files}
                                folders={workspaceTree.folders}
                                search={mentionSearch}
                                expandedFolders={expandedMentionFolders}
                                onToggleFolder={(folderPath) => setExpandedMentionFolders(prev => {
                                    const next = new Set(prev);
                                    next.has(folderPath) ? next.delete(folderPath) : next.add(folderPath);
                                    return next;
                                })}
                                onSelect={handleMentionSelect}
                            />
                        </div>
                    )}

                    {isDragOver && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(99,102,241,0.06)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, pointerEvents: 'none' }}>
                            <div style={{ color: '#a5b4fc', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Image size={14} /> Drop images here</div>
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 10px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ position: 'relative' }} ref={attachmentMenuRef}>
                                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
                                <button
                                    onClick={() => setAttachmentMenuOpen(!attachmentMenuOpen)}
                                    style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5, border: 'none', background: attachmentMenuOpen ? 'rgba(255,255,255,0.1)' : 'none', cursor: 'pointer', color: '#9a9aa1' }}
                                >
                                    <Plus size={14} style={{ transform: attachmentMenuOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
                                </button>

                                {attachmentMenuOpen && (
                                    <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 4, width: 140, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#1a1b1f', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 1000, overflow: 'hidden', padding: 4 }}>
                                        <button onClick={handleMediaClick} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px', borderRadius: 4, border: 'none', background: 'transparent', color: '#d0d0d0', fontSize: 11, cursor: 'pointer', textAlign: 'left' }}>
                                            <Image size={12} /> Media
                                        </button>
                                        <button onClick={handleMentionClick} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px', borderRadius: 4, border: 'none', background: 'transparent', color: '#d0d0d0', fontSize: 11, cursor: 'pointer', marginTop: 2, textAlign: 'left' }}>
                                            <AtSign size={12} /> @ Mentions
                                        </button>
                                        <button onClick={handleWorkflowClick} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px', borderRadius: 4, border: 'none', background: 'transparent', color: '#d0d0d0', fontSize: 11, cursor: 'pointer', marginTop: 2, textAlign: 'left' }}>
                                            <List size={12} /> Workflows
                                        </button>
                                    </div>
                                )}
                            </div>

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
                            <button
                                onClick={handleMicToggle}
                                style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: 'none', background: isRecording ? 'rgba(239, 68, 68, 0.2)' : 'none', cursor: 'pointer', color: isRecording ? '#ef4444' : '#9a9aa1' }}
                            >
                                <Mic size={13} style={{ animation: isRecording ? 'placeholderPulse 1.5s ease-in-out infinite' : 'none' }} />
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={(!inputText.trim() && mediaFiles.length === 0)}
                                style={{
                                    width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6,
                                    border: '1px solid rgba(255,255,255,0.12)', cursor: (inputText.trim() || mediaFiles.length > 0) ? 'pointer' : 'not-allowed',
                                    background: (inputText.trim() || mediaFiles.length > 0) ? '#d8d8d8' : 'rgba(255,255,255,0.07)', color: (inputText.trim() || mediaFiles.length > 0) ? '#111214' : '#6f6f77',
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

// ── @ Mention File Picker Component ──
function MentionFilePicker({ files, folders, search, expandedFolders, onToggleFolder, onSelect }) {
    const rootPath = localStorage.getItem('devstudio-last-project') || '';
    const rootName = rootPath.split('\\').pop()?.split('/').pop() || 'Workspace';
    const norm = (p) => String(p || '').replace(/\\/g, '/');
    const allFiles = Array.isArray(files) ? files : [];
    const allFolders = Array.isArray(folders) ? folders : [];

    const filterMatch = (name) => {
        if (!search) return true;
        return name.toLowerCase().includes(search.toLowerCase());
    };

    // Get direct child folders of a parent (by relative path)
    const getChildFolders = (parentRelPath) => {
        const pNorm = parentRelPath ? norm(parentRelPath) : '';
        return allFolders.filter(f => {
            const fp = norm(f.path || '');
            if (!pNorm) {
                return !fp.includes('/');
            }
            if (!fp.startsWith(pNorm + '/')) return false;
            const rest = fp.slice(pNorm.length + 1);
            return !rest.includes('/');
        });
    };

    // Get direct child files of a parent (using file.folder property)
    const getChildFiles = (parentRelPath) => {
        const pNorm = parentRelPath ? norm(parentRelPath) : '';
        return allFiles.filter(f => {
            const folder = norm(f.folder || '');
            if (!pNorm) return !folder || folder === '.';
            return folder === pNorm;
        });
    };

    const renderFolder = (folder, depth = 0) => {
        const relPath = norm(folder.path || '');
        const fKey = relPath || folder.name;
        const isExpanded = expandedFolders.has(fKey);
        const childFolders = getChildFolders(relPath);
        const childFiles = getChildFiles(relPath);
        const matchesSearch = filterMatch(folder.name);
        const hasMatchingFiles = childFiles.some(f => filterMatch(f.name));
        const hasMatchingSubFolders = childFolders.some(cf => filterMatch(cf.name));
        if (search && !matchesSearch && !hasMatchingFiles && !hasMatchingSubFolders) return null;

        return (
            <div key={fKey}>
                <div
                    style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '4px 8px', paddingLeft: 8 + depth * 14, cursor: 'pointer', fontSize: 11.5, color: '#c8ccd4', borderRadius: 4 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    <span onClick={(e) => { e.stopPropagation(); onToggleFolder(fKey); }} style={{ display: 'flex', alignItems: 'center', padding: '0 4px 0 0', cursor: 'pointer' }}>
                        <ChevronRight size={10} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', opacity: 0.5 }} />
                    </span>
                    <span
                        onClick={() => onSelect({ name: folder.name, path: fKey, realPath: folder.realPath || fKey, type: 'folder' })}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}
                    >
                        {isExpanded ? <FolderOpen size={13} style={{ color: '#f6c445', flexShrink: 0 }} /> : <Folder size={13} style={{ color: '#f6c445', flexShrink: 0 }} />}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</span>
                    </span>
                </div>
                {isExpanded && (
                    <div>
                        {childFolders.map(cf => renderFolder(cf, depth + 1))}
                        {childFiles.filter(f => filterMatch(f.name)).map(f => (
                            <div
                                key={f.realPath || f.id}
                                onClick={() => onSelect(f)}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', paddingLeft: 28 + depth * 14, cursor: 'pointer', fontSize: 11.5, color: '#b8bcc4', borderRadius: 4 }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <CachedFileIcon filename={f.name} size={14} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const topFolders = getChildFolders('');
    const topFiles = getChildFiles('');

    return (
        <div style={{ padding: '4px 0' }}>
            <div style={{ padding: '4px 10px 4px', fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Add context</div>
            <div
                style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '5px 8px', cursor: 'pointer', fontSize: 11.5, color: '#c8ccd4' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
                <span onClick={(e) => { e.stopPropagation(); onToggleFolder('__root__'); }} style={{ display: 'flex', alignItems: 'center', padding: '0 4px 0 0', cursor: 'pointer' }}>
                    <ChevronRight size={10} style={{ transform: expandedFolders.has('__root__') ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', opacity: 0.5 }} />
                </span>
                <span onClick={() => onToggleFolder('__root__')} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                    {expandedFolders.has('__root__') ? <FolderOpen size={13} style={{ color: '#f6c445', flexShrink: 0 }} /> : <Folder size={13} style={{ color: '#f6c445', flexShrink: 0 }} />}
                    <span style={{ fontWeight: 500 }}>{rootName}</span>
                    <span style={{ color: '#6b7280', marginLeft: 'auto', fontSize: 10 }}>..</span>
                </span>
            </div>
            {expandedFolders.has('__root__') && (
                <div>
                    {topFolders.map(f => renderFolder(f, 1))}
                    {topFiles.filter(f => filterMatch(f.name)).map(f => (
                        <div
                            key={f.realPath || f.id}
                            onClick={() => onSelect(f)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', paddingLeft: 28, cursor: 'pointer', fontSize: 11.5, color: '#b8bcc4', borderRadius: 4 }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <CachedFileIcon filename={f.name} size={14} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}


function RunCommandActivityBlock({ command, cwd, termData, toolResult }) {
    const [expanded, setExpanded] = useState(false);
    const outputRef = useRef(null);

    // Command output from live terminal data, or fallback to the static tool result output if available.
    const output = termData?.output || toolResult?.output || toolResult?.error || '';

    // Determine exit code and completion status from either live socket data or the finalized tool result object.
    const hasLiveDone = termData?.done || false;
    const hasResultDone = toolResult?.status === 'done' || toolResult?.status === 'error';
    const isDone = hasLiveDone || hasResultDone;

    const exitCode = termData?.exitCode ?? toolResult?.exitCode;

    // Auto-scroll output when streaming
    useEffect(() => {
        if (expanded && outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [output, expanded]);

    const handleOpenTerminal = (e) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('open-ai-terminal'));
    };

    return (
        <div style={{ width: '100%' }}>
            {/* Inline row — same style as other activity items */}
            <div
                style={{
                    fontSize: 12.5, color: '#c5cad4',
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '4px 2px', cursor: 'pointer',
                }}
                onClick={() => setExpanded((v) => !v)}
            >
                <span style={{ fontSize: 11, flexShrink: 0 }}>
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                <span style={{ fontSize: 11, flexShrink: 0, color: '#9ca3af' }}>
                    <Terminal size={14} />
                </span>
                <span style={{ fontWeight: 500, color: '#b0b8c8' }}>
                    {isDone ? 'Ran command' : 'Running command'}
                </span>
                {!isDone && <Loader2 size={11} style={{ animation: 'spin 1s linear infinite', color: '#8b92a1' }} />}
                {isDone && exitCode != null && (
                    <span style={{
                        fontSize: 10.5,
                        color: exitCode === 0 ? '#4ade80' : '#ef4444',
                        fontWeight: 500,
                    }}>
                        {exitCode === 0 ? '✓' : `✗ ${exitCode}`}
                    </span>
                )}
                <button
                    type="button"
                    onClick={handleOpenTerminal}
                    style={{
                        marginLeft: 'auto',
                        display: 'flex', alignItems: 'center', gap: 3,
                        border: 'none', background: 'none',
                        color: '#6b7280', fontSize: 10.5, cursor: 'pointer',
                        padding: '1px 3px',
                    }}
                >
                    Open <ExternalLink size={10} />
                </button>
            </div>

            {/* Expanded: command + output */}
            {expanded && (
                <div style={{
                    marginLeft: 26, marginTop: 2, marginBottom: 4,
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.07)',
                    background: '#111216',
                    overflow: 'hidden',
                }}>
                    {/* Command line */}
                    <div style={{
                        padding: '6px 10px',
                        fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
                        fontSize: 11.5, color: '#d4d4d4', lineHeight: 1.4,
                        borderBottom: output ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        overflowWrap: 'break-word', wordBreak: 'break-all',
                    }}>
                        {cwd && <span style={{ color: '#6b7280' }}>…{cwd} {'> '}</span>}
                        <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{command}</span>
                    </div>

                    {/* Terminal output */}
                    {output && (
                        <div
                            ref={outputRef}
                            style={{
                                maxHeight: 200,
                                overflowY: 'auto',
                                overflowX: 'hidden',
                            }}
                        >
                            <pre style={{
                                margin: 0,
                                padding: '6px 10px',
                                fontSize: 11,
                                lineHeight: 1.4,
                                color: '#a1a1aa',
                                fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
                                background: 'transparent',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                            }}>
                                {output}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function DiffReviewBar({ pendingChanges, onAcceptAll, onRejectAll, onFileClick }) {
    const changesArray = Object.values(pendingChanges);
    if (changesArray.length === 0) return null;

    const fileCount = changesArray.length;
    const [currentIndex, setCurrentIndex] = useState(0);
    const validIndex = Math.min(currentIndex, Math.max(0, fileCount - 1));
    const currentChange = changesArray[validIndex];

    const handleNext = () => setCurrentIndex(prev => (prev + 1) % fileCount);
    const handlePrev = () => setCurrentIndex(prev => (prev - 1 + fileCount) % fileCount);

    return (
        <div style={{ margin: '0 12px 14px', borderRadius: 8, border: '1px solid rgba(125,179,255,0.2)', background: 'rgba(125,179,255,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, minWidth: 40 }}>
                        {currentChange.added > 0 && <span style={{ color: '#4ade80' }}>+{currentChange.added}</span>}
                        {currentChange.removed > 0 && <span style={{ color: '#f87171' }}>-{currentChange.removed}</span>}
                        {(currentChange.added === 0 && currentChange.removed === 0) && <span style={{ color: '#9ca3af' }}>~0</span>}
                    </div>
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                        onClick={() => onFileClick && onFileClick(currentChange)}
                        title="Click to view diff in editor"
                    >
                        <span style={{ color: '#93c5fd', fontWeight: 500, textDecoration: 'underline', textDecorationColor: 'rgba(147,197,253,0.3)', textUnderlineOffset: 2 }}>{shortPathLabel(currentChange.filePath)}</span>
                        <span style={{ color: '#6b7280', fontSize: 11, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentChange.filePath}>{currentChange.filePath}</span>
                    </div>
                </div>
            </div>

            <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={handlePrev} disabled={fileCount <= 1} style={{ border: 'none', background: 'rgba(255,255,255,0.05)', color: fileCount > 1 ? '#d1d5db' : '#4b5563', cursor: fileCount > 1 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 4 }}><ChevronLeft size={13} /></button>
                        <button onClick={handleNext} disabled={fileCount <= 1} style={{ border: 'none', background: 'rgba(255,255,255,0.05)', color: fileCount > 1 ? '#d1d5db' : '#4b5563', cursor: fileCount > 1 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 4 }}><ChevronRight size={13} /></button>
                    </div>
                    <span style={{ color: '#a1a1aa', fontSize: 11, fontWeight: 500 }}>{fileCount} {fileCount === 1 ? 'File' : 'Files'} With Changes</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={onRejectAll} style={{ border: '1px solid rgba(248,113,113,0.3)', background: 'transparent', color: '#f87171', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '5px 12px', borderRadius: 5, transition: 'background 0.2s', ':hover': { background: 'rgba(248,113,113,0.1)' } }}>Reject all</button>
                    <button onClick={onAcceptAll} style={{ border: 'none', background: '#3b82f6', color: '#ffffff', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '6px 14px', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.2s', ':hover': { background: '#2563eb' } }}>Accept all <CheckCircle2 size={13} /></button>
                </div>
            </div>
        </div>
    );
}

function CommandConfirmationBlock({ confirmation, onRespond }) {
    const [copied, setCopied] = useState(false);
    const [responded, setResponded] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(confirmation.command).catch(() => { });
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const handleRespond = (approved) => {
        setResponded(true);
        onRespond(confirmation.confirmId, approved);
    };

    return (
        <div style={{ width: '100%', maxWidth: '95%' }}>
            <div style={{
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#1a1b1f',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    padding: '10px 14px 6px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#c8ccd4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                }}>
                    <Terminal size={13} style={{ color: '#9ca3af' }} />
                    Run command?
                </div>

                {/* Command block */}
                <div style={{
                    margin: '0 10px',
                    borderRadius: 8,
                    background: '#111216',
                    border: '1px solid rgba(255,255,255,0.07)',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                }}>
                    <div style={{
                        flex: 1,
                        minWidth: 0,
                        fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
                        fontSize: 12.5,
                        color: '#d4d4d4',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                    }}>
                        {confirmation.cwd && (
                            <span style={{ color: '#6b7280' }}>
                                …{confirmation.cwd} {'> '}
                            </span>
                        )}
                        <span style={{ color: '#e5e7eb', fontWeight: 600 }}>
                            {confirmation.command}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleCopy}
                        title={copied ? 'Copied!' : 'Copy command'}
                        style={{
                            width: 26, height: 26,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: 6,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.04)',
                            color: copied ? '#4ade80' : '#9ca3af',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'color 0.2s',
                        }}
                    >
                        {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                    </button>
                </div>

                {/* Footer: Ask every time + Buttons */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 14px 10px',
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 11, color: '#6b7280',
                    }}>
                        <span>Ask every time</span>
                        <ChevronUp size={10} style={{ opacity: 0.6 }} />
                    </div>

                    {!responded ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                                type="button"
                                onClick={() => handleRespond(false)}
                                style={{
                                    padding: '5px 14px',
                                    borderRadius: 6,
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: '#27292e',
                                    color: '#d4d4d4',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                            >
                                Reject
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRespond(true)}
                                style={{
                                    padding: '5px 14px',
                                    borderRadius: 6,
                                    border: '1px solid rgba(59,130,246,0.5)',
                                    background: '#2563eb',
                                    color: '#fff',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                            >
                                Run
                            </button>
                        </div>
                    ) : (
                        <div style={{
                            fontSize: 11, color: '#9ca3af',
                            display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                            <span>Waiting</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ChatMessage({ msg, sessionId, artifactNames, onOpenReference, onOpenArtifact, terminalOutput = {} }) {
    const isUser = msg.role === 'user';
    const isError = msg.role === 'error';
    const extracted = splitThinkFromText(msg.text || '');
    const thinkingText = (msg.thought || extracted.thinkText || '').trim();
    const answerText = extracted.cleanedText || msg.text || '';
    const artifactLinks = (artifactNames || []).filter(Boolean);
    const [thinkingOpen, setThinkingOpen] = useState(false);
    const [activityOpen, setActivityOpen] = useState(false);
    const msgActivities = Array.isArray(msg.activities) ? msg.activities : [];

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
                    a: ({ href, children }) => {
                        const label = nodeText(children).trim();
                        const hasFileIcon = looksLikeFileRef(label);
                        return (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onOpenReference({ href: href || '', label, sessionId });
                                }}
                                style={{
                                    border: 'none', background: 'rgba(255,255,255,0.06)',
                                    padding: '2px 7px', margin: '1px 2px',
                                    color: '#d4d8e0', cursor: 'pointer',
                                    borderRadius: '4px', display: 'inline-flex',
                                    alignItems: 'center', gap: '5px',
                                    textDecoration: 'none', fontSize: '12.5px',
                                    fontWeight: 600,
                                }}
                            >
                                {hasFileIcon && <CachedFileIcon filename={label} size={14} />}
                                {label}
                            </button>
                        )
                    },
                    code: ({ inline, className, children }) => {
                        const isInline = inline !== undefined ? inline : !className;
                        const text = nodeText(children).trim();
                        if (isInline && looksLikeFileRef(text)) {
                            return (
                                <button
                                    type="button"
                                    onClick={() => onOpenReference({ href: text, label: text, sessionId })}
                                    style={{
                                        border: 'none', background: 'rgba(255,255,255,0.06)',
                                        borderRadius: 4, padding: '2px 7px', margin: '1px 2px',
                                        color: '#d4d8e0', cursor: 'pointer',
                                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                                        fontSize: '12.5px', fontWeight: 600,
                                    }}
                                >
                                    <CachedFileIcon filename={text} size={14} />
                                    {text}
                                </button>
                            );
                        }
                        return <code>{children}</code>;
                    },
                }}
            >
                {content}
            </ReactMarkdown >
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
                    {msg.attachments && msg.attachments.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                            {msg.attachments.map((att, idx) => (
                                <div key={idx}
                                    onClick={() => {
                                        window.dispatchEvent(new CustomEvent('devstudio:open-ai-artifact', {
                                            detail: {
                                                sessionId: sessionId || 'image-preview',
                                                artifactName: att.name,
                                                content: `__IMAGE_PREVIEW__${JSON.stringify({ images: msg.attachments, currentIndex: idx })}`,
                                            }
                                        }));
                                    }}
                                    style={{ width: 60, height: 60, overflow: 'hidden', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#1a1a1a', flexShrink: 0, cursor: 'pointer' }}>
                                    {att.dataUrl && att.dataUrl.startsWith('data:image/') ? (
                                        <img src={att.dataUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="att" />
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: 10, color: '#aaa', padding: 4, textAlign: 'center', wordBreak: 'break-all' }}>{att.name}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: '95%', minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
            {thinkingText && (
                <div style={{ marginLeft: 4, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                    <button
                        type="button"
                        onClick={() => setThinkingOpen((v) => !v)}
                        style={{ width: '100%', border: 'none', background: 'transparent', color: '#b4b4bb', padding: '7px 10px', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    >
                        <span>
                            Thinking {msg.thoughtTime > 0 && !msg.streaming ? `(${Math.round(msg.thoughtTime / 1000)}s)` : ''}
                        </span>
                        {thinkingOpen ? <ChevronUp size={12} /> : <ChevronRight size={12} />}
                    </button>
                    {thinkingOpen && (
                        <div style={{ padding: '0 10px 9px', color: '#a1a1aa', fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            <div className="ai-chat-markdown">
                                {renderMarkdown(thinkingText)}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {msgActivities.length > 0 && (
                <div style={{
                    marginLeft: 2,
                    ...((msg.streaming || activityOpen) ? {
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(255,255,255,0.015)',
                        overflow: 'hidden',
                        marginTop: 4
                    } : {})
                }}>
                    {!msg.streaming && (
                        <button
                            type="button"
                            onClick={() => setActivityOpen((v) => !v)}
                            style={{
                                width: '100%', border: 'none', background: 'transparent',
                                color: '#aeb5c2', padding: (msg.streaming || activityOpen) ? '8px 10px 4px' : '4px 0',
                                fontSize: 11.5, display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                                gap: 6, cursor: 'pointer', fontWeight: 600
                            }}
                        >
                            {activityOpen ? <ChevronUp size={13} /> : <ChevronRight size={13} />}
                            <span>{`${msgActivities.length} actions completed`}</span>
                        </button>
                    )}
                    {(msg.streaming || activityOpen) && (
                        <div style={{
                            display: 'flex', flexDirection: 'column', gap: 0,
                            padding: (msg.streaming && !activityOpen) ? 0 : '4px 8px 8px 8px',
                            maxHeight: msg.streaming ? 'none' : '280px',
                            overflowY: msg.streaming ? 'visible' : 'auto'
                        }}>
                            {msgActivities.map((evt, idx) => {
                                const info = prettyToolAction(evt);
                                if (!info.action) return null;
                                const rawPath = pickPathFromArgs(evt?.data?.args || {});
                                const fileName = rawPath ? rawPath.replace(/\\/g, '/').split('/').pop() : '';
                                const query = evt?.data?.args?.Query || evt?.data?.args?.Pattern || '';
                                const resultCount = evt?.data?.resultCount;

                                // Action icon based on type
                                const actionIcons = {
                                    search: <Search size={14} />,
                                    read: <FileText size={14} />,
                                    analyze: <ClipboardList size={14} />,
                                    write: <Edit size={14} />,
                                    edit: <Edit size={14} />,
                                    delete: <Trash2 size={14} />,
                                    terminal: <Terminal size={14} />,
                                    plan: <ClipboardList size={14} />,
                                    think: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>,
                                    error: <XCircle size={14} />,
                                    done: <CheckCircle2 size={14} />,
                                    info: <Info size={14} />,
                                };
                                const actionIcon = actionIcons[info.icon] || <Info size={14} />;

                                const isTerminalAction = info.icon === 'terminal' && evt?.type === 'tool_call';
                                const commandId = evt?.data?.result?.commandId || null;
                                const termData = commandId ? terminalOutput[commandId] : null;

                                // For terminal commands, render a rich RunCommandBlock
                                if (isTerminalAction) {
                                    const cmdLine = evt?.data?.args?.CommandLine || '';
                                    const cmdCwd = evt?.data?.args?.Cwd || '';
                                    const shortCwd = cmdCwd ? cmdCwd.replace(/\\/g, '/').split('/').slice(-2).join('/') : '';
                                    const toolResult = evt?.data?.result;

                                    return (
                                        <RunCommandActivityBlock
                                            key={`${msg.id}-act-${idx}`}
                                            command={cmdLine}
                                            cwd={shortCwd}
                                            termData={termData}
                                            toolResult={toolResult}
                                        />
                                    );
                                }

                                return (
                                    <div key={`${msg.id}-act-${idx}`} style={{
                                        fontSize: 12.5, color: '#c5cad4',
                                        display: 'flex', alignItems: 'center', gap: 7,
                                        padding: '4px 2px', flexWrap: 'wrap', minWidth: 0,
                                    }}>
                                        <span style={{ fontSize: 11, flexShrink: 0 }}>{actionIcon}</span>
                                        <span style={{ fontWeight: 500, color: '#b0b8c8' }}>{info.action}</span>
                                        {fileName && !info.isFolder && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenReference({ href: rawPath, label: fileName, sessionId })}
                                                    style={{
                                                        border: 'none', background: 'rgba(255,255,255,0.06)',
                                                        borderRadius: 4, padding: '2px 7px',
                                                        color: '#d4d8e0', cursor: 'pointer',
                                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                                        fontSize: 12, fontWeight: 600,
                                                    }}
                                                >
                                                    {fileName && <CachedFileIcon filename={fileName} size={14} />}
                                                    {fileName}
                                                </button>
                                                {info.lineRange && (
                                                    <span style={{ color: '#6b7280', fontSize: 11, fontWeight: 500 }}>
                                                        {info.lineRange}
                                                    </span>
                                                )}
                                                {info.editStats && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 2, fontSize: 11, fontWeight: 600 }}>
                                                        {info.editStats.added > 0 && <span style={{ color: '#4ade80' }}>+{info.editStats.added}</span>}
                                                        {info.editStats.removed > 0 && <span style={{ color: '#f87171' }}>-{info.editStats.removed}</span>}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {fileName && info.isFolder && (
                                            <span
                                                style={{
                                                    background: 'transparent',
                                                    color: '#d4d8e0', padding: 0,
                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                    fontSize: 12, fontWeight: 600,
                                                }}
                                            >
                                                <Folder size={13} />
                                                {rawPath.split(/[\\/]/).pop() || fileName}
                                            </span>
                                        )}
                                        {info.detail && <span style={{ color: '#8c95a7', fontSize: 11.5 }}>{info.detail}</span>}
                                        {resultCount != null && <span style={{ color: '#7a8599', fontSize: 11 }}>{resultCount} results</span>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
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
            {msg.streaming && !thinkingText && !answerText && msgActivities.length === 0 && (
                <div style={{ color: '#a7adba', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Working...</span>
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
                    )
                })}
            </div>
        </div>
    );
}

function ActivityFeed({ events, onOpenReference, sessionId }) {
    const fileFromActivity = (evt) => {
        const args = evt?.data?.args || {};
        return args.AbsolutePath || args.TargetFile || args.SearchPath || args.DirectoryPath || '';
    };

    return (
        <div style={{ width: '100%', maxWidth: '95%', marginTop: 2 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {events.map((evt, idx) => {
                    const text = formatActivityLine(evt);
                    const rawFile = fileFromActivity(evt);
                    const filePath = normalizeFileRef(rawFile);
                    const fileName = filePath ? filePath.split(/[\\/]/).pop() : '';
                    const ts = evt?.ts ? new Date(evt.ts).toLocaleTimeString() : '';
                    return (
                        <div key={`${evt.ts || Date.now()}-${idx}`} style={{ fontSize: 11, color: '#aeb5c2', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ color: '#8790a1' }}>Thought for time</span>
                            <span>{text}</span>
                            {filePath && (
                                <button
                                    type="button"
                                    onClick={() => onOpenReference({ href: filePath, label: fileName || filePath, sessionId })}
                                    style={{ border: 'none', background: 'rgba(125,179,255,0.12)', color: '#8dbdff', borderRadius: 5, padding: '2px 6px', cursor: 'pointer', fontSize: 11 }}
                                >
                                    {fileName || filePath}
                                </button>
                            )}
                            {ts && <span style={{ color: '#707787' }}>{ts}</span>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
