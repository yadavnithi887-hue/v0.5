import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const menuItems = {
  File: [
    { label: 'New Text File', shortcut: 'Ctrl+N', action: 'newFile' },
    { label: 'New File...', action: 'newFile' },
    { label: 'New Window', shortcut: 'Ctrl+Shift+N', action: 'newWindow' },
    { type: 'separator' },
    { label: 'Open File...', shortcut: 'Ctrl+O', action: 'openFile' },
    { label: 'Open Folder...', shortcut: 'Ctrl+K Ctrl+O', action: 'openFolder' },
    { label: 'Open Recent', action: 'openRecent', submenu: true },
    { type: 'separator' },
    { label: 'Save', shortcut: 'Ctrl+S', action: 'save' },
    { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: 'saveAs' },
    { label: 'Save All', action: 'saveAll' },
    { type: 'separator' },
    { label: 'Auto Save', action: 'autoSave', toggle: true },
    { label: 'Preferences', action: 'viewSettings' },
    { type: 'separator' },
    { label: 'Close Editor', shortcut: 'Ctrl+F4', action: 'closeEditor' },
    { label: 'Close Folder', shortcut: 'Ctrl+K F', action: 'closeFolder' },
    { label: 'Close Window', shortcut: 'Alt+F4', action: 'closeWindow' },
    { type: 'separator' },
    { label: 'Exit', action: 'quit' }
  ],
  Edit: [
    { label: 'Undo', shortcut: 'Ctrl+Z', action: 'undo' },
    { label: 'Redo', shortcut: 'Ctrl+Y', action: 'redo' },
    { type: 'separator' },
    { label: 'Cut', shortcut: 'Ctrl+X', action: 'cut' },
    { label: 'Copy', shortcut: 'Ctrl+C', action: 'copy' },
    { label: 'Paste', shortcut: 'Ctrl+V', action: 'paste' },
  ],
  View: [
    { label: 'Command Palette', shortcut: 'Ctrl+Shift+P', action: 'commandPalette' },
    { type: 'separator' },
    { label: 'Explorer', shortcut: 'Ctrl+Shift+E', action: 'viewExplorer' },
    { label: 'Terminal', shortcut: 'Ctrl+`', action: 'viewTerminal' },
  ],
  Help: [
    { label: 'Welcome', action: 'welcome' },
    { label: 'About', action: 'about' },
  ]
};

export default function MenuBar({ onAction, settings, onSettingToggle }) {
  const [activeMenu, setActiveMenu] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (menuName) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const handleItemClick = (item) => {
    if (item.comingSoon) {
      onAction('showComingSoon', item.label);
    } else if (item.toggle) {
      onSettingToggle(item.action);
    } else {
      onAction(item.action);
    }
    setActiveMenu(null);
  };

  return (
    <div ref={menuRef} className="flex items-center gap-0.5">
      {Object.entries(menuItems).map(([menuName, items]) => (
        <div key={menuName} className="relative">
          {/* Menu Button - Theme Aware */}
          <button
            onClick={() => handleMenuClick(menuName)}
            onMouseEnter={() => activeMenu && setActiveMenu(menuName)}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150",
              "menu-bar-item", // CSS class for theme awareness
              activeMenu === menuName && "menu-bar-item-active"
            )}
          >
            {menuName}
          </button>

          {/* Dropdown Menu - Stylish with animations */}
          {activeMenu === menuName && (
            <div
              className="menu-dropdown absolute top-full left-0 mt-1 rounded-xl shadow-2xl min-w-[240px] py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden"
            >
              {items.map((item, idx) => (
                item.type === 'separator' ? (
                  <div key={idx} className="menu-separator h-px my-1.5 mx-2" />
                ) : (
                  <button
                    key={idx}
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      "menu-item w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-all duration-100 mx-1.5 rounded-lg",
                      "hover:menu-item-hover",
                      item.comingSoon && "menu-item-disabled"
                    )}
                    style={{ width: 'calc(100% - 12px)' }}
                  >
                    <span className="flex items-center gap-2.5">
                      {item.toggle && (
                        <span className={cn(
                          "w-4 h-4 border rounded flex items-center justify-center transition-colors",
                          settings?.[item.action]
                            ? "bg-blue-500 border-blue-500"
                            : "menu-checkbox-unchecked"
                        )}>
                          {settings?.[item.action] && <Check size={10} className="text-white" />}
                        </span>
                      )}
                      <span>{item.label}</span>
                      {item.comingSoon && (
                        <span className="menu-coming-soon text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                          Soon
                        </span>
                      )}
                    </span>
                    {item.shortcut && (
                      <span className="menu-shortcut text-[10px] font-mono opacity-60">{item.shortcut}</span>
                    )}
                  </button>
                )
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}