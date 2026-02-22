import React, { useEffect, useState } from 'react';
import { Clock, FileText, GitCommit, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatTimestamp(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`;
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

export default function Timeline({ currentFile, onCompareVersion }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const loadedFileRef = React.useRef(null);

    useEffect(() => {
        // Always reload if file changed or on mount
        if (!currentFile || !window.electronAPI) {
            setHistory([]);
            return;
        }

        // Force reload if file changed
        if (loadedFileRef.current !== currentFile) {
            loadedFileRef.current = currentFile;
            loadHistory();
        }
    }, [currentFile]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const result = await window.electronAPI.getFileHistory(currentFile);
            if (result.success) {
                setHistory(result.history || []);
            }
        } catch (err) {
            console.error('Failed to load timeline:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEntryClick = async (entry) => {
        if (onCompareVersion) {
            onCompareVersion(entry.id, entry.timestamp);
        }
    };

    if (!currentFile) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-[#888] p-4 text-center">
                <p className="text-xs">The active editor cannot provide timeline information.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center text-[#888]">
                <div className="animate-spin">⏳</div>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-[#888] p-4 text-center">
                <p className="text-xs opacity-70">
                    Local history will track recent changes as you save unless the file has been excluded or is too large. Source control has not been configured.
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col explorer-bg">
            {/* Current File Name with Refresh */}
            <div className="px-3 py-2 bg-[#2d2d2d] border-b border-[#3c3c3c] flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText size={12} className="text-icon-file flex-shrink-0" />
                    <span className="text-xs explorer-text truncate">{currentFile?.split('/').pop() || 'Unknown'}</span>
                </div>
                <button
                    onClick={loadHistory}
                    className="text-[#cccccc] hover:text-white transition-colors p-1"
                    title="Refresh Timeline"
                >
                    <Clock size={12} />
                </button>
            </div>

            {/* Timeline Entries */}
            <div className="flex-1 overflow-y-auto">
                {history.map((entry, idx) => {
                    const isExpanded = expandedId === entry.id;
                    const isWorkspaceEdit = entry.change_type === 'save';

                    return (
                        <div
                            key={entry.id}
                            className={cn(
                                "border-b border-[#2d2d2d] cursor-pointer transition-colors",
                                "hover:bg-[#2a2d2e]"
                            )}
                        >
                            <div
                                onClick={() => handleEntryClick(entry)}
                                className="px-3 py-2 flex items-start gap-2"
                            >
                                {/* Icon */}
                                <div className="flex-shrink-0 mt-0.5">
                                    {isWorkspaceEdit ? (
                                        <div className="w-4 h-4 rounded-full bg-[#007acc] flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                        </div>
                                    ) : (
                                        <GitCommit size={14} className="text-green-400" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs explorer-text">
                                        {isWorkspaceEdit ? 'Workspace Edit' : 'Git Commit'}
                                    </div>
                                    <div className="text-[10px] explorer-text-muted mt-0.5">
                                        {formatTimestamp(entry.timestamp)}
                                    </div>
                                </div>

                                {/* Expand Arrow */}
                                <ChevronRight
                                    size={12}
                                    className={cn(
                                        "explorer-icon transition-transform flex-shrink-0",
                                        isExpanded && "rotate-90"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedId(isExpanded ? null : entry.id);
                                    }}
                                />
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="px-3 pb-2 ml-6 text-[10px] explorer-text-muted">
                                    <div>ID: {entry.id}</div>
                                    <div>Type: {entry.change_type}</div>
                                    <div className="mt-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEntryClick(entry);
                                            }}
                                            className="text-[#007acc] hover:underline"
                                        >
                                            View Diff →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
