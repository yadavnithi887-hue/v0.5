import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Type, Palette, Code, Layout, FileText,
  Sparkles, Save, User, Puzzle, Power, Info,
  CheckCircle2, XCircle, Book, Terminal, Keyboard,
  Shield, Eye, MousePointer, Columns, ChevronRight,
  Monitor, Layers, Braces, AlignLeft, RefreshCw, X,
  ChevronDown, Check, Brain, MessageSquare, Key
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { registry } from "@/modules/core/ExtensionRegistry";

// Custom Styled Select Component with smooth animations
const CustomSelect = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format display value (truncate long font names)
  const displayValue = (val) => {
    if (!val) return 'Select...';
    if (val.length > 25) return val.substring(0, 22) + '...';
    return val;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center justify-between gap-2 min-w-[180px] px-3 py-2 rounded-lg sp-input border text-sm font-medium transition-all duration-200 hover:border-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <span className="truncate sp-text">{displayValue(value)}</span>
        <ChevronDown
          size={14}
          className={`sp-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 min-w-[220px] max-h-[280px] overflow-y-auto rounded-xl border shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            background: 'rgba(30, 30, 30, 0.95)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="p-1">
            {options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all duration-150 ${value === opt
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <span className="flex-1 truncate">{opt}</span>
                {value === opt && (
                  <Check size={14} className="text-blue-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Complete settings schema with all categories
const defaultSchema = {
  editor: {
    icon: Type,
    label: 'Text Editor',
    description: 'Configure editor appearance and behavior',
    items: [
      { id: 'fontSize', label: 'Font Size', type: 'number', desc: 'Controls the font size in pixels.', default: 14, min: 8, max: 32 },
      {
        id: 'fontFamily',
        label: 'Font Family',
        type: 'select',
        options: [
          "'Fira Code', Consolas, monospace",
          "'Cascadia Code', Consolas, monospace",
          "'JetBrains Mono', monospace",
          "'Source Code Pro', monospace",
          "'IBM Plex Mono', monospace",
          "'Roboto Mono', monospace",
          "'Ubuntu Mono', monospace",
          "Consolas, 'Courier New', monospace",
          "'Monaco', monospace",
          "'Menlo', monospace"
        ],
        desc: 'Choose your preferred coding font.',
        default: "'Fira Code', Consolas, monospace"
      },
      { id: 'tabSize', label: 'Tab Size', type: 'number', desc: 'The number of spaces a tab is equal to.', default: 2, min: 1, max: 8 },
      { id: 'wordWrap', label: 'Word Wrap', type: 'select', options: ['off', 'on', 'wordWrapColumn', 'bounded'], desc: 'Controls how lines should wrap.', default: 'off' },
      { id: 'lineNumbers', label: 'Line Numbers', type: 'select', options: ['on', 'off', 'relative', 'interval'], desc: 'Control the display of line numbers.', default: 'on' },
      { id: 'cursorBlinking', label: 'Cursor Blinking', type: 'select', options: ['blink', 'smooth', 'phase', 'expand', 'solid'], desc: 'Control cursor animation style.', default: 'smooth' },
      { id: 'cursorStyle', label: 'Cursor Style', type: 'select', options: ['line', 'block', 'underline', 'line-thin', 'block-outline', 'underline-thin'], desc: 'Controls the cursor style.', default: 'line' },
      { id: 'cursorWidth', label: 'Cursor Width', type: 'number', desc: 'Controls cursor width in pixels (when using line cursor).', default: 2, min: 1, max: 5 },
      { id: 'insertSpaces', label: 'Insert Spaces', type: 'toggle', desc: 'Insert spaces when pressing Tab.', default: true },
      { id: 'renderWhitespace', label: 'Render Whitespace', type: 'select', options: ['none', 'boundary', 'selection', 'trailing', 'all'], desc: 'Controls rendering of whitespace characters.', default: 'selection' },
      { id: 'smoothScrolling', label: 'Smooth Scrolling', type: 'toggle', desc: 'Enable smooth scrolling in editor.', default: true },
      { id: 'formatOnSave', label: 'Format On Save', type: 'toggle', desc: 'Format the file on save.', default: false },
      { id: 'formatOnPaste', label: 'Format On Paste', type: 'toggle', desc: 'Format pasted content.', default: false },
      { id: 'bracketPairColorization', label: 'Bracket Pair Colorization', type: 'toggle', desc: 'Colorize matching bracket pairs.', default: true },
      { id: 'guidesIndentation', label: 'Indentation Guides', type: 'toggle', desc: 'Show indentation guide lines.', default: true },
      { id: 'autoClosingBrackets', label: 'Auto Closing Brackets', type: 'select', options: ['always', 'languageDefined', 'beforeWhitespace', 'never'], desc: 'Auto-close brackets when typing.', default: 'languageDefined' },
      { id: 'autoClosingQuotes', label: 'Auto Closing Quotes', type: 'select', options: ['always', 'languageDefined', 'beforeWhitespace', 'never'], desc: 'Auto-close quotes when typing.', default: 'languageDefined' },
    ]
  },

  aiGateway: {
    icon: Brain,
    label: 'AI Gateway',
    description: 'Configure and connect your AI Brain',
    items: [] // Handled by custom renderer
  },

  appearance: {
    icon: Palette,
    label: 'Appearance',
    description: 'Customize visual elements',
    items: [
      { id: 'minimap', label: 'Show Minimap', type: 'toggle', desc: 'Controls whether the minimap is shown.', default: true },
      { id: 'minimapSide', label: 'Minimap Side', type: 'select', options: ['right', 'left'], desc: 'Position of the minimap.', default: 'right' },
      { id: 'minimapScale', label: 'Minimap Scale', type: 'number', desc: 'Scale of the minimap (1-3).', default: 1, min: 1, max: 3 },
      { id: 'minimapShowSlider', label: 'Minimap Slider', type: 'select', options: ['always', 'mouseover'], desc: 'When to show the minimap slider.', default: 'mouseover' },
      { id: 'scrollbar', label: 'Scrollbar Visibility', type: 'select', options: ['auto', 'visible', 'hidden'], desc: 'Controls scrollbar visibility.', default: 'auto' },
      { id: 'folding', label: 'Code Folding', type: 'toggle', desc: 'Enable code folding.', default: true },
      { id: 'foldingHighlight', label: 'Folding Highlight', type: 'toggle', desc: 'Highlight folded code regions.', default: true },
      { id: 'renderLineHighlight', label: 'Current Line Highlight', type: 'select', options: ['none', 'line', 'gutter', 'all'], desc: 'Controls how current line is highlighted.', default: 'line' },
      { id: 'showBreadcrumbs', label: 'Breadcrumbs', type: 'toggle', desc: 'Show file path breadcrumbs above editor.', default: true },
      { id: 'activityBarVisible', label: 'Activity Bar', type: 'toggle', desc: 'Show activity bar on the side.', default: true },
      { id: 'statusBarVisible', label: 'Status Bar', type: 'toggle', desc: 'Show status bar at the bottom.', default: true },
      { id: 'sidebarPosition', label: 'Sidebar Position', type: 'select', options: ['left', 'right'], desc: 'Position of the sidebar.', default: 'left' },
    ]
  },

  files: {
    icon: FileText,
    label: 'Files',
    description: 'File handling preferences',
    items: [
      { id: 'autoSave', label: 'Auto Save', type: 'select', options: ['off', 'afterDelay', 'onFocusChange', 'onWindowChange'], desc: 'Controls auto save behavior.', default: 'off' },
      { id: 'autoSaveDelay', label: 'Auto Save Delay', type: 'number', desc: 'Delay in milliseconds before auto saving.', default: 1000, min: 100, max: 10000 },
      { id: 'confirmDelete', label: 'Confirm Delete', type: 'toggle', desc: 'Ask for confirmation when deleting files.', default: true },
      { id: 'trimTrailingWhitespace', label: 'Trim Trailing Whitespace', type: 'toggle', desc: 'Remove trailing whitespace when saving.', default: false },
      { id: 'insertFinalNewline', label: 'Insert Final Newline', type: 'toggle', desc: 'Insert a newline at the end of file on save.', default: false },
      { id: 'trimFinalNewlines', label: 'Trim Final Newlines', type: 'toggle', desc: 'Trim multiple final newlines to one.', default: false },
      { id: 'hotExit', label: 'Hot Exit', type: 'toggle', desc: 'Remember unsaved files when closing.', default: true },
      { id: 'defaultLanguage', label: 'Default Language', type: 'select', options: ['plaintext', 'javascript', 'typescript', 'python', 'html', 'css', 'json'], desc: 'Default language for new files.', default: 'plaintext' },
    ]
  },

  terminal: {
    icon: Terminal,
    label: 'Terminal',
    description: 'Integrated terminal settings',
    items: [
      { id: 'terminalFontSize', label: 'Font Size', type: 'number', desc: 'Terminal font size in pixels.', default: 14, min: 8, max: 24 },
      {
        id: 'terminalFontFamily', label: 'Font Family', type: 'select', options: [
          "'Fira Code', monospace",
          "'Cascadia Code', monospace",
          "'JetBrains Mono', monospace",
          "Consolas, monospace",
          "'Ubuntu Mono', monospace"
        ], desc: 'Terminal font family.', default: "'Fira Code', monospace"
      },
      { id: 'terminalCursorBlinking', label: 'Cursor Blinking', type: 'toggle', desc: 'Enable cursor blinking in terminal.', default: true },
      { id: 'terminalCursorStyle', label: 'Cursor Style', type: 'select', options: ['block', 'underline', 'bar'], desc: 'Terminal cursor style.', default: 'block' },
      { id: 'terminalScrollback', label: 'Scrollback Lines', type: 'number', desc: 'Maximum lines to keep in terminal history.', default: 1000, min: 100, max: 10000 },
      { id: 'terminalCopyOnSelection', label: 'Copy On Selection', type: 'toggle', desc: 'Automatically copy selected text.', default: false },
      { id: 'terminalBellSound', label: 'Bell Sound', type: 'toggle', desc: 'Play bell sound for terminal alerts.', default: false },
    ]
  },

  keyboard: {
    icon: Keyboard,
    label: 'Keyboard',
    description: 'Keyboard shortcuts and bindings',
    items: [
      { id: 'vimMode', label: 'Vim Mode', type: 'toggle', desc: 'Enable Vim keybindings in editor.', default: false },
      { id: 'emacsMode', label: 'Emacs Mode', type: 'toggle', desc: 'Enable Emacs keybindings in editor.', default: false },
      { id: 'multiCursorModifier', label: 'Multi-Cursor Modifier', type: 'select', options: ['ctrlCmd', 'alt'], desc: 'Key for adding multiple cursors.', default: 'alt' },
      { id: 'wordSeparators', label: 'Word Separators', type: 'text', desc: 'Characters used as word separators.', default: '`~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?' },
    ]
  },

  privacy: {
    icon: Shield,
    label: 'Privacy',
    description: 'Telemetry and data collection',
    items: [
      { id: 'telemetryEnabled', label: 'Telemetry', type: 'toggle', desc: 'Allow sending anonymous usage data.', default: false },
      { id: 'crashReporter', label: 'Crash Reporter', type: 'toggle', desc: 'Send crash reports to improve the app.', default: false },
    ]
  },

  extensionsManage: {
    icon: Puzzle,
    label: 'Extensions',
    description: 'Manage installed extensions',
    items: []
  },

  extensionSettings: {
    icon: Code,
    label: 'Extension Settings',
    description: 'Configure extension options',
    items: []
  },

  accounts: {
    icon: User,
    label: 'Accounts',
    description: 'Manage connected accounts',
    items: []
  }
};

