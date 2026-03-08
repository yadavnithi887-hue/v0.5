import React from 'react';
import { GitBranch, Wifi, Bell, Settings, Activity } from 'lucide-react';

/**
 * StatusBar Component
 * Displays system info + extension-provided items
 */
export default function StatusBar({ extensionItems = [], onItemClick }) {
  const pillClass =
    'h-5 inline-flex items-center gap-1 px-2 rounded-full border border-white/20 bg-[#0068b4] hover:bg-[#005a9e] transition-colors';

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

  const liveServerItem = extensionItems.find((item) => item?.id === 'live-server-btn');
  const otherExtensionItems = extensionItems.filter((item) => item?.id !== 'live-server-btn');

  return (
    <div className="h-7 bg-[#007acc] flex items-center justify-between px-2 text-xs text-white border-t border-white/15">
      {/* Left side - System info */}
      <div className="flex items-center gap-2">
        <button className={pillClass} onClick={() => window.dispatchEvent(new CustomEvent('devstudio:status-branch'))} title="Open Source Control">
          <GitBranch size={12} />
          <span>main</span>
        </button>
        <button className={pillClass} onClick={() => window.dispatchEvent(new CustomEvent('devstudio:status-problems'))} title="Open Problems">
          <Activity size={12} />
          <span>0 Errors, 0 Warnings</span>
        </button>
      </div>

      {/* Right side - Extension items + system icons */}
      <div className="flex items-center gap-2">
        {liveServerItem && (
          <button
            key={liveServerItem.id ? `${liveServerItem.extensionId || 'ext'}:${liveServerItem.id}` : 'live-server-btn'}
            onClick={() => handleItemClick(liveServerItem)}
            className={pillClass}
            title={liveServerItem.tooltip || liveServerItem.text}
          >
            {liveServerItem.icon && <span className="text-xs">{liveServerItem.icon}</span>}
            <span>{liveServerItem.text}</span>
          </button>
        )}
        {/* ✅ Render extension-provided status bar items */}
        {otherExtensionItems.map((item, index) => (
          <button
            key={
              item.id
                ? `${item.extensionId || 'ext'}:${item.id}`
                : `${item.extensionId || 'ext'}:status:${index}`
            }
            onClick={() => handleItemClick(item)}
            className={pillClass}
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
              <span className="ml-1 bg-white text-[#007acc] px-1.5 rounded-full text-[10px] font-semibold">
                {item.badge}
              </span>
            )}
          </button>
        ))}

        {/* System icons */}
        <button className={pillClass + ' cursor-pointer'} onClick={() => window.dispatchEvent(new CustomEvent('devstudio:status-network'))} title="AI Gateway">
          <Wifi size={12} />
        </button>
        <button className={pillClass + ' cursor-pointer'} onClick={() => window.dispatchEvent(new CustomEvent('devstudio:status-notifications'))} title="What's New">
          <Bell size={12} />
        </button>
        <button className={pillClass + ' cursor-pointer'} onClick={() => window.dispatchEvent(new CustomEvent('devstudio:status-settings'))} title="Settings">
          <Settings size={12} />
        </button>
      </div>
    </div>
  );
}
