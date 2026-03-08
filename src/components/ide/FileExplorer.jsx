import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronRight, ChevronDown, FilePlus, FolderPlus, Edit3, Trash2, Copy,
  RefreshCw, Folder, File, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { getIconUrl, getMaterialIconUrl } from '@/lib/fileIcons';
import { CachedFileIcon } from '@/components/ide/CachedFileIcon';
import Timeline from './Timeline';
import Outline from './Outline';

// --- Icon Component ---
const FileIcon = ({ filename, isFolder, isOpen }) => {
  return (
    <CachedFileIcon
      filename={filename}
      isFolder={isFolder}
      isOpen={isOpen}
      size={16}
      className={cn(
        "w-4 h-4 flex-shrink-0 mr-2 select-none rounded-[2px]",
        isFolder ? "explorer-node-icon-folder" : "explorer-node-icon-file"
      )}
    />
  );
};

// --- Helper: Path Normalizer ---
const cleanPath = (p) => {
  if (!p || p === 'root') return '';
  return p.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
};

// --- Inline Input ---
const InlineInput = ({ type, onComplete, onCancel }) => {
  const [val, setVal] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, []);

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && val.trim()) {
      onComplete(val.trim());
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (val.trim()) {
        onComplete(val.trim());
      } else {
        onCancel();
      }
    }, 100);
  };

  return (
    <div className="flex items-center py-1.5 px-2 ml-5">
      <span className="mr-2 explorer-icon">
        {type === 'folder' ? <Folder size={16} /> : <File size={16} />}
      </span>
      <input
        ref={ref}
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="explorer-input flex-1 text-[13px] h-6 px-2 rounded outline-none"
        onClick={(e) => e.stopPropagation()}
        placeholder={type === 'folder' ? 'Folder name...' : 'File name...'}
      />
    </div>
  );
};

// --- FILE ITEM ---
const FileItem = ({
  file,
  activeFile,
  onFileClick,
  renamingId,
  setRenamingId,
  onRenameFile,
  onDeleteFile,
  onDuplicateFile,
  onCopyRelativePath,
  onRevealInOS,
  onCopyItem,
  onCutItem,
  onPasteHere,
  onDragStartItem,
  onDragEndItem,
  onNodeClick,
  isSelected,
  className,
  gitStatus,
  problemCount,
  isDragging,
}) => {
  const [newName, setNewName] = useState(file.name);
  const inputRef = useRef(null);
  const isRenaming = renamingId === file.id;
  const isActive = activeFile?.id === file.id;

  useEffect(() => {
    if (isRenaming) {
      setNewName(file.name);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 0);
    }
  }, [isRenaming, file.name]);

  const submitRename = () => {
    if (newName.trim() && newName !== file.name) {
      onRenameFile(file, newName);
    }
    setRenamingId(null);
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (newName.trim() && newName !== file.name) {
        submitRename();
      } else {
        setRenamingId(null);
      }
    }, 100);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={cn(
            "explorer-item flex items-center py-1.5 px-2 cursor-pointer select-none transition-all duration-100 ml-5 rounded-md my-0.5",
            isSelected && "explorer-item-selected",
            isDragging && "opacity-45",
            isActive ? "explorer-item-active" : "explorer-item-hover",
            className
          )}
          draggable={!isRenaming}
          onDragStart={(e) => onDragStartItem?.(e, { type: 'file', file })}
          onDragEnd={onDragEndItem}
          onClick={(e) => {
            e.stopPropagation();
            const shouldContinue = onNodeClick ? onNodeClick(e, { type: 'file', node: file }) : true;
            if (!isRenaming && shouldContinue) onFileClick(file);
          }}
        >
          <FileIcon filename={file.name} isFolder={false} />
          <File className="w-4 h-4 mr-2 explorer-icon hidden" />
          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') submitRename();
                if (e.key === 'Escape') setRenamingId(null);
              }}
              onClick={(e) => e.stopPropagation()}
              className="explorer-input flex-1 text-xs h-5 px-1 rounded outline-none"
            />
          ) : (
            <>
              <span className={cn(
                "text-[13px] leading-[1.2rem] truncate flex-1 select-none explorer-text",
                gitStatus === 'U' ? 'git-text-untracked' : gitStatus === 'M' ? 'git-text-modified' : gitStatus === 'A' ? 'git-text-added' : gitStatus === 'D' ? 'git-text-deleted' : ''
              )}>{file.name}</span>
              {typeof problemCount === 'number' && problemCount > 0 && (
                <span className="explorer-problem-badge">{problemCount}</span>
              )}
              {gitStatus && (
                <span className={cn(
                  "explorer-git-badge",
                  gitStatus === 'U' ? 'is-untracked' : gitStatus === 'M' ? 'is-modified' : gitStatus === 'A' ? 'is-added' : 'is-deleted'
                )} title={`Git: ${gitStatus}`}>{gitStatus}</span>
              )}
            </>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="explorer-context-menu w-48">
        <ContextMenuItem onClick={() => onCopyItem?.({ type: 'file', node: file })} className="text-xs explorer-context-item">
          <Copy size={14} className="mr-2" /> Copy
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onCutItem?.({ type: 'file', node: file })} className="text-xs explorer-context-item">
          <Copy size={14} className="mr-2" /> Cut
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onPasteHere?.(cleanPath(file.folder || ''))} className="text-xs explorer-context-item">
          <Folder size={14} className="mr-2" /> Paste
        </ContextMenuItem>
        <ContextMenuSeparator className="explorer-separator" />
        <ContextMenuItem onClick={() => onDuplicateFile?.(file)} className="text-xs explorer-context-item">
          <Copy size={14} className="mr-2" /> Duplicate
        </ContextMenuItem>
        <ContextMenuItem onClick={() => setRenamingId(file.id)} className="text-xs explorer-context-item">
          <Edit3 size={14} className="mr-2" /> Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onDeleteFile(file)} className="text-red-400 text-xs">
          <Trash2 size={14} className="mr-2" /> Delete
        </ContextMenuItem>
        <ContextMenuSeparator className="explorer-separator" />
        <ContextMenuItem onClick={() => onCopyRelativePath?.(file)} className="text-xs explorer-context-item">
          <Copy size={14} className="mr-2" /> Copy Relative Path
        </ContextMenuItem>
        <ContextMenuItem onClick={() => navigator.clipboard.writeText(file.realPath)} className="text-xs explorer-context-item">
          <Copy size={14} className="mr-2" /> Copy Path
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onRevealInOS?.(file.realPath)} className="text-xs explorer-context-item">
          <Folder size={14} className="mr-2" /> Reveal in Explorer
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

