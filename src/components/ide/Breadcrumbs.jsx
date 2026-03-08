import React from 'react';
import { cn } from '@/lib/utils';

const MDI = 'https://api.iconify.design/mdi';

const getMdiFileIcon = (name = '') => {
  const lower = String(name).toLowerCase();
  const ext = lower.includes('.') ? lower.split('.').pop() : '';
  const map = {
    js: 'language-javascript',
    jsx: 'react',
    ts: 'language-typescript',
    tsx: 'react',
    json: 'code-json',
    html: 'language-html5',
    css: 'language-css3',
    md: 'language-markdown',
    py: 'language-python',
    java: 'language-java',
    go: 'language-go',
    rs: 'language-rust',
    yml: 'file-document-outline',
    yaml: 'file-document-outline',
    xml: 'xml',
  };
  if (lower === 'package.json' || lower === 'package-lock.json') return 'nodejs';
  return map[ext] || 'file-outline';
};

const mdiIcon = (name) => `${MDI}:${name}.svg`;

export default function Breadcrumbs({ file, onNavigate }) {
  if (!file) return null;

  const path = String(file.path || file.name || '').replace(/\\/g, '/');
  const pathParts = path.split('/').filter(Boolean);
  const hasNameInPath = pathParts[pathParts.length - 1] === file.name;
  const parts = hasNameInPath ? pathParts : [...pathParts, file.name].filter(Boolean);

  return (
    <div
      className="h-7 bg-[#1f1f1f] border-b border-[#2e2e2e] flex items-center px-3 text-[13px] font-medium text-[#d0d0d0] overflow-x-auto hover-scrollbar"
      style={{ fontFamily: '"Segoe UI", Inter, sans-serif' }}
    >
      <button
        onClick={() => onNavigate?.('root')}
        className="flex items-center gap-1.5 hover:text-white hover:bg-[#333] px-1.5 py-0.5 rounded"
        title="Root"
      >
        <img src={mdiIcon('home-outline')} alt="" className="w-3.5 h-3.5 [filter:brightness(0)_invert(1)]" />
      </button>

      {parts.map((part, idx) => {
        const isLast = idx === parts.length - 1;
        const isFolder = !isLast;
        const iconName = isFolder ? 'folder-outline' : getMdiFileIcon(part);
        const navPath = parts.slice(0, idx + 1).join('/');

        return (
          <React.Fragment key={`${part}:${idx}`}>
            <img src={mdiIcon('chevron-right')} alt="" className="w-3.5 h-3.5 opacity-60 mx-0.5 flex-shrink-0 [filter:brightness(0)_invert(1)]" />
            <button
              onClick={() => !isLast && onNavigate?.(navPath)}
              className={cn(
                'flex items-center gap-1.5 px-1.5 py-0.5 rounded whitespace-nowrap',
                isLast ? 'text-white' : 'hover:text-white hover:bg-[#333]'
              )}
              title={navPath}
            >
              <img src={mdiIcon(iconName)} alt="" className="w-3.5 h-3.5 flex-shrink-0 [filter:brightness(0)_invert(1)]" />
              <span>{part}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
