import React, { useState, useEffect } from 'react';
import {
  GitBranch, Check, RefreshCw, CloudUpload, Github, LogOut, Globe,
  Plus, Minus, ChevronDown, ChevronRight, ExternalLink, HelpCircle, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import PublishModal from './PublishModal';

export default function GitPanel() {
  const [loading, setLoading] = useState(false);
  const [isRepo, setIsRepo] = useState(false);
  const [files, setFiles] = useState([]);
  const [branch, setBranch] = useState('');
  const [message, setMessage] = useState('');
  const [githubUser, setGithubUser] = useState(localStorage.getItem('github_user'));
  const [hasRemote, setHasRemote] = useState(false);

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  // 🔥 NEW: Help Toggle State
  const [showHelp, setShowHelp] = useState(false);

  // 🔥 NEW: Branch Management States
  const [branches, setBranches] = useState([]);
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  const rootPath = localStorage.getItem('devstudio-last-project');

  const refreshStatus = async () => {
    if (!rootPath || !window.electronAPI) return;
    setLoading(true);
    try {
      const result = await window.electronAPI.getGitStatus(rootPath);
      setIsRepo(result.isRepo);
      setFiles(result.files || []);
      setBranch(result.branch || '');
      setHasRemote(result.hasRemote);
    } catch (e) { }
    setLoading(false);
  };

  useEffect(() => {
    refreshStatus();
    fetchBranches();
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [rootPath]);

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
      } else { toast.error("Invalid Token"); }
    } catch (e) { toast.error("Connection failed"); }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('github_user'); localStorage.removeItem('github_token');
    setGithubUser(null); toast.success("Logged out");
  };

  const handleCommitAction = async () => {
    if (!message.trim()) return toast.error("Enter commit message");
    const hasStaged = files.some(f => f.staged);
    if (!hasStaged) await window.electronAPI.gitStage(rootPath, '.');
    const res = await window.electronAPI.gitCommit(rootPath, message);
    if (res.success) { setMessage(''); refreshStatus(); toast.success("Committed"); }
    else { toast.error("Commit failed"); }
  };

  // handleSync का नाम बदलकर handlePush कर दिया गया है और इसमें बेहतर एरर मैसेज हैं
  const handlePush = async () => {
    if (!githubUser) return toast.error("Please sign in first!");
    if (!hasRemote) return toast.error("This project is not published. Please publish it first.");
    setLoading(true);
    toast.info("Pushing changes...");
    const token = localStorage.getItem('github_token');
    const res = await window.electronAPI.gitPush({ cwd: rootPath, token });
    if (res.success) {
      toast.success("Changes pushed successfully! 🚀");
      refreshStatus();
    } else {
      toast.error(`Push failed: ${res.error}`, { duration: 5000 });
    }
    setLoading(false);
  };

  // नया Pull फंक्शन
  const handlePull = async () => {
    if (!githubUser) return toast.error("Please sign in first!");
    if (!hasRemote) return toast.error("This project is not published. Please publish it first.");
    setLoading(true);
    toast.info("Pulling changes from remote...");
    const res = await window.electronAPI.gitPull(rootPath);
    if (res.success) {
      toast.success("Successfully pulled changes!");
      refreshStatus();
    } else {
      toast.error(`Pull failed: ${res.error}`, { duration: 5000 });
    }
    setLoading(false);
  };

  // यह अब मोडल से पूरा डेटा ऑब्जेक्ट लेता है
  const handlePublishConfirm = async (publishData) => {
    setLoading(true);
    toast.info(`Publishing to ${publishData.useExisting ? 'existing' : 'new'} repository...`);
    const res = await window.electronAPI.gitPublish(publishData);
    if (res.success) {
      toast.success("Successfully published to GitHub! 🎉");
      setHasRemote(true);
      refreshStatus();
    } else {
      toast.error(`Publish failed: ${res.error}`, { duration: 5000 });
    }
    setLoading(false);
  };

  // 🔥 NEW: Branch Management Functions
  const fetchBranches = async () => {
    if (!rootPath || !window.electronAPI) return;
    try {
      const result = await window.electronAPI.getGitBranches(rootPath);
      setBranches(result.branches || []);
    } catch (e) { }
  };

  const handleBranchSelect = async (branchName) => {
    if (!rootPath || !window.electronAPI) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.gitCheckout(rootPath, branchName);
      if (res.success) {
        setBranch(branchName);
        refreshStatus();
        toast.success(`Switched to ${branchName}`);
      } else {
        toast.error("Failed to switch branch");
      }
    } catch (e) {
      toast.error("Error switching branch");
    }
    setLoading(false);
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return toast.error("Enter branch name");
    if (!rootPath || !window.electronAPI) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.gitCreateBranch(rootPath, newBranchName);
      if (res.success) {
        setNewBranchName('');
        setShowCreateBranch(false);
        fetchBranches();
        handleBranchSelect(newBranchName);
        toast.success(`Branch '${newBranchName}' created`);
      } else {
        toast.error("Failed to create branch");
      }
    } catch (e) {
      toast.error("Error creating branch");
    }
    setLoading(false);
  };

  // Helper Components
  const FileItem = ({ file, icon: Icon, action }) => (
    <div className="flex justify-between px-2 py-1 hover:bg-[#2a2d2e] text-xs text-[#cccccc] group">
      <span className="truncate">{file.path}</span>
      <div className="flex items-center gap-2">
        <span className={file.status === 'M' ? 'text-yellow-400' : file.status === 'U' ? 'text-green-400' : 'text-red-400'}>{file.status}</span>
        <button onClick={(e) => { e.stopPropagation(); action(file.path) }} className="opacity-0 group-hover:opacity-100 hover:text-white"><Icon size={12} /></button>
      </div>
    </div>
  );

  if (rootPath && !isRepo) {
    return (
      <div className="h-full bg-[#1e1e1e] text-white p-4 flex flex-col items-center justify-center text-center">
        <p className="text-[#cccccc] text-sm mb-4">No Git Repository found.</p>
        <Button onClick={async () => { await window.electronAPI.gitInit(rootPath); refreshStatus(); }} className="bg-[#007acc] text-white text-sm">Initialize Repository</Button>
      </div>
    );
  }

  const staged = files.filter(f => f.staged);
  const changes = files.filter(f => !f.staged);

  return (
    <div className="h-full bg-[#1e1e1e] flex flex-col text-white">
      <div className="p-3 border-b border-[#3c3c3c]">
        <div className="flex justify-between mb-2 text-[#cccccc] text-xs">
          <span>SOURCE CONTROL</span>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-6 px-2 text-xs text-[#cccccc] hover:bg-[#2a2d2e] flex items-center gap-1">
                  <GitBranch size={12} />
                  <span className="truncate max-w-20">{branch || 'No branch'}</span>
                  <ChevronDown size={10} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#252526] border-[#454545] text-white min-w-40">
                {branches.map((b) => (
                  <DropdownMenuItem
                    key={b}
                    onClick={() => handleBranchSelect(b)}
                    className={`text-xs ${b === branch ? 'bg-[#007acc] text-white' : 'hover:bg-[#2a2d2e]'}`}
                  >
                    {b}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onClick={() => setShowCreateBranch(!showCreateBranch)}
                  className="text-xs hover:bg-[#2a2d2e] border-t border-[#3c3c3c] mt-1 pt-1"
                >
                  <Plus size={10} className="mr-1" /> Create Branch
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <RefreshCw size={14} onClick={refreshStatus} className={`cursor-pointer ${loading && 'animate-spin'}`} />
          </div>
        </div>

        {/* 🔥 NEW: Create Branch Input */}
        {showCreateBranch && (
          <div className="mb-2 p-2 bg-[#252526] border border-[#3c3c3c] rounded">
            <p className="text-[10px] text-[#cccccc] mb-1">New Branch Name:</p>
            <div className="flex gap-1">
              <Input
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="branch-name"
                className="h-6 text-xs bg-[#3c3c3c] border-none text-white flex-1"
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBranch(); }}
              />
              <Button onClick={handleCreateBranch} className="h-6 text-xs bg-[#2da44e] hover:bg-[#2c974b]">Create</Button>
              <Button onClick={() => { setShowCreateBranch(false); setNewBranchName(''); }} className="h-6 text-xs bg-[#3c3c3c] hover:bg-[#4c4c4c]">Cancel</Button>
            </div>
          </div>
        )}

        {/* LOGIN SECTION */}
        {!githubUser ? (
          !showTokenInput ? (
            <Button onClick={() => setShowTokenInput(true)} className="w-full mb-2 bg-[#24292e] h-7 text-xs"><Github size={12} className="mr-2" /> Connect GitHub</Button>
          ) : (
            <div className="mb-2 p-2 bg-[#252526] border border-[#3c3c3c] rounded animate-in fade-in slide-in-from-top-2">
              <p className="text-[10px] text-[#cccccc] mb-1 font-medium">Personal Access Token (Classic):</p>

              <Input
                type="password"
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                className="h-6 text-xs mb-2 bg-[#3c3c3c] border-none text-white"
              />

              <div className="flex gap-1 mb-2">
                <Button onClick={handleTokenLogin} className="flex-1 h-6 text-xs bg-[#2da44e] hover:bg-[#2c974b]">Connect</Button>
                <Button onClick={() => setShowTokenInput(false)} className="h-6 text-xs bg-[#3c3c3c] hover:bg-[#4c4c4c]">Cancel</Button>
              </div>

              {/* 🔥 HELP LINKS & TOGGLE */}
              <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-[#3c3c3c]">
                <div className="flex justify-between items-center">
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo,user,workflow&description=DevStudio+Access"
                    target="_blank"
                    className="text-[10px] text-[#3794ff] flex items-center gap-1 hover:underline"
                  >
                    <ExternalLink size={10} /> Generate Token (Classic)
                  </a>
                  <button
                    onClick={() => setShowHelp(!showHelp)}
                    className="text-[10px] text-[#858585] hover:text-white flex items-center gap-1"
                  >
                    <HelpCircle size={10} /> How to?
                  </button>
                </div>

                {/* 🔥 HELP INSTRUCTIONS BOX */}
                {showHelp && (
                  <div className="bg-[#1e1e1e] p-2 rounded text-[9px] text-[#cccccc] mt-1 space-y-1 border border-[#3c3c3c]">
                    <p className="font-bold text-[#3794ff]">Steps to create token:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-[#858585]">
                      <li>Click "Generate Token" link above.</li>
                      <li>Login to GitHub if asked.</li>
                      <li><b>Note:</b> Give it a name (e.g. DevStudio).</li>
                      <li><b>Expiration:</b> Set to "No expiration".</li>
                      <li><b>Scopes:</b> Ensure <code>repo</code>, <code>workflow</code>, and <code>user</code> are checked.</li>
                      <li>Scroll down & click <b>Generate token</b>.</li>
                      <li>Copy the code (ghp_...) and paste here.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="flex justify-between text-[10px] text-green-400 mb-2 bg-[#2a2d2e] px-2 py-1 rounded"><span className="flex gap-1"><Check size={10} /> {githubUser}</span><LogOut size={10} onClick={handleLogout} className="cursor-pointer hover:text-red-400" /></div>
        )}

        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Message (Ctrl+Enter)" className="w-full h-16 bg-[#252526] border border-[#3c3c3c] text-white text-sm px-2 py-1 outline-none mb-2 resize-none focus:border-[#007acc]" onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') handleCommitAction() }} />

        <div className="flex gap-0">
          <Button onClick={() => handleCommitAction()} className="flex-1 bg-[#007acc] hover:bg-[#005a9e] text-xs h-7 rounded-r-none border-r border-[#ffffff30]"><Check size={12} className="mr-2" /> Commit</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button className="bg-[#007acc] hover:bg-[#005a9e] text-xs h-7 px-1 rounded-l-none"><ChevronDown size={12} /></Button></DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#252526] border-[#454545] text-white">
              <DropdownMenuItem onClick={handleCommitAction}>Commit</DropdownMenuItem>
              <DropdownMenuItem onClick={handlePush}>Push</DropdownMenuItem>
              <DropdownMenuItem onClick={handlePull}>Pull</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {hasRemote ? (
          <Button onClick={handlePush} className="w-full mt-2 bg-[#2d2d2d] hover:bg-[#3c3c3c] text-xs h-7"><CloudUpload size={12} className="mr-2" /> Push Changes</Button>
        ) : (
          <Button onClick={() => githubUser ? setShowPublishModal(true) : toast.error("Sign in first")} className="w-full mt-2 bg-[#2da44e] hover:bg-[#2c974b] text-xs h-7"><Globe size={12} className="mr-2" /> Publish to GitHub</Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {staged.length > 0 && <div className="mb-2"><div className="px-2 py-1 bg-[#333] text-[10px] font-bold text-[#ccc] flex justify-between"><span>STAGED</span><span>{staged.length}</span></div>{staged.map((f, i) => <FileItem key={i} file={f} icon={Minus} action={(p) => window.electronAPI.gitUnstage(rootPath, p).then(refreshStatus)} />)}</div>}
        {changes.length > 0 && <div><div className="px-2 py-1 bg-[#333] text-[10px] font-bold text-[#ccc] flex justify-between"><span>CHANGES</span><span>{changes.length}</span></div>{changes.map((f, i) => <FileItem key={i} file={f} icon={Plus} action={(p) => window.electronAPI.gitStage(rootPath, p).then(refreshStatus)} />)}</div>}
      </div>

      <PublishModal isOpen={showPublishModal} onClose={() => setShowPublishModal(false)} onPublish={handlePublishConfirm} files={files} />
    </div>
  );
}