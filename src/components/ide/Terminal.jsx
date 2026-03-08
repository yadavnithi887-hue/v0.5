import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import { Unicode11Addon } from 'xterm-addon-unicode11';
import 'xterm/css/xterm.css';
import { ChevronUp, ChevronDown, ChevronRight, X, Minus, Plus, Trash2, Monitor, AlertCircle, AlertTriangle, ExternalLink, Bot, Filter, Copy, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getIdeTheme } from '@/lib/ideThemes';
import { toast } from 'sonner';
import { io as socketIO } from 'socket.io-client';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

// --- Problems Tab (VS Code-style) ---
const ProblemsTab = ({ problems, onNavigate, query = '' }) => {
  const [expandedGroups, setExpandedGroups] = useState({});

  const normalizedQuery = query.trim().toLowerCase();
  const filteredProblems = problems.filter((p) => {
    if (!normalizedQuery) return true;
    return (
      String(p.file || '').toLowerCase().includes(normalizedQuery) ||
      String(p.message || '').toLowerCase().includes(normalizedQuery) ||
      String(p.source || '').toLowerCase().includes(normalizedQuery)
    );
  });

  const grouped = filteredProblems.reduce((acc, problem) => {
    const file = String(problem.file || 'unknown');
    if (!acc[file]) acc[file] = [];
    acc[file].push(problem);
    return acc;
  }, {});

  const files = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  if (problems.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-[#8a8a8a] text-[13px]" style={{ fontFamily: '"Segoe UI", Inter, sans-serif' }}>
        No problems have been detected in the workspace.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 flex-1 h-full flex flex-col text-[13px]" style={{ fontFamily: '"Segoe UI", Inter, sans-serif' }}>
      <div className="h-8 flex items-center justify-between px-4 border-b border-[#2c2c2c] text-[#d4d4d4]">
        <span>Problems Workspace</span>
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('devstudio:send-to-agent', {
              detail: { type: 'all', problems: filteredProblems }
            }));
          }}
          className="px-2 py-0.5 text-[11px] bg-[#3a3a3a] hover:bg-[#0e639c] text-white rounded cursor-pointer flex items-center gap-1.5 transition-colors"
        >
          <Bot size={12} /> Send all to Agent
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {files.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#8a8a8a] text-[13px]">No results found.</div>
        ) : (
          files.map((file) => {
            const items = grouped[file];
            const open = expandedGroups[file] ?? true;
            const ext = file.split('.').pop()?.toUpperCase() || 'FILE';
            return (
              <div key={file} className="border-b border-[#232323]">
                <div
                  onClick={() => setExpandedGroups((prev) => ({ ...prev, [file]: !open }))}
                  className="w-full h-8 px-3 flex items-center gap-2 text-left hover:bg-[#252526] cursor-pointer"
                >
                  {open ? <ChevronDown size={14} className="text-[#c5c5c5]" /> : <ChevronRight size={14} className="text-[#c5c5c5]" />}
                  <span className="text-[#d7ba7d] text-[11px] font-semibold">{ext}</span>
                  <span className="text-[#d4d4d4] truncate">{file}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent('devstudio:send-to-agent', {
                        detail: { type: 'file', file: file, problems: items }
                      }));
                    }}
                    className="text-[#8a8a8a] hover:text-white text-[10px] mr-2 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[#3a3a3a] transition-colors"
                  >
                    <Bot size={11} /> Send to Agent
                  </button>
                </div>

                {
                  open && (
                    <div className="pl-8 pb-1">
                      {items.map((p, idx) => {
                        const isError = p.severity === 'Error';
                        const code = p.code || (isError ? 'ts(1005)' : 'ts(6133)');
                        const ln = p.line || 1;
                        const col = p.column || 1;
                        return (
                          <ContextMenu key={`${file}:${ln}:${idx}`}>
                            <ContextMenuTrigger>
                              <div
                                className="h-7 pr-4 flex items-center gap-2 hover:bg-[#2a2d2e] cursor-pointer"
                                onClick={() => onNavigate && onNavigate(p.filePath || p.file, p.line, p.severity)}
                              >
                                {isError ? <AlertCircle size={14} className="text-[#f14c4c] shrink-0" /> : <AlertTriangle size={14} className="text-[#cca700] shrink-0" />}
                                <span className="text-[#dcdcdc] truncate">{p.message}</span>
                                <span className="text-[#8f8f8f] whitespace-nowrap">{code}</span>
                                <span className="text-[#8f8f8f] whitespace-nowrap">[Ln {ln}, Col {col}]</span>
                              </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="bg-[#252526] border-[#3c3c3c] text-white min-w-[220px]">
                              <ContextMenuItem onClick={() => onNavigate && onNavigate(p.filePath || p.file, p.line, p.severity)}>
                                Go to Problem
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => navigator.clipboard.writeText(String(p.message || ''))}>
                                Copy Message
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() => navigator.clipboard.writeText(`${p.filePath || p.file}:${ln}:${col} - ${p.message}`)}
                              >
                                Copy Full
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        );
                      })}
                    </div>
                  )
                }
              </div>
            );
          })
        )}
      </div>
    </div >
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
    const activeTheme = getIdeTheme(settings.ideTheme);

    const term = new XTerminal({
      theme: activeTheme.terminal,
      fontFamily: settings.terminalFontFamily || "'Fira Code', Consolas, 'Courier New', monospace",
      fontSize: settings.terminalFontSize || 14,
      cursorBlink: settings.terminalCursorBlinking !== false,
      cursorStyle: settings.terminalCursorStyle || 'block',
      cursorWidth: settings.terminalCursorWidth || 2,
      lineHeight: settings.terminalLineHeight || 1.2,
      scrollback: settings.terminalScrollback || 1000,
      rendererType: settings.terminalRendererType || 'canvas',
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

  useEffect(() => {
    if (!termInstance.current) return;
    const term = termInstance.current;
    term.options.theme = getIdeTheme(settings.ideTheme).terminal;
    term.options.fontFamily = settings.terminalFontFamily || "'Fira Code', Consolas, 'Courier New', monospace";
    term.options.fontSize = settings.terminalFontSize || 14;
    term.options.cursorBlink = settings.terminalCursorBlinking !== false;
    term.options.cursorStyle = settings.terminalCursorStyle || 'block';
    term.options.cursorWidth = settings.terminalCursorWidth || 2;
    term.options.lineHeight = settings.terminalLineHeight || 1.2;
    term.options.scrollback = settings.terminalScrollback || 1000;
    term.options.rendererType = settings.terminalRendererType || 'canvas';
    safeFit();
  }, [settings]);

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

    // User input handler — send directly to Electron PTY or fallback to socket
    const disposable = term.onData((inputData) => {
      if (activeCommandId) {
        if (window.electronAPI) {
          window.electronAPI.writeAIPtyTerminal(activeCommandId, inputData);
        } else if (socket) {
          socket.emit('terminal:ai-input', { commandId: activeCommandId, data: inputData });
        }
      }
    });

    // Paste support
    term.attachCustomKeyEventHandler((e) => {
      if (e.ctrlKey && e.code === 'KeyV' && e.type === 'keydown') {
        navigator.clipboard.readText().then(t => {
          if (activeCommandId) {
            if (window.electronAPI) {
              window.electronAPI.writeAIPtyTerminal(activeCommandId, t);
            } else if (socket) {
              socket.emit('terminal:ai-input', { commandId: activeCommandId, data: t });
            }
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
  const [problemQuery, setProblemQuery] = useState('');
  const [terminals, setTerminals] = useState([]);
  const [activeTermId, setActiveTermId] = useState(null);
  const termRefs = useRef({});
  const [processPaneWidth, setProcessPaneWidth] = useState(220);
  const [processPaneCollapsed, setProcessPaneCollapsed] = useState(false);
  const [isResizingProcessPane, setIsResizingProcessPane] = useState(false);
  const processResizeRef = useRef({ startX: 0, startWidth: 220 });

  // Terminal Resizer State
  const [terminalHeight, setTerminalHeight] = useState(250);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  const terminalResizeRef = useRef({ startY: 0, startHeight: 250 });

  // AI Terminal state
  const [aiTerminals, setAiTerminals] = useState([]);
  const [latestAiData, setLatestAiData] = useState(null);
  const [activeAiCommandId, setActiveAiCommandId] = useState(null);
  const aiSocketRef = useRef(null);
  const aiTerminalCountRef = useRef(0);

  const startProcessResize = (e) => {
    if (processPaneCollapsed) return;
    setIsResizingProcessPane(true);
    processResizeRef.current = { startX: e.clientX, startWidth: processPaneWidth };
    e.preventDefault();
  };

  const handleProcessSplitterDoubleClick = () => {
    if (processPaneCollapsed) {
      setProcessPaneCollapsed(false);
      setProcessPaneWidth(220);
      return;
    }
    setProcessPaneWidth((prev) => (prev > 220 ? 180 : 300));
  };

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
    const socket = socketIO('http://localhost:3001', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2500,
      timeout: 20000,
      query: { client: 'terminal-ai' },
    });
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

  // Listen for "open-ai-terminal" event from AI Activity Panel
  useEffect(() => {
    const handleOpenAiTerminal = () => {
      if (!isOpen && onToggle) onToggle();
      setActiveTab('terminal');
      if (aiTerminals.length > 0) {
        setActiveTermId(aiTerminals[aiTerminals.length - 1].id);
      }
    };
    window.addEventListener('open-ai-terminal', handleOpenAiTerminal);
    return () => window.removeEventListener('open-ai-terminal', handleOpenAiTerminal);
  }, [isOpen, onToggle, aiTerminals]);

  useEffect(() => {
    if (!isResizingProcessPane) return;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (e) => {
      const delta = processResizeRef.current.startX - e.clientX;
      const next = Math.min(420, Math.max(160, processResizeRef.current.startWidth + delta));
      setProcessPaneWidth(next);
    };

    const onUp = () => setIsResizingProcessPane(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingProcessPane]);

  // Terminal Resizer Effect
  useEffect(() => {
    if (!isResizingTerminal) return;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMove = (e) => {
      const delta = terminalResizeRef.current.startY - e.clientY;
      const next = Math.min(window.innerHeight * 0.8, Math.max(100, terminalResizeRef.current.startHeight + delta));
      setTerminalHeight(next);
    };

    const onUp = () => setIsResizingTerminal(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingTerminal]);

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
    <div
      className={cn(
        "bg-[#1e1e1e] flex flex-col border-[#3c3c3c] relative",
        isMaximized ? "h-[72vh] shadow-[0_-8px_24px_rgba(0,0,0,0.35)]" : "border-t"
      )}
      style={!isMaximized ? { height: `${terminalHeight}px` } : {}}
    >
      {/* Top Drag Handle for Resizing */}
      {!isMaximized && (
        <div
          className="absolute top-0 left-0 right-0 h-[8px] cursor-row-resize z-50 hover:bg-[#007acc] opacity-0 hover:opacity-100 transition-opacity translate-y-[-50%]"
          onMouseDown={(e) => {
            setIsResizingTerminal(true);
            terminalResizeRef.current = { startY: e.clientY, startHeight: terminalHeight };
            e.preventDefault();
          }}
        />
      )}

      {/* Header */}
      <div
        className="h-9 bg-[#252526] flex items-center justify-between px-2 border-b border-[#3c3c3c] flex-shrink-0 min-w-0"
        style={{ fontFamily: '"Segoe UI", Inter, sans-serif' }}
      >
        <div className="flex gap-0.5 text-[11px] font-medium pl-2 overflow-x-auto flex-1 min-w-0 scrollbar-hide">
          {['PROBLEMS', 'OUTPUT', 'DEBUG CONSOLE', 'TERMINAL', 'PORTS'].map(tab => {
            const key = tab.split(' ')[0].toLowerCase();
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "h-8 px-2.5 transition-colors flex items-center gap-1.5 text-[11px] border-b-2 whitespace-nowrap flex-shrink-0",
                  activeTab === key
                    ? "border-b-[#0e639c] text-[#ffffff] bg-[#1f1f1f]"
                    : "text-[#9d9d9d] border-b-transparent hover:text-[#d4d4d4] hover:bg-[#2c2c2c]"
                )}
              >
                {key === 'problems' ? (
                  <>
                    <span>Problems</span>
                    {problems.length > 0 && <span className="bg-[#0e639c] text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]">{problems.length}</span>}
                  </>
                ) : (
                  tab.charAt(0) + tab.slice(1).toLowerCase()
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'problems' && (
            <>
              <div className="relative">
                <input
                  value={problemQuery}
                  onChange={(e) => setProblemQuery(e.target.value)}
                  placeholder="Filter (e.g. text, **/*.ts, !**/node_modules)"
                  className="h-7 w-[260px] px-2 pr-8 text-[12px] bg-[#1e1e1e] border border-[#3a3a3a] rounded text-[#d4d4d4] outline-none focus:border-[#0e639c]"
                />
                <Filter size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9d9d9d]" />
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(problems.map((p) => `${p.file}:${p.line} - ${p.message}`).join('\n')).then(() => toast.success('Copied problems'))}
                className="text-[#cccccc] hover:bg-[#3c3c3c] p-1 rounded"
                title="Copy"
              >
                <Copy size={14} />
              </button>
              <button className="text-[#cccccc] hover:bg-[#3c3c3c] p-1 rounded" title="Toggle View">
                <List size={14} />
              </button>
            </>
          )}
          <button
            onClick={() => setProcessPaneCollapsed((p) => !p)}
            className="text-[#cccccc] hover:bg-[#3c3c3c] p-1 rounded"
            title={processPaneCollapsed ? 'Show Processes' : 'Hide Processes'}
          >
            <Monitor size={14} />
          </button>
          <button onClick={onMaximize} className="text-[#cccccc] hover:bg-[#3c3c3c] p-1 rounded">
            {isMaximized ? <ChevronUp className="rotate-180" size={14} /> : <ChevronUp size={14} />}
          </button>
          <button onClick={onToggle} className="text-[#cccccc] hover:bg-[#3c3c3c] p-1 rounded"><X size={14} /></button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden relative bg-[#1e1e1e]">
        {activeTab === 'problems' && <ProblemsTab problems={problems} onNavigate={onNavigateProblem} query={problemQuery} />}
        {activeTab === 'output' && <div className="h-full overflow-y-auto p-4 pb-8 text-[#cccccc] text-xs font-mono">Output logs will appear here.</div>}
        {activeTab === 'debug' && <div className="h-full overflow-y-auto p-4 pb-8 text-[#cccccc] text-xs font-mono">Debug console ready.</div>}
        {activeTab === 'ports' && <div className="h-full overflow-y-auto p-4 pb-8 text-[#cccccc] text-xs">No open ports.</div>}

        <div className={cn("flex-1 flex overflow-hidden", activeTab === 'terminal' ? "flex" : "hidden")}>
          <div className="flex-1 overflow-hidden relative min-w-0">
            {terminals.length === 0 && aiTerminals.length === 0 ? <div className="flex items-center justify-center h-full text-[#555]">No open terminals</div> :
              <>
                {terminals.map(t => <TerminalInstance key={t.id} id={t.id} active={t.id === activeTermId} onData={(id, i) => termRefs.current[id] = i} settings={settings} />)}
                {aiTerminals.map(t => <AITerminalInstance key={t.id} id={t.id} active={t.id === activeTermId} data={t.id === latestAiData?.terminalId ? latestAiData : null} socket={aiSocketRef.current} activeCommandId={t.commandId} />)}
              </>
            }
          </div>
          {!processPaneCollapsed && (
            <div
              onMouseDown={startProcessResize}
              onDoubleClick={handleProcessSplitterDoubleClick}
              className="w-2.5 cursor-col-resize bg-transparent hover:bg-[#0e639c]/60 transition-colors relative"
              title="Drag to resize. Double-click to toggle width."
            >
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-[#343434]" />
            </div>
          )}
          <div
            className={cn(
              "bg-[#252526] border-l border-[#3c3c3c] flex flex-col transition-all duration-150",
              processPaneCollapsed && "w-0 border-l-0 overflow-hidden"
            )}
            style={processPaneCollapsed ? undefined : { width: `${processPaneWidth}px` }}
          >
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
