import React from 'react';
import { X, Keyboard, Lightbulb, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// Keyboard Shortcuts Modal
export function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'General', items: [
        { keys: 'Ctrl+N', description: 'New File' },
        { keys: 'Ctrl+Shift+N', description: 'New Folder' },
        { keys: 'Ctrl+S', description: 'Save' },
        { keys: 'Ctrl+W', description: 'Close Editor' },
        { keys: 'Ctrl+Shift+P', description: 'Command Palette' },
      ]
    },
    {
      category: 'Editor', items: [
        { keys: 'Ctrl+F', description: 'Find' },
        { keys: 'Ctrl+H', description: 'Replace' },
        { keys: 'Ctrl+G', description: 'Go to Line' },
        { keys: 'Ctrl+/', description: 'Toggle Comment' },
        { keys: 'Ctrl+Z', description: 'Undo' },
        { keys: 'Ctrl+Y', description: 'Redo' },
      ]
    },
    {
      category: 'View', items: [
        { keys: 'Ctrl+`', description: 'Toggle Terminal' },

        { keys: 'Ctrl+B', description: 'Toggle Sidebar' },
        { keys: 'Ctrl+Shift+E', description: 'Explorer' },
        { keys: 'Ctrl+Shift+F', description: 'Search' },
      ]
    },
    {
      category: 'Code', items: [
        { keys: 'Ctrl+Space', description: 'Trigger Suggestions' },
        { keys: 'Tab', description: 'Accept Suggestion' },
        { keys: 'Esc', description: 'Close Suggestions' },
        { keys: 'F2', description: 'Rename Symbol' },
      ]
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#252526] rounded-lg w-[600px] max-h-[80vh] shadow-2xl border border-[#3c3c3c] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#3c3c3c]">
          <div className="flex items-center gap-2 text-white">
            <Keyboard size={20} />
            <span className="font-medium">Keyboard Shortcuts</span>
          </div>
          <button onClick={onClose} className="text-[#858585] hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-2 gap-6">
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h3 className="text-sm font-medium text-[#007acc] mb-2">{section.category}</h3>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <div key={item.keys} className="flex items-center justify-between py-1">
                      <span className="text-sm text-[#cccccc]">{item.description}</span>
                      <kbd className="px-2 py-0.5 bg-[#3c3c3c] rounded text-xs text-[#cccccc] font-mono">
                        {item.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tips Modal
export function TipsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const tips = [

    {
      title: 'Quick File Navigation',
      description: 'Use Ctrl+P to quickly open any file by typing part of its name.',
      icon: Lightbulb,
    },
    {
      title: 'Code Suggestions',
      description: 'Press Ctrl+Space to trigger code suggestions. Use Tab to accept and Esc to dismiss.',
      icon: Lightbulb,
    },
    {
      title: 'Multi-cursor Editing',
      description: 'Hold Alt and click to add multiple cursors. Edit multiple lines simultaneously.',
      icon: Lightbulb,
    },
    {
      title: 'Web Preview',
      description: 'Install the Web Preview extension to see live preview of your HTML/CSS/JS projects.',
      icon: Lightbulb,
    },
    {
      title: 'Terminal Integration',
      description: 'Press Ctrl+` to toggle the integrated terminal. Run commands without leaving the editor.',
      icon: Lightbulb,
    },
    {
      title: 'Search Across Files',
      description: 'Use Ctrl+Shift+F to search across all files in your project.',
      icon: Lightbulb,
    },
    {
      title: 'Format on Save',
      description: 'Enable auto-formatting to keep your code clean and consistent.',
      icon: Lightbulb,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#252526] rounded-lg w-[500px] max-h-[80vh] shadow-2xl border border-[#3c3c3c] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#3c3c3c]">
          <div className="flex items-center gap-2 text-white">
            <Lightbulb size={20} className="text-yellow-400" />
            <span className="font-medium">Tips and Tricks</span>
          </div>
          <button onClick={onClose} className="text-[#858585] hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
          {tips.map((tip, idx) => (
            <div key={idx} className="p-3 bg-[#1e1e1e] rounded-lg border border-[#3c3c3c]">
              <div className="flex items-center gap-2 mb-1">
                <tip.icon size={16} className="text-[#007acc]" />
                <span className="font-medium text-white text-sm">{tip.title}</span>
              </div>
              <p className="text-xs text-[#858585] ml-6">{tip.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// About Modal
export function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#252526] rounded-lg w-[400px] shadow-2xl border border-[#3c3c3c] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#3c3c3c]">
          <div className="flex items-center gap-2 text-white">
            <Info size={20} />
            <span className="font-medium">About DevStudio</span>
          </div>
          <button onClick={onClose} className="text-[#858585] hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#007acc] to-[#00a2ff] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">⌘</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">DevStudio</h2>
          <p className="text-sm text-[#858585] mb-4">Version 1.0.0</p>
          <p className="text-xs text-[#6e6e6e] mb-4">
            A powerful code editor,<br />
            inspired by VS Code and Cursor.
          </p>
          <div className="text-xs text-[#6e6e6e] space-y-1">
            <p>Built with React & Tailwind CSS</p>
            <p>© 2024 DevStudio. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Welcome Modal
export function WelcomeModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#252526] rounded-lg w-[600px] shadow-2xl border border-[#3c3c3c] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#3c3c3c]">
          <div className="flex items-center gap-2 text-white">
            <span className="text-2xl">👋</span>
            <span className="font-medium">Welcome to DevStudio</span>
          </div>
          <button onClick={onClose} className="text-[#858585] hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-[#1e1e1e] rounded-lg border border-[#3c3c3c]">
              <div className="text-2xl mb-2">📁</div>
              <h3 className="font-medium text-white text-sm mb-1">File Explorer</h3>
              <p className="text-xs text-[#858585]">Create and manage files with ease. Supports multiple languages.</p>
            </div>

            <div className="p-4 bg-[#1e1e1e] rounded-lg border border-[#3c3c3c]">
              <div className="text-2xl mb-2">🌐</div>
              <h3 className="font-medium text-white text-sm mb-1">Web Preview</h3>
              <p className="text-xs text-[#858585]">See live preview of your web projects in real-time.</p>
            </div>
            <div className="p-4 bg-[#1e1e1e] rounded-lg border border-[#3c3c3c]">
              <div className="text-2xl mb-2">💻</div>
              <h3 className="font-medium text-white text-sm mb-1">Terminal</h3>
              <p className="text-xs text-[#858585]">Integrated terminal for running commands.</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#007acc]/20 rounded-lg border border-[#007acc]/30">
            <div>
              <p className="text-sm text-white font-medium">Quick Start</p>
              <p className="text-xs text-[#858585]">Press Ctrl+N to create a new file</p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#007acc] text-white text-sm rounded hover:bg-[#006bb3]"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Coming Soon Toast
export function ComingSoonToast({ isOpen, feature, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-[#252526] border border-[#454545] rounded-lg shadow-xl p-4 z-50 animate-in slide-in-from-right">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-[#3c3c3c] rounded flex items-center justify-center">
          <span className="text-lg">🚧</span>
        </div>
        <div>
          <p className="text-sm text-white font-medium">Coming Soon</p>
          <p className="text-xs text-[#858585] mt-0.5">"{feature}" feature is under development</p>
        </div>
        <button onClick={onClose} className="text-[#858585] hover:text-white">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// Go to Line Modal
export function GoToLineModal({ isOpen, onClose, onGoToLine, maxLine }) {
  const [lineNumber, setLineNumber] = React.useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const line = parseInt(lineNumber);
    if (line > 0 && line <= maxLine) {
      onGoToLine(line);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-32 z-50">
      <div className="bg-[#252526] rounded-lg w-[400px] shadow-2xl border border-[#3c3c3c] overflow-hidden">
        <form onSubmit={handleSubmit} className="p-4">
          <label className="text-sm text-[#cccccc] mb-2 block">
            Go to Line (1 - {maxLine})
          </label>
          <input
            type="number"
            min="1"
            max={maxLine}
            value={lineNumber}
            onChange={(e) => setLineNumber(e.target.value)}
            placeholder="Enter line number"
            className="w-full bg-[#3c3c3c] border border-[#3c3c3c] rounded px-3 py-2 text-white text-sm outline-none focus:border-[#007acc]"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-[#cccccc] hover:bg-[#3c3c3c] rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm bg-[#007acc] text-white rounded hover:bg-[#006bb3]"
            >
              Go
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Quick Open Modal
export function QuickOpenModal({ isOpen, onClose, files, onSelect }) {
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const filteredFiles = query
    ? files.filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
    : files;

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredFiles.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredFiles[selectedIndex]) {
      onSelect(filteredFiles[selectedIndex]);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50">
      <div className="bg-[#252526] rounded-lg w-[500px] shadow-2xl border border-[#3c3c3c] overflow-hidden">
        <div className="p-2 border-b border-[#3c3c3c]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type to search files..."
            className="w-full bg-transparent text-white text-sm outline-none px-2 py-1"
            autoFocus
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filteredFiles.map((file, idx) => (
            <div
              key={file.id}
              onClick={() => { onSelect(file); onClose(); }}
              className={cn(
                "px-4 py-2 cursor-pointer flex items-center gap-2",
                idx === selectedIndex ? "bg-[#094771]" : "hover:bg-[#2a2d2e]"
              )}
            >
              <span className="text-sm text-white">{file.name}</span>
              <span className="text-xs text-[#6e6e6e]">{file.path}</span>
            </div>
          ))}
          {filteredFiles.length === 0 && (
            <div className="px-4 py-8 text-center text-[#6e6e6e] text-sm">
              No files found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}