export default function SettingsPanel({ settings, onSave, onSettingChange }) {
  const [schema, setSchema] = useState(defaultSchema);
  const [activeCat, setActiveCat] = useState('editor');
  const [localSettings, setLocalSettings] = useState(settings);
  const [search, setSearch] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [githubUser, setGithubUser] = useState(localStorage.getItem('github_user'));
  const [extensions, setExtensions] = useState([]);
  const [selectedExtension, setSelectedExtension] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // AI Gateway State
  const [authState, setAuthState] = useState({ authenticated: false, email: null });
  const [gatewayConfig, setGatewayConfig] = useState({ botToken: '', chatId: '', model: 'google-antigravity/gemini-3-flash' });
  const [authLoading, setAuthLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);

  // Antigravity Auth State
  const [manualAuthUrl, setManualAuthUrl] = useState('');
  const [pastedUrl, setPastedUrl] = useState('');
  const [clientIdInput, setClientIdInput] = useState('1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com');
  const [clientSecretInput, setClientSecretInput] = useState('');

  // Telegram Config State
  const [telegramConfigured, setTelegramConfigured] = useState({ isConfigured: false, maskedToken: null, chatId: null });

  useEffect(() => {
    if (JSON.stringify(settings) !== JSON.stringify(localSettings)) {
      setLocalSettings(settings);
      setHasChanges(false);
    }
  }, [settings]);

  useEffect(() => {
    loadExtensions();
    // Load auth status and gateway config on mount
    fetch('http://localhost:3001/api/auth/status').then(r => r.json()).then(setAuthState).catch(() => { });
    fetch('http://localhost:3001/api/gateway/status').then(r => r.json()).then(data => {
      if (data.botToken) {
        setTelegramConfigured({ isConfigured: true, maskedToken: data.botToken, chatId: data.chatId });
      }
      setGatewayConfig(prev => ({
        ...prev,
        model: data.model || 'gemini-3-flash',
        chatId: data.chatId || '',
        botToken: '' // Keep input empty
      }));
    }).catch(() => { });
  }, []);

  const loadExtensions = () => {
    const allExtensions = registry.getAllExtensions();
    setExtensions(allExtensions);
    const extSettings = registry.getSettings();
    setSchema(prev => ({
      ...prev,
      extensionSettings: {
        ...prev.extensionSettings,
        items: extSettings
      }
    }));
  };

  const handleChange = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    if (onSettingChange) {
      onSettingChange(key, value);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 500));
    onSave(localSettings);
    setHasChanges(false);
    setIsSaving(false);
    toast.success("Settings saved successfully!");
  };

  const toggleExtension = (extensionId) => {
    const ext = extensions.find(e => e.id === extensionId);
    const newState = !ext.enabled;
    registry.setExtensionEnabled(extensionId, newState);
    loadExtensions();
    toast.success(
      `${ext.name} ${newState ? 'enabled' : 'disabled'}. Reload to apply changes.`,
      { action: { label: 'Reload', onClick: () => window.location.reload() } }
    );
  };

  const handleSaveGatewayConfig = async () => {
    setConfigLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/gateway/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gatewayConfig)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Gateway configuration saved!");
        setTelegramConfigured({ isConfigured: true, maskedToken: '***' + gatewayConfig.botToken.slice(-4), chatId: gatewayConfig.chatId });
        setGatewayConfig(p => ({ ...p, botToken: '' })); // clear input
      } else {
        toast.error("Failed to save config: " + data.error);
      }
    } catch (e) {
      toast.error("Error saving gateway config");
    } finally {
      setConfigLoading(false);
    }
  };

  const renderAIGatewaySettings = () => (
    <div className="space-y-6">
      <div className="p-5 rounded-xl sp-border border sp-bg-active">
        <h4 className="text-sm font-semibold sp-text mb-3 flex items-center gap-2">
          <Brain size={16} className="text-purple-500" />
          Google Authentication
        </h4>
        <p className="text-xs sp-text-secondary mb-4">
          Connect your Google account to access Gemini API. Authentication happens locally via PKCE.
        </p>
        {authState.authenticated ? (
          <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 p-3 rounded-lg">
            <CheckCircle2 size={18} className="text-green-500" />
            <div>
              <p className="text-sm font-medium text-green-400">Connected</p>
              <p className="text-xs text-green-300/70">{authState.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={async () => {
                await fetch('http://localhost:3001/api/auth/logout', { method: 'POST' });
                setAuthState({ authenticated: false });
                toast.success("Logged out");
              }}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-xs text-amber-400 bg-amber-500/10 p-3 rounded border border-amber-500/20">
              <span className="font-semibold block mb-1">Google Antigravity OAuth</span>
              Follow the steps below to authenticate manually.
            </div>

            {!manualAuthUrl ? (
              <div className="flex flex-col gap-2">
                <input
                  placeholder="OAuth Client ID (Optional / Default provided)"
                  className="w-full sp-input border rounded px-3 py-1.5 text-xs text-zinc-400"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                />
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="OAuth Client Secret (Required for Antigravity)"
                    className="flex-1 sp-input border rounded px-3 py-1.5 text-xs text-zinc-400"
                    value={clientSecretInput}
                    onChange={(e) => setClientSecretInput(e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      const clientId = clientIdInput;
                      const clientSecret = clientSecretInput;
                      setAuthLoading(true);

                      console.log('Starting Antigravity OAuth with Client ID:', clientId);

                      fetch('http://localhost:3001/api/auth/start', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ clientId, clientSecret })
                      }).then(r => r.json()).then(data => {
                        if (data.authURL) {
                          setManualAuthUrl(data.authURL);
                          window.open(data.authURL, '_blank');
                          toast.info("Auth URL generated. Please sign in and copy the redirect URL.");
                        } else {
                          toast.error("Backend error: " + (data.error || 'Unknown response'));
                        }
                      }).catch(err => {
                        console.error('Auth start error:', err);
                        toast.error("Failed to start auth. Is backend running? " + err.message);
                      }).finally(() => setAuthLoading(false));
                    }}
                    disabled={authLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 whitespace-nowrap px-3"
                  >
                    {authLoading ? 'Generating...' : 'Start Antigravity OAuth'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">1. Copy/Open Auth URL:</label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={manualAuthUrl}
                      className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-zinc-400 select-all"
                    />
                    <Button size="sm" variant="ghost" onClick={() => window.open(manualAuthUrl, '_blank')} title="Open in Browser">
                      <Layout size={14} />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-1">2. Paste Redirect URL here:</label>
                  <textarea
                    value={pastedUrl}
                    onChange={e => setPastedUrl(e.target.value)}
                    placeholder="http://localhost:XXXX/oauth-callback?code=..."
                    className="w-full h-20 bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs font-mono focus:border-purple-500/50 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setManualAuthUrl(''); setPastedUrl(''); }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (!pastedUrl) return toast.error("Please paste the URL first");
                      setAuthLoading(true);
                      fetch('http://localhost:3001/api/auth/manual-callback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: pastedUrl })
                      }).then(r => r.json()).then(data => {
                        if (data.success) {
                          toast.success("Successfully authenticated!");
                          setManualAuthUrl('');
                          setPastedUrl('');
                          // Refresh status
                          fetch('http://localhost:3001/api/auth/status').then(r => r.json()).then(setAuthState);
                        } else {
                          toast.error("Auth failed: " + (data.error || 'Unknown error'));
                        }
                      }).catch(err => {
                        toast.error("Network error: " + err.message);
                      }).finally(() => setAuthLoading(false));
                    }}
                    disabled={authLoading}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs"
                  >
                    {authLoading ? 'Verifying...' : 'Complete Login'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-5 rounded-xl sp-border border sp-bg-active">
        <h4 className="text-sm font-semibold sp-text mb-3 flex items-center gap-2">
          <MessageSquare size={16} className="text-blue-400" />
          Telegram Gateway
        </h4>
        <p className="text-xs sp-text-secondary mb-4">
          Configure your Telegram Bot to control the IDE remotely.
        </p>

        <div className="space-y-4">
          {telegramConfigured.isConfigured ? (
            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 p-3 rounded-lg mb-4">
              <CheckCircle2 size={18} className="text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-400">Configured</p>
                <p className="text-xs text-green-300/70">Chat ID: {telegramConfigured.chatId}</p>
                <p className="text-[10px] text-green-300/50 font-mono mt-0.5">Token: {telegramConfigured.maskedToken}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                onClick={() => setTelegramConfigured({ isConfigured: false, maskedToken: null, chatId: null })}
              >
                Edit Config
              </Button>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-medium sp-text-secondary block mb-1.5">Bot Token</label>
                <div className="flex items-center gap-2">
                  <div className="bg-black/20 p-2 rounded text-zinc-500"><Key size={14} /></div>
                  <input
                    type="password"
                    value={gatewayConfig.botToken}
                    onChange={(e) => setGatewayConfig(p => ({ ...p, botToken: e.target.value }))}
                    placeholder="123456:ABC-DEF..."
                    className="flex-1 sp-input border rounded px-3 py-1.5 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium sp-text-secondary block mb-1.5">Chat ID</label>
                <div className="flex items-center gap-2">
                  <div className="bg-black/20 p-2 rounded text-zinc-500"><User size={14} /></div>
                  <input
                    type="text"
                    value={gatewayConfig.chatId}
                    onChange={(e) => setGatewayConfig(p => ({ ...p, chatId: e.target.value }))}
                    placeholder="Your numeric Chat ID"
                    className="flex-1 sp-input border rounded px-3 py-1.5 text-sm font-mono"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-medium sp-text-secondary block mb-1.5">AI Model</label>
            <CustomSelect
              value={gatewayConfig.model}
              options={['gemini-3-flash', 'gemini-3-pro-high', 'gemini-3-pro-low', 'claude-sonnet-4.6', 'claude-opus-4.6', 'gpt-oss-120b']}
              onChange={(val) => setGatewayConfig(p => ({ ...p, model: val }))}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            {!telegramConfigured.isConfigured && (
              <Button
                onClick={handleSaveGatewayConfig}
                disabled={configLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs"
              >
                {configLoading ? 'Saving...' : 'Save Config'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderControl = (item) => {
    const val = localSettings[item.id] !== undefined
      ? localSettings[item.id]
      : (item.default !== undefined ? item.default : '');

    if (item.type === 'toggle') {
      return (
        <Switch
          checked={!!val}
          onCheckedChange={c => handleChange(item.id, c)}
          className="data-[state=checked]:bg-blue-500"
        />
      );
    }

    if (item.type === 'number') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={item.min || 0}
            max={item.max || 100}
            value={val}
            onChange={e => handleChange(item.id, parseInt(e.target.value))}
            className="w-24 h-1 rounded-full appearance-none cursor-pointer sp-input [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <input
            type="number"
            min={item.min}
            max={item.max}
            value={val}
            onChange={e => handleChange(item.id, parseInt(e.target.value) || item.min || 0)}
            className="w-16 sp-input border rounded-lg px-2 py-1 text-sm outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
      );
    }

    if (item.type === 'select') {
      return (
        <CustomSelect
          value={val}
          options={item.options || []}
          onChange={(v) => handleChange(item.id, v)}
        />
      );
    }

    if (item.type === 'color') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={val || '#000000'}
            onChange={e => handleChange(item.id, e.target.value)}
            className="w-10 h-8 rounded-lg cursor-pointer sp-border border"
          />
          <span className="text-xs sp-text-muted font-mono">{val}</span>
        </div>
      );
    }

    return (
      <input
        type={item.type === 'password' ? 'password' : 'text'}
        value={val}
        onChange={e => handleChange(item.id, e.target.value)}
        className="sp-input border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500/50 transition-colors w-64"
        placeholder={item.desc}
      />
    );
  };

  const renderExtensionsManager = () => {
    const filteredExts = search
      ? extensions.filter(ext =>
        ext.name.toLowerCase().includes(search.toLowerCase()) ||
        ext.description?.toLowerCase().includes(search.toLowerCase())
      )
      : extensions;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-4 sp-border border-b">
          <div>
            <h3 className="text-sm font-semibold sp-text">Installed Extensions</h3>
            <p className="text-xs sp-text-muted mt-1">
              {extensions.filter(e => e.enabled).length} enabled / {extensions.length} total
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="h-8 text-xs sp-btn rounded-lg px-3 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={12} />
            Reload Window
          </button>
        </div>

        <div className="space-y-3">
          {filteredExts.map(ext => (
            <div
              key={ext.id}
              className={`p-4 rounded-xl sp-border border transition-all duration-200 ${ext.enabled
                ? 'sp-bg-active'
                : 'opacity-60'
                }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h4 className="text-sm font-semibold sp-text">{ext.name}</h4>
                    {ext.enabled ? (
                      <CheckCircle2 size={14} className="text-green-500" />
                    ) : (
                      <XCircle size={14} className="sp-text-muted" />
                    )}
                  </div>
                  <p className="text-xs sp-text-secondary mb-2 line-clamp-2">
                    {ext.description || 'No description available'}
                  </p>
                  <div className="flex items-center gap-3 text-xs sp-text-muted">
                    <span>v{ext.version || '1.0.0'}</span>
                    {ext.author && <span>• {ext.author}</span>}
                  </div>
                </div>

                <div className="flex flex-col gap-2 items-end">
                  <Switch
                    checked={ext.enabled}
                    onCheckedChange={() => toggleExtension(ext.id)}
                    className="data-[state=checked]:bg-blue-500"
                  />
                  {ext.readme && (
                    <button
                      onClick={() => setSelectedExtension(ext)}
                      className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
                    >
                      <Book size={12} />
                      Docs
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredExts.length === 0 && (
          <div className="text-center py-12">
            <Puzzle size={40} className="mx-auto mb-3 sp-text-muted" />
            <p className="text-sm sp-text-muted">No extensions found</p>
          </div>
        )}
      </div>
    );
  };

  const renderExtensionModal = () => {
    if (!selectedExtension) return null;

    return (
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={() => setSelectedExtension(null)}
      >
        <div
          className="settings-panel sp-border border rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden m-4 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-5 sp-border border-b flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold sp-text">{selectedExtension.name}</h3>
              <p className="text-xs sp-text-muted">v{selectedExtension.version}</p>
            </div>
            <button
              onClick={() => setSelectedExtension(null)}
              className="w-8 h-8 rounded-full sp-bg-hover flex items-center justify-center sp-text-secondary hover:sp-text transition-all"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-5 overflow-y-auto max-h-[60vh]">
            <pre className="text-sm sp-text-secondary whitespace-pre-wrap font-mono leading-relaxed">
              {selectedExtension.readme || 'No documentation available'}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  const filteredSchema = React.useMemo(() => {
    if (!search) return schema;
    const filtered = {};
    Object.entries(schema).forEach(([key, cat]) => {
      // Always show special categories if they match or if items match
      // If category name matches, show all items
      if (key === 'extensionsManage' || key === 'accounts' || key === 'aiGateway') {
        if (cat.label.toLowerCase().includes(search.toLowerCase())) {
          filtered[key] = cat;
        }
        return;
      }

      const filteredItems = cat.items.filter(item =>
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        item.desc?.toLowerCase().includes(search.toLowerCase())
      );
      if (filteredItems.length > 0 || cat.label.toLowerCase().includes(search.toLowerCase())) {
        filtered[key] = { ...cat, items: filteredItems };
      }
    });
    return filtered;
  }, [schema, search]);

  return (
    <div className="settings-panel h-full flex flex-col overflow-hidden">
      {/* Glass Header */}
      <div className="settings-panel-header p-4 sp-border border-b flex-shrink-0">
        <h2 className="text-xs font-bold uppercase tracking-wider sp-text-muted mb-3">Settings</h2>
        <div className="flex items-center rounded-xl px-3 py-2 sp-input border">
          <Search size={14} className="sp-text-muted" />
          <input
            className="bg-transparent border-none text-sm px-2 py-0.5 flex-1 outline-none sp-text placeholder:sp-text-muted"
            placeholder="Search settings..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="sp-text-muted hover:sp-text transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="settings-panel-sidebar w-52 sp-border border-r overflow-y-auto py-2 flex-shrink-0">
          {Object.entries(filteredSchema).map(([key, cat]) => (
            <div
              key={key}
              onClick={() => setActiveCat(key)}
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg cursor-pointer transition-all duration-150 ${activeCat === key
                ? 'sp-bg-active sp-text'
                : 'sp-text-secondary sp-bg-hover'
                }`}
            >
              <cat.icon size={16} className={activeCat === key ? 'text-blue-500' : ''} />
              <span className="text-sm font-medium">{cat.label}</span>
              {activeCat === key && (
                <ChevronRight size={14} className="ml-auto text-blue-500" />
              )}
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Category Header */}
          <div className="settings-panel-content-header sticky top-0 z-10 px-6 py-4 sp-border border-b">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold sp-text flex items-center gap-2">
                  {React.createElement(filteredSchema[activeCat]?.icon || Info, { size: 20, className: 'text-blue-500' })}
                  {filteredSchema[activeCat]?.label}
                </h3>
                <p className="text-xs sp-text-muted mt-0.5">
                  {filteredSchema[activeCat]?.description}
                </p>
              </div>
              {activeCat !== 'accounts' && activeCat !== 'extensionsManage' && activeCat !== 'aiGateway' && (
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                  className={`h-9 px-4 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${hasChanges
                    ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'sp-btn cursor-not-allowed opacity-50'
                    }`}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Save Changes
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Settings Content */}
          <div className="p-6">
            {activeCat === 'aiGateway' ? (
              renderAIGatewaySettings()
            ) : activeCat === 'extensionsManage' ? (
              renderExtensionsManager()
            ) : activeCat === 'accounts' ? (
              <div className="p-5 rounded-xl sp-border border sp-bg-active">
                <h4 className="text-sm font-semibold sp-text mb-3 flex items-center gap-2">
                  <User size={16} className="text-blue-500" />
                  GitHub Account
                </h4>
                {githubUser ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold">
                      {githubUser[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm sp-text font-medium">{githubUser}</p>
                      <p className="text-xs text-green-500">Connected</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm sp-text-secondary">Not connected. Use Source Control panel to sign in.</p>
                )}
              </div>
            ) : filteredSchema[activeCat]?.items.length === 0 ? (
              <div className="text-center py-16">
                <Info size={40} className="mx-auto mb-3 sp-text-muted" />
                <p className="text-sm sp-text-muted">No settings available in this category</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredSchema[activeCat]?.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="group flex items-center justify-between p-4 rounded-xl sp-bg-hover transition-all duration-150"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <label className="text-sm font-medium sp-text block mb-0.5">
                        {item.label}
                        {item.extensionId && (
                          <span className="ml-2 text-[10px] text-blue-500 font-normal px-1.5 py-0.5 bg-blue-500/10 rounded">
                            Extension
                          </span>
                        )}
                      </label>
                      <p className="text-xs sp-text-muted leading-relaxed">{item.desc}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {renderControl(item)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {renderExtensionModal()}
    </div>
  );
}