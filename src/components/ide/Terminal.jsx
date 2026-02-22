import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import { Unicode11Addon } from 'xterm-addon-unicode11';
import 'xterm/css/xterm.css';
import { ChevronUp, X, Minus, Plus, Trash2, Monitor, AlertCircle, AlertTriangle, ExternalLink, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { io as socketIO } from 'socket.io-client';

// --- Problems Tab (Enhanced) ---
const ProblemsTab = ({ problems, onNavigate }) => {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);

  const handleCopy = (prob, index, e) => {
    e.stopPropagation();
    // Copy full error with code block format
    const fullLog = `## ${prob.severity === 'Error' ? '❌ Error' : '⚠️ Warning'}: ${prob.message}

**File:** ${prob.file}
**Line:** ${prob.line}
**Source:** ${prob.source || 'Unknown'}

\`\`\`
${prob.file}:${prob.line}
${prob.message}
\`\`\``;

    navigator.clipboard.writeText(fullLog);
    setCopiedIndex(index);
    toast.success('Error copied to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopySimple = (prob, index, e) => {
    e.stopPropagation();
    const simpleCopy = `${prob.file}:${prob.line} - ${prob.message}`;
    navigator.clipboard.writeText(simpleCopy);
    setCopiedIndex(index);
    toast.success('Copied!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (problems.length === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-[#888] gap-2">
        <div className="text-4xl">✓</div>
        <div className="text-sm">No problems detected in workspace</div>
      </div>
    );
  }

  const errorCount = problems.filter(p => p.severity === 'Error').length;
  const warningCount = problems.filter(p => p.severity === 'Warning').length;

  return (
    <div className="h-full flex flex-col">
      {/* Summary Header */}
      <div className="flex items-center gap-4 px-3 py-2 bg-[#252526] border-b border-[#3c3c3c] text-xs">
        <div className="flex items-center gap-1">
          <AlertCircle size={12} className="text-red-400" />
          <span className="text-red-400">{errorCount} Errors</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle size={12} className="text-yellow-400" />
          <span className="text-yellow-400">{warningCount} Warnings</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => navigator.clipboard.writeText(problems.map(p => `[${p.severity}] ${p.file}:${p.line} - ${p.message}`).join('\n')).then(() => toast.success('All problems copied!'))}
          className="text-[#888] hover:text-white text-xs px-2 py-1 hover:bg-[#3c3c3c] rounded"
        >
          Copy All
        </button>
      </div>

      {/* Problems List */}
      <div className="flex-1 overflow-y-auto">
        {problems.map((prob, i) => (
          <div
            key={i}
            className={cn(
              "border-b border-[#2d2d2d] hover:bg-[#2a2d2e] transition-colors",
              expandedIndex === i && "bg-[#2a2d2e]"
            )}
          >
            {/* Problem Row */}
            <div
              onClick={() => onNavigate && onNavigate(prob.file, prob.line, prob.severity)}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer group"
            >
              {/* Severity Icon */}
              {prob.severity === 'Error' ? (
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
              ) : (
                <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0" />
              )}

              {/* Message */}
              <div className="flex-1 min-w-0">
                <span className="text-[#d4d4d4] text-sm truncate block">{prob.message}</span>
              </div>

              {/* Source Badge */}
              <span className="text-[10px] px-1.5 py-0.5 bg-[#3c3c3c] text-[#888] rounded flex-shrink-0">
                {prob.source || 'TS'}
              </span>

              {/* File Location */}
              <span className="text-[#6a9955] text-xs font-mono flex-shrink-0">
                {prob.file}:{prob.line}
              </span>

              {/* Copy Button */}
              <button
                onClick={(e) => handleCopySimple(prob, i, e)}
                className="opacity-0 group-hover:opacity-100 hover:bg-[#4a4a4a] p-1 rounded transition-opacity"
                title="Copy error"
              >
                {copiedIndex === i ? (
                  <span className="text-green-400 text-xs">✓</span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#888]">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>

              {/* Expand Button */}
              <button
                onClick={(e) => { e.stopPropagation(); setExpandedIndex(expandedIndex === i ? null : i); }}
                className="hover:bg-[#4a4a4a] p-1 rounded"
                title="Show details"
              >
                <ChevronUp size={12} className={cn("text-[#888] transition-transform", expandedIndex === i ? "rotate-180" : "")} />
              </button>
            </div>

            {/* Expanded Details */}
            {expandedIndex === i && (
              <div className="px-3 pb-3 bg-[#1e1e1e] mx-2 mb-2 rounded border border-[#3c3c3c]">
                <div className="text-xs text-[#888] mb-1 mt-2">Full Error:</div>
                <pre className="text-xs text-[#ce9178] bg-[#252526] p-2 rounded overflow-x-auto font-mono">
                  {`[${prob.severity}] ${prob.message}
  
  at ${prob.file}:${prob.line}
  Source: ${prob.source || 'TypeScript/JavaScript'}`}
                </pre>
                <button
                  onClick={(e) => handleCopy(prob, i, e)}
                  className="mt-2 text-xs bg-[#0e639c] hover:bg-[#1177bb] text-white px-3 py-1 rounded flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy with Markdown
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Single Terminal Instance ---
const TerminalInstance = ({ id, active, onData, settings = {} }) => {
  const terminalRef = useRef(null);
  const fitAddonRef = useRef(null);
  const termInstance = useRef(null);

  const safeFit = () => {
    try {
      if (terminalRef.current && terminalRef.current.offsetParent !== null && fitAddonRef.current) {
        // 🔥 Ensure dimensions are valid before fitting
        const dims = fitAddonRef.current.proposeDimensions();
        if (!dims || isNaN(dims.cols) || isNaN(dims.rows)) return;

        fitAddonRef.current.fit();
        if (window.electronAPI && termInstance.current?.cols) {
          window.electronAPI.resizeTerminal(id, { cols: termInstance.current.cols, rows: termInstance.current.rows });
        }
      }
    } catch (e) { }
  };

  useEffect(() => {
    if (!window.electronAPI) return;

    const term = new XTerminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#00ff00',
        cursorAccent: '#000000',
        selection: '#264f78',
        black: '#000000',
        red: '#f14c4c',
        green: '#23d18b',
        yellow: '#f5f543',
        blue: '#3b8eea',
        magenta: '#d670d6',
        cyan: '#29b8db',
        white: '#e5e5e5'
      },
      fontFamily: settings.terminalFontFamily || "'Fira Code', Consolas, 'Courier New', monospace",
      fontSize: settings.terminalFontSize || 14,
      cursorBlink: settings.terminalCursorBlinking !== false,
      cursorStyle: settings.terminalCursorStyle || 'block',
      cursorWidth: 2,
      scrollback: settings.terminalScrollback || 1000,
      convertEol: true,
      allowProposedApi: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(terminalRef.current);
    fitAddonRef.current = fitAddon;
    termInstance.current = term;

    // Initial Fit with Delay
    requestAnimationFrame(() => setTimeout(safeFit, 100));

    // Data Listeners
    const disposable = term.onData(data => window.electronAPI.writeTerminal(id, data));

    // Resize Observer with Safe Fit
    const ro = new ResizeObserver(() => {
      window.requestAnimationFrame(safeFit);
    });
    if (terminalRef.current) ro.observe(terminalRef.current);

    onData(id, term);

    // Key Handlers
    term.attachCustomKeyEventHandler((e) => {
      if (e.ctrlKey && e.code === "KeyV" && e.type === "keydown") { navigator.clipboard.readText().then(t => window.electronAPI.writeTerminal(id, t)); return false; }
      if (e.ctrlKey && e.code === "KeyC" && term.hasSelection()) return false;
      return true;
    });

    const handleRightClick = async (e) => { e.preventDefault(); const t = await navigator.clipboard.readText(); if (t) window.electronAPI.writeTerminal(id, t); };
    terminalRef.current.addEventListener('contextmenu', handleRightClick);

    return () => {
      disposable.dispose();
      ro.disconnect();
      term.dispose();
      if (terminalRef.current) terminalRef.current.removeEventListener('contextmenu', handleRightClick);
    };
  }, []);

  // Re-fit when tab becomes active
  useEffect(() => {
    if (active) {
      // Thoda wait karo taki display:none se display:block ho jaye
      setTimeout(safeFit, 100);
    }
  }, [active]);

  return <div className={cn("w-full h-full p-1 pl-3 pb-2", active ? "block" : "hidden")} ref={terminalRef} />;
};

// --- AI Terminal Instance (interactive, streams from backend socket) ---
const AITerminalInstance = ({ id, active, data, socket, activeCommandId }) => {
  const terminalRef = useRef(null);
  const fitAddonRef = useRef(null);
  const termInstance = useRef(null);

  const safeFit = () => {
    try {
      if (terminalRef.current && terminalRef.current.offsetParent !== null && fitAddonRef.current) {
        const dims = fitAddonRef.current.proposeDimensions();
        if (!dims || isNaN(dims.cols) || isNaN(dims.rows)) return;
        fitAddonRef.current.fit();
      }
    } catch (e) { }
  };

  useEffect(() => {
    const term = new XTerminal({
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        cursorAccent: '#0d1117',
        selection: '#264f78',
        black: '#0d1117',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39d353',
        white: '#c9d1d9'
      },
      fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
      fontSize: 13,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
      convertEol: true,
      allowProposedApi: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(terminalRef.current);
    fitAddonRef.current = fitAddon;
    termInstance.current = term;

    // Write header
    term.writeln('\x1b[1;35mAI Terminal\x1b[0m - Commands executed by the AI agent');
    term.writeln('\x1b[90mYou can type here to interact with running commands\x1b[0m');
    term.writeln('\x1b[90m' + '\u2500'.repeat(60) + '\x1b[0m');
    term.writeln('');

    // User input handler — send to backend command stdin
    const disposable = term.onData((inputData) => {
      if (socket && activeCommandId) {
        socket.emit('terminal:ai-input', { commandId: activeCommandId, data: inputData });
      }
    });

    // Paste support
    term.attachCustomKeyEventHandler((e) => {
      if (e.ctrlKey && e.code === 'KeyV' && e.type === 'keydown') {
        navigator.clipboard.readText().then(t => {
          if (socket && activeCommandId) {
            socket.emit('terminal:ai-input', { commandId: activeCommandId, data: t });
          }
        });
        return false;
      }
      return true;
    });

    requestAnimationFrame(() => setTimeout(safeFit, 100));

    const ro = new ResizeObserver(() => window.requestAnimationFrame(safeFit));
    if (terminalRef.current) ro.observe(terminalRef.current);

    return () => {
      disposable.dispose();
      ro.disconnect();
      term.dispose();
    };
  }, []);

  // Write incoming AI terminal data
  useEffect(() => {
    if (!data || !termInstance.current) return;
    const term = termInstance.current;

    if (data.event === 'start') {
      term.writeln(`\x1b[1;36m$ ${data.command}\x1b[0m`);
      term.writeln(`\x1b[90m  cwd: ${data.cwd}\x1b[0m`);
    } else if (data.event === 'stdout') {
      term.write(data.data);
    } else if (data.event === 'stderr') {
      term.write(`\x1b[31m${data.data}\x1b[0m`);
    } else if (data.event === 'exit') {
      const color = data.exitCode === 0 ? '32' : '31';
      const label = data.exitCode === 0 ? 'Done' : 'Failed';
      term.writeln(`\n\x1b[${color}m[${label}] Process exited with code ${data.exitCode}\x1b[0m`);
      term.writeln('\x1b[90m' + '\u2500'.repeat(60) + '\x1b[0m\n');
    } else if (data.event === 'error') {
      term.writeln(`\x1b[1;31m[Error] ${data.error}\x1b[0m`);
    }
  }, [data]);

  useEffect(() => {
    if (active) setTimeout(safeFit, 100);
  }, [active]);

  return <div className={cn("w-full h-full p-1 pl-3 pb-2", active ? "block" : "hidden")} ref={terminalRef} />;
};

// --- Main Terminal Manager ---
export default function Terminal({ isOpen, onToggle, onMaximize, isMaximized, problems = [], outputLogs = [], onNavigateProblem, rootPath, settings = {} }) {
  const [activeTab, setActiveTab] = useState('terminal');
  const [terminals, setTerminals] = useState([]);
  const [activeTermId, setActiveTermId] = useState(null);
  const termRefs = useRef({});

  // AI Terminal state
  const [aiTerminals, setAiTerminals] = useState([]);
  const [latestAiData, setLatestAiData] = useState(null);
  const [activeAiCommandId, setActiveAiCommandId] = useState(null);
  const aiSocketRef = useRef(null);
  const aiTerminalCountRef = useRef(0);

  // 🔥 DETECT URL & SHOW BUTTON
  const checkForUrl = (text) => {
    // Regex to find Localhost URLs
    const urlRegex = /(http:\/\/localhost:\d+|http:\/\/127\.0\.0\.1:\d+)/g;
    const match = text.match(urlRegex);

    if (match) {
      const url = match[0];
      toast.success(`Server running at ${url}`, {
        duration: 10000, // 10 seconds
        action: {
          label: 'Open',
          onClick: () => {
            require('electron').shell.openExternal(url); // Electron shell use karein
          }
        },
        icon: <ExternalLink size={16} className="text-green-400" />
      });
    }
  };

  // 🔥 SMART PROCESS DETECTION - Update terminal name based on running process
  const detectProcess = (text, termId) => {
    const processPatterns = [
      { pattern: /vite|VITE/i, name: 'Vite Dev Server', icon: '⚡' },
      { pattern: /webpack/i, name: 'Webpack', icon: '📦' },
      { pattern: /next dev|Next\.js/i, name: 'Next.js', icon: '▲' },
      { pattern: /react-scripts/i, name: 'React App', icon: '⚛️' },
      { pattern: /nodemon/i, name: 'Nodemon', icon: '🔄' },
      { pattern: /node\s+\w+\.js|node\s+\./i, name: 'Node.js', icon: '🟢' },
      { pattern: /npm run dev|npm start/i, name: 'npm Dev', icon: '📦' },
      { pattern: /python\s+|python3\s+/i, name: 'Python', icon: '🐍' },
      { pattern: /live-server|Serving/i, name: 'Live Server', icon: '🌐' },
      { pattern: /esbuild/i, name: 'esbuild', icon: '⚡' },
      { pattern: /tsc|typescript/i, name: 'TypeScript', icon: '🔷' },
    ];

    for (const { pattern, name, icon } of processPatterns) {
      if (pattern.test(text)) {
        setTerminals(prev => prev.map(t =>
          t.id === termId ? { ...t, name: `${icon} ${name}`, detectedProcess: name } : t
        ));
        break;
      }
    }
  };

  // 🔥 SINGLE useEffect to open terminal ONLY ONCE when panel opens
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only create terminal if:
    // 1. Panel is open
    // 2. We haven't initialized yet
    // 3. No terminals exist
    if (isOpen && !hasInitialized.current && terminals.length === 0) {
      hasInitialized.current = true;
      addTerminal(rootPath);
    }

    // Reset when panel closes
    if (!isOpen) {
      hasInitialized.current = false;
    }
  }, [isOpen, rootPath]);

  useEffect(() => {
    if (!window.electronAPI) return;
    const removeListener = window.electronAPI.onTerminalData((id, data) => {
      // Write to xterm
      if (termRefs.current[id]) {
        termRefs.current[id].write(data);
      }
      // Check for URLs
      checkForUrl(data);
      // 🔥 Detect running process
      detectProcess(data, id);
    });
    return () => removeListener();
  }, []);

  // AI Terminal Socket - Listen for AI command executions from backend
  useEffect(() => {
    const socket = socketIO('http://localhost:3001');
    aiSocketRef.current = socket;

    socket.on('terminal:ai-output', (data) => {
      if (data.event === 'start') {
        const termId = data.terminalId; // Backend controls terminal ID
        setActiveAiCommandId(data.commandId);

        if (data.newTerminal) {
          // Backend says: create a new terminal
          aiTerminalCountRef.current += 1;
          setAiTerminals(prev => {
            if (prev.some(t => t.id === termId)) return prev;
            return [...prev, {
              id: termId,
              name: `AI Terminal ${aiTerminalCountRef.current}`,
              commandId: data.commandId,
              isAi: true
            }];
          });
          setActiveTermId(termId);
          setActiveTab('terminal');
        } else {
          // Reuse existing terminal — just update commandId
          setAiTerminals(prev => prev.map(t =>
            t.id === termId ? { ...t, commandId: data.commandId } : t
          ));
          setActiveTermId(termId);
          setActiveTab('terminal');
        }
      }
      setLatestAiData(data);
    });

    return () => socket.disconnect();
  }, []);

  // 🔥 HANDLE COMMANDS FROM DEBUG PANEL
  useEffect(() => {
    const handleRunCommand = (e) => {
      const { cmd, newWindow, path } = e.detail;

      // Agar New Window bola hai, to naya banao
      if (newWindow) {
        addTerminal(path).then((newId) => {
          setTimeout(() => {
            if (newId && window.electronAPI) window.electronAPI.writeTerminal(newId, cmd);
          }, 500); // Thoda wait taki shell ready ho jaye
        });
      }
      // Nahi to active me chalao (agar koi hai)
      else if (activeTermId && window.electronAPI) {
        window.electronAPI.writeTerminal(activeTermId, cmd);
      }
      // Agar kuch nahi hai to naya banao
      else {
        addTerminal(path).then((newId) => {
          setTimeout(() => { if (newId) window.electronAPI.writeTerminal(newId, cmd); }, 500);
        });
      }
    };

    window.addEventListener('devstudio:run-command', handleRunCommand);
    return () => window.removeEventListener('devstudio:run-command', handleRunCommand);
  }, [activeTermId, terminals]);

  // Add Terminal (Accepts optional path)
  const addTerminal = async (cwd = null) => {
    if (!window.electronAPI) return;
    const storedPath = localStorage.getItem('devstudio-last-project');
    const targetPath = cwd || storedPath; // Agar specific path hai to wo, nahi to root

    try {
      const newId = await window.electronAPI.createTerminal(targetPath);
      const termNumber = terminals.length + 1;
      const termName = `Terminal ${termNumber}`; // 🔥 Better naming

      setTerminals(p => [...p, { id: newId, name: termName, detectedProcess: null }]);
      setActiveTermId(newId);
      return newId;
    } catch (e) { }
  };

  const removeTerminal = (id, e) => {
    e.stopPropagation();
    if (!window.electronAPI) return;
    window.electronAPI.killTerminal(id);
    setTerminals(p => {
      const n = p.filter(t => t.id !== id);
      if (id === activeTermId && n.length > 0) setActiveTermId(n[n.length - 1].id);
      return n;
    });
    delete termRefs.current[id];
  };

  if (!isOpen) return null;

  return (
    <div className={cn("bg-[#1e1e1e] flex flex-col border-t border-[#3c3c3c] transition-all duration-200", isMaximized ? "absolute inset-0 z-50 h-full" : "h-52")}>

      {/* Header */}
      <div className="h-9 bg-[#252526] flex items-center justify-between px-2 border-b border-[#3c3c3c] flex-shrink-0 min-w-0">
        <div className="flex gap-2 text-[11px] uppercase tracking-wide font-medium pl-2 overflow-x-auto flex-1 min-w-0 scrollbar-hide">
          {['PROBLEMS', 'OUTPUT', 'DEBUG CONSOLE', 'TERMINAL'].map(tab => {
            const key = tab.split(' ')[0].toLowerCase();
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "px-2 py-1 rounded-t-md transition-all flex items-center gap-1 text-[10px] border-b-2 whitespace-nowrap flex-shrink-0",
                  activeTab === key
                    ? "glass-button !bg-white/10 !border-b-[#007acc] !border-t-white/10 !border-x-white/10 text-white shadow-[0_-2px_10px_rgba(0,122,204,0.2)]"
                    : "text-[#858585] border-transparent hover:text-[#cccccc] hover:bg-white/5"
                )}
              >
                {key === 'problems' && problems.length > 0 && <span className="bg-[#f14c4c] text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]">{problems.length}</span>}
                {tab}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onMaximize} className="text-[#cccccc] hover:bg-[#3c3c3c] p-1 rounded">
            {isMaximized ? <ChevronUp className="rotate-180" size={14} /> : <ChevronUp size={14} />}
          </button>
          <button onClick={onToggle} className="text-[#cccccc] hover:bg-[#3c3c3c] p-1 rounded"><X size={14} /></button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden relative bg-[#1e1e1e]">
        {activeTab === 'problems' && <ProblemsTab problems={problems} onNavigate={onNavigateProblem} />}
        {activeTab === 'output' && <div className="h-full overflow-y-auto p-4 pb-8 text-[#cccccc] text-xs font-mono">Output logs will appear here.</div>}
        {activeTab === 'debug' && <div className="h-full overflow-y-auto p-4 pb-8 text-[#cccccc] text-xs font-mono">Debug console ready.</div>}

        <div className={cn("flex-1 flex overflow-hidden", activeTab === 'terminal' ? "flex" : "hidden")}>
          <div className="flex-1 overflow-hidden relative">
            {terminals.length === 0 && aiTerminals.length === 0 ? <div className="flex items-center justify-center h-full text-[#555]">No open terminals</div> :
              <>
                {terminals.map(t => <TerminalInstance key={t.id} id={t.id} active={t.id === activeTermId} onData={(id, i) => termRefs.current[id] = i} settings={settings} />)}
                {aiTerminals.map(t => <AITerminalInstance key={t.id} id={t.id} active={t.id === activeTermId} data={t.id === latestAiData?.terminalId ? latestAiData : null} socket={aiSocketRef.current} activeCommandId={t.commandId} />)}
              </>
            }
          </div>
          <div className="w-36 bg-[#252526] border-l border-[#3c3c3c] flex flex-col">
            <div className="flex items-center justify-between p-2 text-[10px] text-[#cccccc] font-medium bg-[#2d2d2d]">
              <span>PROCESSES</span>
              <button onClick={() => addTerminal()} className="hover:bg-[#3c3c3c] p-1 rounded"><Plus size={12} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {terminals.map(t => (
                <div key={t.id} onClick={() => setActiveTermId(t.id)} className={cn("flex items-center justify-between px-3 py-1.5 cursor-pointer text-xs group", activeTermId === t.id ? "bg-[#37373d] text-white" : "text-[#858585] hover:text-[#cccccc]")}>
                  <div className="flex items-center gap-2 overflow-hidden"><Monitor size={12} /><span className="truncate">{t.name}</span></div>
                  <button onClick={(e) => removeTerminal(t.id, e)} className="opacity-0 group-hover:opacity-100 hover:text-red-400"><Trash2 size={12} /></button>
                </div>
              ))}
              {aiTerminals.map(t => (
                <div key={t.id} onClick={() => setActiveTermId(t.id)} className={cn("flex items-center justify-between px-3 py-1.5 cursor-pointer text-xs group", activeTermId === t.id ? "bg-[#2d1f4e] text-purple-300" : "text-[#858585] hover:text-[#cccccc]")}>
                  <div className="flex items-center gap-2 overflow-hidden"><Bot size={12} className="text-purple-400" /><span className="truncate">{t.name}</span></div>
                  <button onClick={(e) => { e.stopPropagation(); setAiTerminals(prev => prev.filter(a => a.id !== t.id)); }} className="opacity-0 group-hover:opacity-100 hover:text-red-400"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}