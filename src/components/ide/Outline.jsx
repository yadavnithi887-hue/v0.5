import React, { useEffect, useState } from 'react';
import { List, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const SYMBOL_ICONS = {
    Function: '𝑓',
    Method: 'M',
    Class: 'C',
    Interface: 'I',
    Variable: 'V',
    Constant: 'K',
    Property: 'P',
    Enum: 'E',
    Module: 'mod',
    Constructor: '⚙',
    Field: 'F',
    Object: '{}',
    Array: '[]',
};

export default function Outline({ editor, currentFile }) {
    const [symbols, setSymbols] = useState([]);
    const [expandedKeys, setExpandedKeys] = useState(new Set());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!editor || !currentFile) {
            setSymbols([]);
            return;
        }

        extractSymbols();
    }, [editor, currentFile]);

    const extractSymbols = async () => {
        if (!window.monaco || !editor) return;

        setLoading(true);
        try {
            const model = editor.getModel();
            if (!model) return;

            // Get document symbols from Monaco
            const symbolsResult = await window.monaco.languages.getDocumentSymbols(model);

            if (symbolsResult && symbolsResult.length > 0) {
                setSymbols(symbolsResult);
                // Auto-expand first level
                const firstLevel = new Set(symbolsResult.map((_, i) => `root-${i}`));
                setExpandedKeys(firstLevel);
            } else {
                setSymbols([]);
            }
        } catch (err) {
            console.error('Failed to get outline:', err);
            setSymbols([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSymbolClick = (symbol) => {
        if (!editor) return;

        // Navigate to symbol location
        editor.setSelection(symbol.range);
        editor.revealRangeInCenter(symbol.range);
        editor.focus();
    };

    const toggleExpand = (key) => {
        const newExpanded = new Set(expandedKeys);
        if (newExpanded.has(key)) {
            newExpanded.delete(key);
        } else {
            newExpanded.add(key);
        }
        setExpandedKeys(newExpanded);
    };

    const renderSymbol = (symbol, parentKey = 'root', index = 0) => {
        const symbolKey = `${parentKey}-${index}`;
        const isExpanded = expandedKeys.has(symbolKey);
        const hasChildren = symbol.children && symbol.children.length > 0;
        const symbolKind = window.monaco?.languages.SymbolKind[symbol.kind] || 'Unknown';
        const icon = SYMBOL_ICONS[symbolKind] || '•';

        return (
            <div key={symbolKey}>
                <div
                    onClick={() => handleSymbolClick(symbol)}
                    className={cn(
                        "flex items-center gap-1 px-2 py-1 cursor-pointer text-xs",
                        "explorer-item-hover transition-colors"
                    )}
                    style={{ paddingLeft: `${(parentKey.split('-').length - 1) * 12 + 8}px` }}
                >
                    {/* Expand/Collapse Button */}
                    {hasChildren ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(symbolKey);
                            }}
                            className="flex-shrink-0 hover:bg-[#3c3c3c] rounded p-0.5"
                        >
                            {isExpanded ? (
                                <ChevronDown size={12} className="explorer-chevron" />
                            ) : (
                                <ChevronRight size={12} className="explorer-chevron" />
                            )}
                        </button>
                    ) : (
                        <div className="w-4" />
                    )}

                    {/* Symbol Icon */}
                    <span className="flex-shrink-0 w-4 text-center text-[10px] font-mono text-[#007acc]">
                        {icon}
                    </span>

                    {/* Symbol Name */}
                    <span className="flex-1 truncate explorer-text">
                        {symbol.name}
                    </span>
                </div>

                {/* Render Children */}
                {hasChildren && isExpanded && (
                    <div>
                        {symbol.children.map((child, idx) => renderSymbol(child, symbolKey, idx))}
                    </div>
                )}
            </div>
        );
    };

    if (!currentFile) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-[#888] p-4 text-center">
                <p className="text-xs">No symbols found in document '{currentFile || 'active editor'}'</p>
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

    if (symbols.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-[#888] p-4 text-center">
                <p className="text-xs opacity-70">
                    No symbols found in document '{currentFile?.split('/').pop() || 'active editor'}'
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col explorer-bg">
            {/* Symbols Tree */}
            <div className="flex-1 overflow-y-auto">
                {symbols.map((symbol, idx) => renderSymbol(symbol, 'root', idx))}
            </div>
        </div>
    );
}

