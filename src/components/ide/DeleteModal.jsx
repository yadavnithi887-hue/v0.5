import React from 'react';
import { Button } from '@/components/ui/button';

export default function DeleteModal({ isOpen, onClose, onConfirm, itemName, type }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-[#252526] rounded-lg shadow-2xl border border-[#454545] w-[400px] overflow-hidden">
        <div className="p-4">
          <h3 className="text-white font-medium mb-2">Delete {type}?</h3>
          <p className="text-[#cccccc] text-sm">
            Are you sure you want to delete <strong>{itemName}</strong>?
            {type === 'folder' && " This will delete all files inside it."}
            <br />
            This action cannot be undone.
          </p>
        </div>
        
        <div className="flex justify-end gap-2 p-3 bg-[#1e1e1e] border-t border-[#3c3c3c]">
          <Button 
            onClick={onClose} 
            className="bg-[#3c3c3c] hover:bg-[#4c4c4c] text-white text-xs h-8"
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            className="bg-[#be1100] hover:bg-[#e81123] text-white text-xs h-8"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}