// --- Folder Item ---
const FolderItem = ({
  folder,
  expandedFolders,
  toggleFolder,
  renamingId,
  setRenamingId,
  onRenameFolder,
  onDeleteFolder,
  renderTree,
  startCreation,
  onDragStartItem,
  onDragEndItem,
  onDragOverTarget,
  onDropTarget,
  onDragLeaveTarget,
  onCopyRelativePath,
  onRevealInOS,
  onCopyItem,
  onCutItem,
  onPasteHere,
  onNodeClick,
  isSelected,
  className,
  gitStatus,
  problemCount,
  isDragOver,
  isDragging
}) => {
  const [newName, setNewName] = useState(folder.name);
  const inputRef = useRef(null);
  const isExpanded = expandedFolders[folder.path];
  const isRenaming = renamingId === folder.path;

  useEffect(() => {
    if (isRenaming) {
      setNewName(folder.name);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 0);
    }
  }, [isRenaming, folder.name]);

  const submitRename = () => {
    if (newName.trim() && newName !== folder.name) {
      onRenameFolder(folder, newName);
    }
    setRenamingId(null);
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (newName.trim() && newName !== folder.name) {
        submitRename();
      } else {
        setRenamingId(null);
      }
    }, 100);
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={cn(
              "explorer-item flex items-center py-1.5 px-2 cursor-pointer select-none transition-all duration-100 explorer-item-hover group rounded-md my-0.5",
              isSelected && "explorer-item-selected",
              isDragOver && "explorer-drop-target",
              isDragging && "opacity-45",
              className
            )}
            draggable={!isRenaming}
            onDragStart={(e) => onDragStartItem?.(e, { type: 'folder', folder })}
            onDragEnd={onDragEndItem}
            onDragOver={(e) => onDragOverTarget?.(e, folder)}
            onDragLeave={(e) => onDragLeaveTarget?.(e, folder)}
            onDrop={(e) => onDropTarget?.(e, folder)}
            onClick={(e) => {
              e.stopPropagation();
              const shouldContinue = onNodeClick ? onNodeClick(e, { type: 'folder', node: folder }) : true;
              if (!isRenaming && shouldContinue) toggleFolder(folder.path);
            }}
          >
            <span className="mr-1 flex-shrink-0 explorer-chevron transition-transform duration-150">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>

            <FileIcon filename={folder.name} isFolder={true} isOpen={isExpanded} />
            <Folder className="w-4 h-4 mr-2 explorer-icon hidden" />

            {isRenaming ? (
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') submitRename();
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                className="explorer-input flex-1 text-xs h-5 px-1 rounded outline-none"
              />
            ) : (
              <>
                <span className={cn(
                  "text-[13px] leading-[1.2rem] truncate select-none flex-1 explorer-text",
                  gitStatus ? (gitStatus === 'U' ? 'git-text-untracked' : gitStatus === 'M' ? 'git-text-modified' : 'git-text-added') : ''
                )}>{folder.name}</span>
                {typeof problemCount === 'number' && problemCount > 0 && (
                  <span className="explorer-problem-badge">{problemCount}</span>
                )}
                {gitStatus && (
                  <span className={cn(
                    "explorer-git-badge",
                    gitStatus === 'U' ? 'is-untracked' : gitStatus === 'M' ? 'is-modified' : gitStatus === 'A' ? 'is-added' : 'is-deleted'
                  )} title={`Git: ${gitStatus}`}>{gitStatus}</span>
                )}
              </>
            )}
            {/* Quick actions on hover */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 ml-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startCreation('file', folder.path);
                }}
                className="explorer-action-btn p-1 rounded"
                title="New File"
              >
                <FilePlus size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startCreation('folder', folder.path);
                }}
                className="explorer-action-btn p-1 rounded"
                title="New Folder"
              >
                <FolderPlus size={12} />
              </button>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="explorer-context-menu w-48">
          <ContextMenuItem onClick={() => onCopyItem?.({ type: 'folder', node: folder })} className="text-xs explorer-context-item">
            <Copy size={14} className="mr-2" /> Copy
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onCutItem?.({ type: 'folder', node: folder })} className="text-xs explorer-context-item">
            <Copy size={14} className="mr-2" /> Cut
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onPasteHere?.(cleanPath(folder.path))} className="text-xs explorer-context-item">
            <Folder size={14} className="mr-2" /> Paste
          </ContextMenuItem>
          <ContextMenuSeparator className="explorer-separator" />
          <ContextMenuItem onClick={() => startCreation('file', folder.path)} className="text-xs explorer-context-item">
            <FilePlus size={14} className="mr-2" /> New File
          </ContextMenuItem>
          <ContextMenuItem onClick={() => startCreation('folder', folder.path)} className="text-xs explorer-context-item">
            <FolderPlus size={14} className="mr-2" /> New Folder
          </ContextMenuItem>
          <ContextMenuSeparator className="explorer-separator" />
          <ContextMenuItem onClick={() => setRenamingId(folder.path)} className="text-xs explorer-context-item">
            <Edit3 size={14} className="mr-2" /> Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onDeleteFolder(folder)} className="text-red-400 text-xs">
            <Trash2 size={14} className="mr-2" /> Delete
          </ContextMenuItem>
          <ContextMenuSeparator className="explorer-separator" />
          <ContextMenuItem onClick={() => onCopyRelativePath?.(folder)} className="text-xs explorer-context-item">
            <Copy size={14} className="mr-2" /> Copy Relative Path
          </ContextMenuItem>
          <ContextMenuItem onClick={() => navigator.clipboard.writeText(folder.realPath || folder.path)} className="text-xs explorer-context-item">
            <Copy size={14} className="mr-2" /> Copy Path
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onRevealInOS?.(folder.realPath || folder.path)} className="text-xs explorer-context-item">
            <Folder size={14} className="mr-2" /> Reveal in Explorer
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {isExpanded && (
        <div className="ml-3 pl-3 explorer-branch-line">
          {renderTree(folder.path)}
        </div>
      )}
    </div>
  );
};

