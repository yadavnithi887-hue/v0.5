 import React, { useState } from 'react';
import { Package, Trash2, RefreshCw, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function ExtensionDetailView({ extension, onClose }) {
  const [activeTab, setActiveTab] = useState('details');
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  if (!extension) return null;

  const handleUninstall = async () => {
    if (!confirm(`Are you sure you want to uninstall "${extension.name}"?`)) return;
    
    setIsUninstalling(true);
    try {
      await window.electronAPI.uninstallExtension(extension.id);
      toast.success('Extension uninstalled successfully');
      if (onClose) onClose();
    } catch (e) {
      toast.error('Failed to uninstall extension');
    } finally {
      setIsUninstalling(false);
    }
  };

  const handleReload = async () => {
    setIsReloading(true);
    try {
      const result = await window.electronAPI.reloadExtension(extension.id);
      if (result.success) {
        toast.success('Extension reloaded successfully');
      } else {
        toast.error('Failed to reload extension');
      }
    } catch (e) {
      toast.error('Error reloading extension');
    } finally {
      setIsReloading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-white overflow-hidden">
      {/* Header Area */}
      <div className="p-8 border-b border-[#3c3c3c] flex gap-6">
        {/* Icon */}
        <div className="w-24 h-24 bg-[#252526] border border-[#3c3c3c] flex items-center justify-center rounded-md flex-shrink-0">
          {extension.icon ? (
            <img 
              src={extension.icon} 
              alt={extension.name} 
              className="w-16 h-16 object-contain"
            />
          ) : (
            <Package size={48} className="text-[#007acc]" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold mb-1 truncate">{extension.name}</h1>
          <div className="text-[#cccccc] text-sm mb-4 flex items-center gap-2 flex-wrap">
            <span>v{extension.version}</span>
            <span>•</span>
            <span>{extension.author}</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-[#2da44e]">
              <CheckCircle size={14} /> Installed
            </span>
          </div>
          <p className="text-[#cccccc] mb-4 line-clamp-2">{extension.description}</p>

          <div className="flex gap-3 flex-wrap">
            <Button 
              disabled 
              className="bg-[#2da44e] text-white h-7 text-xs opacity-50 cursor-not-allowed"
            >
              <CheckCircle size={14} className="mr-2" /> Installed
            </Button>
            
            <Button 
              onClick={handleUninstall}
              disabled={isUninstalling}
              className="bg-[#252526] border border-[#3c3c3c] hover:bg-[#be1100] text-white h-7 text-xs transition"
            >
              <Trash2 size={14} className="mr-2" />
              {isUninstalling ? 'Uninstalling...' : 'Uninstall'}
            </Button>
            
            <Button 
              onClick={handleReload}
              disabled={isReloading}
              className="bg-[#252526] border border-[#3c3c3c] hover:bg-[#007acc] text-white h-7 text-xs transition"
            >
              <RefreshCw size={14} className={`mr-2 ${isReloading ? 'animate-spin' : ''}`} />
              {isReloading ? 'Reloading...' : 'Reload'}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 px-8 border-b border-[#3c3c3c] text-xs font-medium">
        <button 
          onClick={() => setActiveTab('details')}
          className={`py-2 border-b-2 transition ${
            activeTab === 'details' 
              ? 'border-[#007acc] text-white' 
              : 'border-transparent text-[#858585] hover:text-[#cccccc]'
          }`}
        >
          Details
        </button>
        <button 
          onClick={() => setActiveTab('changelog')}
          className={`py-2 border-b-2 transition ${
            activeTab === 'changelog' 
              ? 'border-[#007acc] text-white' 
              : 'border-transparent text-[#858585] hover:text-[#cccccc]'
          }`}
        >
          Changelog
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1">
        <div className="h-full overflow-y-auto p-8">
          {activeTab === 'details' ? (
            <div className="prose prose-invert max-w-none">
              {extension.readme ? (
                <ReactMarkdown
                  components={{
                    // Style markdown elements
                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 text-white" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-3 mt-6 text-white" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-lg font-bold mb-2 mt-4 text-white" {...props} />,
                    p: ({node, ...props}) => <p className="text-[#cccccc] mb-3 leading-relaxed" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 text-[#cccccc]" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 text-[#cccccc]" {...props} />,
                    code: ({node, inline, ...props}) => inline
                      ? <code className="bg-[#2d2d2d] px-1.5 py-0.5 rounded text-[#ce9178] text-sm" {...props} />
                      : <code className="block bg-[#1e1e1e] p-4 rounded text-[#ce9178] text-sm overflow-x-auto mb-3" {...props} />,
                    a: ({node, ...props}) => <a className="text-[#3794ff] hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                  }}
                >
                  {extension.readme}
                </ReactMarkdown>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle size={48} className="mx-auto mb-4 text-[#858585] opacity-50" />
                  <h3 className="text-lg text-[#cccccc] mb-2">No Details Available</h3>
                  <p className="text-sm text-[#858585]">
                    This extension hasn't provided any documentation.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle size={48} className="mx-auto mb-4 text-[#858585] opacity-50" />
              <h3 className="text-lg text-[#cccccc] mb-2">No Changelog Available</h3>
              <p className="text-sm text-[#858585]">
                Version history is not available for this extension.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}