import React, { useState, useEffect } from 'react';
import { X, Lock, Globe, GitPullRequest, Plus, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';

export default function PublishModal({ isOpen, onClose, onPublish, files = [] }) {
    const [repoName, setRepoName] = useState('');
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(true);
    const [selectedFiles, setSelectedFiles] = useState([]);

    const [isLoadingRepos, setIsLoadingRepos] = useState(false);
    const [existingRepos, setExistingRepos] = useState([]);
    const [selectedRepoUrl, setSelectedRepoUrl] = useState('');
    const [publishMode, setPublishMode] = useState('new'); // 'new' or 'existing'

    // New features for repository creation
    const [gitignoreTemplate, setGitignoreTemplate] = useState('Node'); // Default Node
    const [addReadme, setAddReadme] = useState(true);

    useEffect(() => {
        if (isOpen) {
            const currentFolder = localStorage.getItem('devstudio-last-project');
            setRepoName(currentFolder ? currentFolder.split('\\').pop().split('/').pop() : 'my-new-project');
            setDescription('');
            setIsPrivate(true);
            setSelectedFiles(files.map(f => f.path));
            setPublishMode('new');
            setSelectedRepoUrl('');
            setExistingRepos([]);
            setGitignoreTemplate('Node');
            setAddReadme(true);

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
            description: description,
            existingRepoUrl: selectedRepoUrl,
            gitignoreTemplate: gitignoreTemplate !== 'None' ? gitignoreTemplate : null,
            addReadme: addReadme
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
            <div className="bg-[#252526] border border-[#454545] w-[500px] shadow-2xl rounded-md flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c3c] shrink-0">
                    <span className="text-sm font-medium text-white">Publish to GitHub</span>
                    <button onClick={onClose} className="text-[#858585] hover:text-white"><X size={16} /></button>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto">
                    <div className="flex bg-[#3c3c3c] p-1 rounded-md shrink-0">
                        <button
                            onClick={() => setPublishMode('new')}
                            className={`flex-1 text-xs p-1.5 rounded-sm flex items-center justify-center gap-2 transition-colors ${publishMode === 'new' ? 'bg-[#252526] text-white shadow-sm' : 'text-[#858585] hover:text-[#cccccc]'}`}
                        ><Plus size={14} />Create New Repository</button>
                        <button
                            onClick={() => setPublishMode('existing')}
                            className={`flex-1 text-xs p-1.5 rounded-sm flex items-center justify-center gap-2 transition-colors ${publishMode === 'existing' ? 'bg-[#252526] text-white shadow-sm' : 'text-[#858585] hover:text-[#cccccc]'}`}
                        ><GitPullRequest size={14} />Use Existing Repository</button>
                    </div>

                    {publishMode === 'new' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-1">
                                <label className="text-[10px] text-[#858585] uppercase tracking-wider font-semibold">Repository Name</label>
                                <Input
                                    value={repoName}
                                    onChange={e => setRepoName(e.target.value)}
                                    className="bg-[#3c3c3c] border-transparent focus:border-[#007acc] text-white h-8 text-xs"
                                    placeholder="my-awesome-project"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] text-[#858585] uppercase tracking-wider font-semibold">Description (Optional)</label>
                                <Input
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="bg-[#3c3c3c] border-transparent focus:border-[#007acc] text-white h-8 text-xs"
                                    placeholder="What is this repository for?"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-[#858585] uppercase tracking-wider font-semibold">Visibility</label>
                                    <div className="flex bg-[#3c3c3c] p-1 rounded-md">
                                        <button onClick={() => setIsPrivate(true)} className={`flex-1 text-xs py-1 rounded-sm flex items-center justify-center transition-colors ${isPrivate ? 'bg-[#007acc] text-white' : 'text-[#858585] hover:text-[#cccccc]'}`}><Lock size={12} className="mr-1.5" />Private</button>
                                        <button onClick={() => setIsPrivate(false)} className={`flex-1 text-xs py-1 rounded-sm flex items-center justify-center transition-colors ${!isPrivate ? 'bg-[#2da44e] text-white' : 'text-[#858585] hover:text-[#cccccc]'}`}><Globe size={12} className="mr-1.5" />Public</button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] text-[#858585] uppercase tracking-wider font-semibold">.gitignore Template</label>
                                    <Select onValueChange={setGitignoreTemplate} value={gitignoreTemplate}>
                                        <SelectTrigger className="w-full bg-[#3c3c3c] border-transparent text-white h-[28px] text-xs mt-[2px]">
                                            <SelectValue placeholder="Select template" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#252526] border-[#454545] text-white">
                                            <SelectItem value="None" className="text-xs hover:bg-[#3c3c3c]">None</SelectItem>
                                            <SelectItem value="Node" className="text-xs hover:bg-[#3c3c3c]">Node</SelectItem>
                                            <SelectItem value="Python" className="text-xs hover:bg-[#3c3c3c]">Python</SelectItem>
                                            <SelectItem value="React" className="text-xs hover:bg-[#3c3c3c]">React</SelectItem>
                                            <SelectItem value="C++" className="text-xs hover:bg-[#3c3c3c]">C++</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 bg-[#3c3c3c]/30 p-2.5 rounded-md border border-[#3c3c3c]">
                                <button
                                    type="button"
                                    onClick={() => setAddReadme(!addReadme)}
                                    className={`flex items-center justify-center w-4 h-4 rounded-sm border ${addReadme ? 'bg-[#007acc] border-[#007acc] text-white' : 'border-[#858585] text-transparent'}`}
                                >
                                    <CheckCircle2 size={12} />
                                </button>
                                <div className="flex flex-col cursor-pointer" onClick={() => setAddReadme(!addReadme)}>
                                    <label className="text-xs font-medium text-[#cccccc] cursor-pointer">Add a README file</label>
                                    <p className="text-[10px] text-[#858585]">This is where you can write a long description for your project.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {publishMode === 'existing' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-1">
                                <label className="text-[10px] text-[#858585] uppercase tracking-wider font-semibold">Select Repository</label>
                                <Select onValueChange={setSelectedRepoUrl} value={selectedRepoUrl}>
                                    <SelectTrigger className="w-full bg-[#3c3c3c] border-transparent focus:border-[#007acc] text-white h-8 text-xs">
                                        <SelectValue placeholder={isLoadingRepos ? "Loading your repos..." : "Select a repository"} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#252526] border-[#454545] text-white max-h-60">
                                        {existingRepos.map(repo => (
                                            <SelectItem key={repo.clone_url} value={repo.clone_url} className="text-xs hover:bg-[#3c3c3c]">
                                                <div className="flex items-center justify-between w-full">
                                                    <span>{repo.full_name}</span>
                                                    {repo.private ? <Lock size={10} className="text-[#858585] ml-2" /> : <Globe size={10} className="text-[#858585] ml-2" />}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="bg-[#3c3c3c]/30 border border-[#3c3c3c] rounded p-3 text-xs text-[#cccccc]">
                                <p className="flex items-start gap-2">
                                    <FileText size={14} className="text-[#3794ff] shrink-0 mt-0.5" />
                                    <span>This will add the selected repository as a remote origin and push your current local branch to it.</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-[#3c3c3c] flex justify-end items-center bg-[#252526] shrink-0 gap-2">
                    <Button onClick={onClose} className="bg-[#3c3c3c] hover:bg-[#4c4c4c] text-white text-xs h-8">
                        Cancel
                    </Button>
                    <Button onClick={handleFinalPublish} className="bg-[#2da44e] hover:bg-[#2c974b] text-white text-xs h-8">
                        {publishMode === 'new' ? 'Create & Publish' : 'Push to Existing'}
                    </Button>
                </div>
            </div>
        </div>
    );
}