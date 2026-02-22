import React from 'react';
import { ChevronRight, File, Folder, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Breadcrumbs({ file, onNavigate }) {
  if (!file) return null;
  
  // Parse path into segments
  const pathParts = file.path?.split('/').filter(Boolean) || [file.name];
  
  return (
    <div className="h-6 bg-[#1e1e1e] border-b border-[#3c3c3c] flex items-center px-3 text-xs text-[#cccccc] overflow-x-auto">
      <button 
        onClick={() => onNavigate?.('root')}
        className="flex items-center gap-1 hover:text-white hover:bg-[#3c3c3c] px-1 py-0.5 rounded"
      >
        <Home size={12} />
      </button>
      
      {pathParts.map((part, idx) => {
        const isLast = idx === pathParts.length - 1;
        return (
          <React.Fragment key={idx}>
            <ChevronRight size={12} className="text-[#6e6e6e] mx-0.5 flex-shrink-0" />
            <button
              onClick={() => !isLast && onNavigate?.(pathParts.slice(0, idx + 1).join('/'))}
              className={cn(
                "flex items-center gap-1 px-1 py-0.5 rounded whitespace-nowrap",
                isLast 
                  ? "text-white" 
                  : "hover:text-white hover:bg-[#3c3c3c]"
              )}
            >
              {isLast ? <File size={12} /> : <Folder size={12} />}
              <span>{part}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}