import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, File, Settings, Terminal, Sparkles, FolderPlus, FilePlus, Save, X, GitBranch, Play, Code, Eye, Columns, Layout, Monitor, Keyboard, Info, HelpCircle, RefreshCw, Zap, Folder, Type, AlignLeft, Hash, ToggleLeft, Palette, Command } from 'lucide-react';
import { cn } from '@/lib/utils';
import { registry } from '@/modules/core/ExtensionRegistry';

// Static commands list with more VS Code-like commands
const staticCommands = [
  // File commands
  { id: 'newFile', label: 'File: New File', icon: FilePlus, category: 'File', shortcut: 'Ctrl+N' },
  { id: 'newFolder', label: 'File: New Folder', icon: FolderPlus, category: 'File', shortcut: 'Ctrl+Shift+N' },
  { id: 'openFolder', label: 'File: Open Folder', icon: Folder, category: 'File', shortcut: 'Ctrl+K Ctrl+O' },
  { id: 'save', label: 'File: Save', icon: Save, category: 'File', shortcut: 'Ctrl+S' },
  { id: 'closeFolder', label: 'File: Close Folder', icon: X, category: 'File', shortcut: '' },

  // View commands
  { id: 'viewTerminal', label: 'View: Toggle Terminal', icon: Terminal, category: 'View', shortcut: 'Ctrl+`' },
  { id: 'viewExplorer', label: 'View: Show Explorer', icon: Folder, category: 'View', shortcut: 'Ctrl+Shift+E' },
  { id: 'viewSearch', label: 'View: Show Search', icon: Search, category: 'View', shortcut: 'Ctrl+Shift+F' },
  { id: 'viewGit', label: 'View: Show Source Control', icon: GitBranch, category: 'View', shortcut: 'Ctrl+Shift+G' },
  { id: 'viewDebug', label: 'View: Show Run and Debug', icon: Play, category: 'View', shortcut: 'Ctrl+Shift+D' },
  { id: 'viewExtensions', label: 'View: Show Extensions', icon: Sparkles, category: 'View', shortcut: 'Ctrl+Shift+X' },

  // Preferences commands
  { id: 'openSettings', label: 'Preferences: Open Settings', icon: Settings, category: 'Preferences', shortcut: 'Ctrl+,' },
  { id: 'openKeyboardShortcuts', label: 'Preferences: Open Keyboard Shortcuts', icon: Keyboard, category: 'Preferences', shortcut: 'Ctrl+K Ctrl+S' },

  // Help commands
  { id: 'showWelcome', label: 'Help: Welcome', icon: Info, category: 'Help', shortcut: '' },
  { id: 'showAbout', label: 'Help: About', icon: HelpCircle, category: 'Help', shortcut: '' },
  { id: 'showShortcuts', label: 'Help: Keyboard Shortcuts Reference', icon: Keyboard, category: 'Help', shortcut: '' },
  { id: 'showTips', label: 'Help: Tips and Tricks', icon: Zap, category: 'Help', shortcut: '' },

  // Developer commands
  { id: 'reloadWindow', label: 'Developer: Reload Window', icon: RefreshCw, category: 'Developer', shortcut: 'Ctrl+R' },
];