// --- Main Explorer ---
const FileExplorer = ({
  files = [],
  folders = [],
  activeFile,
  onFileClick,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onDeleteFolder,
  onRenameFile,
  onRenameFolder,
  projectName,
  onOpenFolder,
  onRefreshExplorer,
  problems = [],
  rootPath,
  editorInstance,
  onCompareVersion
}) => {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [projectExpanded, setProjectExpanded] = useState(true);
  const [renamingId, setRenamingId] = useState(null);
  const [creationState, setCreationState] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [nestedExpanded, setNestedExpanded] = useState({});
  const [dragPayload, setDragPayload] = useState(null);
  const [dragOverPath, setDragOverPath] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [selectionAnchor, setSelectionAnchor] = useState(null);
  const [treeClipboard, setTreeClipboard] = useState(null);
  const [gitMap, setGitMap] = useState({});
  const [, setIconRefreshToken] = useState(0);
  const expandHoverTimerRef = useRef(null);

  // Auto expand src folder
  useEffect(() => {
    const src = folders.find(f => f.name === 'src');
    if (src) {
      setExpandedFolders(prev => ({ ...prev, [src.path]: true }));
    }
  }, [folders.length]);

  useEffect(() => {
    const refreshIcons = () => setIconRefreshToken(prev => prev + 1);
    window.addEventListener('devstudio:icon-pack-changed', refreshIcons);
    return () => window.removeEventListener('devstudio:icon-pack-changed', refreshIcons);
  }, []);

  useEffect(() => {
    const validKeys = new Set([
      ...folders.map((f) => keyFor('folder', f)),
      ...files.map((f) => keyFor('file', f)),
    ]);
    setSelectedKeys((prev) => new Set([...prev].filter((k) => validKeys.has(k))));
  }, [files, folders]);

  useEffect(() => () => {
    if (expandHoverTimerRef.current) clearTimeout(expandHoverTimerRef.current);
  }, []);

  useEffect(() => {
    let timer = null;
    const loadGitStatus = async () => {
      if (!rootPath || !window.electronAPI?.getGitStatus) {
        setGitMap({});
        return;
      }
      try {
        const result = await window.electronAPI.getGitStatus(rootPath);
        const next = {};
        (result?.files || []).forEach((entry) => {
          const rel = cleanPath(entry.path || '');
          const status = String(entry.status || '').toUpperCase();
          if (rel) next[rel] = status || (entry.staged ? 'M' : '');
        });
        setGitMap(next);
      } catch {
        setGitMap({});
      }
    };
    loadGitStatus();
    timer = setInterval(loadGitStatus, 6000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [rootPath, files.length, folders.length]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (mod && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setClipboardFromSelection('copy');
      } else if (mod && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        setClipboardFromSelection('cut');
      } else if (mod && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteFromClipboard(getActivePasteTarget());
      } else if (e.key === 'Delete') {
        e.preventDefault();
        bulkDeleteSelected();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedKeys, treeClipboard, files, folders]);

  const toggleFolder = (path) => {
    setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const collapseAll = () => {
    setExpandedFolders({});
    setProjectExpanded(false);
    setOutlineOpen(false);
    setTimelineOpen(false);
    setCreationState(null);
  };

  const expandAll = () => {
    const allExpanded = {};
    folders.forEach((folder) => {
      allExpanded[folder.path] = true;
    });
    setExpandedFolders(allExpanded);
    setProjectExpanded(true);
    setOutlineOpen(true);
    setTimelineOpen(true);
  };

  const toggleCollapseExpandAll = () => {
    const hasAnyExpanded = Object.values(expandedFolders).some(Boolean);
    const fullyCollapsed = !projectExpanded && !outlineOpen && !timelineOpen && !hasAnyExpanded;
    if (fullyCollapsed) {
      expandAll();
    } else {
      collapseAll();
    }
  };

  const startCreation = (type, parentPath) => {
    const cleanedPath = cleanPath(parentPath);
    if (cleanedPath) {
      setExpandedFolders(prev => ({ ...prev, [cleanedPath]: true }));
    } else {
      setProjectExpanded(true);
    }
    setCreationState({ type, parentPath: cleanedPath });
  };

  const handleCreationComplete = (name) => {
    if (!creationState) return;
    if (creationState.type === 'file') {
      onCreateFile({ name, folder: creationState.parentPath });
    } else {
      onCreateFolder({ name, folder: creationState.parentPath });
    }
    setCreationState(null);
  };

  const sortItems = (items) => items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  const keyFor = (type, node) => `${type}:${type === 'file' ? node.id : node.path}`;
  const nodePath = (type, node) => (type === 'file' ? node.realPath || node.id : node.realPath || '');
  const selectableNodes = () => {
    const all = [
      ...folders.map((f) => ({ type: 'folder', node: f, key: keyFor('folder', f), rank: normalizeAbs(f.realPath || f.path) })),
      ...files.map((f) => ({ type: 'file', node: f, key: keyFor('file', f), rank: normalizeAbs(f.realPath || f.id || f.path) }))
    ];
    return all.sort((a, b) => a.rank.localeCompare(b.rank));
  };

  const handleNodeClick = (e, payload) => {
    const key = keyFor(payload.type, payload.node);
    const withToggle = e.ctrlKey || e.metaKey;
    const withRange = e.shiftKey;
    if (withRange) {
      const list = selectableNodes();
      const anchor = selectionAnchor || key;
      const start = list.findIndex((n) => n.key === anchor);
      const end = list.findIndex((n) => n.key === key);
      if (start >= 0 && end >= 0) {
        const [s, t] = start < end ? [start, end] : [end, start];
        const next = new Set(selectedKeys);
        list.slice(s, t + 1).forEach((n) => next.add(n.key));
        setSelectedKeys(next);
      } else {
        setSelectedKeys(new Set([key]));
      }
      return false;
    }
    if (withToggle) {
      const next = new Set(selectedKeys);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setSelectedKeys(next);
      setSelectionAnchor(key);
      return false;
    }
    setSelectedKeys(new Set([key]));
    setSelectionAnchor(key);
    return true;
  };

  const selectedEntries = () => {
    const map = new Map();
    files.forEach((f) => map.set(keyFor('file', f), { type: 'file', node: f }));
    folders.forEach((f) => map.set(keyFor('folder', f), { type: 'folder', node: f }));
    return Array.from(selectedKeys).map((k) => map.get(k)).filter(Boolean);
  };

  const normalizeAbs = (value) => String(value || '').replace(/\\/g, '/').toLowerCase();
  const getDirName = (value = '') => {
    const normalized = String(value || '').replace(/\\/g, '/');
    const idx = normalized.lastIndexOf('/');
    return idx >= 0 ? normalized.slice(0, idx) : '';
  };
  const getBaseName = (value = '') => String(value || '').replace(/\\/g, '/').split('/').pop() || '';
  const relativeToAbsoluteFolder = (folderPath = '') => {
    const cleaned = cleanPath(folderPath);
    if (!cleaned) return rootPath || '';
    const found = folders.find((f) => cleanPath(f.path) === cleaned);
    return found?.realPath || '';
  };

  const clearDragHoverTimer = () => {
    if (expandHoverTimerRef.current) {
      clearTimeout(expandHoverTimerRef.current);
      expandHoverTimerRef.current = null;
    }
  };

  const startDragPreview = (e, label, type) => {
    const preview = document.createElement('div');
    preview.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      background: rgba(30,30,30,0.95);
      color: #d4d4d4;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 12px;
      font-family: "Segoe UI", sans-serif;
      pointer-events: none;
      z-index: 9999;
      box-shadow: 0 10px 24px rgba(0,0,0,0.35);
    `;
    preview.textContent = `${type === 'folder' ? 'Folder' : 'File'}: ${label}`;
    document.body.appendChild(preview);
    e.dataTransfer.setDragImage(preview, 8, 8);
    setTimeout(() => {
      if (preview.parentNode) preview.parentNode.removeChild(preview);
    }, 0);
  };

  const handleDragStartItem = (e, payload) => {
    const sourcePath = payload.type === 'folder'
      ? payload.folder.realPath || ''
      : payload.file.realPath || '';
    if (!sourcePath) return;
    const sourceKey = keyFor(payload.type, payload.type === 'folder' ? payload.folder : payload.file);
    const currentSelection = selectedKeys.has(sourceKey) ? selectedEntries() : [{ type: payload.type, node: payload.type === 'folder' ? payload.folder : payload.file }];
    const sourceItems = currentSelection
      .map((entry) => ({
        type: entry.type,
        sourcePath: nodePath(entry.type, entry.node),
        sourceName: entry.node.name,
      }))
      .filter((item) => !!item.sourcePath);

    const sourceName = payload.type === 'folder' ? payload.folder.name : payload.file.name;
    setDragPayload({
      type: payload.type,
      sourcePath,
      sourceName,
      items: sourceItems,
    });
    try {
      e.dataTransfer.effectAllowed = 'copyMove';
      e.dataTransfer.setData('text/plain', sourcePath);
      startDragPreview(e, sourceName, payload.type);
    } catch {
      // ignore drag-data issues
    }
  };

  const handleDragEndItem = () => {
    clearDragHoverTimer();
    setDragOverPath(null);
    setDragPayload(null);
  };

  const canDropToFolder = (targetFolderPath = '') => {
    if (!dragPayload?.items?.length) return { valid: false, reason: 'No source path' };
    const targetAbsFolder = relativeToAbsoluteFolder(targetFolderPath);
    if (!targetAbsFolder) return { valid: false, reason: 'Invalid target folder' };
    const targetAbsNormalized = normalizeAbs(targetAbsFolder);
    const sourceFolders = dragPayload.items
      .filter((i) => i.type === 'folder')
      .map((i) => normalizeAbs(i.sourcePath));
    const planned = [];
    let anyMove = false;
    for (const item of dragPayload.items) {
      const sourceAbsPath = item.sourcePath;
      const sourceParent = normalizeAbs(getDirName(sourceAbsPath));
      const sourceAbsNormalized = normalizeAbs(sourceAbsPath);
      if (sourceFolders.some((folderPath) => folderPath !== sourceAbsNormalized && sourceAbsNormalized.startsWith(`${folderPath}/`))) {
        continue;
      }
      if (item.type === 'folder' && (targetAbsNormalized === sourceAbsNormalized || targetAbsNormalized.startsWith(`${sourceAbsNormalized}/`))) {
        return { valid: false, reason: 'Cannot move folder into itself' };
      }
      if (sourceParent === targetAbsNormalized) continue;
      const nextPath = `${targetAbsFolder}\\${item.sourceName}`;
      if (normalizeAbs(nextPath) === sourceAbsNormalized) continue;
      planned.push({ ...item, newAbsPath: nextPath });
      anyMove = true;
    }
    if (!anyMove) return { valid: false, reason: 'No change' };
    return { valid: true, moves: planned };
  };

  const handleDropMove = async (targetFolderPath, altKey = false) => {
    if (!dragPayload?.items?.length || !window.electronAPI?.renamePath) return;
    const check = canDropToFolder(targetFolderPath);
    if (!check.valid) {
      if (check.reason && check.reason !== 'Already in this folder' && check.reason !== 'No change') toast.warning(check.reason);
      return;
    }

    if (altKey) {
      toast.info('Alt+Drag copy is not available yet in this build.');
    }

    try {
      const moveResults = [];
      for (const move of check.moves) {
        const result = await window.electronAPI.renamePath(move.sourcePath, move.newAbsPath);
        if (!result?.success) throw new Error(result?.error || `Move failed: ${move.sourceName}`);
        moveResults.push({ from: move.sourcePath, to: move.newAbsPath });
      }
      if (typeof onRefreshExplorer === 'function') await onRefreshExplorer();
      toast.success(`Moved ${moveResults.length} item(s)`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              for (const move of moveResults.slice().reverse()) {
                const undoRes = await window.electronAPI.renamePath(move.to, move.from);
                if (!undoRes?.success) throw new Error(undoRes?.error || 'Undo failed');
              }
              if (typeof onRefreshExplorer === 'function') await onRefreshExplorer();
              toast.success('Move undone');
            } catch (err) {
              toast.error(err?.message || 'Undo failed');
            }
          }
        }
      });
    } catch (err) {
      toast.error(err?.message || 'Move failed');
    }
  };

  const handleDragOverFolder = (e, folder) => {
    const folderPath = cleanPath(folder?.path);
    const check = canDropToFolder(folderPath);
    if (check.valid) {
      e.preventDefault();
      e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
      setDragOverPath(folderPath);
      if (!expandedFolders[folder.path]) {
        clearDragHoverTimer();
        expandHoverTimerRef.current = setTimeout(() => {
          setExpandedFolders((prev) => ({ ...prev, [folder.path]: true }));
        }, 500);
      }
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDropFolder = async (e, folder) => {
    e.preventDefault();
    clearDragHoverTimer();
    const folderPath = cleanPath(folder?.path);
    setDragOverPath(null);
    await handleDropMove(folderPath, e.altKey);
    setDragPayload(null);
  };

  const handleDragLeaveFolder = () => {
    clearDragHoverTimer();
  };

  const handleRootDragOver = (e) => {
    const check = canDropToFolder('');
    if (check.valid) {
      e.preventDefault();
      e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
      setDragOverPath('__root__');
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleRootDrop = async (e) => {
    e.preventDefault();
    clearDragHoverTimer();
    setDragOverPath(null);
    await handleDropMove('', e.altKey);
    setDragPayload(null);
  };

  const filterItems = (items) => {
    const fuzzyMatch = (text, query) => {
      const t = String(text || '').toLowerCase();
      const q = String(query || '').toLowerCase().trim();
      if (!q) return true;
      if (t.includes(q)) return true;
      let i = 0;
      for (let j = 0; j < t.length && i < q.length; j += 1) {
        if (t[j] === q[i]) i += 1;
      }
      return i === q.length;
    };
    let filtered = items.filter(item => {
      const name = item.name.toLowerCase();
      if (name === '.devstudio' || name === 'node_modules') return false;
      return true;
    });
    if (searchQuery.trim()) {
      filtered = filtered.filter(item => fuzzyMatch(item.name, searchQuery));
    }
    return filtered;
  };

  const buildFileNesting = (items) => {
    const byName = new Map(items.map((f) => [f.name, f]));
    const consumed = new Set();
    const rows = [];
    items.forEach((file) => {
      if (consumed.has(file.id)) return;
      const parts = String(file.name || '').split('.');
      const children = [];
      if (parts.length === 2) {
        const stem = parts[0];
        items.forEach((candidate) => {
          if (candidate.id === file.id) return;
          if (candidate.name.startsWith(`${stem}.`) && candidate.name !== file.name) {
            const cparts = candidate.name.split('.');
            if (cparts.length > 2) children.push(candidate);
          }
        });
      } else if (parts.length > 2) {
        const parentName = `${parts[0]}.${parts[parts.length - 1]}`;
        if (byName.has(parentName)) return;
      }
      if (children.length > 0) {
        consumed.add(file.id);
        children.forEach((c) => consumed.add(c.id));
        rows.push({ parent: file, children: children.sort((a, b) => a.name.localeCompare(b.name)) });
      } else {
        consumed.add(file.id);
        rows.push({ parent: file, children: [] });
      }
    });
    return rows;
  };

  const toRelativePath = (targetPath = '') => {
    const rootNorm = String(rootPath || '').replace(/\\/g, '/').toLowerCase();
    const targetNorm = String(targetPath || '').replace(/\\/g, '/');
    if (!rootNorm) return targetNorm;
    const lowerTarget = targetNorm.toLowerCase();
    if (lowerTarget.startsWith(rootNorm)) {
      return targetNorm.slice(rootNorm.length).replace(/^\/+/, '');
    }
    return targetNorm;
  };

  const problemCountByFile = React.useMemo(() => {
    const counts = {};
    (problems || []).forEach((p) => {
      const rel = cleanPath(toRelativePath(p.filePath || p.file || ''));
      if (!rel) return;
      counts[rel] = (counts[rel] || 0) + 1;
    });
    return counts;
  }, [problems, rootPath]);

  const folderProblemCount = (folderPath) => {
    const key = cleanPath(folderPath);
    if (!key) return 0;
    return Object.entries(problemCountByFile).reduce((acc, [filePath, count]) => (
      filePath.startsWith(`${key}/`) ? acc + count : acc
    ), 0);
  };

  const gitStatusForFolder = (folderPath) => {
    const key = cleanPath(folderPath);
    if (!key) return null;
    const statuses = Object.entries(gitMap)
      .filter(([p]) => p.startsWith(`${key}/`))
      .map(([, s]) => s);
    if (statuses.includes('M')) return 'M';
    if (statuses.includes('A')) return 'A';
    if (statuses.includes('U') || statuses.includes('??')) return 'U';
    return null;
  };

  const handleCopyRelativePath = async (item) => {
    const absolute = item?.realPath || item?.id || item?.path || '';
    const relative = toRelativePath(absolute || item?.path || '');
    if (!relative) return;
    await navigator.clipboard.writeText(relative);
    toast.success('Relative path copied');
  };

  const handleRevealInOS = async (absolutePath) => {
    if (!absolutePath || !window.electronAPI?.executeCommand) return;
    const escaped = String(absolutePath).replace(/"/g, '""');
    try {
      await window.electronAPI.executeCommand(`explorer /select,"${escaped}"`);
    } catch {
      toast.error('Reveal in Explorer failed');
    }
  };

  const handleDuplicateFile = async (file) => {
    if (!file?.realPath || !window.electronAPI?.readFile || !window.electronAPI?.createFile) return;
    const originalPath = String(file.realPath);
    const dir = getDirName(originalPath);
    const name = getBaseName(originalPath);
    const dotIndex = name.lastIndexOf('.');
    const base = dotIndex > 0 ? name.slice(0, dotIndex) : name;
    const ext = dotIndex > 0 ? name.slice(dotIndex) : '';

    let duplicatePath = `${dir}/${base} copy${ext}`.replace(/\//g, '\\');
    let copyIndex = 2;
    const existingSet = new Set(files.map((f) => normalizeAbs(f.realPath || '')));
    while (existingSet.has(normalizeAbs(duplicatePath))) {
      duplicatePath = `${dir}/${base} copy ${copyIndex}${ext}`.replace(/\//g, '\\');
      copyIndex += 1;
    }

    try {
      const content = await window.electronAPI.readFile(originalPath);
      const result = await window.electronAPI.createFile(duplicatePath, content || '');
      if (!result?.success) throw new Error(result?.error || 'Duplicate failed');
      if (typeof onRefreshExplorer === 'function') await onRefreshExplorer();
      toast.success(`Duplicated: ${name}`);
    } catch (err) {
      toast.error(err?.message || 'Duplicate failed');
    }
  };

  const ensureUniqueTargetPath = (baseTargetPath) => {
    const existing = new Set([
      ...files.map((f) => normalizeAbs(f.realPath || '')),
      ...folders.map((f) => normalizeAbs(f.realPath || ''))
    ]);
    if (!existing.has(normalizeAbs(baseTargetPath))) return baseTargetPath;
    const dir = getDirName(baseTargetPath);
    const name = getBaseName(baseTargetPath);
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    let i = 2;
    let candidate = `${dir}\\${stem} copy${ext}`;
    while (existing.has(normalizeAbs(candidate))) {
      candidate = `${dir}\\${stem} copy ${i}${ext}`;
      i += 1;
    }
    return candidate;
  };

  const copyFolderRecursive = async (sourceFolderPath, targetFolderPath) => {
    const snapshot = await window.electronAPI.openPath(sourceFolderPath);
    if (!snapshot) throw new Error('Cannot read source folder');
    await window.electronAPI.createFolder(targetFolderPath);

    const sourceNorm = normalizeAbs(sourceFolderPath);
    const folderTasks = (snapshot.folders || []).map((f) => {
      const rel = String(f.realPath || '').replace(/\\/g, '/').slice(String(sourceFolderPath).replace(/\\/g, '/').length).replace(/^\/+/, '');
      if (!rel) return null;
      return window.electronAPI.createFolder(`${targetFolderPath}\\${rel.replace(/\//g, '\\')}`);
    }).filter(Boolean);
    await Promise.all(folderTasks);

    for (const file of snapshot.files || []) {
      const fileAbs = String(file.realPath || '');
      const rel = fileAbs.replace(/\\/g, '/').slice(String(sourceFolderPath).replace(/\\/g, '/').length).replace(/^\/+/, '');
      if (!rel) continue;
      const content = await window.electronAPI.readFile(fileAbs);
      const targetFilePath = `${targetFolderPath}\\${rel.replace(/\//g, '\\')}`;
      const createRes = await window.electronAPI.createFile(targetFilePath, content || '');
      if (!createRes?.success && !String(createRes?.error || '').toLowerCase().includes('exists')) {
        throw new Error(createRes?.error || `Failed copying ${rel}`);
      }
    }
    return sourceNorm;
  };

  const getActivePasteTarget = () => {
    const selectedFolders = selectedEntries().filter((e) => e.type === 'folder');
    if (selectedFolders.length === 1) return cleanPath(selectedFolders[0].node.path);
    return '';
  };

  const setClipboardFromSelection = (mode, fallbackEntry = null) => {
    const items = (selectedEntries().length ? selectedEntries() : (fallbackEntry ? [fallbackEntry] : []))
      .map((entry) => ({
        type: entry.type,
        path: nodePath(entry.type, entry.node),
        name: entry.node.name,
      }))
      .filter((item) => !!item.path);
    if (!items.length) return;
    setTreeClipboard({ mode, items });
    toast.success(`${mode === 'cut' ? 'Cut' : 'Copied'} ${items.length} item(s)`);
  };

  const pasteFromClipboard = async (targetFolderPath = '') => {
    if (!treeClipboard?.items?.length || !window.electronAPI) return;
    const targetAbsFolder = relativeToAbsoluteFolder(targetFolderPath);
    if (!targetAbsFolder) return;

    try {
      if (treeClipboard.mode === 'cut') {
        for (const item of treeClipboard.items) {
          const dest = ensureUniqueTargetPath(`${targetAbsFolder}\\${item.name}`);
          const res = await window.electronAPI.renamePath(item.path, dest);
          if (!res?.success) throw new Error(res?.error || `Failed moving ${item.name}`);
        }
      } else {
        for (const item of treeClipboard.items) {
          const dest = ensureUniqueTargetPath(`${targetAbsFolder}\\${item.name}`);
          if (item.type === 'file') {
            const content = await window.electronAPI.readFile(item.path);
            const createRes = await window.electronAPI.createFile(dest, content || '');
            if (!createRes?.success && !String(createRes?.error || '').toLowerCase().includes('exists')) {
              throw new Error(createRes?.error || `Failed copying ${item.name}`);
            }
          } else {
            await copyFolderRecursive(item.path, dest);
          }
        }
      }
      if (typeof onRefreshExplorer === 'function') await onRefreshExplorer();
      if (treeClipboard.mode === 'cut') setTreeClipboard(null);
      toast.success('Paste complete');
    } catch (err) {
      toast.error(err?.message || 'Paste failed');
    }
  };

  const bulkDeleteSelected = async () => {
    const entries = selectedEntries();
    if (!entries.length || !window.electronAPI?.deletePath) return;
    const ok = window.confirm(`Delete ${entries.length} selected item(s)?`);
    if (!ok) return;
    try {
      for (const entry of entries) {
        const p = nodePath(entry.type, entry.node);
        if (!p) continue;
        const res = await window.electronAPI.deletePath(p);
        if (!res?.success) throw new Error(res?.error || `Failed deleting ${entry.node.name}`);
      }
      if (typeof onRefreshExplorer === 'function') await onRefreshExplorer();
      setSelectedKeys(new Set());
      toast.success(`Deleted ${entries.length} item(s)`);
    } catch (err) {
      toast.error(err?.message || 'Bulk delete failed');
    }
  };

  const renderTree = (parentPath) => {
    const normParent = cleanPath(parentPath);

    let childFolders = folders.filter(f => {
      const p = cleanPath(f.path);
      if (!p.startsWith(normParent + '/')) return false;
      return !p.slice(normParent.length + 1).includes('/');
    });

    let childFiles = files.filter(f => cleanPath(f.folder) === normParent);

    childFolders = filterItems(sortItems(childFolders));
    childFiles = filterItems(sortItems(childFiles));

    const nestedRows = buildFileNesting(childFiles);

    return (
      <>
        {creationState && creationState.parentPath === normParent && (
          <InlineInput type={creationState.type} onComplete={handleCreationComplete} onCancel={() => setCreationState(null)} />
        )}
        {childFolders.map(folder => (
          <FolderItem
            key={folder.path}
            folder={folder}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
            renamingId={renamingId}
            setRenamingId={setRenamingId}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
            renderTree={renderTree}
            startCreation={startCreation}
            onCopyRelativePath={handleCopyRelativePath}
            onRevealInOS={handleRevealInOS}
            onCopyItem={(entry) => setClipboardFromSelection('copy', entry)}
            onCutItem={(entry) => setClipboardFromSelection('cut', entry)}
            onPasteHere={pasteFromClipboard}
            onNodeClick={handleNodeClick}
            isSelected={selectedKeys.has(keyFor('folder', folder))}
            gitStatus={gitStatusForFolder(folder.path)}
            problemCount={folderProblemCount(folder.path)}
            onDragStartItem={handleDragStartItem}
            onDragEndItem={handleDragEndItem}
            onDragOverTarget={handleDragOverFolder}
            onDropTarget={handleDropFolder}
            onDragLeaveTarget={handleDragLeaveFolder}
            isDragOver={dragOverPath === cleanPath(folder.path)}
            isDragging={dragPayload?.type === 'folder' && dragPayload?.sourcePath === (folder.realPath || '')}
          />
        ))}
        {nestedRows.map(({ parent, children }) => {
          const nestKey = parent.id;
          const expanded = nestedExpanded[nestKey] !== false;
          return (
            <div key={parent.id}>
              <div className="flex items-center">
                {children.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNestedExpanded((prev) => ({ ...prev, [nestKey]: !expanded }));
                    }}
                    className="ml-1 w-4 h-4 flex items-center justify-center explorer-chevron hover:text-white"
                    title={expanded ? 'Collapse nested files' : 'Expand nested files'}
                  >
                    {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                )}
                <div className="flex-1">
                  <FileItem
                    file={parent}
                    activeFile={activeFile}
                    onFileClick={onFileClick}
                    renamingId={renamingId}
                    setRenamingId={setRenamingId}
                    onRenameFile={onRenameFile}
                    onDeleteFile={onDeleteFile}
                    onDuplicateFile={handleDuplicateFile}
                    onCopyRelativePath={handleCopyRelativePath}
                    onRevealInOS={handleRevealInOS}
                    onCopyItem={(entry) => setClipboardFromSelection('copy', entry)}
                    onCutItem={(entry) => setClipboardFromSelection('cut', entry)}
                    onPasteHere={pasteFromClipboard}
                    onNodeClick={handleNodeClick}
                    isSelected={selectedKeys.has(keyFor('file', parent))}
                    gitStatus={gitMap[cleanPath(parent.path)] || null}
                    problemCount={problemCountByFile[cleanPath(parent.path)] || 0}
                    onDragStartItem={handleDragStartItem}
                    onDragEndItem={handleDragEndItem}
                    isDragging={dragPayload?.type === 'file' && dragPayload?.sourcePath === (parent.realPath || '')}
                    className={children.length > 0 ? "ml-1" : ""}
                  />
                </div>
              </div>
              {expanded && children.map((file) => (
                <FileItem
                  key={file.id}
                  file={file}
                  activeFile={activeFile}
                  onFileClick={onFileClick}
                  renamingId={renamingId}
                  setRenamingId={setRenamingId}
                  onRenameFile={onRenameFile}
                  onDeleteFile={onDeleteFile}
                  onDuplicateFile={handleDuplicateFile}
                  onCopyRelativePath={handleCopyRelativePath}
                  onRevealInOS={handleRevealInOS}
                  onCopyItem={(entry) => setClipboardFromSelection('copy', entry)}
                  onCutItem={(entry) => setClipboardFromSelection('cut', entry)}
                  onPasteHere={pasteFromClipboard}
                  onNodeClick={handleNodeClick}
                  isSelected={selectedKeys.has(keyFor('file', file))}
                  gitStatus={gitMap[cleanPath(file.path)] || null}
                  problemCount={problemCountByFile[cleanPath(file.path)] || 0}
                  onDragStartItem={handleDragStartItem}
                  onDragEndItem={handleDragEndItem}
                  isDragging={dragPayload?.type === 'file' && dragPayload?.sourcePath === (file.realPath || '')}
                  className="ml-9"
                />
              ))}
            </div>
          );
        })}
      </>
    );
  };

  const rootFoldersList = filterItems(sortItems(folders.filter(f => !cleanPath(f.path).includes('/'))));
  const rootFilesList = filterItems(sortItems(files.filter(f => !cleanPath(f.folder))));
  const rootNestedRows = buildFileNesting(rootFilesList);

  // Empty state
  if (!rootPath && files.length === 0 && folders.length === 0) {
    return (
      <div className="h-full explorer-bg flex flex-col items-center justify-center p-4 text-center">
        <FolderPlus size={48} className="explorer-text-muted mb-4" />
        <p className="explorer-text-muted text-xs mb-4">No open folder</p>
        <button onClick={onOpenFolder} className="glass-button px-4 py-2 text-xs font-medium">
          Open Folder
        </button>
      </div>
    );
  }

  return (
    <div
      className="h-full explorer-bg flex flex-col border-r explorer-border"
      style={{ fontFamily: '"Segoe UI", Inter, sans-serif' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 text-[11px] uppercase tracking-[0.08em] font-semibold explorer-header min-w-0 overflow-hidden">
        <span className="flex-shrink-0 truncate explorer-text-muted">Explorer</span>
        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
          <button onClick={() => setShowSearch(!showSearch)} className={cn("explorer-header-btn w-[22px] h-[22px] p-0 rounded-md", showSearch && "explorer-header-btn-active")} title="Search">
            <Search size={13} />
          </button>
          <button onClick={() => startCreation('file', '')} className="explorer-header-btn w-[22px] h-[22px] p-0 rounded-md" title="New File">
            <FilePlus size={13} />
          </button>
          <button onClick={() => startCreation('folder', '')} className="explorer-header-btn w-[22px] h-[22px] p-0 rounded-md" title="New Folder">
            <FolderPlus size={13} />
          </button>
          <button
            onClick={toggleCollapseExpandAll}
            className="explorer-header-btn w-[22px] h-[22px] p-0 rounded-md"
            title="Collapse / Expand All"
          >
            <ChevronRight size={13} />
          </button>
          <button
            onClick={() => (typeof onRefreshExplorer === 'function' ? onRefreshExplorer() : onOpenFolder())}
            className="explorer-header-btn w-[22px] h-[22px] p-0 rounded-md"
            title="Refresh Explorer"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="px-3 py-2 explorer-search-bg">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full explorer-search-input text-xs px-3 py-2 rounded-lg outline-none"
          />
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-auto custom-scrollbar px-1 py-1">
        {/* Project Name */}
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              className={cn(
                "explorer-project flex items-center gap-1 px-2 py-2 cursor-pointer text-[12px] font-semibold tracking-[0.02em] transition-all duration-100 group rounded-lg my-0.5",
                dragOverPath === '__root__' && "explorer-drop-target"
              )}
              onDragOver={handleRootDragOver}
              onDrop={handleRootDrop}
              onDragLeave={() => setDragOverPath((prev) => (prev === '__root__' ? null : prev))}
              onClick={() => setProjectExpanded(!projectExpanded)}
            >
              <span className="explorer-chevron transition-transform duration-150">
                {projectExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
              <span className="explorer-project-name">{projectName}</span>

              {/* Quick actions on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 ml-auto">
                <button
                  onClick={(e) => { e.stopPropagation(); startCreation('file', ''); setProjectExpanded(true); }}
                  className="explorer-action-btn p-1 rounded"
                  title="New File"
                >
                  <FilePlus size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); startCreation('folder', ''); setProjectExpanded(true); }}
                  className="explorer-action-btn p-1 rounded"
                  title="New Folder"
                >
                  <FolderPlus size={12} />
                </button>
              </div>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="explorer-context-menu w-48">
            <ContextMenuItem onClick={() => setClipboardFromSelection('copy')} className="text-xs explorer-context-item">
              <Copy size={14} className="mr-2" /> Copy Selected
            </ContextMenuItem>
            <ContextMenuItem onClick={() => setClipboardFromSelection('cut')} className="text-xs explorer-context-item">
              <Copy size={14} className="mr-2" /> Cut Selected
            </ContextMenuItem>
            <ContextMenuItem onClick={() => pasteFromClipboard('')} className="text-xs explorer-context-item">
              <Folder size={14} className="mr-2" /> Paste
            </ContextMenuItem>
            <ContextMenuItem onClick={bulkDeleteSelected} className="text-red-400 text-xs">
              <Trash2 size={14} className="mr-2" /> Delete Selected
            </ContextMenuItem>
            <ContextMenuSeparator className="explorer-separator" />
            <ContextMenuItem onClick={() => { startCreation('file', ''); setProjectExpanded(true); }} className="text-xs explorer-context-item">
              <FilePlus size={14} className="mr-2" /> New File
            </ContextMenuItem>
            <ContextMenuItem onClick={() => { startCreation('folder', ''); setProjectExpanded(true); }} className="text-xs explorer-context-item">
              <FolderPlus size={14} className="mr-2" /> New Folder
            </ContextMenuItem>
            <ContextMenuSeparator className="explorer-separator" />
            <ContextMenuItem onClick={() => navigator.clipboard.writeText(rootPath || '')} className="text-xs explorer-context-item">
              <Copy size={14} className="mr-2" /> Copy Path
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Root Content */}
        {projectExpanded && (
          <div className="ml-2">
            {creationState && creationState.parentPath === '' && (
              <InlineInput type={creationState.type} onComplete={handleCreationComplete} onCancel={() => setCreationState(null)} />
            )}
            {rootFoldersList.map(folder => (
              <FolderItem
                key={folder.path}
                folder={folder}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                renamingId={renamingId}
                setRenamingId={setRenamingId}
                onRenameFolder={onRenameFolder}
                onDeleteFolder={onDeleteFolder}
                renderTree={renderTree}
                startCreation={startCreation}
                onCopyRelativePath={handleCopyRelativePath}
                onRevealInOS={handleRevealInOS}
                onCopyItem={(entry) => setClipboardFromSelection('copy', entry)}
                onCutItem={(entry) => setClipboardFromSelection('cut', entry)}
                onPasteHere={pasteFromClipboard}
                onNodeClick={handleNodeClick}
                isSelected={selectedKeys.has(keyFor('folder', folder))}
                gitStatus={gitStatusForFolder(folder.path)}
                problemCount={folderProblemCount(folder.path)}
                onDragStartItem={handleDragStartItem}
                onDragEndItem={handleDragEndItem}
                onDragOverTarget={handleDragOverFolder}
                onDropTarget={handleDropFolder}
                onDragLeaveTarget={handleDragLeaveFolder}
                isDragOver={dragOverPath === cleanPath(folder.path)}
                isDragging={dragPayload?.type === 'folder' && dragPayload?.sourcePath === (folder.realPath || '')}
              />
            ))}
            {rootNestedRows.map(({ parent, children }) => {
              const nestKey = parent.id;
              const expanded = nestedExpanded[nestKey] !== false;
              return (
                <div key={parent.id}>
                  <div className="flex items-center">
                    {children.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNestedExpanded((prev) => ({ ...prev, [nestKey]: !expanded }));
                        }}
                        className="ml-1 w-4 h-4 flex items-center justify-center explorer-chevron hover:text-white"
                        title={expanded ? 'Collapse nested files' : 'Expand nested files'}
                      >
                        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>
                    )}
                    <div className="flex-1">
                      <FileItem
                        file={parent}
                        activeFile={activeFile}
                        onFileClick={onFileClick}
                        renamingId={renamingId}
                        setRenamingId={setRenamingId}
                        onRenameFile={onRenameFile}
                        onDeleteFile={onDeleteFile}
                        onDuplicateFile={handleDuplicateFile}
                        onCopyRelativePath={handleCopyRelativePath}
                        onRevealInOS={handleRevealInOS}
                        onCopyItem={(entry) => setClipboardFromSelection('copy', entry)}
                        onCutItem={(entry) => setClipboardFromSelection('cut', entry)}
                        onPasteHere={pasteFromClipboard}
                        onNodeClick={handleNodeClick}
                        isSelected={selectedKeys.has(keyFor('file', parent))}
                        gitStatus={gitMap[cleanPath(parent.path)] || null}
                        problemCount={problemCountByFile[cleanPath(parent.path)] || 0}
                        onDragStartItem={handleDragStartItem}
                        onDragEndItem={handleDragEndItem}
                        isDragging={dragPayload?.type === 'file' && dragPayload?.sourcePath === (parent.realPath || '')}
                        className={children.length > 0 ? "ml-1" : ""}
                      />
                    </div>
                  </div>
                  {expanded && children.map((file) => (
                    <FileItem
                      key={file.id}
                      file={file}
                      activeFile={activeFile}
                      onFileClick={onFileClick}
                      renamingId={renamingId}
                      setRenamingId={setRenamingId}
                      onRenameFile={onRenameFile}
                      onDeleteFile={onDeleteFile}
                      onDuplicateFile={handleDuplicateFile}
                      onCopyRelativePath={handleCopyRelativePath}
                      onRevealInOS={handleRevealInOS}
                      onCopyItem={(entry) => setClipboardFromSelection('copy', entry)}
                      onCutItem={(entry) => setClipboardFromSelection('cut', entry)}
                      onPasteHere={pasteFromClipboard}
                      onNodeClick={handleNodeClick}
                      isSelected={selectedKeys.has(keyFor('file', file))}
                      gitStatus={gitMap[cleanPath(file.path)] || null}
                      problemCount={problemCountByFile[cleanPath(file.path)] || 0}
                      onDragStartItem={handleDragStartItem}
                      onDragEndItem={handleDragEndItem}
                      isDragging={dragPayload?.type === 'file' && dragPayload?.sourcePath === (file.realPath || '')}
                      className="ml-9"
                    />
                  ))}
                </div>
              );
            })}
            {searchQuery && rootFoldersList.length === 0 && rootFilesList.length === 0 && (
              <div className="px-3 py-4 text-center explorer-text-muted text-xs">
                No files found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Outline Section */}
      <div className="flex-shrink-0 border-t border-[#2d2d2d] flex flex-col">
        <div
          className="flex items-center px-2 py-1 cursor-pointer hover:bg-[#2a2d2e] select-none group"
          onClick={() => setOutlineOpen(!outlineOpen)}
        >
          <span className="explorer-chevron transition-transform duration-150 mr-1">
            {outlineOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wide group-hover:text-white transition-colors">Outline</span>
        </div>
        {outlineOpen && (
          <div className="h-48 overflow-auto border-t border-[#2d2d2d] bg-[#1e1e1e]">
            <Outline editor={editorInstance} currentFile={activeFile?.realPath || activeFile?.path} />
          </div>
        )}
      </div>

      {/* Timeline Section */}
      <div className="flex-shrink-0 border-t border-[#2d2d2d] flex flex-col">
        <div
          className="flex items-center px-2 py-1 cursor-pointer hover:bg-[#2a2d2e] select-none group"
          onClick={() => setTimelineOpen(!timelineOpen)}
        >
          <span className="explorer-chevron transition-transform duration-150 mr-1">
            {timelineOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wide group-hover:text-white transition-colors">Timeline</span>
        </div>
        {timelineOpen && (
          <div className="h-48 overflow-auto border-t border-[#2d2d2d] bg-[#1e1e1e]">
            <Timeline
              currentFile={activeFile?.realPath || activeFile?.path}
              onCompareVersion={onCompareVersion}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
