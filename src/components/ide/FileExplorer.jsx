import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronRight, ChevronDown, FilePlus, FolderPlus, Edit3, Trash2, Copy,
  RefreshCw, Folder, File, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { getIconUrl } from '@/lib/fileIcons';
import Timeline from './Timeline';
import Outline from './Outline';

// --- Icon Component ---
const FileIcon = ({ filename, isFolder, isOpen }) => {
  const iconUrl = getIconUrl(filename || '', isFolder, isOpen);

  return (
    <img
      src={iconUrl}
      alt=""
      className="w-4 h-4 flex-shrink-0 mr-2 select-none"
      onError={(e) => {
        e.target.style.display = 'none';
        e.target.nextSibling.style.display = 'block';
      }}
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
const FileItem = ({ file, activeFile, onFileClick, renamingId, setRenamingId, onRenameFile, onDeleteFile }) => {
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
            isActive ? "explorer-item-active" : "explorer-item-hover"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (!isRenaming) onFileClick(file);
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
            <span className="text-[13px] truncate flex-1 select-none explorer-text">{file.name}</span>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="explorer-context-menu w-48">
        <ContextMenuItem onClick={() => setRenamingId(file.id)} className="text-xs explorer-context-item">
          <Edit3 size={14} className="mr-2" /> Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onDeleteFile(file)} className="text-red-400 text-xs">
          <Trash2 size={14} className="mr-2" /> Delete
        </ContextMenuItem>
        <ContextMenuSeparator className="explorer-separator" />
        <ContextMenuItem onClick={() => navigator.clipboard.writeText(file.realPath)} className="text-xs explorer-context-item">
          <Copy size={14} className="mr-2" /> Copy Path
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
  startCreation
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
            className="explorer-item flex items-center py-1.5 px-2 cursor-pointer select-none transition-all duration-100 explorer-item-hover group rounded-md my-0.5"
            onClick={(e) => {
              e.stopPropagation();
              if (!isRenaming) toggleFolder(folder.path);
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
              <span className="text-[13px] truncate select-none flex-1 explorer-text font-medium">{folder.name}</span>
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
          <ContextMenuItem onClick={() => navigator.clipboard.writeText(folder.realPath || folder.path)} className="text-xs explorer-context-item">
            <Copy size={14} className="mr-2" /> Copy Path
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

  // Auto expand src folder
  useEffect(() => {
    const src = folders.find(f => f.name === 'src');
    if (src) {
      setExpandedFolders(prev => ({ ...prev, [src.path]: true }));
    }
  }, [folders.length]);

  const toggleFolder = (path) => {
    setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const collapseAll = () => setExpandedFolders({});

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

  const filterItems = (items) => {
    let filtered = items.filter(item => {
      const name = item.name.toLowerCase();
      if (name === '.devstudio' || name === 'node_modules') return false;
      return true;
    });
    if (searchQuery.trim()) {
      filtered = filtered.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return filtered;
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
          />
        ))}
        {childFiles.map(file => (
          <FileItem
            key={file.id}
            file={file}
            activeFile={activeFile}
            onFileClick={onFileClick}
            renamingId={renamingId}
            setRenamingId={setRenamingId}
            onRenameFile={onRenameFile}
            onDeleteFile={onDeleteFile}
          />
        ))}
      </>
    );
  };

  const rootFoldersList = filterItems(sortItems(folders.filter(f => !cleanPath(f.path).includes('/'))));
  const rootFilesList = filterItems(sortItems(files.filter(f => !cleanPath(f.folder))));

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
    <div className="h-full explorer-bg flex flex-col border-r explorer-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold explorer-header min-w-0 overflow-hidden">
        <span className="flex-shrink-0 truncate explorer-text-muted">Explorer</span>
        <div className="flex gap-0.5 flex-shrink-0 ml-1">
          <button onClick={() => setShowSearch(!showSearch)} className={cn("explorer-header-btn w-6 h-6 p-0 rounded", showSearch && "explorer-header-btn-active")} title="Search">
            <Search size={12} />
          </button>
          <button onClick={() => startCreation('file', '')} className="explorer-header-btn w-6 h-6 p-0 rounded" title="New File">
            <FilePlus size={12} />
          </button>
          <button onClick={() => startCreation('folder', '')} className="explorer-header-btn w-6 h-6 p-0 rounded" title="New Folder">
            <FolderPlus size={12} />
          </button>
          <button onClick={collapseAll} className="explorer-header-btn w-6 h-6 p-0 rounded" title="Collapse All">
            <ChevronRight size={12} />
          </button>
          <button onClick={onOpenFolder} className="explorer-header-btn w-6 h-6 p-0 rounded" title="Refresh">
            <RefreshCw size={12} />
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
              className="explorer-project flex items-center gap-1 px-2 py-2 cursor-pointer text-[11px] font-bold uppercase tracking-wide transition-all duration-100 group rounded-lg my-0.5"
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
              />
            ))}
            {rootFilesList.map(file => (
              <FileItem
                key={file.id}
                file={file}
                activeFile={activeFile}
                onFileClick={onFileClick}
                renamingId={renamingId}
                setRenamingId={setRenamingId}
                onRenameFile={onRenameFile}
                onDeleteFile={onDeleteFile}
              />
            ))}
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