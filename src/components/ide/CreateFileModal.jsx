import React, { useState, useEffect, useRef } from 'react';
import { X, File, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CreateFileModal({ isOpen, onClose, onCreate, folders = [], type = 'file', initialFolder }) {
  const [name, setName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('root');
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (isOpen) {
      setName('');
      
      let target = 'root';
      if (initialFolder && initialFolder !== 'root') {
         const exists = folders.some(f => f.path === initialFolder || f.realPath === initialFolder);
         if (exists) target = initialFolder;
      }
      setSelectedFolder(target);
      
      // Force Focus after render
      requestAnimationFrame(() => {
        if(inputRef.current) inputRef.current.focus();
      });
    }
  }, [isOpen]); 
  
  const handleCreate = () => {
    if (!name.trim()) return;
    const finalFolder = selectedFolder === 'root' ? '' : selectedFolder;
    onCreate({ name: name.trim(), folder: finalFolder });
    onClose();
  };
  
  const handleKeyDown = (e) => {
    // 🔥 CRITICAL FIX:
    // Ye event ko Layout.jsx tak jane se rokega.
    // Isse 'n', 's', 'p' dabane par shortcuts trigger nahi honge.
    e.stopPropagation(); 

    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-[#252526] rounded-lg w-96 shadow-2xl border border-[#3c3c3c]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#3c3c3c]">
          <div className="flex items-center gap-2 text-white">
            {type === 'file' ? <File size={18} /> : <Folder size={18} />}
            <span className="font-medium">New {type === 'file' ? 'File' : 'Folder'}</span>
          </div>
          <button onClick={onClose} className="text-[#858585] hover:text-white">
            <X size={18} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-[#858585] mb-1 block">
              {type === 'file' ? 'Name' : 'Folder Name'}
            </label>
            {/* 🔥 Input Field */}
            <Input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown} // 🔥 Ye wala function upar update kiya hai
              placeholder={type === 'file' ? 'index.js' : 'src'}
              className="bg-[#3c3c3c] border-[#454545] text-white focus:border-[#007acc] w-full"
              autoComplete="off"
            />
          </div>
          
          {/* Location Selection */}
          <div>
            <label className="text-xs text-[#858585] mb-1 block">Location</label>
            <Select 
              value={selectedFolder} 
              onValueChange={setSelectedFolder}
            >
              <SelectTrigger className="bg-[#3c3c3c] border-[#454545] text-white w-full">
                <SelectValue placeholder="Select Location" />
              </SelectTrigger>
              <SelectContent className="bg-[#252526] border-[#454545] text-white max-h-48 z-[10000]">
                <SelectItem value="root">/ (Project Root)</SelectItem>
                {folders.map((folder) => (
                   <SelectItem key={folder.path} value={folder.realPath || folder.path}>
                     {folder.name}
                   </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-[#3c3c3c]">
          <Button variant="ghost" onClick={onClose} className="text-[#cccccc] hover:text-white hover:bg-[#3c3c3c]">
            Cancel
          </Button>
          <Button onClick={handleCreate} className="bg-[#007acc] hover:bg-[#006bb3] text-white">
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}