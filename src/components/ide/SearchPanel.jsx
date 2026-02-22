import React, { useState } from 'react';
import { Search, FileCode, Loader2 } from 'lucide-react';

export default function SearchPanel({ onFileClick }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    if (e.key === 'Enter' && query.trim()) {
      setLoading(true);
      const rootPath = localStorage.getItem('devstudio-last-project');
      
      if (window.electronAPI && rootPath) {
        const res = await window.electronAPI.searchFiles(rootPath, query);
        setResults(res);
      }
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#252526] text-white">
      <div className="p-3 border-b border-[#3c3c3c]">
        <span className="text-xs font-bold text-[#bbbbbb] uppercase">Search</span>
        <div className="flex items-center bg-[#3c3c3c] border border-[#3c3c3c] focus-within:border-[#007acc] mt-2 rounded px-2">
          <Search size={14} className="text-[#858585]" />
          <input 
            className="bg-transparent border-none outline-none text-sm text-white p-1.5 flex-1"
            placeholder="Search (Enter)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center p-4"><Loader2 className="animate-spin text-[#007acc]" /></div>
        ) : results.length > 0 ? (
          <div className="p-0">
             {results.map((res, i) => (
               <div key={i} className="group cursor-pointer hover:bg-[#37373d] p-2 border-b border-[#3c3c3c]/30" onClick={() => onFileClick({ id: res.path, name: res.file, realPath: res.path })}>
                  <div className="flex items-center gap-2 text-xs text-[#cccccc] font-bold">
                    <FileCode size={12} /> {res.file}
                    <span className="bg-[#094771] px-1 rounded text-[10px]">{res.line}</span>
                  </div>
                  <div className="text-xs text-[#858585] mt-1 pl-4 truncate font-mono">
                    {res.content}
                  </div>
               </div>
             ))}
          </div>
        ) : (
          <div className="p-4 text-xs text-[#858585] text-center">No results found.</div>
        )}
      </div>
    </div>
  );
}