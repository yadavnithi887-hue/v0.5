import React, { useState } from 'react';
import { X, File, FileCode, FileJson, FileText, Pin, PinOff, Command } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";

// Icon Helper
const getFileIcon = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const icons = {
    js: { icon: FileCode, color: 'text-yellow-400' },
    jsx: { icon: FileCode, color: 'text-blue-400' },
    ts: { icon: FileCode, color: 'text-blue-500' },
    tsx: { icon: FileCode, color: 'text-blue-500' },
    css: { icon: FileCode, color: 'text-blue-300' },
    html: { icon: FileCode, color: 'text-orange-500' },
    json: { icon: FileJson, color: 'text-yellow-500' },
    md: { icon: FileText, color: 'text-white' },
    py: { icon: FileCode, color: 'text-blue-400' },
    java: { icon: FileCode, color: 'text-red-400' },
  };
  return icons[ext] || { icon: File, color: 'text-icon-file' };
};

export default function EditorTabs({ openFiles, activeFile, onTabClick, onTabClose, unsavedFiles }) {

  if (openFiles.length === 0) return null;

  return (
    // 🔥 Overflow-X Auto added to fix hiding issue
    <div className="h-9 bg-[#252526] flex items-end overflow-x-auto custom-scrollbar border-b border-[#252526] flex-shrink-0">
      {openFiles.map((file) => {
        const { icon: Icon, color } = file.type === 'welcome'
          ? { icon: Command, color: 'text-purple-400' }
          : getFileIcon(file.name);
        // 🔥 Check agar file unsaved list me hai
        const isDirty = unsavedFiles && unsavedFiles.has(file.id);

        return (
          <ContextMenu key={file.id}>
            <ContextMenuTrigger>
              <div
                className={cn(
                  "h-8 flex items-center gap-2 px-3 cursor-pointer min-w-fit border border-transparent mr-1 rounded-t-md transition-all select-none",
                  activeFile?.id === file.id
                    ? "glass-button !bg-white/10 !border-white/10 text-white rounded-b-none"
                    : "text-[#969696] hover:bg-white/5 hover:text-white rounded-md"
                )}
                onClick={() => onTabClick(file)}
              >
                <Icon size={14} className={color} />
                <span className={cn("text-xs truncate max-w-[150px]", isDirty && "text-yellow-100")}>
                  {file.name}
                </span>

                {/* 🔥 Logic: Agar Dirty hai to Dot, nahi to Close button */}
                <div className="w-5 h-5 flex items-center justify-center ml-1 rounded hover:bg-white/10"
                  onClick={(e) => { e.stopPropagation(); onTabClose(file); }}>

                  {isDirty ? (
                    // White Dot (Dirty State)
                    <div className="w-2 h-2 bg-white rounded-full group-hover:hidden" />
                  ) : null}

                  {/* Close Icon (Hover karne par ya agar dirty nahi hai tab dikhega) */}
                  <X size={14} className={cn(isDirty ? "hidden group-hover:block" : "block")} />

                </div>
              </div>
            </ContextMenuTrigger>

            <ContextMenuContent className="bg-[#252526] border-[#454545] text-white">
              <ContextMenuItem onClick={() => onTabClose(file)}>Close</ContextMenuItem>
              <ContextMenuItem onClick={() => { }}>Close Others</ContextMenuItem>
              <ContextMenuItem onClick={() => { }}>Close All</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
}