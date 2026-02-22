import React, { useState, useEffect, useRef } from 'react';
import {
    Brain, Loader2, ChevronDown, ChevronRight,
    Wifi, WifiOff, Eye, FileEdit, Terminal,
    Search, Play, Square, AlertTriangle, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { io } from 'socket.io-client';

// Supported Antigravity models
const SUPPORTED_MODELS = [
    { id: 'gemini-3-flash', label: 'Gemini 3 Flash' },
    { id: 'gemini-3-pro-high', label: 'Gemini 3.1 Pro (High)' },
    { id: 'gemini-3-pro-low', label: 'Gemini 3.1 Pro (Low)' },
    { id: 'claude-sonnet-4.6', label: 'Claude Sonnet 4.6' },
    { id: 'claude-opus-4.6', label: 'Claude Opus 4.6' },
    { id: 'gpt-oss-120b', label: 'GPT-OSS 120B' },
];

/**
 * AIActivityPanel — Minimal AI Gateway sidebar
 * Connect/Disconnect + Model Selection + Activity Log
 */
export default function AIActivityPanel() {
    const [gatewayStatus, setGatewayStatus] = useState({
        active: false, authenticated: false, model: 'gemini-3-flash'
    });
    const [activities, setActivities] = useState([]);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState('');
    const [socket, setSocket] = useState(null);
    const [modelOpen, setModelOpen] = useState(false);
    const modelRef = useRef(null);
    const activitiesEndRef = useRef(null);
    const BACKEND_URL = 'http://localhost:3001';

    // Mount: Fetch status + Connect Socket
    useEffect(() => {
        fetchStatus();
        const newSocket = io(BACKEND_URL);
        setSocket(newSocket);

        newSocket.on('gateway:status', (status) => setGatewayStatus(status));
        newSocket.on('gateway:activity', (activity) => {
            addActivity(activity.type, activity.message, activity.data);
        });
        newSocket.on('auth:status', (status) => {
            setGatewayStatus(prev => ({ ...prev, authenticated: status.authenticated }));
        });

        const interval = setInterval(fetchStatus, 10000);
        return () => { newSocket.disconnect(); clearInterval(interval); };
    }, []);

    // Auto-scroll activities
    useEffect(() => {
        activitiesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activities]);

    // Close model dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (modelRef.current && !modelRef.current.contains(e.target)) setModelOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/gateway/status`);
            const data = await res.json();
            setGatewayStatus(data);
        } catch { }
    };

    const startGateway = async () => {
        setConnecting(true);
        setError('');
        try {
            const workspacePath = localStorage.getItem('devstudio-last-project') || '';
            const res = await fetch(`${BACKEND_URL}/api/gateway/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspacePath })
            });
            const data = await res.json();
            if (data.success) {
                fetchStatus();
                addActivity('system', `Gateway started: @${data.bot?.username}`);
            } else {
                setError(data.error);
            }
        } catch (e) {
            setError('Failed to start gateway');
        } finally {
            setConnecting(false);
        }
    };

    const stopGateway = async () => {
        try {
            await fetch(`${BACKEND_URL}/api/gateway/stop`, { method: 'POST' });
            fetchStatus();
            addActivity('system', 'Gateway stopped');
        } catch {
            setError('Failed to stop gateway');
        }
    };

    const switchModel = async (modelId) => {
        setModelOpen(false);
        try {
            const res = await fetch(`${BACKEND_URL}/api/gateway/model`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: modelId })
            });
            const data = await res.json();
            if (data.success) {
                setGatewayStatus(prev => ({ ...prev, model: modelId }));
                addActivity('system', `Model switched to: ${modelId}`);
            }
        } catch {
            setError('Failed to switch model');
        }
    };

    const addActivity = (type, message, data = {}) => {
        setActivities(prev => [...prev.slice(-100), {
            id: Date.now(),
            type, message, data,
            timestamp: new Date()
        }]);
    };

    const getToolIcon = (toolName) => {
        if (!toolName) return Eye;
        const name = toolName.toLowerCase();
        if (name.includes('view') || name.includes('read') || name.includes('list')) return Eye;
        if (name.includes('write') || name.includes('replace') || name.includes('multi')) return FileEdit;
        if (name.includes('command') || name.includes('terminal')) return Terminal;
        if (name.includes('search') || name.includes('grep') || name.includes('find')) return Search;
        return Play;
    };

    const currentModelLabel = SUPPORTED_MODELS.find(m => m.id === gatewayStatus.model)?.label || gatewayStatus.model;

    return (
        <div className="h-full flex flex-col text-sm select-none">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Brain size={16} className="text-purple-400" />
                    <span className="font-semibold text-xs uppercase tracking-wider sp-text">AI Gateway</span>
                </div>
                <div className={cn(
                    "w-2 h-2 rounded-full",
                    gatewayStatus.active ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" : "bg-zinc-600"
                )} />
            </div>

            {/* Controls */}
            <div className="mx-3 my-2 space-y-2">
                {/* Connect / Disconnect Button */}
                {!gatewayStatus.active ? (
                    <button
                        onClick={startGateway}
                        disabled={connecting}
                        className={cn(
                            "w-full py-2 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-all",
                            connecting
                                ? "bg-zinc-700 text-zinc-400 cursor-wait"
                                : "bg-purple-600/80 hover:bg-purple-600 text-white"
                        )}
                    >
                        {connecting ? <Loader2 size={13} className="animate-spin" /> : <Wifi size={13} />}
                        {connecting ? 'Connecting...' : 'Connect'}
                    </button>
                ) : (
                    <button
                        onClick={stopGateway}
                        className="w-full py-2 rounded-md text-xs font-medium flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/20 transition-all"
                    >
                        <Square size={11} fill="currentColor" />
                        Disconnect
                    </button>
                )}

                {/* Model Selector */}
                <div className="relative" ref={modelRef}>
                    <button
                        onClick={() => setModelOpen(!modelOpen)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-white/[0.03] border border-white/5 text-xs text-zinc-300 hover:border-white/10 transition-colors"
                    >
                        <span className="truncate">{currentModelLabel}</span>
                        <ChevronDown size={12} className={cn("text-zinc-500 transition-transform", modelOpen && "rotate-180")} />
                    </button>

                    {modelOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 rounded-lg border border-white/10 bg-[#1e1e1e] shadow-xl z-50 overflow-hidden">
                            {SUPPORTED_MODELS.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => switchModel(m.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors",
                                        gatewayStatus.model === m.id
                                            ? "bg-purple-500/15 text-purple-300"
                                            : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                                    )}
                                >
                                    <span>{m.label}</span>
                                    {gatewayStatus.model === m.id && <Check size={12} className="text-purple-400" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="px-2 py-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] flex items-center gap-1.5">
                        <AlertTriangle size={12} />
                        {error}
                        <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-300 text-[10px]">x</button>
                    </div>
                )}
            </div>

            {/* Activity Log */}
            <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
                {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                        <Brain size={32} className="opacity-30" />
                        <span className="text-xs text-center">AI activity will appear here when the gateway is running</span>
                    </div>
                ) : (
                    activities.map(activity => (
                        <ActivityItem key={activity.id} activity={activity} getToolIcon={getToolIcon} />
                    ))
                )}
                <div ref={activitiesEndRef} />
            </div>
        </div>
    );
}

/**
 * Individual activity log item
 */
function ActivityItem({ activity, getToolIcon }) {
    const [expanded, setExpanded] = useState(false);
    const { type, message, data, timestamp } = activity;

    const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const typeConfig = {
        system: { color: 'text-blue-400', bg: 'bg-blue-500/10' },
        thinking: { color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
        tool_call: { color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
        tool_result: { color: 'text-green-400', bg: 'bg-green-500/10' },
        tool_error: { color: 'text-red-400', bg: 'bg-red-500/10' },
        response: { color: 'text-purple-400', bg: 'bg-purple-500/10' },
        warning: { color: 'text-orange-400', bg: 'bg-orange-500/10' },
        error: { color: 'text-red-400', bg: 'bg-red-500/10' },
    };

    const config = typeConfig[type] || typeConfig.system;
    const ToolIcon = data?.tool ? getToolIcon(data.tool) : Brain;

    return (
        <div className={cn("rounded px-2 py-1.5 text-xs transition-colors cursor-pointer hover:bg-white/5", config.bg)}>
            <div className="flex items-center gap-2" onClick={() => setExpanded(!expanded)}>
                <ToolIcon size={12} className={config.color} />
                <span className={cn("flex-1 truncate", config.color)}>
                    {message || data?.tool || data?.message || type}
                </span>
                <span className="text-[10px] text-zinc-600 flex-shrink-0">{time}</span>
                {data && Object.keys(data).length > 0 && (
                    expanded ? <ChevronDown size={10} className="text-zinc-600" /> : <ChevronRight size={10} className="text-zinc-600" />
                )}
            </div>
            {expanded && data && (
                <pre className="mt-1 text-[10px] text-zinc-500 overflow-x-auto whitespace-pre-wrap break-all pl-5">
                    {JSON.stringify(data, null, 2).slice(0, 500)}
                </pre>
            )}
        </div>
    );
}
