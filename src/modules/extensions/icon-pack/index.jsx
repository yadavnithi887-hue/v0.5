import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCircle2, ChevronDown, Image } from 'lucide-react';

export const metadata = {
  id: 'devstudio.icon-pack',
  name: 'Icon Pack Switcher',
  version: '1.0.0',
  description: 'Switch file/folder icon packs for File Explorer.',
  author: 'DevStudio Team',
  icon: 'box',
  readme: `
# Icon Pack Switcher

## Features
- Turn custom icon packs on/off
- Choose from multiple icon packs
- Instant refresh in File Explorer
`
};

const STORAGE_PACK = 'devstudio-icon-pack';
const STORAGE_ENABLED = 'devstudio-icon-pack-enabled';
const PACKS = [
  { id: 'material', label: 'Material Icons (Default)' },
  { id: 'vscode-icons', label: 'VSCode Icons' },
  { id: 'mdi', label: 'MDI Symbols' },
  { id: 'carbon', label: 'Carbon Icons' },
  { id: 'mono', label: 'Mono Minimal' },
];

const IconPackPanel = ({ context }) => {
  const initialEnabled = localStorage.getItem(STORAGE_ENABLED) !== 'false';
  const initialPack = localStorage.getItem(STORAGE_PACK) || 'material';

  const [enabled, setEnabled] = useState(initialEnabled);
  const [selectedPack, setSelectedPack] = useState(initialPack);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedPackLabel = useMemo(
    () => PACKS.find((p) => p.id === selectedPack)?.label || 'Material Icons (Default)',
    [selectedPack]
  );

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const notifyChange = (nextEnabled, nextPack) => {
    localStorage.setItem(STORAGE_ENABLED, String(nextEnabled));
    localStorage.setItem(STORAGE_PACK, nextPack);
    window.dispatchEvent(
      new CustomEvent('devstudio:icon-pack-changed', {
        detail: { enabled: nextEnabled, pack: nextPack },
      })
    );
  };

  const toggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    notifyChange(next, selectedPack);
    context?.toast?.success(next ? 'Icon pack enabled' : 'Icon pack disabled');
  };

  const handlePackChange = (packId) => {
    setSelectedPack(packId);
    setOpen(false);
    notifyChange(enabled, packId);
    context?.toast?.success(`Icon pack: ${PACKS.find((p) => p.id === packId)?.label || packId}`);
  };

  return (
    <div className="h-full p-3 text-white">
      <div className="text-xs uppercase tracking-wide font-bold text-[#9ca3af] mb-4">Icon Packs</div>

      <div className="rounded-lg border border-[#3c3c3c] bg-[#1f1f1f] p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Image size={16} />
            <span>Enable Custom Icons</span>
          </div>
          <button
            onClick={toggleEnabled}
            className={`w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-[#007acc]' : 'bg-[#4b5563]'}`}
            aria-label="Toggle icon packs"
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
            />
          </button>
        </div>

        <div>
          <label className="block text-xs text-[#9ca3af] mb-1">Pack</label>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              disabled={!enabled}
              className="w-full bg-[#2a2a2a] border border-[#3c3c3c] rounded-lg px-3 py-2 text-sm disabled:opacity-50 flex items-center justify-between hover:border-[#4b5563] transition-colors"
              onClick={() => enabled && setOpen((prev) => !prev)}
            >
              <span className="truncate">{selectedPackLabel}</span>
              <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && enabled && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-[#3c3c3c] bg-[#1f1f1f] shadow-2xl overflow-hidden">
                {PACKS.map((pack) => (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => handlePackChange(pack.id)}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-[#2f2f2f] transition-colors ${
                      selectedPack === pack.id ? 'bg-[#007acc]/25 text-[#e5f2ff]' : 'text-white'
                    }`}
                  >
                    <span className="truncate">{pack.label}</span>
                    {selectedPack === pack.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-[#9ca3af] flex items-center gap-2">
          <CheckCircle2 size={12} />
          Active: {enabled ? selectedPackLabel : 'Built-in (Material)'}
        </div>
      </div>
    </div>
  );
};

export const activate = (context) => {
  if (!localStorage.getItem(STORAGE_PACK)) {
    localStorage.setItem(STORAGE_PACK, 'material');
  }
  if (!localStorage.getItem(STORAGE_ENABLED)) {
    localStorage.setItem(STORAGE_ENABLED, 'true');
  }

  context.registerSidebarPanel(
    'icon-pack',
    {
      icon: 'box',
      label: 'Icons',
    },
    (props) => <IconPackPanel context={context} {...props} />
  );
};
