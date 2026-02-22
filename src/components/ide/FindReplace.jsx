import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronUp, Replace, CaseSensitive, Regex, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FindReplace({ editor, onClose }) {
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [showReplace, setShowReplace] = useState(true); // Show replace by default
    const [matchCase, setMatchCase] = useState(false);
    const [wholeWord, setWholeWord] = useState(false);
    const [useRegex, setUseRegex] = useState(false);
    const [matchCount, setMatchCount] = useState({ current: 0, total: 0 });

    const findInputRef = useRef(null);
    const decorationIdsRef = useRef([]); // Track decoration IDs for cleanup

    useEffect(() => {
        // Focus find input on mount
        if (findInputRef.current) {
            findInputRef.current.focus();
            findInputRef.current.select();
        }

        // Get selected text if any
        if (editor) {
            const selection = editor.getSelection();
            const selectedText = editor.getModel()?.getValueInRange(selection);
            if (selectedText && !selectedText.includes('\n')) {
                setFindText(selectedText);
            }
        }

        // Cleanup decorations on unmount
        return () => {
            if (editor && decorationIdsRef.current.length > 0) {
                editor.deltaDecorations(decorationIdsRef.current, []);
                decorationIdsRef.current = [];
            }
        };
    }, [editor]);

    useEffect(() => {
        if (!editor || !findText) {
            // Clear decorations when search text is empty
            if (editor && decorationIdsRef.current.length > 0) {
                editor.deltaDecorations(decorationIdsRef.current, []);
                decorationIdsRef.current = [];
            }
            setMatchCount({ current: 0, total: 0 });
            return;
        }

        performFind();
    }, [findText, matchCase, wholeWord, useRegex, editor]);

    const performFind = () => {
        if (!editor || !findText) return;

        const model = editor.getModel();
        if (!model) return;

        const matches = model.findMatches(
            findText,
            true, // searchOnlyEditableRange
            useRegex,
            matchCase,
            wholeWord ? findText : null,
            true // captureMatches
        );

        setMatchCount({ current: matches.length > 0 ? 1 : 0, total: matches.length });

        // Add yellow highlight decorations for all matches
        const decorations = matches.map(match => ({
            range: match.range,
            options: {
                className: 'findMatch',
                inlineClassName: 'findMatchHighlight',
                overviewRuler: {
                    color: '#d18616',
                    position: 2
                },
                minimap: {
                    color: '#d18616',
                    position: 2
                }
            }
        }));

        // Clear old decorations and add new ones, storing the IDs
        decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, decorations);

        // Highlight first match
        if (matches.length > 0) {
            editor.setSelection(matches[0].range);
            editor.revealRangeInCenter(matches[0].range);
        }
    };

    const findNext = () => {
        if (!editor || !findText) return;

        editor.trigger('find-replace', 'actions.findNext', null);
    };

    const findPrevious = () => {
        if (!editor || !findText) return;

        editor.trigger('find-replace', 'actions.findPrevious', null);
    };

    const replaceNext = () => {
        if (!editor || !findText) return;

        const selection = editor.getSelection();
        const selectedText = editor.getModel()?.getValueInRange(selection);

        if (selectedText === findText || (useRegex && new RegExp(findText).test(selectedText))) {
            editor.executeEdits('replace', [{
                range: selection,
                text: replaceText
            }]);
            findNext();
        } else {
            findNext();
        }
    };

    const replaceAll = () => {
        if (!editor || !findText) return;

        const model = editor.getModel();
        if (!model) return;

        const matches = model.findMatches(
            findText,
            true,
            useRegex,
            matchCase,
            wholeWord ? findText : null,
            true
        );

        const edits = matches.map(match => ({
            range: match.range,
            text: replaceText
        }));

        editor.executeEdits('replace-all', edits);
        performFind();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'Enter') {
            if (e.shiftKey) {
                findPrevious();
            } else {
                findNext();
            }
        }
    };

    return (
        <div className="absolute top-0 right-0 z-50 m-4">
            <div className="glass-container rounded-xl shadow-2xl border border-white/20 backdrop-blur-xl">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <Search size={16} className="text-white/70" />
                        <span className="text-sm font-medium text-white/90">
                            {showReplace ? 'Find & Replace' : 'Find'}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        title="Close (Esc)"
                    >
                        <X size={16} className="text-white/70" />
                    </button>
                </div>

                {/* Find Input */}
                <div className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                        <input
                            ref={findInputRef}
                            type="text"
                            value={findText}
                            onChange={(e) => setFindText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Find"
                            className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#007acc] focus:ring-1 focus:ring-[#007acc]/50 transition-all text-sm"
                        />

                        {/* Match Counter */}
                        {findText && (
                            <span className="text-xs text-white/60 min-w-[50px] text-right">
                                {matchCount.total > 0 ? `${matchCount.current}/${matchCount.total}` : 'No results'}
                            </span>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={findPrevious}
                                disabled={!findText || matchCount.total === 0}
                                className="p-1.5 hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Previous Match (Shift+Enter)"
                            >
                                <ChevronUp size={14} className="text-white/70" />
                            </button>
                            <button
                                onClick={findNext}
                                disabled={!findText || matchCount.total === 0}
                                className="p-1.5 hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Next Match (Enter)"
                            >
                                <ChevronDown size={14} className="text-white/70" />
                            </button>
                        </div>

                        {/* Toggle Replace */}
                        <button
                            onClick={() => setShowReplace(!showReplace)}
                            className={cn(
                                "p-1.5 rounded transition-colors",
                                showReplace ? "bg-white/15 text-white" : "hover:bg-white/10 text-white/70"
                            )}
                            title="Toggle Replace"
                        >
                            <Replace size={14} />
                        </button>
                    </div>

                    {/* Options */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setMatchCase(!matchCase)}
                            className={cn(
                                "px-2 py-1 rounded text-xs font-medium transition-colors",
                                matchCase ? "bg-[#007acc] text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                            )}
                            title="Match Case"
                        >
                            <CaseSensitive size={14} />
                        </button>
                        <button
                            onClick={() => setWholeWord(!wholeWord)}
                            className={cn(
                                "px-2 py-1 rounded text-xs font-medium transition-colors",
                                wholeWord ? "bg-[#007acc] text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                            )}
                            title="Match Whole Word"
                        >
                            Ab|
                        </button>
                        <button
                            onClick={() => setUseRegex(!useRegex)}
                            className={cn(
                                "px-2 py-1 rounded text-xs font-medium transition-colors",
                                useRegex ? "bg-[#007acc] text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                            )}
                            title="Use Regular Expression"
                        >
                            <Regex size={14} />
                        </button>
                    </div>

                    {/* Replace Input */}
                    {showReplace && (
                        <>
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="text"
                                    value={replaceText}
                                    onChange={(e) => setReplaceText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Replace"
                                    className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#007acc] focus:ring-1 focus:ring-[#007acc]/50 transition-all text-sm"
                                />
                            </div>

                            {/* Replace Buttons */}
                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    onClick={replaceNext}
                                    disabled={!findText || matchCount.total === 0}
                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs font-medium text-white transition-colors"
                                >
                                    Replace
                                </button>
                                <button
                                    onClick={replaceAll}
                                    disabled={!findText || matchCount.total === 0}
                                    className="px-3 py-1.5 bg-[#007acc] hover:bg-[#0066b8] disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs font-medium text-white transition-colors"
                                >
                                    Replace All
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
