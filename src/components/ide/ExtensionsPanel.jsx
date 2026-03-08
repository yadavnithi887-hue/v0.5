import React, { useEffect, useMemo, useState } from 'react';
import {
  AlignLeft,
  Book,
  Boxes,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Download,
  FlaskConical,
  Globe2,
  MessageSquare,
  Package,
  Palette,
  Search,
  Settings,
  Star,
  Users,
  Wand2,
  X,
} from 'lucide-react';
import { registry } from '@/modules/core/ExtensionRegistry';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const getExtensionVisual = (iconName) => {
  const key = String(iconName || '').toLowerCase();
  const map = {
    zap: { Icon: Wand2, tile: 'bg-[#34261a]', icon: 'text-[#ffb86b]' },
    globe: { Icon: Globe2, tile: 'bg-[#112d3b]', icon: 'text-[#5ac8fa]' },
    'check-square': { Icon: CheckSquare, tile: 'bg-[#1f2f1f]', icon: 'text-[#6ee7a0]' },
    palette: { Icon: Palette, tile: 'bg-[#2f2336]', icon: 'text-[#d8b4fe]' },
    box: { Icon: Boxes, tile: 'bg-[#252a38]', icon: 'text-[#93c5fd]' },
    messagesquare: { Icon: FlaskConical, tile: 'bg-[#2f231c]', icon: 'text-[#fcae7a]' },
    'align-left': { Icon: AlignLeft, tile: 'bg-[#252525]', icon: 'text-[#d4d4d4]' },
    'lorem-ipsum': { Icon: AlignLeft, tile: 'bg-[#252525]', icon: 'text-[#d4d4d4]' },
  };
  return map[key] || { Icon: MessageSquare, tile: 'bg-[#252526]', icon: 'text-[#9ca3af]' };
};

const getExtensionMeta = (id) => {
  const meta = {
    'devstudio.prettier': { rating: 4.8, installs: '24.5M', category: 'Formatters', lastUpdated: '2 days ago' },
    'devstudio.live-server': { rating: 4.7, installs: '18.2M', category: 'Development', lastUpdated: '1 week ago' },
    'devstudio.todo-manager': { rating: 4.5, installs: '5.3M', category: 'Productivity', lastUpdated: '3 days ago' },
    'devstudio.theme-picker': { rating: 4.6, installs: '12.1M', category: 'Themes', lastUpdated: '1 week ago' },
    'devstudio.icon-pack': { rating: 4.5, installs: '9.4M', category: 'Appearance', lastUpdated: 'today' },
    'devstudio.rest-client': { rating: 4.4, installs: '8.7M', category: 'Testing', lastUpdated: '5 days ago' },
    'devstudio.lorem-generator': { rating: 4.3, installs: '3.2M', category: 'Utilities', lastUpdated: '2 weeks ago' },
  };
  return meta[id] || { rating: 4.0, installs: '1K', category: 'Other', lastUpdated: '1 day ago' };
};

const StarRating = ({ rating }) => (
  <div className="flex items-center gap-1">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        size={10}
        className={i < Math.floor(rating) ? 'fill-yellow-500 text-yellow-500' : 'text-[#454545]'}
      />
    ))}
    <span className="text-xs text-[#858585] ml-1">{rating.toFixed(1)}</span>
  </div>
);

