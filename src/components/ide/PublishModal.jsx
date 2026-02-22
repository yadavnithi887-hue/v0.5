import React, { useState, useEffect } from 'react';
import { X, Lock, Globe, CheckSquare, Square, GitPullRequest, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Select कंपोनेंट को इम्पोर्ट करें
import { toast } from 'sonner';

export default function PublishModal({ isOpen, onClose, onPublish, files = [] }) {
  const [repoName, setRepoName] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  // --- 🔥 नए स्टेट्स ---
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [existingRepos, setExistingRepos] = useState([]);
  const [selectedRepoUrl, setSelectedRepoUrl] = useState('');
  const [publishMode, setPublishMode] = useState('new'); // 'new' या 'existing'

  useEffect(() => {
    if (isOpen) {
      // जब मोडल खुले तो सब कुछ रीसेट करें
      const currentFolder = localStorage.getItem('devstudio-last-project');
      setRepoName(currentFolder ? currentFolder.split('\\').pop().split('/').pop() : 'my-new-project');
      setIsPrivate(true);
      setSelectedFiles(files.map(f => f.path));
      setPublishMode('new');
      setSelectedRepoUrl('');
      setExistingRepos([]);
      
      // मौजूदा रिपॉजिटरी की सूची लोड करें
      fetchExistingRepos();
    }
  }, [isOpen]);

  const fetchExistingRepos = async () => {
    setIsLoadingRepos(true);
    const token = localStorage.getItem('github_token');
    if (token) {
        const result = await window.electronAPI.getGithubRepos(token);
        if (result.success) {
            setExistingRepos(result.repos || []);
        } else {
            toast.error("Could not fetch your GitHub repositories.");
        }
    }
    setIsLoadingRepos(false);
  };

  const handleFinalPublish = () => {
    const publishData = {
        cwd: localStorage.getItem('devstudio-last-project'),
        token: localStorage.getItem('github_token'),
        files: selectedFiles,
        isPrivate: isPrivate,
        useExisting: publishMode === 'existing',
        repoName: repoName,
        existingRepoUrl: selectedRepoUrl
    };

    if (publishMode === 'existing' && !selectedRepoUrl) {
        return toast.error("Please select an existing repository to publish to.");
    }
    if (publishMode === 'new' && !repoName.trim()) {
        return toast.error("Please enter a name for the new repository.");
    }

    onPublish(publishData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-20 z-[9999]">
      <div className="bg-[#252526] border border-[#454545] w-[500px] shadow-2xl rounded-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c3c]">
          <span className="text-sm font-medium text-white">Publish to GitHub</span>
          <button onClick={onClose} className="text-[#858585] hover:text-white"><X size={16}/></button>
        </div>

        <div className="p-4 space-y-4">
            {/* --- 🔥 नया मोड सेलेक्टर --- */}
            <div className="flex bg-[#3c3c3c] p-1 rounded-md">
                <button 
                    onClick={() => setPublishMode('new')}
                    className={`flex-1 text-xs p-1 rounded-sm flex items-center justify-center gap-2 ${publishMode === 'new' ? 'bg-[#252526] text-white' : 'text-[#858585]'}`}
                ><Plus size={14}/>Create New Repository</button>
                <button 
                    onClick={() => setPublishMode('existing')}
                    className={`flex-1 text-xs p-1 rounded-sm flex items-center justify-center gap-2 ${publishMode === 'existing' ? 'bg-[#252526] text-white' : 'text-[#858585]'}`}
                ><GitPullRequest size={14}/>Use Existing Repository</button>
            </div>

            {/* नया रिपॉजिटरी बनाने का फॉर्म */}
            {publishMode === 'new' && (
                <div className="space-y-4 animate-in fade-in">
                    <Input 
                        value={repoName} 
                        onChange={e => setRepoName(e.target.value)} 
                        className="bg-[#3c3c3c] border-[#454545] text-white" 
                        placeholder="new-repository-name"
                    />
                    <div className="flex gap-2">
                        <Button onClick={() => setIsPrivate(true)} variant={isPrivate ? 'secondary' : 'ghost'} className="flex-1 text-xs"><Lock size={12} className="mr-1"/>Private</Button>
                        <Button onClick={() => setIsPrivate(false)} variant={!isPrivate ? 'secondary' : 'ghost'} className="flex-1 text-xs"><Globe size={12} className="mr-1"/>Public</Button>
                    </div>
                </div>
            )}

            {/* मौजूदा रिपॉजिटरी चुनने का फॉर्म */}
            {publishMode === 'existing' && (
                <div className="space-y-2 animate-in fade-in">
                     <Select onValueChange={setSelectedRepoUrl} value={selectedRepoUrl}>
                        <SelectTrigger className="w-full bg-[#3c3c3c] border-[#454545] text-white">
                            <SelectValue placeholder={isLoadingRepos ? "Loading your repos..." : "Select a repository"} />
                        </SelectTrigger>
                        <SelectContent className="bg-[#252526] border-[#454545] text-white">
                            {existingRepos.map(repo => (
                                <SelectItem key={repo.clone_url} value={repo.clone_url} className="hover:bg-[#3c3c3c]">
                                    {repo.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>

        <div className="p-3 border-t border-[#3c3c3c] flex justify-end items-center bg-[#252526]">
            <Button onClick={handleFinalPublish} className="bg-[#2da44e] hover:bg-[#2c974b] text-white text-xs">
                Publish Repository
            </Button>
        </div>
      </div>
    </div>
  );
}