export default function CommandPalette({ isOpen, onClose, onAction, files = [], initialMode = 'command' }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [allCommands, setAllCommands] = useState(staticCommands);
  const [mode, setMode] = useState(initialMode);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Determine mode based on query prefix
  const currentMode = useMemo(() => {
    if (query.startsWith('>')) return 'command';
    if (query.startsWith('@')) return 'symbol';
    if (query.startsWith(':')) return 'line';
    return mode === 'command' ? 'command' : 'file';
  }, [query, mode]);

  // Get search query without prefix
  const searchQuery = useMemo(() => {
    if (query.startsWith('>') || query.startsWith('@') || query.startsWith(':')) {
      return query.slice(1).trim();
    }
    return query.trim();
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      const extCommandsMap = registry.getCommands();
      const extCommandsList = Array.from(extCommandsMap.keys()).map(cmdId => ({
        id: cmdId,
        label: `Ext: ${cmdId.replace('.', ': ')}`,
        icon: Sparkles,
        category: 'Extension',
        shortcut: ''
      }));
      setAllCommands([...staticCommands, ...extCommandsList]);

      if (initialMode === 'command') {
        setQuery('>');
        setMode('command');
      } else {
        setQuery('');
        setMode('file');
      }
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialMode]);

  // Filter commands based on mode and query
  const filteredItems = useMemo(() => {
    if (currentMode === 'command') {
      return allCommands.filter(cmd =>
        cmd.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else if (currentMode === 'file') {
      if (!files || files.length === 0) return [];
      return files.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (file.path && file.path.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 20);
    } else if (currentMode === 'line') {
      return [];
    }
    return [];
  }, [currentMode, searchQuery, allCommands, files]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex];
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Reset selection when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, currentMode]);

  const handleSelect = (item) => {
    if (currentMode === 'command') {
      if (registry.getCommands().has(item.id)) {
        registry.executeCommand(item.id);
      } else {
        onAction(item.id);
      }
    } else if (currentMode === 'file') {
      onAction('openFile', item);
    }
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(p => Math.min(p + 1, filteredItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(p => Math.max(p - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentMode === 'line') {
        const lineNum = parseInt(searchQuery, 10);
        if (!isNaN(lineNum) && lineNum > 0) {
          onAction('goToLine', lineNum);
          onClose();
        }
      } else if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Backspace' && query.length === 1 && (query === '>' || query === '@' || query === ':')) {
      e.preventDefault();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
  };

  if (!isOpen) return null;

  const getPlaceholder = () => {
    if (currentMode === 'command') return 'Type a command...';
    if (currentMode === 'file') return 'Search files by name (type > for commands)';
    if (currentMode === 'line') return 'Go to line number...';
    if (currentMode === 'symbol') return 'Go to symbol...';
    return 'Search...';
  };

  const getModeIndicator = () => {
    if (currentMode === 'command') return 'Commands';
    if (currentMode === 'file') return 'Files';
    if (currentMode === 'line') return 'Go to Line';
    if (currentMode === 'symbol') return 'Symbols';
    return '';
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-[12vh]">
      {/* Backdrop with subtle blur */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Main Command Palette Container - White Transparent Glass Effect */}
      <div
        className="relative w-full max-w-2xl overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -1px 0 rgba(255, 255, 255, 0.05)
          `,
        }}
      >
        {/* Top highlight edge for glass effect */}
        <div
          className="absolute top-0 left-4 right-4 h-[1px]"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
          }}
        />

        {/* Search Input Section */}
        <div
          className="relative flex items-center gap-3 px-4 py-3"
          style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Search Icon */}
          <Search size={18} className="text-white/50 flex-shrink-0" />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            className="flex-1 bg-transparent text-white text-sm font-normal outline-none placeholder-white/30"
            style={{
              caretColor: 'rgba(255, 255, 255, 0.7)',
            }}
            autoComplete="off"
            spellCheck="false"
          />

          {/* Mode indicator badge */}
          <span
            className="text-[11px] font-medium px-2.5 py-1 rounded-md"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {getModeIndicator()}
          </span>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[45vh] overflow-y-auto"
          style={{
            scrollbarWidth: 'thin',
          }}
        >
          {currentMode === 'line' ? (
            <div className="px-4 py-4">
              <div className="text-sm text-white/40 mb-3">Enter a line number and press Enter</div>
              {searchQuery && !isNaN(parseInt(searchQuery, 10)) && (
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Hash size={14} className="text-white/60" />
                  <span className="text-white/80 text-sm">Go to line {searchQuery}</span>
                </div>
              )}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="text-white/30 text-sm">
                {currentMode === 'command' ? 'No commands found' : 'No files found'}
              </div>
            </div>
          ) : (
            <div className="py-1">
              {filteredItems.map((item, idx) => (
                <div
                  key={currentMode === 'command' ? item.id : item.id || item.path || idx}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className="flex items-center gap-3 px-4 py-2 cursor-pointer transition-all duration-100 mx-1 rounded-md"
                  style={{
                    background: idx === selectedIndex
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'transparent',
                    borderLeft: idx === selectedIndex
                      ? '2px solid rgba(255, 255, 255, 0.4)'
                      : '2px solid transparent',
                  }}
                >
                  {currentMode === 'command' ? (
                    <>
                      <item.icon size={14} className="text-white/50 flex-shrink-0" />
                      <span className="flex-1 text-sm text-white/80">{item.label}</span>
                      {item.shortcut && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: 'rgba(255, 255, 255, 0.4)',
                          }}
                        >
                          {item.shortcut}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <File size={14} className="text-white/50 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white/80 truncate">{item.name}</div>
                        {item.path && (
                          <div className="text-xs text-white/30 truncate">{item.path}</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div
          className="flex items-center justify-center gap-5 px-4 py-2.5"
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(0, 0, 0, 0.1)',
          }}
        >
          <span className="text-[11px] text-white/30 flex items-center gap-1.5">
            <kbd
              className="px-1 py-0.5 rounded text-white/40 font-mono text-[10px]"
              style={{ background: 'rgba(255, 255, 255, 0.08)' }}
            >↑↓</kbd>
            Navigate
          </span>
          <span className="text-[11px] text-white/30 flex items-center gap-1.5">
            <kbd
              className="px-1 py-0.5 rounded text-white/40 font-mono text-[10px]"
              style={{ background: 'rgba(255, 255, 255, 0.08)' }}
            >↵</kbd>
            Select
          </span>
          <span className="text-[11px] text-white/30 flex items-center gap-1.5">
            <kbd
              className="px-1 py-0.5 rounded text-white/40 font-mono text-[10px]"
              style={{ background: 'rgba(255, 255, 255, 0.08)' }}
            >Esc</kbd>
            Close
          </span>
          {currentMode !== 'command' && (
            <span className="text-[11px] text-white/30 flex items-center gap-1.5">
              <kbd
                className="px-1 py-0.5 rounded text-white/40 font-mono text-[10px]"
                style={{ background: 'rgba(255, 255, 255, 0.08)' }}
              >&gt;</kbd>
              Commands
            </span>
          )}
        </div>

        {/* Bottom highlight edge */}
        <div
          className="absolute bottom-0 left-4 right-4 h-[1px]"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
          }}
        />
      </div>
    </div>
  );
}