export default function ExtensionsPanel() {
  const [extensions, setExtensions] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedExt, setSelectedExt] = useState(null);

  const loadExtensions = () => {
    setExtensions(registry.getAllExtensions());
  };

  useEffect(() => {
    loadExtensions();
  }, []);

  const toggleExtension = (extensionId) => {
    const ext = extensions.find((e) => e.id === extensionId);
    if (!ext) return;

    registry.setExtensionEnabled(extensionId, !ext.enabled);
    if (extensionId === 'devstudio.icon-pack') {
      window.dispatchEvent(new CustomEvent('devstudio:icon-pack-changed'));
    }
    loadExtensions();
  };

  const filteredExtensions = useMemo(() => {
    return extensions.filter((ext) => {
      const matchesSearch =
        !search ||
        ext.name.toLowerCase().includes(search.toLowerCase()) ||
        ext.description?.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === 'all' ||
        (filter === 'enabled' && ext.enabled) ||
        (filter === 'disabled' && !ext.enabled);

      return matchesSearch && matchesFilter;
    });
  }, [extensions, filter, search]);

  const enabledCount = extensions.filter((e) => e.enabled).length;

  return (
    <div className="h-full flex bg-[#1e1e1e] text-white">
      <div className="w-full flex flex-col border-r border-[#3c3c3c]">
        <div className="p-3 border-b border-[#3c3c3c]">
          <h2 className="text-xs font-bold uppercase text-[#ccc]">Extensions</h2>
          <p className="text-xs text-[#858585] mt-0.5 mb-3">{enabledCount} enabled • {extensions.length} installed</p>

          <div className="flex bg-[#252526] rounded border border-[#3c3c3c] px-2 mb-3">
            <Search size={14} className="text-[#858585] my-auto" />
            <input
              className="bg-transparent border-none text-xs p-2 flex-1 outline-none text-white"
              placeholder="Search extensions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-1 text-xs">
            {['all', 'enabled', 'disabled'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn('px-3 py-1 rounded capitalize', filter === f ? 'bg-[#007acc] text-white' : 'text-[#858585] hover:text-white')}
              >
                {f}
                {f === 'enabled' && ` (${enabledCount})`}
                {f === 'disabled' && ` (${extensions.length - enabledCount})`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredExtensions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <Package size={48} className="text-[#454545] mb-2" />
              <p className="text-sm text-[#858585]">No extensions found</p>
            </div>
          ) : (
            filteredExtensions.map((ext) => {
              const meta = getExtensionMeta(ext.id);
              const visual = getExtensionVisual(ext.icon);
              const Icon = visual.Icon;

              return (
                <div
                  key={ext.id}
                  className={cn(
                    'p-3 border-b border-[#3c3c3c] cursor-pointer transition',
                    selectedExt?.id === ext.id ? 'bg-[#2a2a2a]' : 'hover:bg-[#252526]',
                    !ext.enabled && 'opacity-60'
                  )}
                  onClick={() => setSelectedExt(ext)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('w-10 h-10 rounded flex items-center justify-center flex-shrink-0 border border-white/5', visual.tile)}>
                      <Icon size={18} className={visual.icon} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{ext.name}</h3>
                        {ext.enabled && <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />}
                      </div>

                      <p className="text-xs text-[#858585] line-clamp-2 mb-1">{ext.description || 'No description'}</p>

                      <div className="flex items-center gap-3 text-xs">
                        <StarRating rating={meta.rating} />
                        <span className="text-[#666]">{meta.installs}</span>
                      </div>
                    </div>

                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExtension(ext.id);
                      }}
                      className="flex-shrink-0"
                    >
                      <Switch checked={ext.enabled} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-[#3c3c3c]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#858585]">Manage from Settings</span>
            <Button onClick={() => window.location.reload()} className="h-6 text-xs bg-[#007acc] hover:bg-[#006bb3]">
              Reload
            </Button>
          </div>
        </div>
      </div>

      {selectedExt && (
        <div className="w-full bg-[#252526] flex flex-col">
          <div className="p-4 border-b border-[#3c3c3c]">
            <div className="flex items-start gap-4 mb-4">
              {(() => {
                const visual = getExtensionVisual(selectedExt.icon);
                const Icon = visual.Icon;
                return (
                  <div className={cn('w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 border border-white/5', visual.tile)}>
                    <Icon size={28} className={visual.icon} />
                  </div>
                );
              })()}

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold">{selectedExt.name}</h2>
                  {selectedExt.enabled ? (
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-[#3c3c3c] text-[#858585] text-xs rounded">Disabled</span>
                  )}
                </div>
                <p className="text-sm text-[#cccccc]">{selectedExt.description || 'No description available'}</p>
              </div>

              <button onClick={() => setSelectedExt(null)} className="text-[#858585] hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            {(() => {
              const meta = getExtensionMeta(selectedExt.id);
              return (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-[#1e1e1e] p-3 rounded">
                    <div className="text-[#858585] text-xs mb-1">Rating</div>
                    <StarRating rating={meta.rating} />
                  </div>
                  <div className="bg-[#1e1e1e] p-3 rounded">
                    <div className="text-[#858585] text-xs mb-1">Installs</div>
                    <div className="flex items-center gap-1 text-sm"><Download size={12} /><span className="font-semibold">{meta.installs}</span></div>
                  </div>
                  <div className="bg-[#1e1e1e] p-3 rounded">
                    <div className="text-[#858585] text-xs mb-1">Version</div>
                    <div className="text-sm font-semibold">v{selectedExt.version || '1.0.0'}</div>
                  </div>
                  <div className="bg-[#1e1e1e] p-3 rounded">
                    <div className="text-[#858585] text-xs mb-1">Updated</div>
                    <div className="flex items-center gap-1 text-sm"><Calendar size={12} /><span>{meta.lastUpdated}</span></div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-6">
              <h3 className="text-sm font-bold mb-3 text-[#ccc]">Information</h3>
              <div className="space-y-2 text-sm">
                {selectedExt.author && (
                  <div className="flex items-center gap-2"><Users size={14} className="text-[#858585]" /><span className="text-[#858585]">Publisher:</span><span>{selectedExt.author}</span></div>
                )}
                {(() => {
                  const meta = getExtensionMeta(selectedExt.id);
                  return <div className="flex items-center gap-2"><Package size={14} className="text-[#858585]" /><span className="text-[#858585]">Category:</span><span>{meta.category}</span></div>;
                })()}
                {selectedExt.settings && selectedExt.settings.length > 0 && (
                  <div className="flex items-center gap-2"><Settings size={14} className="text-[#858585]" /><span className="text-[#858585]">Settings:</span><span>{selectedExt.settings.length} configurable options</span></div>
                )}
              </div>
            </div>

            {selectedExt.readme ? (
              <div>
                <h3 className="text-sm font-bold mb-3 text-[#ccc]">Documentation</h3>
                <div className="bg-[#1e1e1e] p-4 rounded border border-[#3c3c3c]">
                  <pre className="text-xs text-[#cccccc] whitespace-pre-wrap leading-relaxed">{selectedExt.readme}</pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-8"><Book size={40} className="mx-auto mb-2 text-[#454545]" /><p className="text-sm text-[#858585]">No documentation available</p></div>
            )}
          </div>

          <div className="p-4 border-t border-[#3c3c3c] flex gap-2">
            <Button
              onClick={() => toggleExtension(selectedExt.id)}
              className={cn('flex-1 h-9', selectedExt.enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700')}
            >
              {selectedExt.enabled ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
