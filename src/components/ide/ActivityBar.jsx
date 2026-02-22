import React from 'react';
import {
  LayoutTemplate, Search, Github, PlayCircle, Puzzle, Settings,
  Box, Terminal, Globe, User, Zap, MessageSquare,
  CheckSquare, Palette, AlignLeft, Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 🔥 Comprehensive Icon Mapper
const getIcon = (name) => {
  const iconMap = {
    // Extension icons
    zap: Zap,
    box: Box,
    terminal: Terminal,
    globe: Globe,
    user: User,
    settings: Settings,
    messagesquare: MessageSquare,
    bot: MessageSquare, // Fallback for bot

    // New Extension icons
    'check-square': CheckSquare,
    'palette': Palette,
    'align-left': AlignLeft,
    'lorem-ipsum': AlignLeft,

    // Additional icons
    files: LayoutTemplate, // Modern Explorer Icon
    search: Search,
    git: Github, // GitHub Icon as requested
    debug: PlayCircle, // Modern Debug Icon
    extensions: Puzzle, // Puzzle for Extensions
  };

  const iconName = name?.toLowerCase() || '';
  return iconMap[iconName] || Puzzle; // Default to Puzzle if not found
};

// ✅ UPDATED Props
export default function ActivityBar({
  activeView,
  setActiveView,
  sidebarOpen,
  onToggleSidebar,
  onOpenSettings,
  extensionItems = [],
}) {
  // Core activities (always visible)
  const activities = [
    { id: 'explorer', icon: LayoutTemplate, label: 'Explorer' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'git', icon: Github, label: 'Source Control' },
    { id: 'debug', icon: PlayCircle, label: 'Run & Debug' },
    { id: 'extensions', icon: Puzzle, label: 'Extensions' },
    { id: 'ai-gateway', icon: Brain, label: 'AI Gateway' },
  ];

  const handleActivityClick = (itemId) => {
    // If the same icon is clicked, toggle the sidebar
    if (activeView === itemId && sidebarOpen) {
      onToggleSidebar();
    } else {
      // Otherwise, set the new view and ensure the sidebar is open
      setActiveView(itemId);
      if (!sidebarOpen) onToggleSidebar();
    }
  };

  const handleExtClick = (item) => {
    if (item.onClick) {
      // Custom click handler from extension
      item.onClick();
    } else {
      // Default behavior: open in sidebar using the same logic
      handleActivityClick(item.id);
    }
  };

  return (
    <div className="w-16 flex flex-col items-center py-4 z-20 flex-shrink-0 sidebar-glass transition-all duration-300">
      {/* Top section for Core & Extension Activities */}
      <div className="flex flex-col gap-3 w-full px-2">
        {activities.map((item) => (
          <button
            key={item.id}
            onClick={() => handleActivityClick(item.id)}
            className={cn(
              "w-12 h-12 flex items-center justify-center relative group transition-all rounded-xl mx-auto",
              activeView === item.id && sidebarOpen
                ? "glass-button-active shadow-[0_0_20px_rgba(0,122,204,0.3)] scale-105"
                : "sidebar-icon hover:bg-white/10"
            )}
            title={item.label}
          >
            <item.icon size={24} strokeWidth={1.5} className="transition-transform duration-300 group-hover:scale-110" />

            {/* Active Indicator Line (Left) REMOVED */}
            {activeView === item.id && sidebarOpen && (
              <div className="hidden" />
            )}

            <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#1e1e1e]/90 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 shadow-2xl border border-white/10 backdrop-blur-md translate-x-2 group-hover:translate-x-0">
              {item.label}
            </div>
          </button>
        ))}

        {/* 🔥 ADDED: AI Icon here to be consistent with VSCode layout */}


        {extensionItems.length > 0 && (
          <div className="h-px w-8 mx-auto my-2 sidebar-separator" />
        )}

        {extensionItems.map((item) => {
          const Icon = getIcon(item.icon);

          return (
            <button
              key={item.id}
              onClick={() => handleExtClick(item)}
              className={cn(
                "w-12 h-12 flex items-center justify-center relative group transition-all rounded-xl mx-auto",
                activeView === item.id && sidebarOpen
                  ? "glass-button-active shadow-[0_0_20px_rgba(0,122,204,0.3)] scale-105"
                  : "sidebar-icon hover:bg-white/10"
              )}
              title={item.label}
            >
              <Icon size={24} strokeWidth={1.5} className="transition-transform duration-300 group-hover:scale-110" />

              {/* Active Indicator Line (Left) REMOVED */}
              {activeView === item.id && sidebarOpen && (
                <div className="hidden" />
              )}

              <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#1e1e1e]/90 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 shadow-2xl border border-white/10 backdrop-blur-md translate-x-2 group-hover:translate-x-0">
                {item.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Spacer to push next items to the bottom */}
      <div className="flex-1" />

      {/* Bottom Actions */}
      <div className="flex flex-col gap-3 pb-2 w-full px-2">


        <button
          onClick={onOpenSettings}
          className="w-12 h-12 flex items-center justify-center relative group transition-all rounded-xl mx-auto sidebar-icon hover:bg-white/10"
          title="Settings"
        >
          <Settings size={26} strokeWidth={1.5} className="transition-transform duration-500 group-hover:rotate-90" />

          <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#1e1e1e]/90 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 shadow-2xl border border-white/10 backdrop-blur-md translate-x-2 group-hover:translate-x-0">
            Settings
          </div>
        </button>
      </div>
    </div>
  );
}