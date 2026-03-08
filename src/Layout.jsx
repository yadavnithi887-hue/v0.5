import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import ActivityBar from '@/components/ide/ActivityBar';
import FileExplorer from '@/components/ide/FileExplorer';
import EditorTabs from '@/components/ide/EditorTabs';
import CodeEditor from '@/components/ide/CodeEditor';
import Terminal from '@/components/ide/Terminal';
import WelcomeScreen from '@/components/ide/WelcomeScreen';
import StatusBar from '@/components/ide/StatusBar';
import SearchPanel from '@/components/ide/SearchPanel';
import DeleteModal from '@/components/ide/DeleteModal';
import CreateFileModal from '@/components/ide/CreateFileModal';
import MenuBar from '@/components/ide/MenuBar';
import ExtensionsPanel from '@/components/ide/ExtensionsPanel';
import WebPreview from '@/components/ide/WebPreview';
import GitPanel from '@/components/ide/GitPanel';
import DebugPanel from '@/components/ide/DebugPanel';
import SettingsPanel from '@/components/ide/SettingsPanel';
import AIActivityPanel from '@/components/ide/AIActivityPanel';
import AIReportView from '@/components/ide/AIReportView';
import ImagePreviewView from '@/components/ide/ImagePreviewView';
import RobotCompanion from '@/components/ide/RobotCompanion';
import CommandPalette from '@/components/ide/CommandPalette';
import Breadcrumbs from '@/components/ide/Breadcrumbs';
import { ShortcutsModal, TipsModal, AboutModal, WelcomeModal, ComingSoonToast, GoToLineModal, QuickOpenModal } from '@/components/ide/HelpModals';
import WhatsNewModal from '@/components/ide/WhatsNewModal';
import { cn } from '@/lib/utils';
import { DEFAULT_IDE_THEME_ID, applyIdeTheme } from '@/lib/ideThemes';
import { toast, Toaster } from 'sonner';
import { registry } from "@/modules/core/ExtensionRegistry";
import * as monaco from 'monaco-editor';

const DIAGNOSTIC_EXTENSIONS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
  'json', 'jsonc', 'css', 'scss', 'less', 'html', 'xml', 'yml', 'yaml'
]);
const OFFLINE_DRAFT_PREFIX = 'devstudio-offline-draft:';

const DEFAULT_SETTINGS = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  lineHeight: 22,
  letterSpacing: 0,
  fontLigatures: true,
  tabSize: 2,
  wordWrap: 'off',
  lineNumbers: 'on',
  cursorBlinking: 'smooth',
  cursorStyle: 'line',
  cursorWidth: 2,
  insertSpaces: true,
  renderWhitespace: 'selection',
  smoothScrolling: true,
  formatOnSave: false,
  formatOnPaste: false,
  bracketPairColorization: true,
  guidesIndentation: true,
  matchBrackets: 'always',
  autoClosingBrackets: 'languageDefined',
  autoClosingQuotes: 'languageDefined',
  quickSuggestions: true,
  inlineSuggest: true,
  stickyScroll: false,
  mouseWheelZoom: true,
  occurrencesHighlight: true,
  links: true,
  minimap: true,
  minimapSide: 'right',
  minimapScale: 1,
  minimapShowSlider: 'mouseover',
  scrollbar: 'auto',
  folding: true,
  foldingHighlight: true,
  renderLineHighlight: 'line',
  showBreadcrumbs: true,
  activityBarVisible: true,
  statusBarVisible: true,
  sidebarPosition: 'left',
  commandCenter: true,
  ideTheme: DEFAULT_IDE_THEME_ID,
  themeSource: 'settings',
  uiFontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
  uiDensity: 'comfortable',
  showWelcomeOnStartup: true,
  autoSave: 'off',
  autoSaveDelay: 1000,
  confirmDelete: true,
  trimTrailingWhitespace: false,
  insertFinalNewline: false,
  trimFinalNewlines: false,
  hotExit: true,
  defaultLanguage: 'plaintext',
  restoreRecentWorkspace: true,
  explorerConfirmDragAndDrop: false,
  terminalFontSize: 14,
  terminalFontFamily: "'Fira Code', monospace",
  terminalCursorBlinking: true,
  terminalCursorStyle: 'block',
  terminalCursorWidth: 2,
  terminalLineHeight: 1.2,
  terminalScrollback: 1000,
  terminalCopyOnSelection: false,
  terminalBellSound: false,
  terminalRendererType: 'canvas',
  vimMode: false,
  emacsMode: false,
  multiCursorModifier: 'alt',
  wordSeparators: '`~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?',
  commandPalettePreserveInput: true,
  telemetryEnabled: false,
  crashReporter: false,
  privacyMaskPaths: true,
  reducedMotion: false,
  largeClickTargets: false
};

/**
 * Layout.jsx - Main IDE Layout
 * âœ… Fixed: Internal Extension System Integration
 * âœ… Registry-driven UI updates for StatusBar & Editor Buttons

 */

