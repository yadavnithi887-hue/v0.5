import React from 'react';
import {
  LayoutTemplate, Search, Github, PlayCircle, Puzzle, Settings,
  Box, Terminal, Globe, User, Zap, MessageSquare,
  CheckSquare, Palette, AlignLeft, Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';

const getIcon = (name) => {
  const iconMap = {
    zap: Zap,
    box: Box,
    terminal: Terminal,
    globe: Globe,
    user: User,
    settings: Settings,
    messagesquare: MessageSquare,
    bot: MessageSquare,
    'check-square': CheckSquare,
    palette: Palette,
    'align-left': AlignLeft,
    'lorem-ipsum': AlignLeft,
    files: LayoutTemplate,
    search: Search,
    git: Github,
    debug: PlayCircle,
    extensions: Puzzle,
  };

  const iconName = name?.toLowerCase() || '';
  return iconMap[iconName] || Puzzle;
};

export default function ActivityBar({
  activeView,
  setActiveView,
  sidebarOpen,
  onToggleSidebar,
  onOpenSettings,
  extensionItems = [],
}) {
  const activities = [
    { id: 'explorer', icon: LayoutTemplate, label: 'Explorer' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'git', icon: Github, label: 'Source Control' },
    { id: 'debug', icon: PlayCircle, label: 'Run & Debug' },
    { id: 'extensions', icon: Puzzle, label: 'Extensions' },
    { id: 'ai-gateway', icon: Brain, label: 'AI Gateway' },
  ];

  const handleActivityClick = (itemId) => {
    if (activeView === itemId && sidebarOpen) {
      onToggleSidebar();
    } else {
      setActiveView(itemId);
      if (!sidebarOpen) onToggleSidebar();
    }
  };

  const handleExtClick = (item) => {
    if (item.onClick) item.onClick();
    else handleActivityClick(item.id);
  };

  const renderIconButton = (id, Icon, label, onClick) => (
    <button
      key={id}
      onClick={onClick}
      className={cn(
        'w-11 h-11 flex items-center justify-center relative group transition-all rounded-xl mx-auto',
        activeView === id && sidebarOpen
          ? 'sidebar-icon text-white'
          : 'sidebar-icon'
      )}
      title={label}
    >
      {activeView === id && sidebarOpen && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[2px] bg-[#007acc] rounded-r-full" />
      )}
      <Icon size={20} strokeWidth={1.7} className="transition-transform duration-300 group-hover:scale-110" />
      <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#1e1e1e]/90 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 shadow-2xl border border-white/10 backdrop-blur-md translate-x-2 group-hover:translate-x-0">
        {label}
      </div>
    </button>
  );

  return (
    <div className="w-14 h-full min-h-0 flex flex-col items-center py-4 z-20 flex-shrink-0 sidebar-glass transition-all duration-300 overflow-hidden">
      <div className="flex flex-col gap-3 w-full px-2 pb-2">
        {activities.map((item) => renderIconButton(item.id, item.icon, item.label, () => handleActivityClick(item.id)))}
      </div>

      <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden scrollbar-hide">
        <div className="flex flex-col gap-3 w-full px-2 pb-2">
          {extensionItems.length > 0 && (
            <div className="h-px w-8 mx-auto my-2 sidebar-separator" />
          )}

          {extensionItems.map((item) => {
            const Icon = getIcon(item.icon);
            return renderIconButton(item.id, Icon, item.label, () => handleExtClick(item));
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 pb-2 w-full px-2">
        <button
          onClick={onOpenSettings}
          className="w-11 h-11 flex items-center justify-center relative group transition-all rounded-xl mx-auto sidebar-icon"
          title="Settings"
        >
          <Settings size={22} strokeWidth={1.6} className="transition-transform duration-500 group-hover:rotate-90" />
          <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#1e1e1e]/90 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 shadow-2xl border border-white/10 backdrop-blur-md translate-x-2 group-hover:translate-x-0">
            Settings
          </div>
        </button>
      </div>
    </div>
  );
}
