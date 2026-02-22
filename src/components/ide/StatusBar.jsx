import React from 'react';
import { GitBranch, Wifi, Bell, Settings, Activity } from 'lucide-react';

/**
 * StatusBar Component
 * Displays system info + extension-provided items
 */
export default function StatusBar({ extensionItems = [], onItemClick }) {
  
  const handleItemClick = (item) => {
    console.log('🖱️ StatusBar item clicked:', item);
    
    if (item.command) {
      // Execute via callback (which calls registry.executeCommand)
      if (onItemClick) {
        onItemClick(item.command);
      } else {
        console.warn('No onItemClick handler provided to StatusBar');
      }
    } else if (item.onClick) {
      // Direct onClick handler (legacy support)
      try {
        item.onClick();
      } catch (e) {
        console.error('Error executing item onClick:', e);
      }
    }
  };

  return (
    <div className="h-6 bg-[#007acc] flex items-center justify-between px-2 text-xs text-white">
      {/* Left side - System info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <GitBranch size={12} />
          <span>main</span>
        </div>
        <div className="flex items-center gap-1">
          <Activity size={12} />
          <span>0 Errors, 0 Warnings</span>
        </div>
      </div>

      {/* Right side - Extension items + system icons */}
      <div className="flex items-center gap-3">
        {/* ✅ Render extension-provided status bar items */}
        {extensionItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className="flex items-center gap-1 hover:bg-[#005a9e] px-2 py-0.5 rounded transition-colors"
            title={item.tooltip || item.text}
          >
            {/* Icon (if provided) */}
            {item.icon && (
              <span className="text-xs">{item.icon}</span>
            )}
            
            {/* Text */}
            <span>{item.text}</span>
            
            {/* Badge/Count (if provided) */}
            {item.badge && (
              <span className="ml-1 bg-white text-[#007acc] px-1 rounded text-[10px] font-semibold">
                {item.badge}
              </span>
            )}
          </button>
        ))}

        {/* System icons */}
        <div className="flex items-center gap-1 hover:bg-[#005a9e] px-1 rounded cursor-pointer">
          <Wifi size={12} />
        </div>
        <div className="flex items-center gap-1 hover:bg-[#005a9e] px-1 rounded cursor-pointer">
          <Bell size={12} />
        </div>
        <div className="flex items-center gap-1 hover:bg-[#005a9e] px-1 rounded cursor-pointer">
          <Settings size={12} />
        </div>
      </div>
    </div>
  );
}