export default function Layout() {
  const isThemeExtensionEnabled = React.useCallback(() => {
    try {
      const saved = localStorage.getItem('extension_states');
      const states = saved ? JSON.parse(saved) : {};
      return states['devstudio.theme-picker'] !== false;
    } catch {
      return true;
    }
  }, []);

  // Core file/project state
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [projectName, setProjectName] = useState('DEVSTUDIO AI');

  // UI state
  const [activeView, setActiveView] = useState('explorer');
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const isResizing = React.useRef(false);

  // Editor & Terminal
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalMaximized, setTerminalMaximized] = useState(false);

  // Settings - Complete default settings for all categories
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('devstudio-settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });
  const [settingsUnsaved, setSettingsUnsaved] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Modals & helper UI
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState('file');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandPaletteMode, setCommandPaletteMode] = useState('command'); // 'command' or 'file'
  const [showQuickOpen, setShowQuickOpen] = useState(false);

  useEffect(() => {
    const canUseExtensionTheme = settings.themeSource === 'extension' && isThemeExtensionEnabled();
    const effectiveThemeId = canUseExtensionTheme
      ? (localStorage.getItem('devstudio-extension-theme') || settings.ideTheme || DEFAULT_IDE_THEME_ID)
      : (settings.ideTheme || DEFAULT_IDE_THEME_ID);

    applyIdeTheme(effectiveThemeId, { save: false });

    const root = document.documentElement;
    root.style.setProperty('--ui-font-family', settings.uiFontFamily || DEFAULT_SETTINGS.uiFontFamily);
    root.style.setProperty('--editor-font-family', settings.fontFamily || DEFAULT_SETTINGS.fontFamily);
    root.dataset.density = settings.uiDensity || DEFAULT_SETTINGS.uiDensity;
    root.classList.toggle('reduce-motion', settings.reducedMotion === true);
    root.classList.toggle('large-click-targets', settings.largeClickTargets === true);
  }, [
    settings.ideTheme,
    settings.themeSource,
    isThemeExtensionEnabled,
    settings.uiFontFamily,
    settings.fontFamily,
    settings.uiDensity,
    settings.reducedMotion,
    settings.largeClickTargets
  ]);

  useEffect(() => {
    const handleThemeSourceChange = (event) => {
      const { source, themeId } = event.detail || {};
      if (!source) return;

      const canUseExtensionTheme = source === 'extension' && isThemeExtensionEnabled();
      const nextSource = canUseExtensionTheme ? source : 'settings';
      const nextThemeId = themeId || settings.ideTheme || DEFAULT_IDE_THEME_ID;

      setSettings((prev) => ({
        ...prev,
        themeSource: nextSource,
        ...(nextSource === 'settings' ? { ideTheme: nextThemeId } : {})
      }));

      setSettingsUnsaved(nextSource === 'settings');
    };

    window.addEventListener('devstudio:theme-source-change', handleThemeSourceChange);
    return () => window.removeEventListener('devstudio:theme-source-change', handleThemeSourceChange);
  }, [isThemeExtensionEnabled, settings.ideTheme]);

  useEffect(() => {
    if (settings.activityBarVisible === false) {
      setSettings((prev) => ({ ...prev, activityBarVisible: true }));
      setSettingsUnsaved(true);
    }
  }, [settings.activityBarVisible]);

  const [showGoToLine, setShowGoToLine] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [comingSoon, setComingSoon] = useState({ show: false, feature: '' });

  // Extensions & registry-driven UI
  const [extSidebarItems, setExtSidebarItems] = useState([]);
  const [installedExtensions, setInstalledExtensions] = useState(['web-preview']);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMaximized, setPreviewMaximized] = useState(false);

  // âœ… Registry-driven UI items (StatusBar & Editor Buttons)
  const [statusBarItems, setStatusBarItems] = useState([]);
  const [extEditorButtons, setExtEditorButtons] = useState([]);

  // Misc
  const [unsavedFiles, setUnsavedFiles] = useState(new Set());
  const [outputLogs, setOutputLogs] = useState(['DevStudio Started...', 'System Ready.']);
  const [problems, setProblems] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedExtension, setSelectedExtension] = useState(null);
  const [showExtensionDocs, setShowExtensionDocs] = useState(false);
  const [focusLine, setFocusLine] = useState(null);
  const [focusSeverity, setFocusSeverity] = useState(null); // 'Error' or 'Warning'
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showRecentModal, setShowRecentModal] = useState(false);

  // AI states removed

  // Editor instance for Outline
  const [editorInstance, setEditorInstance] = useState(null);

  // Diff view state
  const [diffViewActive, setDiffViewActive] = useState(false);
  const [diffOriginalContent, setDiffOriginalContent] = useState('');
  const [diffLabel, setDiffLabel] = useState('');
  const [isAiDiff, setIsAiDiff] = useState(false);
  const aiDiffSnapshotsRef = React.useRef({});  // { filePath: { originalContent, isNewFile } }
  const activeFileRef = React.useRef(null);
  const workspaceProblemsRef = React.useRef([]);
  const editorProblemsRef = React.useRef([]);
  const diagnosticsRunIdRef = React.useRef(0);

  const mergeProblems = useCallback((workspaceList = [], editorList = []) => {
    const map = new Map();
    [...workspaceList, ...editorList].forEach((p) => {
      if (!p || !p.file || !p.message) return;
      const key = `${p.file}|${p.line || 0}|${p.column || 0}|${p.severity || ''}|${p.message}`;
      if (!map.has(key)) map.set(key, p);
    });
    return Array.from(map.values());
  }, []);

  const syncProblems = useCallback(() => {
    setProblems(mergeProblems(workspaceProblemsRef.current, editorProblemsRef.current));
  }, [mergeProblems]);

  const getLanguageFromName = useCallback((name = '') => {
    const lower = String(name).toLowerCase();
    if (lower.endsWith('.d.ts')) return 'typescript';
    const ext = lower.includes('.') ? lower.split('.').pop() : '';
    const map = {
      js: 'javascript',
      jsx: 'javascript',
      mjs: 'javascript',
      cjs: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      json: 'json',
      jsonc: 'json',
      css: 'css',
      scss: 'scss',
      less: 'less',
      html: 'html',
      xml: 'xml',
      yml: 'yaml',
      yaml: 'yaml',
    };
    return map[ext] || 'plaintext';
  }, []);

  const toMonacoUri = useCallback((pathValue) => {
    const normalized = String(pathValue || '').replace(/\\/g, '/');
    if (!normalized) return null;
    if (/^[a-zA-Z]:\//.test(normalized)) {
      return monaco.Uri.parse(`file:///${normalized}`);
    }
    return monaco.Uri.parse(`file://${normalized.startsWith('/') ? '' : '/'}${normalized}`);
  }, []);

  const handleEditorValidate = useCallback((markers) => {
    editorProblemsRef.current = Array.isArray(markers) ? markers : [];
    syncProblems();
  }, [syncProblems]);

  const runWorkspaceDiagnostics = useCallback(async () => {
    const runId = ++diagnosticsRunIdRef.current;
    const rootPath = localStorage.getItem('devstudio-last-project');
    if (!rootPath || !window.electronAPI) {
      workspaceProblemsRef.current = [];
      syncProblems();
      return;
    }

    const candidates = files
      .filter((f) => {
        if (!f?.name) return false;
        const lower = String(f.name).toLowerCase();
        const ext = lower.includes('.') ? lower.split('.').pop() : '';
        return DIAGNOSTIC_EXTENSIONS.has(ext) || lower.endsWith('.d.ts');
      })
      .sort((a, b) => {
        const aActive = activeFile?.id === a.id ? 1 : 0;
        const bActive = activeFile?.id === b.id ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        const aLoaded = typeof a.content === 'string' ? 1 : 0;
        const bLoaded = typeof b.content === 'string' ? 1 : 0;
        return bLoaded - aLoaded;
      })
      .slice(0, 180);

    if (candidates.length === 0) {
      workspaceProblemsRef.current = [];
      syncProblems();
      return;
    }

    const readTargets = candidates.filter((f) => typeof f.content !== 'string' && (f.realPath || f.id));
    const loadedContent = new Map();
    const chunkSize = 36;
    for (let i = 0; i < readTargets.length; i += chunkSize) {
      const chunk = readTargets.slice(i, i + chunkSize);
      const result = await Promise.all(
        chunk.map(async (f) => {
          try {
            const content = await window.electronAPI.readFile(f.realPath || f.id);
            return [f.id, typeof content === 'string' ? content : ''];
          } catch {
            return [f.id, ''];
          }
        })
      );
      result.forEach(([id, content]) => loadedContent.set(id, content));
      if (runId !== diagnosticsRunIdRef.current) return;
    }

    if (loadedContent.size > 0) {
      setFiles((prev) => prev.map((f) => (loadedContent.has(f.id) ? { ...f, content: loadedContent.get(f.id) } : f)));
    }

    const uriSet = new Set();
    const uriToFilePath = new Map();
    candidates.forEach((f) => {
      const fullPath = f.realPath || f.id;
      const uri = toMonacoUri(fullPath);
      if (!uri) return;
      uriSet.add(uri.toString());
      uriToFilePath.set(uri.toString(), String(fullPath || ''));
      const language = getLanguageFromName(f.name || '');
      const content = typeof f.content === 'string' ? f.content : (loadedContent.get(f.id) || '');
      const model = monaco.editor.getModel(uri);
      if (model) {
        if (model.getValue() !== content) model.setValue(content);
        if (model.getLanguageId() !== language && language !== 'plaintext') {
          monaco.editor.setModelLanguage(model, language);
        }
      } else {
        monaco.editor.createModel(content, language, uri);
      }
    });
    // Multi-pass: collect at 150ms (JSON/CSS), 600ms (JS syntax), 1500ms (TS semantic)
    const WS_DIAG_LANG2 = new Set(['javascript', 'typescript', 'json', 'css', 'scss', 'less', 'html']);
    const collectAll = () => {
      const mm = new Map();
      monaco.editor.getModelMarkers({}).forEach((m) => {
        const rk = m.resource?.toString?.() || '';
        if (!uriSet.has(rk)) return;
        const mdl2 = m.resource ? monaco.editor.getModel(m.resource) : null;
        const ml = mdl2?.getLanguageId?.() || '';
        if (ml && !WS_DIAG_LANG2.has(ml)) return;
        const p = String(m.resource?.path || '').replace(/\\/g, '/');
        const fn = p.split('/').pop() || 'unknown';
        const sv = m.severity === monaco.MarkerSeverity.Error ? 'Error' : 'Warning';
        const cd = typeof m.code === 'string' ? m.code : m.code?.value;
        const src = m.source || (ml === 'json' ? 'JSON' : ml === 'css' || ml === 'scss' || ml === 'less' ? 'CSS' : ml === 'html' ? 'HTML' : 'TS/JS');
        const it = { file: fn, filePath: uriToFilePath.get(rk) || p, message: m.message, line: m.startLineNumber || 1, column: m.startColumn || 1, severity: sv, source: src, code: cd };
        const k = `${it.file}|${it.line}|${it.column}|${it.message}|${it.severity}`;
        if (!mm.has(k)) mm.set(k, it);
      });
      return Array.from(mm.values());
    };
    for (const delay of [150, 600, 1500]) {
      await new Promise((r) => setTimeout(r, delay));
      if (runId !== diagnosticsRunIdRef.current) return;
      workspaceProblemsRef.current = collectAll();
      syncProblems();
    }

  }, [files, activeFile?.id, getLanguageFromName, syncProblems, toMonacoUri]);

  useEffect(() => {
    activeFileRef.current = activeFile || null;
  }, [activeFile]);

  const getDraftKey = useCallback((fileLike) => {
    const filePath = String(fileLike?.realPath || fileLike?.id || '').trim();
    if (!filePath || filePath.startsWith('ai-artifact:') || filePath === 'welcome') return null;
    return `${OFFLINE_DRAFT_PREFIX}${filePath}`;
  }, []);

  const loadOfflineDraft = useCallback((fileLike) => {
    try {
      const key = getDraftKey(fileLike);
      if (!key) return null;
      const cached = localStorage.getItem(key);
      return typeof cached === 'string' ? cached : null;
    } catch {
      return null;
    }
  }, [getDraftKey]);

  const storeOfflineDraft = useCallback((fileLike, content) => {
    try {
      const key = getDraftKey(fileLike);
      if (!key) return;
      localStorage.setItem(key, String(content ?? ''));
    } catch {
      // Ignore localStorage quota/access issues.
    }
  }, [getDraftKey]);

  const clearOfflineDraft = useCallback((fileLike) => {
    try {
      const key = getDraftKey(fileLike);
      if (!key) return;
      localStorage.removeItem(key);
    } catch {
      // Ignore localStorage access issues.
    }
  }, [getDraftKey]);

  // Sidebar resizing handlers
  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
  }, []);
  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = 'default';
  }, []);
  const resize = useCallback((e) => {
    if (isResizing.current) {
      const newWidth = e.clientX - 48;
      if (newWidth > 170 && newWidth < 900) setSidebarWidth(newWidth);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  // Welcome modal on first load
  // âœ… FINAL: Single Combined useEffect for Extension System
  useEffect(() => {
    // console.log('ðŸŽ¬ Layout: Setting up extensions...');

    // 1ï¸âƒ£ Create FULL context for extensions
    const context = {
      toast,
      getSettings: () => settings,

      electronAPI: window.electronAPI,
      getWorkspaceRoot: () => localStorage.getItem('devstudio-last-project'),
      activeFile: activeFile,
      updateEditorContent: (newContent) => {
        if (activeFile) {
          handleContentChange(activeFile.id, newContent);
        }
      },
      // Command execution for inter-extension communication
      executeCommand: (id, args) => registry.executeCommand(id, args)
    };

    // 2ï¸âƒ£ Register listeners FIRST
    const removeStatus = registry.onStatusBarUpdate((item) => {
      // console.log('ðŸ“¥ Layout: Received status bar item:', item);
      setStatusBarItems(prev => {
        const exists = prev.find(i => i.id === item.id);
        if (exists) {
          return prev.map(i => i.id === item.id ? item : i);
        }
        return [...prev, item];
      });
    });

    const removeEditor = registry.onEditorButtonUpdate((btn) => {
      // console.log('ðŸ“¥ Layout: Received editor button:', btn);
      setExtEditorButtons(prev => {
        if (prev.find(b => b.id === btn.id)) return prev;
        return [...prev, btn];
      });
    });
    const syncRegistryUI = () => {
      setExtSidebarItems(registry.getSidebarItems());
      setStatusBarItems(registry.getStatusBarItems());
      setExtEditorButtons(registry.getEditorButtons());
      setActiveView((currentView) => {
        const coreViews = ['explorer', 'search', 'git', 'debug', 'extensions', 'ai-gateway', 'settings'];
        if (coreViews.includes(currentView)) return currentView;
        return registry.getSidebarPanel(currentView) ? currentView : 'explorer';
      });
    };

    const removeRegistryUpdate = registry.onRegistryUpdate(syncRegistryUI);


    // 3ï¸âƒ£ Initialize extensions
    // console.log('âš¡ Layout: Initializing registry...');
    registry.initialize(context);

    // 4ï¸âƒ£ Get sidebar items
    const sidebarItems = registry.getSidebarItems();
    // console.log('ðŸ“‹ Layout: Loaded sidebar items:', sidebarItems);
    setExtSidebarItems(sidebarItems);
    syncRegistryUI();

    // console.log('âœ… Layout: Extensions setup complete');

    // 5ï¸âƒ£ Cleanup on unmount
    return () => {
      // console.log('ðŸ§¹ Layout: Cleaning up extension listeners');
      try { removeStatus(); } catch (e) { console.error(e); }
      try { removeEditor(); } catch (e) { console.error(e); }
      try { removeRegistryUpdate(); } catch (e) { console.error(e); }
    };
  }, [activeFile, settings, sidebarOpen]); // Dependencies updated

  // --- Helper: Load Project ---
  const loadLastProject = useCallback(async () => {
    const lastPath = localStorage.getItem('devstudio-last-project');
    const recents = JSON.parse(localStorage.getItem('devstudio-recents') || '[]');
    setRecentProjects(recents);

    if (lastPath && window.electronAPI) {
      const loadingToast = toast.loading('Loading project...');
      try {
        const result = await window.electronAPI.openPath(lastPath);
        if (result) {
          setFiles(result.files || []);
          setFolders(result.folders || []);
          const folderName = result.rootPath.split('\\').pop().split('/').pop();
          setProjectName(folderName.toUpperCase());
          toast.dismiss(loadingToast);
          toast.success(`Project loaded: ${folderName}`);
        } else {
          localStorage.removeItem('devstudio-last-project');
          toast.dismiss(loadingToast);
        }
      } catch (error) {
        console.error('Failed to load project:', error);
        toast.dismiss(loadingToast);
      }
    }
  }, []);

  // --- Helper: Refresh Active File Content ---
  const refreshActiveFile = useCallback(async () => {
    const current = activeFileRef.current;
    if (!current || !window.electronAPI) return;
    try {
      const content = await window.electronAPI.readFile(current.realPath || current.path);
      if (typeof content === 'string') {
        setFiles(prev => prev.map(f => f.id === current.id ? { ...f, content } : f));
        setActiveFile(prev => (prev?.id === current.id ? { ...prev, content } : prev));
      }
    } catch (error) {
      console.error('Failed to refresh active file:', error);
    }
  }, []);

  // Auto-load last project
  useEffect(() => {
    loadLastProject();
  }, [loadLastProject]);

  // Background workspace diagnostics (project-wide)
  useEffect(() => {
    const timer = setTimeout(() => {
      runWorkspaceDiagnostics();
    }, 80);
    return () => clearTimeout(timer);
  }, [files, folders, runWorkspaceDiagnostics]);

  useEffect(() => {
    if (!activeFile) {
      editorProblemsRef.current = [];
      syncProblems();
    }
  }, [activeFile, syncProblems]);

  // --- Helper: Refresh Directory Tree (Preserving Content) ---
  const refreshDirectoryTree = useCallback(async () => {
    if (!window.electronAPI) return;
    const rootPath = localStorage.getItem('devstudio-last-project');
    if (!rootPath) return;

    try {
      const result = await window.electronAPI.openPath(rootPath);
      if (result) {
        setFolders(result.folders || []);

        // Merge files to preserve already loaded/edited content
        setFiles(prevFiles => {
          const newFiles = result.files || [];
          return newFiles.map(newF => {
            const existingF = prevFiles.find(p => p.id === newF.id);
            if (existingF && existingF.content) {
              return { ...newF, content: existingF.content };
            }
            return newF;
          });
        });
        // console.log('ðŸ”„ Directory tree refreshed');
      }
    } catch (error) {
      console.error('Failed to refresh directory tree:', error);
    }
  }, []);

  // âš¡ Electron IPC File Watcher (Chokidar)
  useEffect(() => {
    if (!window.electronAPI?.onFileChanged) return;

    let refreshTimeout;
    const cleanup = window.electronAPI.onFileChanged(() => {
      // console.log('ðŸ”” Layout: Received fs:changed from Electron');
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        refreshDirectoryTree();
      }, 300); // 300ms debounce
    });

    return () => {
      clearTimeout(refreshTimeout);
      cleanup();
    };
  }, [refreshDirectoryTree]);

  const saveCurrentFile = useCallback(async (fileLike, { silentSuccess = false } = {}) => {
    if (!fileLike || fileLike.type === 'welcome' || String(fileLike.id || '').startsWith('ai-artifact:')) return false;
    const targetPath = fileLike.realPath || fileLike.path || fileLike.id;
    const targetContent = String(fileLike.content ?? '');

    if (!window.electronAPI?.saveFile || !targetPath) {
      storeOfflineDraft(fileLike, targetContent);
      toast.error('Disk save unavailable. Draft cached locally for offline use.');
      return false;
    }

    try {
      const res = await window.electronAPI.saveFile(targetPath, targetContent);
      if (!res?.success) throw new Error(res?.error || 'Save failed');
      clearOfflineDraft(fileLike);
      setUnsavedFiles((prev) => {
        const next = new Set(prev);
        next.delete(fileLike.id);
        return next;
      });
      if (!silentSuccess) toast.success('File Saved!');
      return true;
    } catch (err) {
      storeOfflineDraft(fileLike, targetContent);
      toast.error(`Save failed. Draft cached locally. ${err?.message ? `(${err.message})` : ''}`.trim());
      return false;
    }
  }, [clearOfflineDraft, storeOfflineDraft]);


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setShowDebugPanel(prev => !prev);
        return;
      }



      if (showCreateModal || showQuickOpen || showGoToLine || showCommandPalette || !!deleteTarget) return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'p':
            e.preventDefault();
            if (e.shiftKey) {
              setCommandPaletteMode('command');
              setShowCommandPalette(true);
            } else {
              setCommandPaletteMode('file');
              setShowCommandPalette(true);
            }
            break;
          // Note: Ctrl+I is now free for other uses, as AI toggle is Ctrl+Shift+I
          case '`':
            e.preventDefault(); setTerminalOpen(prev => !prev);
            break;
          case 'n':
            e.preventDefault(); setCreateType(e.shiftKey ? 'folder' : 'file'); setShowCreateModal(true);
            break;
          case 's':
            e.preventDefault();
            if (activeFile) saveCurrentFile(activeFile);
            break;
          case 'b':
            e.preventDefault(); setSidebarOpen(prev => !prev);
            break;
          default:
            break;
        }
      }
      if (e.key === 'F1') { e.preventDefault(); setCommandPaletteMode('command'); setShowCommandPalette(true); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, showCreateModal, showQuickOpen, showGoToLine, showCommandPalette, deleteTarget, sidebarOpen, saveCurrentFile]);

  // âš¡ Socket.IO Connection for Active File Refresh (AI/Backend direct edits)
  useEffect(() => {
    const socket = io('http://localhost:3001', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2500,
      timeout: 20000,
      query: { client: 'layout-fs-refresh' },
    });

    socket.on('connect', () => {
      // console.log('ðŸ”Œ Layout: Connected to Backend Socket');
    });

    let refreshTimeout;
    socket.on('disconnect', (reason) => {
      console.warn(`[SOCKET][layout-fs-refresh] disconnected: ${reason}`);
    });
    socket.on('connect_error', (err) => {
      console.error(`[SOCKET][layout-fs-refresh] connect_error: ${err?.message || 'unknown error'}`);
    });
    socket.io.on('reconnect_attempt', (attempt) => {
      console.warn(`[SOCKET][layout-fs-refresh] reconnect attempt ${attempt}`);
    });

    socket.on('fs:refresh', (data) => {
      // console.log('ðŸ”„ Layout: Received fs:refresh event', data);

      // Debounce refresh - but keep it fast (100ms)
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        // 1. Refresh active file content ONLY (fastest feedback, no disconnects)
        refreshActiveFile();

        // 2. We now ALSO trigger a tree refresh just in case new files were created
        // Our new refreshDirectoryTree safely preserves loaded text.
        if (typeof refreshDirectoryTree === 'function') {
          refreshDirectoryTree();
        }

        toast.info('File updated', { duration: 1000 });
      }, 100);
    });

    // Listen for AI file snapshots - store original content for diff review
    socket.on('ai:file-snapshot', (data) => {
      if (!data?.filePath) return;
      const snapshots = aiDiffSnapshotsRef.current;
      // Only keep the first snapshot per file (the true original)
      if (!snapshots[data.filePath]) {
        snapshots[data.filePath] = {
          originalContent: data.originalContent,
          isNewFile: data.isNewFile || false,
          timestamp: data.timestamp || Date.now()
        };
      }
    });

    // AI Auto-Verify: respond to backend's diagnostics:request with current problems
    socket.on('diagnostics:request', async (data) => {
      console.log('[DIAGNOSTICS] Backend requested problems data');
      // Trigger a fresh workspace scan and wait for Monaco to finish
      try {
        await runWorkspaceDiagnostics();
        // Give Monaco extra time to process markers
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        console.error('[DIAGNOSTICS] Scan error:', e);
      }
      // Send current problems back to backend
      socket.emit('diagnostics:response', {
        problems: workspaceProblemsRef.current.concat(editorProblemsRef.current),
        requestId: data?.requestId,
        timestamp: Date.now()
      });
    });

    return () => {
      clearTimeout(refreshTimeout);
      socket.off('fs:refresh');
      socket.off('ai:file-snapshot');
      socket.off('diagnostics:request');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.io.off('reconnect_attempt');
      socket.disconnect();
    };
  }, [refreshActiveFile, refreshDirectoryTree]);

  // Open AI artifact as a virtual editor tab/page
  useEffect(() => {
    const handler = (event) => {
      const payload = event?.detail || {};
      const sid = String(payload.sessionId || 'unknown-session');
      const artifactName = String(payload.artifactName || 'artifact.md');
      const fileId = `ai-artifact:${sid}:${artifactName}`;
      const virtualFile = {
        id: fileId,
        name: artifactName,
        path: fileId,
        realPath: fileId,
        type: 'ai-artifact',
        content: String(payload.content || ''),
      };
      setOpenFiles((prev) => {
        const exists = prev.find((f) => f.id === fileId);
        if (exists) {
          return prev.map((f) => (f.id === fileId ? { ...f, ...virtualFile } : f));
        }
        return [...prev, virtualFile];
      });
      setActiveFile(virtualFile);
    };

    window.addEventListener('devstudio:open-ai-artifact', handler);
    return () => window.removeEventListener('devstudio:open-ai-artifact', handler);
  }, []);

  // Open workspace file references coming from chat markdown links.
  useEffect(() => {
    const normalizePath = (p) => String(p || '').replace(/\\/g, '/').toLowerCase();
    const getBaseName = (p) => {
      const s = String(p || '').replace(/\\/g, '/');
      const i = s.lastIndexOf('/');
      return i >= 0 ? s.slice(i + 1) : s;
    };
    const fileList = () => (Array.isArray(files) ? files : []);

    const handler = async (event) => {
      const rawPath = String(event?.detail?.path || '').trim();
      if (!rawPath) return;

      const workspaceRoot = localStorage.getItem('devstudio-last-project') || '';
      let resolved = rawPath.replace(/^file:\/\//i, '');
      if (/^\/[A-Za-z]:\//.test(resolved)) resolved = resolved.slice(1);

      if (!/^[A-Za-z]:[\\/]/.test(resolved) && !resolved.startsWith('/') && workspaceRoot) {
        const sep = workspaceRoot.includes('\\') ? '\\' : '/';
        const clean = resolved.replace(/^\.?[\\/]/, '');
        resolved = `${workspaceRoot}${sep}${clean}`;
      }

      const norm = normalizePath(resolved);
      const rawNorm = normalizePath(rawPath);
      const rawBase = getBaseName(rawPath);
      let file = fileList().find((f) => normalizePath(f.realPath || f.id) === norm);
      if (!file) file = fileList().find((f) => normalizePath(f.realPath || f.id).endsWith(`/${rawNorm}`));
      if (!file && rawBase) file = fileList().find((f) => String(f.name || '').toLowerCase() === rawBase.toLowerCase());
      if (!file && rawBase) file = fileList().find((f) => normalizePath(f.realPath || f.id).endsWith(`/${rawBase.toLowerCase()}`));

      if (!file && window.electronAPI) {
        try {
          const content = await window.electronAPI.readFile(resolved);
          file = {
            id: resolved,
            name: getBaseName(resolved),
            path: resolved,
            realPath: resolved,
            content,
          };
          setFiles((prev) => (prev.find((f) => f.id === file.id) ? prev : [...prev, file]));
        } catch {
          toast.error(`File not found: ${rawPath}`);
          return;
        }
      }

      if (!file) {
        toast.error(`Cannot open reference: ${rawPath}`);
        return;
      }

      // Use handleFileClick to ensure content is actually loaded from disk
      handleFileClick(file);
    };

    window.addEventListener('devstudio:open-file-ref', handler);
    return () => window.removeEventListener('devstudio:open-file-ref', handler);
  }, [files]);

  // File click handler (open in editor)
  const handleFileClick = async (file) => {
    if (file.type === 'welcome') {
      if (!openFiles.find(f => f.id === file.id)) setOpenFiles(prev => [...prev, file]);
      setActiveFile(file);
      return;
    }

    let resolvedContent = typeof file.content === 'string' ? file.content : null;
    let diskReadSucceeded = false;
    let diskContent = '';
    if (window.electronAPI) {
      try {
        const content = await window.electronAPI.readFile(file.realPath || file.id);
        if (typeof content === 'string') {
          diskReadSucceeded = true;
          diskContent = content;
        }
      } catch (e) { console.error(e); }
    }

    const cachedDraft = loadOfflineDraft(file);
    if (diskReadSucceeded) {
      resolvedContent = diskContent;
      // Clean stale empty drafts if real file has content.
      if (typeof cachedDraft === 'string' && cachedDraft.length === 0 && diskContent.length > 0) {
        clearOfflineDraft(file);
      }
    } else if (typeof cachedDraft === 'string') {
      resolvedContent = cachedDraft;
      setUnsavedFiles((prev) => new Set(prev).add(file.id));
    }
    if (resolvedContent === null) resolvedContent = '';

    const updatedFile = resolvedContent !== null ? { ...file, content: resolvedContent } : file;
    if (resolvedContent !== null) {
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, content: resolvedContent } : f));
    }

    setOpenFiles(prev => {
      const exists = prev.find(f => f.id === file.id);
      if (!exists) return [...prev, updatedFile];
      return prev.map(f => (f.id === file.id ? { ...f, ...(resolvedContent !== null ? { content: resolvedContent } : {}) } : f));
    });
    setActiveFile(updatedFile);
  };

  // Content change
  const handleContentChange = useCallback((fileId, content) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, content } : f));
    if (activeFile?.id === fileId) setActiveFile(prev => ({ ...prev, content }));
    setUnsavedFiles(prev => new Set(prev).add(fileId));
    const current = activeFile?.id === fileId
      ? { ...activeFile, content }
      : (openFiles.find((f) => f.id === fileId) || files.find((f) => f.id === fileId));
    if (current) storeOfflineDraft(current, content);
  }, [activeFile, openFiles, files, storeOfflineDraft]);

  // Create file / folder direct helpers (calls into electronAPI)
  const handleCreateFileDirect = async (arg1, arg2) => {
    let name, folder;
    if (typeof arg1 === 'object' && arg1 !== null) {
      name = arg1.name; folder = arg1.folder;
    } else { name = arg1; folder = arg2; }

    if (!name) return;
    if (!window.electronAPI) return toast.error('No filesystem API available');

    const rootPath = localStorage.getItem('devstudio-last-project');
    if (!rootPath) return toast.error('No project open');

    const isWindows = rootPath.includes('\\');
    const sep = isWindows ? '\\' : '/';
    let targetDir = rootPath;

    if (folder && folder !== 'root') {
      if (folder.includes(rootPath)) targetDir = folder;
      else {
        const normFolder = folder.replace(/\//g, sep).replace(/\\/g, sep);
        if (normFolder.startsWith(rootPath)) targetDir = normFolder;
        else targetDir = `${rootPath}${sep}${normFolder}`;
      }
    }

    const finalPath = `${targetDir}${sep}${name}`;
    try {
      const result = await window.electronAPI.createFile(finalPath);
      if (result.success) {
        await handleOpenRecent(rootPath);
        toast.success(`Created: ${name}`);
      } else toast.error(result.error || 'Create failed');
    } catch (e) { console.error(e); }
  };

  const handleCreateFolderDirect = async (arg1, arg2) => {
    let name, folder;
    if (typeof arg1 === 'object' && arg1 !== null) {
      name = arg1.name; folder = arg1.folder;
    } else { name = arg1; folder = arg2; }

    if (!name) return;
    if (!window.electronAPI) return toast.error('No filesystem API available');

    const rootPath = localStorage.getItem('devstudio-last-project');
    const isWindows = rootPath.includes('\\');
    const sep = isWindows ? '\\' : '/';
    let targetDir = rootPath;

    if (folder && folder !== 'root') {
      if (folder.includes(rootPath)) targetDir = folder;
      else {
        const normFolder = folder.replace(/\//g, sep).replace(/\\/g, sep);
        if (normFolder.startsWith(rootPath)) targetDir = normFolder;
        else targetDir = `${rootPath}${sep}${normFolder}`;
      }
    }

    const finalPath = `${targetDir}${sep}${name}`;
    try {
      const result = await window.electronAPI.createFolder(finalPath);
      if (result.success) {
        await handleOpenRecent(rootPath);
        toast.success(`Created: ${name}`);
      } else toast.error(result.error || 'Create folder failed');
    } catch (e) { console.error(e); }
  };

  // Delete flow
  const promptDeleteFile = (file) => setDeleteTarget({ type: 'file', item: file });
  const promptDeleteFolder = (folder) => setDeleteTarget({ type: 'folder', item: folder });

  const confirmDelete = async () => {
    if (!deleteTarget || !window.electronAPI) return;
    const path = deleteTarget.item.realPath;
    try {
      await window.electronAPI.deletePath(path);
      const rootPath = localStorage.getItem('devstudio-last-project');
      await handleOpenRecent(rootPath);
      if (deleteTarget.type === 'file') handleTabClose(deleteTarget.item);
      setDeleteTarget(null);
      toast.success('Deleted');
    } catch (e) { console.error(e); toast.error('Delete failed'); }
  };

  // Rename
  const handleRenameFile = async (file, newName) => {
    if (!window.electronAPI || !newName || newName === file.name) return;
    const oldPath = file.realPath;
    const lastSlash = oldPath.lastIndexOf('\\') !== -1 ? oldPath.lastIndexOf('\\') : oldPath.lastIndexOf('/');
    const directory = oldPath.substring(0, lastSlash);
    const newPath = `${directory}\\${newName}`;
    try {
      const result = await window.electronAPI.renamePath(oldPath, newPath);
      if (result.success) {
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, name: newName, realPath: newPath, id: newPath, path: f.path.replace(file.name, newName) } : f));
        if (activeFile?.id === file.id) setActiveFile(prev => ({ ...prev, name: newName, realPath: newPath, id: newPath }));
        setOpenFiles(prev => prev.map(f => f.id === file.id ? { ...f, name: newName, realPath: newPath, id: newPath } : f));
        toast.success('Renamed successfully');
      } else toast.error(`Rename failed: ${result.error}`);
    } catch (e) { console.error(e); toast.error('Error renaming file'); }
  };

  const handleRenameFolder = async (folder, newName) => {
    if (!window.electronAPI || !newName || newName === folder.name) return;
    const oldPath = folder.realPath;
    const lastSlash = oldPath.lastIndexOf('\\') !== -1 ? oldPath.lastIndexOf('\\') : oldPath.lastIndexOf('/');
    const parentDir = oldPath.substring(0, lastSlash);
    const newPath = `${parentDir}\\${newName}`;
    try {
      const result = await window.electronAPI.renamePath(oldPath, newPath);
      if (result.success) {
        const currentProject = localStorage.getItem('devstudio-last-project');
        if (currentProject) {
          const refresh = await window.electronAPI.openPath(currentProject);
          if (refresh) {
            setFiles(refresh.files || []);
            setFolders(refresh.folders || []);
          }
        }
        toast.success('Folder renamed');
      } else toast.error(`Rename failed: ${result.error}`);
    } catch (e) { console.error(e); toast.error('Error renaming folder'); }
  };

  // Open folder
  const handleOpenFolder = async () => {
    if (!window.electronAPI) return;
    try {
      const result = await window.electronAPI.openFolder();
      if (result) {
        setFiles(result.files || []);
        setFolders(result.folders || []);
        const folderName = result.rootPath.split('\\').pop().split('/').pop();
        setProjectName(folderName.toUpperCase());
        setOpenFiles([]); setActiveFile(null);
        localStorage.setItem('devstudio-last-project', result.rootPath);
        const newRecents = [result.rootPath, ...recentProjects.filter(p => p !== result.rootPath)].slice(0, 5);
        setRecentProjects(newRecents);
        localStorage.setItem('devstudio-recents', JSON.stringify(newRecents));
        toast.success(`Opened: ${folderName}`);
      }
    } catch (e) { console.error(e); }
  };

  // Open recent by path
  const handleOpenRecent = async (path) => {
    if (!window.electronAPI) return;
    const loadingToast = toast.loading(`Opening ${path}...`);
    try {
      // First check if path exists
      const exists = await window.electronAPI.checkPathExists?.(path);
      // If checkPathExists is not available (older backend), try openPath directly
      // But if we can check, do it first.

      const result = await window.electronAPI.openPath(path);
      if (result) {
        setFiles(result.files || []);
        setFolders(result.folders || []);
        const folderName = result.rootPath.split('\\').pop().split('/').pop();
        setProjectName(folderName.toUpperCase());
        setOpenFiles([]); setActiveFile(null);
        const newRecents = [result.rootPath, ...recentProjects.filter(p => p !== result.rootPath)].slice(0, 5);
        setRecentProjects(newRecents);
        localStorage.setItem('devstudio-last-project', result.rootPath);
        localStorage.setItem('devstudio-recents', JSON.stringify(newRecents));
        toast.dismiss(loadingToast); toast.success(`Opened: ${folderName}`);
      } else {
        // Path does not exist or open failed
        toast.dismiss(loadingToast);
        toast.error('Project path not found. Removing from recent list.');

        // Remove from recents
        const newRecents = recentProjects.filter(p => p !== path);
        setRecentProjects(newRecents);
        localStorage.setItem('devstudio-recents', JSON.stringify(newRecents));
      }
    } catch (e) {
      toast.dismiss(loadingToast);
      console.error(e);
      toast.error('Error opening project');
    }
  };

  // Tab close
  const handleTabClose = (file) => {
    const newOpenFiles = openFiles.filter(f => f.id !== file.id);
    setOpenFiles(newOpenFiles);
    if (activeFile?.id === file.id) {
      setActiveFile(newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null);
    }
  };

  // Navigate from problems list with severity highlighting
  const handleNavigateProblem = async (fileOrPath, line, severity) => {
    const normalize = (p) => String(p || '').replace(/\\/g, '/').toLowerCase();
    const needle = normalize(fileOrPath);
    let targetFile = null;

    if (needle.includes('/')) {
      targetFile = files.find((f) => normalize(f.realPath || f.id) === needle);
      if (!targetFile) {
        targetFile = files.find((f) => normalize(f.realPath || f.id).endsWith(`/${needle.split('/').pop()}`));
      }
    } else {
      targetFile = files.find((f) => String(f.name || '').toLowerCase() === needle);
      if (!targetFile) targetFile = files.find((f) => normalize(f.path).endsWith(`/${needle}`));
    }

    if (targetFile) {
      await handleFileClick(targetFile);
      setFocusLine(line);
      setFocusSeverity(severity || 'Error');
    } else {
      toast.error(`File ${fileOrPath} not found`);
    }
  };

  // Apply code from AIChat or other sources
  const handleApplyCode = (code) => {
    if (activeFile) handleContentChange(activeFile.id, code);
  };

  // Extension selection UI
  const handleExtensionSelect = (ext) => {
    setActiveFile(null);
    setSelectedExtension(ext);
  };

  // Menu actions
  const handleMenuAction = (action, data) => {
    switch (action) {
      case 'newFile': setCreateType('file'); setShowCreateModal(true); break;
      case 'newFolder': setCreateType('folder'); setShowCreateModal(true); break;

      // NEW: Open a new window
      case 'newWindow':
        if (window.electronAPI?.newWindow) {
          window.electronAPI.newWindow();
        } else {
          // Fallback: open in new browser tab
          window.open(window.location.href, '_blank');
        }
        break;

      case 'openFolder': handleOpenFolder(); break;

      // NEW: Open File dialog
      case 'openFile':
        if (data) {
          handleFileClick(data);
        } else if (window.electronAPI?.openFileDialog) {
          window.electronAPI.openFileDialog().then(result => {
            if (result && result.filePath) {
              // Read and open the file
              window.electronAPI.readFile(result.filePath).then(content => {
                const fileName = result.filePath.split('\\').pop().split('/').pop();
                const newFile = {
                  id: result.filePath,
                  name: fileName,
                  realPath: result.filePath,
                  content: content,
                  type: 'file'
                };
                setFiles(prev => [...prev.filter(f => f.id !== newFile.id), newFile]);
                setOpenFiles(prev => [...prev.filter(f => f.id !== newFile.id), newFile]);
                setActiveFile(newFile);
                toast.success(`Opened: ${fileName}`);
              });
            }
          });
        } else {
          toast.info('Use File Explorer to open files');
        }
        break;

      // NEW: Open Recent - show modal with recent projects
      case 'openRecent':
        if (recentProjects.length > 0) {
          setShowRecentModal(true);
        } else {
          toast.info('No recent projects found');
        }
        break;

      case 'closeFolder':
        setFiles([]); setFolders([]); setOpenFiles([]); setActiveFile(null);
        setProjectName('DEVSTUDIO'); localStorage.removeItem('devstudio-last-project');
        window.location.reload();
        toast.success('Folder closed');
        break;

      case 'closeWindow':
      case 'quit':
        if (window.electronAPI) window.electronAPI.closeWindow();
        break;

      // NEW: Close current editor tab
      case 'closeEditor':
        if (activeFile) {
          handleTabClose(activeFile);
        }
        break;

      case 'viewExplorer': setActiveView('explorer'); setSidebarOpen(true); break;
      case 'viewSearch': setActiveView('search'); setSidebarOpen(true); break;
      case 'viewGit': setActiveView('git'); setSidebarOpen(true); break;
      case 'viewDebug': setActiveView('debug'); setSidebarOpen(true); break;
      case 'viewExtensions': setActiveView('extensions'); setSidebarOpen(true); break;
      case 'viewTerminal': setTerminalOpen(prev => !prev); break;
      case 'commandPalette': setCommandPaletteMode('command'); setShowCommandPalette(true); break;
      case 'openSettings':
      case 'viewSettings':
        setShowSettingsModal(true); break;
      case 'openKeyboardShortcuts': setShowShortcuts(true); break;
      case 'showWelcome':
      case 'welcome':
        {
          const welcomeTab = { id: 'welcome', name: 'Welcome', type: 'welcome' };
          if (!openFiles.find(f => f.id === 'welcome')) {
            setOpenFiles(prev => [...prev, welcomeTab]);
          }
          setActiveFile(welcomeTab);
          setShowWelcome(true);
        }
        break;
      case 'showAbout':
      case 'about':
        setShowAbout(true); break;
      case 'showShortcuts': setShowShortcuts(true); break;
      case 'showTips': setShowTips(true); break;
      case 'reloadWindow': window.location.reload(); break;
      case 'showWhatsNew': setShowWhatsNew(true); break;

      case 'save':
        if (activeFile) saveCurrentFile(activeFile);
        break;

      // NEW: Save As - save with a new name/location
      case 'saveAs':
        if (activeFile && window.electronAPI?.saveFileDialog) {
          window.electronAPI.saveFileDialog(activeFile.name).then(result => {
            if (result && result.filePath) {
              window.electronAPI.saveFile(result.filePath, activeFile.content).then(res => {
                if (res.success) {
                  const fileName = result.filePath.split('\\').pop().split('/').pop();
                  toast.success(`Saved as: ${fileName}`);
                  // Update file reference
                  const updatedFile = { ...activeFile, id: result.filePath, name: fileName, realPath: result.filePath };
                  setFiles(prev => [...prev.filter(f => f.id !== activeFile.id), updatedFile]);
                  setOpenFiles(prev => prev.map(f => f.id === activeFile.id ? updatedFile : f));
                  setActiveFile(updatedFile);
                  setUnsavedFiles(prev => { const s = new Set(prev); s.delete(activeFile.id); return s; });
                  clearOfflineDraft(activeFile);
                  clearOfflineDraft(updatedFile);
                } else toast.error('Save failed');
              });
            }
          });
        } else if (activeFile) {
          toast.info('Save As requires Electron API');
        }
        break;

      // NEW: Save All - save all unsaved files
      case 'saveAll':
        if (unsavedFiles.size > 0) {
          const savePromises = Array.from(unsavedFiles).map((fileId) => {
            const file = openFiles.find((f) => f.id === fileId) || files.find((f) => f.id === fileId);
            if (!file) return Promise.resolve(false);
            return saveCurrentFile(file, { silentSuccess: true });
          });
          Promise.all(savePromises).then((results) => {
            const successCount = results.filter(Boolean).length;
            if (successCount > 0) toast.success(`Saved ${successCount} file(s)`);
          });
        } else {
          toast.info('No unsaved files');
        }
        break;

      case 'goToLine':
        if (data && activeFile) {
          setFocusLine(data);
        }
        break;
      case 'showComingSoon':
        setComingSoon({ show: true, feature: data }); setTimeout(() => setComingSoon({ show: false, feature: '' }), 3000);
        break;
      default: break;
    }
  };

  // Handle timeline diff view
  const handleCompareVersion = async (versionId, timestamp) => {
    if (!activeFile || !window.electronAPI) return;

    console.log('Loading diff for version:', versionId, 'of file:', activeFile.realPath);

    try {
      const result = await window.electronAPI.getFileVersion(activeFile.realPath, versionId);
      console.log('Loaded version result (JSON):', JSON.stringify(result, null, 2));

      if (result.success && result.version && result.version.content !== undefined) {
        console.log('Setting diff - Original length:', result.version.content.length, 'Current length:', activeFile.content.length);
        setDiffOriginalContent(result.version.content);
        setDiffLabel(`Version from ${new Date(timestamp).toLocaleString()}`);
        setDiffViewActive(true);
      } else {
        console.error('Failed to load version. Full result:', result);
        toast.error(result.error || 'Failed to load version');
      }
    } catch (err) {
      console.error('Error loading version:', err);
      toast.error('Error loading version');
    }
  };

  const handleCloseDiff = () => {
    setDiffViewActive(false);
    setDiffOriginalContent('');
    setDiffLabel('');
    setIsAiDiff(false);
  };

  // AI Diff: Accept — keep current file content, close diff
  const handleAcceptAiDiff = () => {
    if (activeFile?.realPath) {
      delete aiDiffSnapshotsRef.current[activeFile.realPath];
    }
    handleCloseDiff();
    toast.success('AI changes accepted', { duration: 1500 });
  };

  // AI Diff: Reject — restore original content, refresh editor, close diff
  const handleRejectAiDiff = async () => {
    const filePath = activeFile?.realPath;
    if (!filePath) { handleCloseDiff(); return; }
    const snapshot = aiDiffSnapshotsRef.current[filePath];
    if (!snapshot) { handleCloseDiff(); return; }

    try {
      const api = window.electronAPI;
      if (api?.restoreSnapshot) {
        await api.restoreSnapshot(filePath, snapshot.originalContent, snapshot.isNewFile);
      }
      // Refresh file content in editor
      if (snapshot.isNewFile) {
        // Remove the tab if AI-created file was rejected
        setOpenFiles(prev => prev.filter(f => f.realPath !== filePath && f.id !== filePath));
        if (activeFile?.realPath === filePath || activeFile?.id === filePath) {
          setActiveFile(null);
        }
      } else if (api?.readFile) {
        const content = await api.readFile(filePath);
        setFiles(prev => prev.map(f => (f.realPath === filePath || f.id === filePath) ? { ...f, content } : f));
        if (activeFile?.realPath === filePath || activeFile?.id === filePath) {
          setActiveFile(prev => ({ ...prev, content }));
        }
        setOpenFiles(prev => prev.map(f => (f.realPath === filePath || f.id === filePath) ? { ...f, content } : f));
      }
      delete aiDiffSnapshotsRef.current[filePath];
      handleCloseDiff();
      toast.success('AI changes rejected — original restored', { duration: 1500 });
    } catch (err) {
      console.error('[AI Diff Reject] Error:', err);
      toast.error('Failed to restore original file');
    }
  };

  // Listen for AI diff activation events from AIActivityPanel
  useEffect(() => {
    const handleActivateAiDiff = (event) => {
      const { filePath, originalContent, fileName } = event?.detail || {};
      if (!filePath) return;

      // Open the file if not already active
      const normalize = (p) => String(p || '').replace(/\\/g, '/').toLowerCase();
      const targetNorm = normalize(filePath);
      const allFiles = Array.isArray(files) ? files : [];
      let target = allFiles.find(f => normalize(f.realPath || f.id) === targetNorm);

      if (target) {
        handleFileClick(target).then(() => {
          setDiffOriginalContent(originalContent || '');
          setDiffLabel(fileName || filePath.split(/[\\/]/).pop());
          setIsAiDiff(true);
          setDiffViewActive(true);
        });
      } else {
        // File might not be in explorer tree yet — read it directly
        setDiffOriginalContent(originalContent || '');
        setDiffLabel(fileName || filePath.split(/[\\/]/).pop());
        setIsAiDiff(true);
        setDiffViewActive(true);
      }
    };

    window.addEventListener('devstudio:ai-diff-activate', handleActivateAiDiff);
    return () => window.removeEventListener('devstudio:ai-diff-activate', handleActivateAiDiff);
  }, [files]);



  // Render sidebar content based on activeView or extension panels
  const renderSidebar = () => {
    switch (activeView) {
      case 'explorer':
        return <FileExplorer
          files={files}
          folders={folders}
          activeFile={activeFile}
          onFileClick={handleFileClick}
          onCreateFile={handleCreateFileDirect}
          onCreateFolder={handleCreateFolderDirect}
          onDeleteFile={promptDeleteFile}
          onDeleteFolder={promptDeleteFolder}
          onRenameFile={handleRenameFile}
          onRenameFolder={handleRenameFolder}
          projectName={projectName}
          onOpenFolder={handleOpenFolder}
          onRefreshExplorer={refreshDirectoryTree}
          problems={problems}
          rootPath={localStorage.getItem('devstudio-last-project')}
          editorInstance={editorInstance} // Pass editor instance for Outline
          onCompareVersion={handleCompareVersion} // Pass diff handler for Timeline
        />;
      case 'search':
        return <SearchPanel files={files} onFileClick={handleFileClick} onShowComingSoon={(f) => handleMenuAction('showComingSoon', f)} />;
      case 'git':
        return <GitPanel files={files} onShowComingSoon={(f) => handleMenuAction('showComingSoon', f)} rootPath={localStorage.getItem('devstudio-last-project')} />;
      case 'debug':
        return <DebugPanel onShowComingSoon={(f) => handleMenuAction('showComingSoon', f)} activeFile={activeFile} files={files} />;
      case 'extensions':
        return <ExtensionsPanel onSelectExtension={(ext) => handleExtensionSelect(ext)} />;
      case 'ai-gateway':
        return <AIActivityPanel />;
      case 'settings':
        return <SettingsPanel
          settings={settings}
          onSettingChange={(k, v) => {
            const newSettings = { ...settings, [k]: v };
            setSettings(newSettings);
            setSettingsUnsaved(true);
          }}
          onSave={(s) => {
            setSettings(s);
            localStorage.setItem('devstudio-settings', JSON.stringify(s));
            setSettingsUnsaved(false);
          }}
          unsaved={settingsUnsaved}
        />;

      default:
        // Check if an extension provides this panel
        const ExtensionComponent = registry.getSidebarPanel(activeView);
        if (ExtensionComponent) return <ExtensionComponent />;
        return null;
    }
  };

  // âœ… Render StatusBar (with extension items)
  const renderStatusBar = () => (
    <StatusBar
      extensionItems={statusBarItems}
      onItemClick={(command) => {
        if (!command) return;
        try {
          registry.executeCommand(command);
        } catch (e) {
          console.error('Error executing command:', command, e);
        }
      }}
    />
  );

  const effectiveThemeId = settings.themeSource === 'extension' && isThemeExtensionEnabled()
    ? (localStorage.getItem('devstudio-extension-theme') || settings.ideTheme || DEFAULT_IDE_THEME_ID)
    : (settings.ideTheme || DEFAULT_IDE_THEME_ID);

  const runtimeSettings = {
    ...settings,
    ideTheme: effectiveThemeId
  };

  const handleCloseSettings = () => {
    if (settingsUnsaved) {
      persistSettingsChanges();
      return;
    }
    setShowSettingsModal(false);
  };

  const discardSettingsChanges = () => {
    const saved = localStorage.getItem('devstudio-settings');
    setSettings(saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS);
    setSettingsUnsaved(false);
    setShowUnsavedWarning(false);
    setShowSettingsModal(false);
  };

  const persistSettingsChanges = () => {
    localStorage.setItem('devstudio-settings', JSON.stringify(settings));
    setSettingsUnsaved(false);
    setShowUnsavedWarning(false);
    setShowSettingsModal(false);
  };

  useEffect(() => {
    const openSourceControl = () => {
      setActiveView('git');
      setSidebarOpen(true);
    };

    const openProblems = () => {
      setTerminalOpen(true);
      if (terminalMaximized) setTerminalMaximized(false);
    };

    const openAIGateway = () => {
      setActiveView('ai-gateway');
      setSidebarOpen(true);
    };

    const openWhatsNew = () => setShowWhatsNew(true);
    const openSettings = () => setShowSettingsModal(true);

    window.addEventListener('devstudio:status-branch', openSourceControl);
    window.addEventListener('devstudio:status-problems', openProblems);
    window.addEventListener('devstudio:status-network', openAIGateway);
    window.addEventListener('devstudio:status-notifications', openWhatsNew);
    window.addEventListener('devstudio:status-settings', openSettings);

    return () => {
      window.removeEventListener('devstudio:status-branch', openSourceControl);
      window.removeEventListener('devstudio:status-problems', openProblems);
      window.removeEventListener('devstudio:status-network', openAIGateway);
      window.removeEventListener('devstudio:status-notifications', openWhatsNew);
      window.removeEventListener('devstudio:status-settings', openSettings);
    };
  }, [terminalMaximized]);

  return (
    <div
      className="h-screen flex flex-col bg-[#1e1e1e] text-[#cccccc] overflow-hidden"
      style={{ fontFamily: 'var(--ui-font-family)', fontWeight: 'var(--ui-font-weight)' }}
    >
      {/* Title Bar */}
      <div className="h-8 ide-activitybar flex-shrink-0 border-b border-[#2e2e2e] flex items-center justify-between px-3 text-xs ide-fg-secondary">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27ca40]" />
          </div>
          <MenuBar onAction={handleMenuAction} settings={runtimeSettings} onSettingToggle={(id) => setSettings(p => ({ ...p, [id]: !p[id] }))} />
        </div>
        <div className="flex-1 text-center">{settings.commandCenter !== false ? `${activeFile?.name || 'DevStudio'} - DevStudio` : ''}</div>

      </div>

      <div className={`flex-1 flex overflow-hidden ${settings.sidebarPosition === 'right' ? 'flex-row-reverse' : ''}`}>
        <ActivityBar
          activeView={activeView}
          setActiveView={setActiveView}
          aiOpen={false}
          setAiOpen={() => { }}
          installedExtensions={installedExtensions}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
          onOpenSettings={() => setShowSettingsModal(true)}
          extensionItems={extSidebarItems}
        />

        {sidebarOpen && (
          <div className={`relative flex h-full min-h-0 flex-shrink-0 flex-col ide-border sidebar-panel-glass ${settings.sidebarPosition === 'right' ? 'border-l' : 'border-r'}`} style={{ width: `${sidebarWidth}px` }}>
            {renderSidebar()}
            <div onMouseDown={startResizing} className={`absolute top-0 w-[8px] h-full cursor-col-resize z-50 hover:bg-[#007acc] opacity-0 hover:opacity-100 transition-opacity ${settings.sidebarPosition === 'right' ? 'left-[-4px]' : 'right-[-4px]'}`} />
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorTabs openFiles={openFiles} activeFile={activeFile} onTabClick={handleFileClick} onTabClose={handleTabClose} unsavedFiles={unsavedFiles} />
          {settings.showBreadcrumbs !== false && <Breadcrumbs file={activeFile} />}

          <div className="flex-1 flex flex-col overflow-hidden relative">

            {/* Main Editor Container */}
            <div className="flex flex-col overflow-hidden relative flex-1 min-h-0">

              {showExtensionDocs ? (
                <div className="p-4">Extension Docs</div>
              ) : selectedExtension ? (
                <div className="flex-1 relative">
                  <div className="p-4">
                    <h2 className="text-xl font-semibold">{selectedExtension.name || 'Extension'}</h2>
                    <p className="text-sm text-[#cfcfcf]">{selectedExtension.description}</p>
                  </div>
                  <button onClick={() => setSelectedExtension(null)} className="absolute top-2 right-4 bg-[#3c3c3c] p-1 rounded text-white hover:bg-red-500">âœ•</button>
                </div>
              ) : activeFile?.type === 'welcome' || showWelcome ? (
                <WelcomeScreen
                  onOpenFolder={handleOpenFolder}
                  onCreateFile={() => { setCreateType('file'); setShowCreateModal(true); }}
                  recentProjects={recentProjects}
                  onOpenRecent={handleOpenRecent}
                  onOpenSettings={() => setShowSettingsModal(true)}
                  onOpenCommandPalette={() => handleMenuAction('commandPalette')}
                  onOpenDocs={() => window.open('https://code.visualstudio.com/docs', '_blank')}
                  onOpenWhatsNew={() => setShowWhatsNew(true)}
                />
              ) : activeFile ? (
                activeFile.type === 'ai-artifact' ? (
                  <AIReportView file={activeFile} />
                ) : activeFile.type === 'image-preview' ? (
                  <ImagePreviewView file={activeFile} />
                ) : (
                  <CodeEditor
                    file={activeFile}
                    files={files}
                    onContentChange={handleContentChange}
                    settings={runtimeSettings}
                    onValidate={handleEditorValidate}
                    focusLine={focusLine}
                    focusSeverity={focusSeverity}
                    onMount={(editor) => setEditorInstance(editor)}
                    diffMode={diffViewActive}
                    originalContent={diffOriginalContent}
                    diffLabel={diffLabel}
                    onCloseDiff={handleCloseDiff}
                    isAiDiff={isAiDiff}
                    onAcceptDiff={handleAcceptAiDiff}
                    onRejectDiff={handleRejectAiDiff}
                  />
                )
              ) : (
                settings.showWelcomeOnStartup !== false ? (
                  <WelcomeScreen
                    onOpenFolder={handleOpenFolder}
                    onCreateFile={() => { setCreateType('file'); setShowCreateModal(true); }}
                    recentProjects={recentProjects}
                    onOpenRecent={handleOpenRecent}
                    onOpenSettings={() => setShowSettingsModal(true)}
                    onOpenCommandPalette={() => handleMenuAction('commandPalette')}
                    onOpenDocs={() => window.open('https://code.visualstudio.com/docs', '_blank')}
                    onOpenWhatsNew={() => setShowWhatsNew(true)}
                  />
                ) : (
                  <div className="flex-1 bg-[var(--ide-bg)]" />
                )
              )}

              {installedExtensions.includes('web-preview') && previewOpen && (
                <WebPreview
                  files={files}
                  isOpen={true}
                  onClose={() => setPreviewOpen(false)}
                  onMaximize={() => setPreviewMaximized(!previewMaximized)}
                  isMaximized={previewMaximized}
                />
              )}
            </div>

            {/* Terminal */}
            <div className={cn('border-t border-[#3c3c3c]', !terminalOpen && 'hidden')}>
              <Terminal
                isOpen={terminalOpen}
                onToggle={() => setTerminalOpen(prev => !prev)}
                onMaximize={() => setTerminalMaximized(prev => !prev)}
                isMaximized={terminalMaximized}
                problems={problems}
                outputLogs={outputLogs}
                onNavigateProblem={handleNavigateProblem}
                rootPath={localStorage.getItem('devstudio-last-project')}
                settings={runtimeSettings}
              />
            </div>
          </div>
        </div> {/* End of main editor column */}

      </div>

      {/* Floating AI Assistant */}
      <div className="ai-fab-wrap">
        {aiPanelOpen && (
          <div className="ai-fab-panel">
            <div className="ai-fab-panel-header">
              <span>AI Assistant</span>
              <button
                onClick={() => setAiPanelOpen(false)}
                className="ai-fab-close"
                title="Close AI Assistant"
              >
                ×
              </button>
            </div>
            <div className="ai-fab-panel-body">
              <AIActivityPanel />
            </div>
          </div>
        )}

        <button
          type="button"
          className={cn('ai-fab-button', aiPanelOpen && 'is-open')}
          onClick={() => setAiPanelOpen((prev) => !prev)}
          title={aiPanelOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
        >
          <RobotCompanion className="ai-fab-robot" />
        </button>
      </div>

      <DeleteModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} itemName={deleteTarget?.item?.name || ''} type={deleteTarget?.type || ''} />

      <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <TipsModal isOpen={showTips} onClose={() => setShowTips(false)} />
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <WelcomeModal isOpen={showWelcome} onClose={() => setShowWelcome(false)} />
      <GoToLineModal isOpen={showGoToLine} onClose={() => setShowGoToLine(false)} onGoToLine={(line) => console.log('Go to line:', line)} maxLine={activeFile?.content?.split('\n').length || 1} />
      <QuickOpenModal isOpen={showQuickOpen} onClose={() => setShowQuickOpen(false)} files={files} onSelect={handleFileClick} />
      <ComingSoonToast isOpen={comingSoon.show} feature={comingSoon.feature} onClose={() => setComingSoon({ show: false, feature: '' })} />

      <WhatsNewModal
        isOpen={showWhatsNew}
        onClose={() => setShowWhatsNew(false)}
      />
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onAction={handleMenuAction}
        files={files}
        initialMode={commandPaletteMode}
      />

      <CreateFileModal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); }} onCreate={createType === 'file' ? handleCreateFileDirect : handleCreateFolderDirect} folders={folders} type={createType} initialFolder={null} />

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100]">
          <div className="settings-workspace-shell w-screen h-screen overflow-hidden">
            <div className="settings-modal-header flex items-center justify-between px-6 py-4 border-b">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] sp-text-muted font-semibold">Workspace</p>
                <h2 className="text-lg font-semibold sp-text">Settings</h2>
              </div>
              <button onClick={handleCloseSettings} className="settings-close-text text-sm font-medium sp-text-secondary transition-colors">Close</button>
              <button onClick={() => setShowSettingsModal(false)} className="w-8 h-8 rounded-full settings-modal-close flex items-center justify-center sp-text-secondary text-xl transition-colors">Ã—</button>
            </div>
            <div className="h-[calc(100%-74px)] overflow-hidden">
              <SettingsPanel
                settings={settings}
                onSettingChange={(k, v) => {
                  const newSettings = { ...settings, [k]: v };
                  setSettings(newSettings);
                  setSettingsUnsaved(true);
                }}
                onSave={(s) => {
                  setSettings(s);
                  localStorage.setItem('devstudio-settings', JSON.stringify(s));
                  setSettingsUnsaved(false);
                }}
                unsaved={settingsUnsaved}
              />
            </div>
          </div>
        </div>
      )}

      {/* Unsaved changes warning */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-white mb-4">Unsaved Changes</h3>
            <p className="text-[#cccccc] mb-6">You have unsaved settings changes. Do you want to save them before closing?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowUnsavedWarning(false)} className="px-4 py-2 bg-[#3c3c3c] text-white rounded hover:bg-[#454545]">Cancel</button>
              <button onClick={discardSettingsChanges} className="px-4 py-2 bg-[#ff5f56] text-white rounded hover:bg-[#e54b42]">Don't Save</button>
              <button onClick={persistSettingsChanges} className="px-4 py-2 bg-[#007acc] text-white rounded hover:bg-[#005a9e]">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Projects Modal */}
      {showRecentModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={() => setShowRecentModal(false)}>
          <div
            className="settings-modal-container rounded-2xl w-96 max-h-[70vh] overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="settings-modal-header flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold sp-text">Recent Projects</h2>
              <button onClick={() => setShowRecentModal(false)} className="w-8 h-8 rounded-full settings-modal-close flex items-center justify-center sp-text-secondary text-xl transition-colors">Ã—</button>
            </div>
            <div className="p-2 max-h-[50vh] overflow-y-auto">
              {recentProjects.length > 0 ? (
                recentProjects.map((path, idx) => {
                  const folderName = path.split('\\').pop().split('/').pop();
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setShowRecentModal(false);
                        handleOpenRecent(path);
                      }}
                      className="w-full text-left p-3 rounded-lg menu-item hover:menu-item-hover transition-all duration-150 mb-1"
                    >
                      <div className="sp-text font-medium text-sm">{folderName}</div>
                      <div className="sp-text-muted text-xs truncate mt-0.5">{path}</div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-8 sp-text-muted text-sm">
                  No recent projects
                </div>
              )}
            </div>
            <div className="p-3 border-t settings-modal-header">
              <button
                onClick={() => {
                  localStorage.removeItem('devstudio-recents');
                  setRecentProjects([]);
                  toast.success('Cleared recent projects');
                }}
                className="w-full py-2 text-xs sp-text-secondary hover:sp-text transition-colors"
              >
                Clear Recent Projects
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      {settings.statusBarVisible !== false && renderStatusBar()}

      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'devstudio-toast',
          style: {
            background: 'var(--ide-sidebar)',
            border: '1px solid var(--ide-border)',
            borderRadius: '14px',
            color: 'var(--ide-fg)',
            boxShadow: '0 18px 50px rgba(0, 0, 0, 0.18)',
          },
        }}
      />
    </div>
  );
}


