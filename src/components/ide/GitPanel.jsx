import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  GitBranch, Check, RefreshCw, CloudUpload, Github, LogOut, Globe,
  Plus, Minus, ChevronDown, ChevronRight, ExternalLink, HelpCircle,
  ArrowUpCircle, ArrowDownCircle, Undo2, Trash2, GitMerge, Archive,
  History, FileText, X, ChevronUp, Copy, AlertTriangle, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import PublishModal from './PublishModal';

// ─── Collapsible Section ─────────────────────────────────────────
const Section = ({ title, count, icon: Icon, children, defaultOpen = true, actions }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="git-section">
      <button
        onClick={() => setOpen(!open)}
        className="git-section-header"
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {Icon && <Icon size={12} className="text-[#858585] flex-shrink-0" />}
          <span className="text-[10px] font-semibold uppercase tracking-wider truncate">{title}</span>
          {typeof count === 'number' && count > 0 && (
            <span className="git-badge-count">{count}</span>
          )}
        </div>
        {actions && <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>{actions}</div>}
      </button>
      {open && <div className="git-section-body">{children}</div>}
    </div>
  );
};

// ─── Diff Viewer (Inline) ────────────────────────────────────────
const DiffViewer = ({ diff, onClose }) => {
  if (!diff) return null;
  const lines = diff.split('\n');
  return (
    <div className="git-diff-viewer">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#3c3c3c]">
        <span className="text-[10px] text-[#cccccc] font-medium">Diff Preview</span>
        <button onClick={onClose} className="text-[#858585] hover:text-white"><X size={12} /></button>
      </div>
      <pre className="git-diff-content">
        {lines.map((line, i) => {
          let cls = 'git-diff-line';
          if (line.startsWith('+') && !line.startsWith('+++')) cls += ' git-diff-add';
          else if (line.startsWith('-') && !line.startsWith('---')) cls += ' git-diff-remove';
          else if (line.startsWith('@@')) cls += ' git-diff-hunk';
          return <div key={i} className={cls}>{line}</div>;
        })}
      </pre>
    </div>
  );
};

