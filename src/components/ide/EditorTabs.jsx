import React from 'react';
import { Copy, FileSearch, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { CachedFileIcon } from '@/components/ide/CachedFileIcon';

const getRelativePath = (file) => {
  if (!file) return '';
  if (file.path) return String(file.path).replace(/\\/g, '/');
  return file.name || '';
};

const getBreadcrumbPath = (file) => getRelativePath(file).split('/').filter(Boolean).join(' > ');

export default function EditorTabs({
  openFiles,
  activeFile,
  onTabClick,
  onTabClose,
  unsavedFiles,
}) {
  if (!openFiles?.length) return null;

  const closeOthers = (targetFile) => {
    openFiles.filter((f) => f.id !== targetFile.id).forEach((f) => onTabClose(f));
  };

  const closeToRight = (targetFile) => {
    const index = openFiles.findIndex((f) => f.id === targetFile.id);
    if (index < 0) return;
    openFiles.slice(index + 1).forEach((f) => onTabClose(f));
  };

  const closeAll = () => {
    openFiles.forEach((f) => onTabClose(f));
  };

  return (
    <div
      className="h-10 pt-[1px] bg-[#1f1f1f] border-b border-[#2e2e2e] flex items-center overflow-x-auto scrollbar-hide flex-shrink-0"
      style={{ fontFamily: '"Segoe UI", Inter, sans-serif' }}
    >
      {openFiles.map((file) => {
        const isActive = activeFile?.id === file.id;
        const isDirty = !!unsavedFiles?.has?.(file.id);
        const relativePath = getRelativePath(file);
        const realPath = file.realPath || relativePath || file.name || '';

        return (
          <ContextMenu key={file.id}>
            <ContextMenuTrigger>
              <div
                className={cn(
                  'group relative h-8 flex items-center gap-2 px-3 cursor-pointer min-w-[140px] max-w-[220px] border-r border-[#2d2d2d] border-b-2 select-none rounded-t-[6px]',
                  isActive ? 'bg-[#1e1e1e] text-white' : 'bg-[#252526] text-[#b9b9b9] hover:bg-[#2b2b2c] hover:text-white'
                )}
                style={{ borderBottomColor: isActive ? 'var(--primary)' : 'transparent' }}
                onClick={() => onTabClick(file)}
                title={realPath}
              >
                <CachedFileIcon filename={file.name || ''} size={16} className="w-4 h-4 flex-shrink-0" />

                <span className={cn('text-[13px] leading-none font-medium tracking-[0.1px] truncate flex-1', isDirty && 'text-[#f6cf8a]')}>
                  {file.name}
                </span>

                <button
                  className={cn(
                    'w-4 h-4 flex items-center justify-center rounded hover:bg-[#3a3a3a] text-[#b0b0b0] hover:text-white transition-opacity duration-150',
                    isDirty ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(file);
                  }}
                  title="Close"
                >
                  {isDirty ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-white group-hover:hidden" />
                      <X size={12} className="hidden group-hover:block" />
                    </>
                  ) : (
                    <X size={12} />
                  )}
                </button>

                <div
                  className={cn(
                    'absolute left-0 right-0 bottom-0 h-[2px] transition-opacity',
                    isActive ? 'opacity-0' : 'bg-[#0e639c] opacity-0 group-hover:opacity-100'
                  )}
                />
              </div>
            </ContextMenuTrigger>

            <ContextMenuContent className="bg-[#252526] border-[#3c3c3c] text-white min-w-[240px]">
              <ContextMenuItem onClick={() => onTabClose(file)} className="text-sm">
                Close
              </ContextMenuItem>
              <ContextMenuItem onClick={() => closeOthers(file)} className="text-sm">
                Close Others
              </ContextMenuItem>
              <ContextMenuItem onClick={() => closeToRight(file)} className="text-sm">
                Close to the Right
              </ContextMenuItem>
              <ContextMenuItem onClick={closeAll} className="text-sm">
                Close All
              </ContextMenuItem>
              <ContextMenuSeparator className="bg-[#3c3c3c]" />
              <ContextMenuItem onClick={() => navigator.clipboard.writeText(realPath)} className="text-sm">
                <Copy size={14} className="mr-2" /> Copy Path
              </ContextMenuItem>
              <ContextMenuItem onClick={() => navigator.clipboard.writeText(relativePath)} className="text-sm">
                <Copy size={14} className="mr-2" /> Copy Relative Path
              </ContextMenuItem>
              <ContextMenuItem onClick={() => navigator.clipboard.writeText(getBreadcrumbPath(file))} className="text-sm">
                <Copy size={14} className="mr-2" /> Copy Breadcrumbs Path
              </ContextMenuItem>
              <ContextMenuSeparator className="bg-[#3c3c3c]" />
              <ContextMenuItem onClick={() => onTabClick(file)} className="text-sm">
                <FileSearch size={14} className="mr-2" /> Reveal in Explorer View
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
}