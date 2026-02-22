import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, Package, FileCode, AlertCircle, Bug, Folder, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function DebugPanel({ activeFile, files = [] }) {
  const [loading, setLoading] = useState(false);
  const [projectScripts, setProjectScripts] = useState([]); 
  
  const rootPath = localStorage.getItem('devstudio-last-project');

  const refreshScripts = async () => {
    if (!rootPath || !window.electronAPI) return;
    setLoading(true);
    const foundProjects = [];
    try {
      const packageFiles = files.filter(f => f.name === 'package.json');
      for (const file of packageFiles) {
        const content = await window.electronAPI.readFile(file.realPath);
        if (content && content.trim()) {
          try {
            const json = JSON.parse(content);
            if (json.scripts) {
              let folderPath = file.realPath.replace(/\\package.json$/, '').replace(/\/package.json$/, '');
              let folderName = file.path.replace('/package.json', '');
              if (folderName === 'package.json' || folderName === '') folderName = 'ROOT';
              foundProjects.push({ folderName, fullPath: folderPath, scripts: json.scripts });
            }
          } catch (e) {}
        }
      }
      setProjectScripts(foundProjects);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { refreshScripts(); }, [files.length]); 

  // 🔥 NEW: Send Command Object (Not just string)
  const sendCommand = (cmd, path, isNew = false) => {
    const event = new CustomEvent('devstudio:run-command', { 
        detail: { 
            cmd, 
            path, 
            newWindow: isNew // 🔥 Ye batayega ki naya terminal kholna hai
        } 
    });
    window.dispatchEvent(event);
  };

  const runNpmScript = (scriptName, folderPath) => {
    // Windows path fix
    const safePath = folderPath ? folderPath.replace(/\//g, '\\') : null;
    
    // Command construct
    let fullCmd = '';
    if (safePath) fullCmd += `cd "${safePath}" ; `; // PowerShell separator
    fullCmd += `npm run ${scriptName}\r`;

    // Send with newWindow: true
    sendCommand(fullCmd, safePath, true);
    toast.info(`Starting: ${scriptName}...`);
  };

  const runActiveFile = () => {
    if (!activeFile) return toast.error("Open a file first.");

    const ext = activeFile.name.split('.').pop().toLowerCase();
    // Folder path nikalo
    const fileDir = activeFile.realPath.substring(0, activeFile.realPath.lastIndexOf(activeFile.name.includes('\\') ? '\\' : '/'));
    const safeDir = fileDir.replace(/\//g, '\\'); // Windows path fix

    let command = '';

    switch(ext) {
        // 1. JavaScript / Node
        case 'js':
        case 'cjs':
        case 'mjs':
            command = `node "${activeFile.name}"`;
            break;

        // 2. Python (python or py)
        case 'py':
            // Try 'python' first, sometimes it's 'py' on Windows
            command = `python "${activeFile.name}"`;
            break;

        // 3. Java (Single File Execution - Java 11+)
        case 'java':
            command = `java "${activeFile.name}"`;
            break;

        // 4. C++ (Needs MinGW/G++)
        case 'cpp':
        case 'cc':
            // Compile to output.exe then run
            command = `g++ "${activeFile.name}" -o output.exe ; if ($?) { .\\output.exe }`;
            break;

        // 5. C Language
        case 'c':
            command = `gcc "${activeFile.name}" -o output.exe ; if ($?) { .\\output.exe }`;
            break;

        // 6. TypeScript
        case 'ts':
            command = `npx ts-node "${activeFile.name}"`;
            break;

        case 'json':
            if (activeFile.name === 'package.json') { command = `npm install`; toast.info("Installing dependencies..."); }
            else return toast.warning("Cannot run JSON");
            break;

        case 'html':
            // HTML ke liye file ka path copy karke browser me kholne ka suggestion
            toast.info("Opening in Default Browser...");
            require('electron').shell.openPath(activeFile.realPath);
            return;

        default: return toast.warning(`No runner configured for .${ext}`);
    }

    // 🔥 Naya Terminal Kholo aur Command Chalao
    const fullCmd = `cd "${safeDir}" ; ${command}\r`;
    sendCommand(fullCmd, safeDir, true);
  };

  return (
    <div className="h-full bg-[#1e1e1e] flex flex-col text-white">
      <div className="p-3 border-b border-[#3c3c3c]">
        <div className="flex items-center justify-between mb-3 text-[#bbbbbb]">
           <span className="text-[11px] uppercase font-medium">Run and Debug</span>
           <RefreshCw size={14} onClick={refreshScripts} className={`cursor-pointer hover:text-white ${loading && 'animate-spin'}`}/>
        </div>
        <Button onClick={runActiveFile} className={`w-full text-xs h-7 mb-2 ${activeFile ? 'bg-[#2da44e] hover:bg-[#2c974b]' : 'bg-[#3c3c3c] text-[#858585] cursor-not-allowed'}`} disabled={!activeFile}>
           <Play size={12} className="mr-2"/> {activeFile ? `Run ${activeFile.name}` : 'Run Active File'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-0">
        {projectScripts.length > 0 ? projectScripts.map((proj, idx) => (
            <div key={idx} className="mb-1 border-b border-[#3c3c3c]">
               <div className="flex items-center px-3 py-2 bg-[#2a2d2e] text-xs font-bold text-[#cccccc]">
                  <Folder size={12} className="mr-2 text-yellow-500"/>
                  <span className="uppercase truncate">{proj.folderName}</span>
               </div>
               {Object.entries(proj.scripts).map(([key, cmd]) => (
                 <div key={key} className="group flex items-center justify-between px-3 py-2 hover:bg-[#37373d] cursor-pointer">
                    <div className="flex flex-col overflow-hidden"><span className="text-sm text-[#cccccc] font-medium">{key}</span><span className="text-[10px] text-[#6e6e6e] truncate w-40" title={cmd}>{cmd}</span></div>
                    {/* 🔥 Play Button now triggers new terminal */}
                    <button onClick={() => runNpmScript(key, proj.fullPath)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-[#007acc] rounded text-white bg-[#3c3c3c]"><Play size={12} /></button>
                 </div>
               ))}
            </div>
          )) : (
          <div className="p-4 text-center text-[#858585] text-xs">
             <p className="mb-2">No scripts found.</p>
          </div>
        )}
      </div>
    </div>
  );
}