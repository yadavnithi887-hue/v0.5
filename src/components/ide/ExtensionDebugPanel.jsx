import React, { useState, useEffect } from 'react';
import { registry } from '@/modules/core/ExtensionRegistry';

/**
 * Extension Debug Panel
 * Shows all registered extensions, commands, and UI elements
 * Add this to your Layout for debugging
 */
export default function ExtensionDebugPanel() {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState({
    commands: [],
    statusBarItems: [],
    editorButtons: [],
    sidebarItems: []
  });

  const refresh = () => {
    const commands = Array.from(registry.getCommands().keys());
    const statusBarItems = registry.getStatusBarItems();
    const editorButtons = registry.getEditorButtons();
    const sidebarItems = registry.getSidebarItems();

    setData({
      commands,
      statusBarItems,
      editorButtons,
      sidebarItems
    });
  };

  useEffect(() => {
    if (visible) refresh();
  }, [visible]);

  // Keyboard shortcut: Ctrl+Shift+D
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[9999] flex items-center justify-center p-4">
      <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#3c3c3c]">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            🔧 Extension Debug Panel
            <span className="text-xs text-[#858585] font-normal">
              Press Ctrl+Shift+D to toggle
            </span>
          </h2>
          <div className="flex gap-2">
            <button
              onClick={refresh}
              className="px-3 py-1 bg-[#007acc] text-white rounded hover:bg-[#005a9e] text-sm"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => setVisible(false)}
              className="text-[#858585] hover:text-white text-xl px-2"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Commands */}
          <Section title="📋 Registered Commands" count={data.commands.length}>
            {data.commands.length === 0 ? (
              <Empty>No commands registered</Empty>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {data.commands.map(cmd => (
                  <div key={cmd} className="bg-[#2d2d2d] p-2 rounded text-xs font-mono">
                    <code className="text-[#4ec9b0]">{cmd}</code>
                    <button
                      onClick={() => {
                        console.log(`Executing: ${cmd}`);
                        try {
                          registry.executeCommand(cmd);
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="ml-2 text-[#007acc] hover:underline"
                    >
                      Execute
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Status Bar Items */}
          <Section title="📊 Status Bar Items" count={data.statusBarItems.length}>
            {data.statusBarItems.length === 0 ? (
              <Empty>No status bar items</Empty>
            ) : (
              <div className="space-y-2">
                {data.statusBarItems.map(item => (
                  <div key={item.id} className="bg-[#2d2d2d] p-3 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-[#4ec9b0] text-sm">{item.id}</code>
                      {item.command && (
                        <span className="text-xs text-[#858585]">
                          → {item.command}
                        </span>
                      )}
                    </div>
                    <div className="text-xs space-y-1">
                      <div>Text: <span className="text-[#ce9178]">"{item.text}"</span></div>
                      {item.icon && <div>Icon: {item.icon}</div>}
                      {item.tooltip && <div>Tooltip: <span className="text-[#858585]">{item.tooltip}</span></div>}
                      {item.badge && <div>Badge: <span className="bg-white text-black px-1 rounded">{item.badge}</span></div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Editor Buttons */}
          <Section title="🎨 Editor Buttons" count={data.editorButtons.length}>
            {data.editorButtons.length === 0 ? (
              <Empty>No editor buttons</Empty>
            ) : (
              <div className="space-y-2">
                {data.editorButtons.map(btn => (
                  <div key={btn.id} className="bg-[#2d2d2d] p-3 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-[#4ec9b0] text-sm">{btn.id}</code>
                      {btn.command && (
                        <span className="text-xs text-[#858585]">
                          → {btn.command}
                        </span>
                      )}
                    </div>
                    <div className="text-xs space-y-1">
                      <div>Label: <span className="text-[#ce9178]">"{btn.label}"</span></div>
                      {btn.icon && <div>Icon: {btn.icon}</div>}
                      {btn.tooltip && <div>Tooltip: <span className="text-[#858585]">{btn.tooltip}</span></div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Sidebar Items */}
          <Section title="📁 Sidebar Items" count={data.sidebarItems.length}>
            {data.sidebarItems.length === 0 ? (
              <Empty>No sidebar items</Empty>
            ) : (
              <div className="space-y-2">
                {data.sidebarItems.map(item => (
                  <div key={item.id} className="bg-[#2d2d2d] p-3 rounded">
                    <code className="text-[#4ec9b0] text-sm">{item.id}</code>
                    <div className="text-xs mt-2 space-y-1">
                      {item.icon && <div>Icon: {item.icon}</div>}
                      {item.tooltip && <div>Tooltip: <span className="text-[#858585]">{item.tooltip}</span></div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Footer */}
        <div className="border-t border-[#3c3c3c] p-3 bg-[#252525] text-xs text-[#858585]">
          💡 Tip: Open browser console to see detailed extension logs
        </div>
      </div>
    </div>
  );
}

// Helper components
function Section({ title, count, children }) {
  return (
    <div className="border border-[#3c3c3c] rounded-lg overflow-hidden">
      <div className="bg-[#2d2d2d] px-3 py-2 border-b border-[#3c3c3c] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-xs text-[#858585] bg-[#3c3c3c] px-2 py-0.5 rounded">
          {count}
        </span>
      </div>
      <div className="p-3">
        {children}
      </div>
    </div>
  );
}

function Empty({ children }) {
  return (
    <div className="text-center py-8 text-[#858585] text-sm">
      {children}
    </div>
  );
}