// ─── File Item ───────────────────────────────────────────────────
const FileItem = ({ file, staged, onStage, onUnstage, onDiscard, onDiffClick }) => {
  const statusMap = {
    'U': { label: 'U', cls: 'untracked', title: 'Untracked' },
    'M': { label: 'M', cls: 'modified', title: 'Modified' },
    'A': { label: 'A', cls: 'added', title: 'Added' },
    'D': { label: 'D', cls: 'deleted', title: 'Deleted' },
    'R': { label: 'R', cls: 'added', title: 'Renamed' },
    '??': { label: 'U', cls: 'untracked', title: 'Untracked' },
  };
  const info = statusMap[file.status] || statusMap['M'];

  return (
    <div className="git-file-item group" onClick={() => onDiffClick?.(file)}>
      <span className={`truncate flex-1 git-text-${info.cls}`} title={file.path}>{file.path}</span>
      <div className="flex items-center gap-1">
        <span className={`explorer-git-badge is-${info.cls}`} title={info.title}>{info.label}</span>
        <div className="git-file-actions">
          {staged ? (
            <button onClick={(e) => { e.stopPropagation(); onUnstage(file.path); }} title="Unstage" className="git-action-btn">
              <Minus size={12} />
            </button>
          ) : (
            <>
              {file.status !== 'U' && (
                <button onClick={(e) => { e.stopPropagation(); onDiscard?.(file.path); }} title="Discard Changes" className="git-action-btn text-red-400 hover:text-red-300">
                  <Undo2 size={12} />
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); onStage(file.path); }} title="Stage" className="git-action-btn">
                <Plus size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Commit Item ─────────────────────────────────────────────────
const CommitItem = ({ commit }) => {
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="git-commit-item">
      <div className="flex items-start gap-2 min-w-0">
        <div className="git-commit-dot" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-[#cccccc] truncate leading-tight" title={commit.message}>{commit.message}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] text-[#858585]">{commit.hashShort}</span>
            <span className="text-[9px] text-[#616161]">•</span>
            <span className="text-[9px] text-[#858585]">{commit.author}</span>
            <span className="text-[9px] text-[#616161]">•</span>
            <span className="text-[9px] text-[#616161]">{timeAgo(commit.date)}</span>
          </div>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(commit.hash).then(() => toast.success('Hash copied'))}
          className="git-action-btn opacity-0 group-hover:opacity-100 flex-shrink-0"
          title="Copy full hash"
        >
          <Copy size={10} />
        </button>
      </div>
    </div>
  );
};

// ─── Stash Item ──────────────────────────────────────────────────
const StashItem = ({ stash, onApply, onPop, onDrop }) => (
  <div className="git-stash-item group">
    <div className="flex-1 min-w-0">
      <p className="text-[11px] text-[#cccccc] truncate">{stash.message || `stash@{${stash.index}}`}</p>
      <span className="text-[9px] text-[#616161]">#{stash.index}</span>
    </div>
    <div className="git-file-actions">
      <button onClick={() => onApply(stash.index)} title="Apply (keep stash)" className="git-action-btn"><ArrowDownCircle size={12} /></button>
      <button onClick={() => onPop(stash.index)} title="Pop (apply & remove)" className="git-action-btn text-green-400"><Check size={12} /></button>
      <button onClick={() => onDrop(stash.index)} title="Drop" className="git-action-btn text-red-400"><Trash2 size={12} /></button>
    </div>
  </div>
);


// ═══════════════════════════════════════════════════════════════════
// ─── MAIN GIT PANEL ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
export default function GitPanel() {
  // --- Core State ---
  const [loading, setLoading] = useState(false);
  const [isRepo, setIsRepo] = useState(false);
  const [files, setFiles] = useState([]);
  const [branch, setBranch] = useState('');
  const [message, setMessage] = useState('');
  const [hasRemote, setHasRemote] = useState(false);
  const [ahead, setAhead] = useState(0);
  const [behind, setBehind] = useState(0);

  // --- GitHub Auth ---
  const [githubUser, setGithubUser] = useState(localStorage.getItem('github_user'));
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // --- Branch Management ---
  const [branches, setBranches] = useState([]);
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  // --- Commit History ---
  const [commits, setCommits] = useState([]);
  const [showCommitSearch, setShowCommitSearch] = useState(false);
  const [commitSearch, setCommitSearch] = useState('');

  // --- Stash ---
  const [stashes, setStashes] = useState([]);
  const [stashMessage, setStashMessage] = useState('');
  const [showStashInput, setShowStashInput] = useState(false);

  // --- Diff ---
  const [diffContent, setDiffContent] = useState(null);
  const [diffFile, setDiffFile] = useState(null);

  // --- Discard Confirmation ---
  const [confirmDiscard, setConfirmDiscard] = useState(null);

  const rootPath = localStorage.getItem('devstudio-last-project');
  const messageRef = useRef(null);

  // ─── Data Fetching ───────────────────────────────────
  const refreshStatus = useCallback(async () => {
    if (!rootPath || !window.electronAPI) return;
    try {
      const result = await window.electronAPI.getGitStatus(rootPath);
      setIsRepo(result.isRepo);
      setFiles(result.files || []);
      setBranch(result.branch || '');
      setHasRemote(result.hasRemote);
      setAhead(result.ahead || 0);
      setBehind(result.behind || 0);
    } catch (e) { }
  }, [rootPath]);

  const fetchBranches = useCallback(async () => {
    if (!rootPath || !window.electronAPI) return;
    try {
      const result = await window.electronAPI.getGitBranches(rootPath);
      setBranches(result.branches || result || []);
    } catch (e) { }
  }, [rootPath]);

  const fetchCommits = useCallback(async () => {
    if (!rootPath || !window.electronAPI?.gitLog) return;
    try {
      const result = await window.electronAPI.gitLog(rootPath, 30);
      setCommits(result.commits || []);
    } catch (e) { }
  }, [rootPath]);

  const fetchStashes = useCallback(async () => {
    if (!rootPath || !window.electronAPI?.gitStashList) return;
    try {
      const result = await window.electronAPI.gitStashList(rootPath);
      setStashes(result.stashes || []);
    } catch (e) { }
  }, [rootPath]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([refreshStatus(), fetchBranches(), fetchCommits(), fetchStashes()]);
    setLoading(false);
  }, [refreshStatus, fetchBranches, fetchCommits, fetchStashes]);

  // Initial load + Event-driven refresh (on file system changes)
  useEffect(() => {
    refreshAll();
    // Listen for file system changes instead of constant polling
    let cleanup;
    if (window.electronAPI?.onFileChanged) {
      cleanup = window.electronAPI.onFileChanged(() => {
        refreshStatus();
      });
    }
    // Light polling as safety net (30s instead of 5s)
    const interval = setInterval(refreshStatus, 30000);
    return () => {
      clearInterval(interval);
      if (typeof cleanup === 'function') cleanup();
    };
  }, [rootPath]);

  // ─── Actions ─────────────────────────────────────────
  const handleTokenLogin = async () => {
    if (!tokenInput.trim()) return toast.error("Enter valid token");
    setLoading(true);
    try {
      const response = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${tokenInput}` } });
      if (response.ok) {
        const data = await response.json();
        setGithubUser(data.login);
        localStorage.setItem('github_user', data.login);
        localStorage.setItem('github_token', tokenInput);
        toast.success(`Connected as ${data.login}`);
        setShowTokenInput(false);
        setTokenInput('');
      } else { toast.error("Invalid Token"); }
    } catch (e) { toast.error("Connection failed"); }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('github_user');
    localStorage.removeItem('github_token');
    setGithubUser(null);
    toast.success("Logged out");
  };

  const handleStageAll = async () => {
    await window.electronAPI.gitStage(rootPath, '.');
    refreshStatus();
    toast.success("All files staged");
  };

  const handleUnstageAll = async () => {
    await window.electronAPI.gitUnstage(rootPath, '.');
    refreshStatus();
    toast.success("All files unstaged");
  };

  const handleCommit = async () => {
    if (!message.trim()) return toast.error("Enter a commit message");
    const hasStaged = files.some(f => f.staged);
    if (!hasStaged) {
      await window.electronAPI.gitStage(rootPath, '.');
    }
    setLoading(true);
    const res = await window.electronAPI.gitCommit(rootPath, message);
    if (res.success) {
      setMessage('');
      toast.success(res.summary
        ? `Committed (${res.summary.changes} changes, +${res.summary.insertions} -${res.summary.deletions})`
        : "Committed successfully"
      );
      refreshAll();
    } else {
      toast.error(`Commit failed: ${res.error || 'Unknown error'}`);
    }
    setLoading(false);
  };

  const handleCommitAndPush = async () => {
    await handleCommit();
    // Small delay for commit to complete
    setTimeout(async () => {
      if (hasRemote && githubUser) {
        await handlePush();
      }
    }, 500);
  };

  const handlePush = async () => {
    if (!githubUser) return toast.error("Please sign in first");
    if (!hasRemote) return toast.error("Publish to GitHub first");
    setLoading(true);
    toast.info("Pushing changes...");
    const token = localStorage.getItem('github_token');
    const res = await window.electronAPI.gitPush({ cwd: rootPath, token });
    if (res.success) {
      toast.success("Changes pushed! 🚀");
      refreshAll();
    } else {
      toast.error(`Push failed: ${res.error}`, { duration: 5000 });
    }
    setLoading(false);
  };

  const handlePull = async () => {
    if (!githubUser) return toast.error("Please sign in first");
    if (!hasRemote) return toast.error("Publish to GitHub first");
    setLoading(true);
    toast.info("Pulling changes...");
    const res = await window.electronAPI.gitPull(rootPath);
    if (res.success) {
      toast.success("Pulled successfully!");
      refreshAll();
    } else {
      toast.error(`Pull failed: ${res.error}`, { duration: 5000 });
    }
    setLoading(false);
  };

  const handleDiscard = async (filePath) => {
    setConfirmDiscard(filePath);
  };

  const confirmDiscardAction = async () => {
    if (!confirmDiscard) return;
    const res = await window.electronAPI.gitDiscard(rootPath, confirmDiscard);
    if (res.success) {
      toast.success(`Discarded changes: ${confirmDiscard}`);
      refreshStatus();
    } else {
      toast.error(`Discard failed: ${res.error}`);
    }
    setConfirmDiscard(null);
  };

  const handleDiscardAll = async () => {
    const changes = files.filter(f => !f.staged);
    if (changes.length === 0) return;
    setConfirmDiscard('__ALL__');
  };

  const confirmDiscardAllAction = async () => {
    const changes = files.filter(f => !f.staged);
    setLoading(true);
    for (const f of changes) {
      await window.electronAPI.gitDiscard(rootPath, f.path);
    }
    toast.success(`Discarded all ${changes.length} changes`);
    refreshStatus();
    setLoading(false);
    setConfirmDiscard(null);
  };

  // Branch actions
  const handleBranchSelect = async (branchName) => {
    if (!rootPath || !window.electronAPI) return;
    setLoading(true);
    const res = await window.electronAPI.gitCheckout(rootPath, branchName);
    if (res.success) {
      setBranch(branchName);
      toast.success(`Switched to ${branchName}`);
      refreshAll();
    } else {
      toast.error(`Switch failed: ${res.error || 'Unknown error'}`);
    }
    setLoading(false);
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return toast.error("Enter branch name");
    setLoading(true);
    const res = await window.electronAPI.gitCreateBranch(rootPath, newBranchName);
    if (res.success) {
      toast.success(`Branch '${newBranchName}' created & switched`);
      setNewBranchName('');
      setShowCreateBranch(false);
      refreshAll();
    } else {
      toast.error(`Failed: ${res.error || 'Unknown error'}`);
    }
    setLoading(false);
  };

  const handleDeleteBranch = async (branchName) => {
    if (branchName === branch) return toast.error("Cannot delete current branch");
    setLoading(true);
    const res = await window.electronAPI.gitDeleteBranch(rootPath, branchName, false);
    if (res.success) {
      toast.success(`Deleted branch: ${branchName}`);
      fetchBranches();
    } else {
      toast.error(`Delete failed: ${res.error}`);
    }
    setLoading(false);
  };

  const handleMerge = async (branchName) => {
    setLoading(true);
    toast.info(`Merging ${branchName} into ${branch}...`);
    const res = await window.electronAPI.gitMerge(rootPath, branchName);
    if (res.success) {
      toast.success(`Merged ${branchName} successfully!`);
      refreshAll();
    } else {
      toast.error(`Merge failed: ${res.error}`, { duration: 5000 });
    }
    setLoading(false);
  };

  // Stash actions
  const handleStashSave = async () => {
    setLoading(true);
    const res = await window.electronAPI.gitStash(rootPath, stashMessage || undefined);
    if (res.success) {
      toast.success("Changes stashed");
      setStashMessage('');
      setShowStashInput(false);
      refreshAll();
    } else {
      toast.error(`Stash failed: ${res.error}`);
    }
    setLoading(false);
  };

  const handleStashApply = async (index) => {
    const res = await window.electronAPI.gitStashApply(rootPath, index);
    if (res.success) { toast.success("Stash applied"); refreshAll(); }
    else toast.error(`Apply failed: ${res.error}`);
  };

  const handleStashPop = async (index) => {
    const res = await window.electronAPI.gitStashPop(rootPath, index);
    if (res.success) { toast.success("Stash popped"); refreshAll(); }
    else toast.error(`Pop failed: ${res.error}`);
  };

  const handleStashDrop = async (index) => {
    const res = await window.electronAPI.gitStashDrop(rootPath, index);
    if (res.success) { toast.success("Stash dropped"); fetchStashes(); }
    else toast.error(`Drop failed: ${res.error}`);
  };

  // Diff action
  const handleFileDiff = async (file) => {
    if (!window.electronAPI?.gitDiff) return;
    const res = await window.electronAPI.gitDiff(rootPath, file.path, file.staged);
    if (res.success && res.diff) {
      setDiffContent(res.diff);
      setDiffFile(file.path);
    } else {
      if (file.status === 'U') toast.info("Untracked file — no diff available");
      else toast.error("Could not load diff");
    }
  };

  const handlePublishConfirm = async (publishData) => {
    setLoading(true);
    toast.info(`Publishing to ${publishData.useExisting ? 'existing' : 'new'} repository...`);
    const res = await window.electronAPI.gitPublish(publishData);
    if (res.success) {
      toast.success("Published to GitHub! 🎉");
      setHasRemote(true);
      refreshAll();
    } else {
      toast.error(`Publish failed: ${res.error}`, { duration: 5000 });
    }
    setLoading(false);
  };

  // ─── Derived Data ────────────────────────────────────
  const staged = files.filter(f => f.staged);
  const changes = files.filter(f => !f.staged);
  const filteredCommits = commitSearch
    ? commits.filter(c => c.message.toLowerCase().includes(commitSearch.toLowerCase()) || c.hashShort.includes(commitSearch))
    : commits;

  // ─── Not a Repo View ─────────────────────────────────
  if (rootPath && !isRepo) {
    return (
      <div className="h-full bg-[#1e1e1e] text-white p-6 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[#252526] flex items-center justify-center">
          <GitBranch size={24} className="text-[#858585]" />
        </div>
        <div>
          <p className="text-[#cccccc] text-sm font-medium mb-1">No Git Repository</p>
          <p className="text-[#858585] text-xs">Initialize a repository to start tracking your changes.</p>
        </div>
        <Button
          onClick={async () => {
            const res = await window.electronAPI.gitInit(rootPath);
            if (res.success) { toast.success("Repository initialized"); refreshAll(); }
            else toast.error("Failed to initialize");
          }}
          className="bg-[#007acc] hover:bg-[#005a9e] text-white text-xs px-6"
        >
          Initialize Repository
        </Button>
      </div>
    );
  }

  // ─── Main Render ─────────────────────────────────────
  return (
    <div className="h-full bg-[#1e1e1e] flex flex-col text-white git-panel">
      {/* ─── HEADER ─── */}
      <div className="git-panel-header">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#cccccc]">Source Control</span>
          <div className="flex items-center gap-1">
            {hasRemote && (ahead > 0 || behind > 0) && (
              <div className="flex items-center gap-1 mr-1">
                {ahead > 0 && <span className="git-sync-badge" title={`${ahead} commit(s) ahead`}>↑{ahead}</span>}
                {behind > 0 && <span className="git-sync-badge" title={`${behind} commit(s) behind`}>↓{behind}</span>}
              </div>
            )}
            <RefreshCw
              size={14}
              onClick={refreshAll}
              className={`cursor-pointer text-[#858585] hover:text-white transition-colors ${loading && 'animate-spin'}`}
              title="Refresh"
            />
          </div>
        </div>

        {/* Branch Selector */}
        <div className="flex items-center gap-1 mb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-6 px-2 text-xs text-[#cccccc] hover:bg-[#2a2d2e] flex items-center gap-1 flex-1 justify-start">
                <GitBranch size={12} className="text-[#858585]" />
                <span className="truncate">{branch || 'No branch'}</span>
                <ChevronDown size={10} className="ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#252526] border-[#454545] text-white min-w-48 max-h-64 overflow-y-auto">
              {branches.map((b) => (
                <DropdownMenuItem
                  key={b}
                  className={`text-xs flex items-center justify-between group ${b === branch ? 'bg-[#094771]' : 'hover:bg-[#2a2d2e]'}`}
                >
                  <span onClick={() => handleBranchSelect(b)} className="flex-1 truncate">{b}</span>
                  {b !== branch && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-2">
                      <button onClick={(e) => { e.stopPropagation(); handleMerge(b); }} title="Merge into current" className="hover:text-blue-400"><GitMerge size={11} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteBranch(b); }} title="Delete branch" className="hover:text-red-400"><Trash2 size={11} /></button>
                    </div>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-[#3c3c3c]" />
              <DropdownMenuItem onClick={() => setShowCreateBranch(!showCreateBranch)} className="text-xs hover:bg-[#2a2d2e]">
                <Plus size={10} className="mr-1" /> Create New Branch
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Create Branch Input */}
        {showCreateBranch && (
          <div className="mb-2 p-2 bg-[#252526] border border-[#3c3c3c] rounded animate-in fade-in slide-in-from-top-1">
            <p className="text-[9px] text-[#858585] mb-1 uppercase tracking-wider">New Branch Name</p>
            <div className="flex gap-1">
              <Input
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="feature/my-feature"
                className="h-6 text-xs bg-[#3c3c3c] border-none text-white flex-1"
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBranch(); if (e.key === 'Escape') setShowCreateBranch(false); }}
                autoFocus
              />
              <Button onClick={handleCreateBranch} className="h-6 text-xs bg-[#2da44e] hover:bg-[#2c974b] px-3">Create</Button>
              <Button onClick={() => { setShowCreateBranch(false); setNewBranchName(''); }} className="h-6 text-xs bg-[#3c3c3c] hover:bg-[#4c4c4c] px-2"><X size={12} /></Button>
            </div>
          </div>
        )}

        {/* GitHub Auth */}
        {!githubUser ? (
          !showTokenInput ? (
            <Button onClick={() => setShowTokenInput(true)} className="w-full mb-2 bg-[#24292e] hover:bg-[#2f363d] h-7 text-xs border border-[#3c3c3c]">
              <Github size={12} className="mr-2" /> Connect GitHub
            </Button>
          ) : (
            <div className="mb-2 p-2 bg-[#252526] border border-[#3c3c3c] rounded animate-in fade-in slide-in-from-top-2">
              <p className="text-[9px] text-[#858585] mb-1 uppercase tracking-wider font-medium">Personal Access Token (Classic)</p>
              <Input
                type="password"
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                className="h-6 text-xs mb-2 bg-[#3c3c3c] border-none text-white"
                onKeyDown={e => { if (e.key === 'Enter') handleTokenLogin(); }}
                autoFocus
              />
              <div className="flex gap-1 mb-2">
                <Button onClick={handleTokenLogin} disabled={loading} className="flex-1 h-6 text-xs bg-[#2da44e] hover:bg-[#2c974b]">Connect</Button>
                <Button onClick={() => { setShowTokenInput(false); setTokenInput(''); }} className="h-6 text-xs bg-[#3c3c3c] hover:bg-[#4c4c4c]">Cancel</Button>
              </div>
              <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-[#3c3c3c]">
                <div className="flex justify-between items-center">
                  <a href="https://github.com/settings/tokens/new?scopes=repo,user,workflow&description=DevStudio+Access" target="_blank" className="text-[10px] text-[#3794ff] flex items-center gap-1 hover:underline">
                    <ExternalLink size={10} /> Generate Token
                  </a>
                  <button onClick={() => setShowHelp(!showHelp)} className="text-[10px] text-[#858585] hover:text-white flex items-center gap-1">
                    <HelpCircle size={10} /> {showHelp ? 'Hide' : 'How to?'}
                  </button>
                </div>
                {showHelp && (
                  <div className="bg-[#1e1e1e] p-2 rounded text-[9px] text-[#cccccc] mt-1 space-y-0.5 border border-[#3c3c3c]">
                    <p className="font-bold text-[#3794ff]">Steps to create token:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-[#858585]">
                      <li>Click "Generate Token" link above</li>
                      <li>Login to GitHub if asked</li>
                      <li><b>Note:</b> Give it a name (e.g. DevStudio)</li>
                      <li><b>Expiration:</b> Set to "No expiration"</li>
                      <li><b>Scopes:</b> Ensure <code>repo</code>, <code>workflow</code>, <code>user</code> are checked</li>
                      <li>Scroll down & click <b>Generate token</b></li>
                      <li>Copy the code (ghp_...) and paste here</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="flex items-center justify-between text-[10px] text-green-400 mb-2 bg-[#1a2e1a] px-2 py-1.5 rounded border border-[#2d4a2d]">
            <span className="flex items-center gap-1"><Check size={10} /> {githubUser}</span>
            <LogOut size={10} onClick={handleLogout} className="cursor-pointer hover:text-red-400 transition-colors" title="Logout" />
          </div>
        )}

        {/* Commit Input */}
        <textarea
          ref={messageRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Commit message (Ctrl+Enter to commit)"
          className="git-commit-input"
          onKeyDown={e => {
            if (e.ctrlKey && e.key === 'Enter') {
              e.preventDefault();
              if (e.shiftKey) handleCommitAndPush();
              else handleCommit();
            }
          }}
        />
        <div className="text-[9px] text-[#616161] mb-2 px-1">
          Ctrl+Enter = Commit{hasRemote ? ' • Ctrl+Shift+Enter = Commit & Push' : ''}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-0 mb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex-1 bg-[#007acc] hover:bg-[#005a9e] text-xs h-7 rounded-r-none border-r border-[#ffffff20]">
                <Check size={12} className="mr-1.5" /> Commit
                <ChevronDown size={10} className="ml-1.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#252526] border-[#454545] text-white">
              <DropdownMenuItem onClick={handleCommit} className="text-xs">
                <Check size={12} className="mr-2" /> Commit
              </DropdownMenuItem>
              {hasRemote && (
                <DropdownMenuItem onClick={handleCommitAndPush} className="text-xs">
                  <ArrowUpCircle size={12} className="mr-2" /> Commit & Push
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-1">
          {hasRemote ? (
            <>
              <Button onClick={handlePush} disabled={loading} className="flex-1 bg-[#2d2d2d] hover:bg-[#3c3c3c] text-xs h-6 border border-[#3c3c3c]" title="Push">
                <ArrowUpCircle size={11} className="mr-1" /> Push
                {ahead > 0 && <span className="ml-1 text-[9px] text-[#3794ff]">{ahead}</span>}
              </Button>
              <Button onClick={handlePull} disabled={loading} className="flex-1 bg-[#2d2d2d] hover:bg-[#3c3c3c] text-xs h-6 border border-[#3c3c3c]" title="Pull">
                <ArrowDownCircle size={11} className="mr-1" /> Pull
                {behind > 0 && <span className="ml-1 text-[9px] text-[#3794ff]">{behind}</span>}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => githubUser ? setShowPublishModal(true) : toast.error("Sign in first")}
              className="flex-1 bg-[#2da44e] hover:bg-[#2c974b] text-xs h-6"
            >
              <Globe size={11} className="mr-1" /> Publish to GitHub
            </Button>
          )}
          <Button
            onClick={() => setShowStashInput(!showStashInput)}
            className="bg-[#2d2d2d] hover:bg-[#3c3c3c] text-xs h-6 px-2 border border-[#3c3c3c]"
            title="Stash changes"
          >
            <Archive size={11} />
          </Button>
        </div>

        {/* Stash Input */}
        {showStashInput && (
          <div className="mt-2 p-2 bg-[#252526] border border-[#3c3c3c] rounded animate-in fade-in slide-in-from-top-1">
            <div className="flex gap-1">
              <Input
                value={stashMessage}
                onChange={(e) => setStashMessage(e.target.value)}
                placeholder="Stash message (optional)"
                className="h-6 text-xs bg-[#3c3c3c] border-none text-white flex-1"
                onKeyDown={e => { if (e.key === 'Enter') handleStashSave(); if (e.key === 'Escape') setShowStashInput(false); }}
                autoFocus
              />
              <Button onClick={handleStashSave} className="h-6 text-xs bg-[#007acc] hover:bg-[#005a9e] px-3">Stash</Button>
              <Button onClick={() => setShowStashInput(false)} className="h-6 text-xs bg-[#3c3c3c] hover:bg-[#4c4c4c] px-2"><X size={12} /></Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── SCROLLABLE CONTENT ─── */}
      <div className="flex-1 overflow-y-auto">
        {/* Staged Changes */}
        {staged.length > 0 && (
          <Section
            title="Staged Changes"
            count={staged.length}
            icon={Check}
            actions={
              <button onClick={handleUnstageAll} className="git-action-btn" title="Unstage All"><Minus size={12} /></button>
            }
          >
            {staged.map((f, i) => (
              <FileItem
                key={`staged-${i}`}
                file={f}
                staged={true}
                onUnstage={(p) => window.electronAPI.gitUnstage(rootPath, p).then(refreshStatus)}
                onDiffClick={handleFileDiff}
              />
            ))}
          </Section>
        )}

        {/* Changes */}
        {changes.length > 0 && (
          <Section
            title="Changes"
            count={changes.length}
            icon={FileText}
            actions={
              <div className="flex items-center gap-1">
                <button onClick={handleDiscardAll} className="git-action-btn text-red-400 hover:text-red-300" title="Discard All"><Undo2 size={12} /></button>
                <button onClick={handleStageAll} className="git-action-btn" title="Stage All"><Plus size={12} /></button>
              </div>
            }
          >
            {changes.map((f, i) => (
              <FileItem
                key={`change-${i}`}
                file={f}
                staged={false}
                onStage={(p) => window.electronAPI.gitStage(rootPath, p).then(refreshStatus)}
                onDiscard={handleDiscard}
                onDiffClick={handleFileDiff}
              />
            ))}
          </Section>
        )}

        {/* Inline Diff */}
        {diffContent && (
          <DiffViewer diff={diffContent} onClose={() => { setDiffContent(null); setDiffFile(null); }} />
        )}

        {/* No changes message */}
        {files.length === 0 && isRepo && (
          <div className="px-4 py-8 text-center">
            <Check size={20} className="mx-auto text-green-400 mb-2" />
            <p className="text-[11px] text-[#858585]">Working tree clean</p>
            <p className="text-[9px] text-[#616161] mt-1">No pending changes</p>
          </div>
        )}

        {/* Stashes */}
        {stashes.length > 0 && (
          <Section title="Stashes" count={stashes.length} icon={Archive} defaultOpen={false}>
            {stashes.map((s) => (
              <StashItem
                key={s.index}
                stash={s}
                onApply={handleStashApply}
                onPop={handleStashPop}
                onDrop={handleStashDrop}
              />
            ))}
          </Section>
        )}

        {/* Commit History */}
        <Section
          title="Commit History"
          count={commits.length}
          icon={History}
          defaultOpen={false}
          actions={
            <button onClick={() => setShowCommitSearch(!showCommitSearch)} className="git-action-btn" title="Search commits">
              <Search size={12} />
            </button>
          }
        >
          {showCommitSearch && (
            <div className="px-2 pb-2">
              <Input
                value={commitSearch}
                onChange={e => setCommitSearch(e.target.value)}
                placeholder="Search by message or hash..."
                className="h-6 text-xs bg-[#3c3c3c] border-none text-white"
                autoFocus
              />
            </div>
          )}
          {filteredCommits.length === 0 ? (
            <p className="text-[10px] text-[#616161] px-3 py-2">No commits yet</p>
          ) : (
            filteredCommits.map((c) => <CommitItem key={c.hash} commit={c} />)
          )}
        </Section>
      </div>

      {/* ─── DISCARD CONFIRMATION ─── */}
      {confirmDiscard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-[#252526] border border-[#454545] rounded-md p-4 w-80 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-yellow-400" />
              <span className="text-sm text-white font-medium">Discard Changes?</span>
            </div>
            <p className="text-xs text-[#cccccc] mb-4">
              {confirmDiscard === '__ALL__'
                ? 'This will discard ALL uncommitted changes. This action cannot be undone.'
                : <>Are you sure you want to discard changes in <code className="text-[#3794ff]">{confirmDiscard}</code>? This cannot be undone.</>
              }
            </p>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setConfirmDiscard(null)} className="h-7 text-xs bg-[#3c3c3c] hover:bg-[#4c4c4c]">Cancel</Button>
              <Button
                onClick={confirmDiscard === '__ALL__' ? confirmDiscardAllAction : confirmDiscardAction}
                className="h-7 text-xs bg-red-600 hover:bg-red-700"
              >
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      <PublishModal isOpen={showPublishModal} onClose={() => setShowPublishModal(false)} onPublish={handlePublishConfirm} files={files} />
    </div>
  );
}