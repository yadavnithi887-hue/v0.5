import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RefreshCw, ExternalLink, Smartphone, Monitor, Tablet, X, Maximize2, Minimize2, Terminal, Eye, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

const deviceSizes = {
  mobile: { width: 375, height: 667, label: 'Mobile' },
  tablet: { width: 768, height: 1024, label: 'Tablet' },
  desktop: { width: '100%', height: '100%', label: 'Desktop' },
};

export default function WebPreview({ files, isOpen, onClose, onMaximize, isMaximized }) {
  const [device, setDevice] = useState('desktop');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showConsole, setShowConsole] = useState(true);
  const [consoleOutput, setConsoleOutput] = useState([]);
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef(null);
  
  // Find HTML, CSS, JS files
  const htmlFile = files.find(f => f.name === 'index.html') || files.find(f => f.name.endsWith('.html'));
  const cssFiles = files.filter(f => f.name.endsWith('.css'));
  const jsFiles = files.filter(f => f.name.endsWith('.js') && !f.name.endsWith('.json'));
  
  // Generate preview HTML
  const previewHTML = useMemo(() => {
    let html = htmlFile?.content || `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
</head>
<body>
  <div id="root">
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#666;">
      <p>Create an HTML file to see preview</p>
    </div>
  </div>
</body>
</html>`;
    
    // Inject CSS before </head>
    const cssContent = cssFiles.map(f => f.content).join('\n');
    if (cssContent) {
      const styleTag = `<style>\n${cssContent}\n</style>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${styleTag}\n</head>`);
      } else {
        html = `<style>${cssContent}</style>` + html;
      }
    }
    
    // Console capture script
    const consoleScript = `
<script>
(function() {
  const methods = ['log', 'error', 'warn', 'info'];
  const original = {};
  
  methods.forEach(method => {
    original[method] = console[method];
    console[method] = function(...args) {
      original[method].apply(console, args);
      try {
        window.parent.postMessage({
          type: 'devstudio-console',
          method: method,
          args: args.map(arg => {
            if (arg === null) return 'null';
            if (arg === undefined) return 'undefined';
            if (typeof arg === 'object') {
              try { return JSON.stringify(arg, null, 2); }
              catch(e) { return String(arg); }
            }
            return String(arg);
          }),
          timestamp: new Date().toLocaleTimeString()
        }, '*');
      } catch(e) {}
    };
  });
  
  window.onerror = function(msg, url, line) {
    console.error(msg + ' (Line: ' + line + ')');
    return false;
  };
  
  window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise Rejection: ' + e.reason);
  });
})();
</script>`;
    
    // Inject JS before </body>
    const jsContent = jsFiles.map(f => f.content).join('\n\n');
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${consoleScript}\n<script>\n${jsContent}\n</script>\n</body>`);
    } else {
      html = html + `${consoleScript}<script>${jsContent}</script>`;
    }
    
    return html;
  }, [htmlFile?.content, cssFiles.map(f => f.content).join(), jsFiles.map(f => f.content).join()]);
  
  // Listen for console messages
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'devstudio-console') {
        setConsoleOutput(prev => {
          const newLog = {
            method: event.data.method,
            content: event.data.args.join(' '),
            timestamp: event.data.timestamp
          };
          return [...prev.slice(-100), newLog];
        });
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  // Auto-refresh on file changes
  useEffect(() => {
    if (isOpen) {
      setPreviewKey(prev => prev + 1);
    }
  }, [previewHTML, isOpen]);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    setConsoleOutput([]);
    setPreviewKey(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 300);
  };
  
  const clearConsole = () => {
    setConsoleOutput([]);
  };
  
  if (!isOpen) return null;
  
  const currentDevice = deviceSizes[device];
  const hasContent = htmlFile || cssFiles.length > 0 || jsFiles.length > 0;
  
  return (
    <div className={cn(
      "bg-[#1e1e1e] border-l border-[#3c3c3c] flex flex-col",
      isMaximized ? "fixed inset-0 z-50" : "w-[450px] flex-shrink-0"
    )}>
      {/* Header */}
      <div className="h-10 bg-[#252526] flex items-center justify-between px-3 border-b border-[#3c3c3c] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-[#007acc]" />
          <span className="text-sm text-white font-medium">Preview</span>
          {hasContent && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              Live
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Device Selector */}
          <div className="flex items-center gap-0.5 mr-2 bg-[#3c3c3c] rounded p-0.5">
            <button
              onClick={() => setDevice('mobile')}
              className={cn(
                "p-1.5 rounded transition-colors",
                device === 'mobile' ? "bg-[#007acc] text-white" : "text-[#858585] hover:text-white"
              )}
              title="Mobile (375px)"
            >
              <Smartphone size={14} />
            </button>
            <button
              onClick={() => setDevice('tablet')}
              className={cn(
                "p-1.5 rounded transition-colors",
                device === 'tablet' ? "bg-[#007acc] text-white" : "text-[#858585] hover:text-white"
              )}
              title="Tablet (768px)"
            >
              <Tablet size={14} />
            </button>
            <button
              onClick={() => setDevice('desktop')}
              className={cn(
                "p-1.5 rounded transition-colors",
                device === 'desktop' ? "bg-[#007acc] text-white" : "text-[#858585] hover:text-white"
              )}
              title="Desktop (100%)"
            >
              <Monitor size={14} />
            </button>
          </div>
          
          <button
            onClick={handleRefresh}
            className={cn(
              "p-1.5 hover:bg-[#3c3c3c] rounded text-[#858585] hover:text-white transition-transform",
              isRefreshing && "animate-spin"
            )}
            title="Refresh (Ctrl+R)"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setShowConsole(!showConsole)}
            className={cn(
              "p-1.5 hover:bg-[#3c3c3c] rounded transition-colors",
              showConsole ? "text-[#007acc]" : "text-[#858585] hover:text-white"
            )}
            title="Toggle Console"
          >
            <Terminal size={14} />
          </button>
          <button
            onClick={onMaximize}
            className="p-1.5 hover:bg-[#3c3c3c] rounded text-[#858585] hover:text-white"
            title={isMaximized ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#3c3c3c] rounded text-[#858585] hover:text-white"
            title="Close Preview"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      {/* Preview Area */}
      <div className="flex-1 bg-[#0d0d0d] flex items-center justify-center overflow-hidden p-2 min-h-0">
        <div 
          className={cn(
            "bg-white overflow-hidden transition-all duration-200 h-full",
            device !== 'desktop' ? "rounded-lg border-4 border-[#333] shadow-2xl" : "w-full"
          )}
          style={{
            width: device === 'desktop' ? '100%' : currentDevice.width,
            maxWidth: '100%',
            maxHeight: '100%'
          }}
        >
          <iframe
            key={previewKey}
            ref={iframeRef}
            srcDoc={previewHTML}
            className="w-full h-full border-0"
            title="Preview"
            sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
          />
        </div>
      </div>
      
      {/* Console */}
      {showConsole && (
        <div className="h-36 bg-[#1e1e1e] border-t border-[#3c3c3c] flex flex-col flex-shrink-0">
          <div className="h-7 bg-[#252526] flex items-center justify-between px-3 border-b border-[#3c3c3c]">
            <div className="flex items-center gap-2">
              <Terminal size={12} className="text-[#858585]" />
              <span className="text-xs text-[#cccccc]">Console</span>
              {consoleOutput.length > 0 && (
                <span className="text-xs bg-[#3c3c3c] px-1.5 rounded text-[#858585]">
                  {consoleOutput.length}
                </span>
              )}
            </div>
            <button 
              onClick={clearConsole}
              className="text-xs text-[#858585] hover:text-white px-2 py-0.5 hover:bg-[#3c3c3c] rounded"
            >
              Clear
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
            {consoleOutput.length === 0 ? (
              <div className="text-[#6e6e6e] p-2 text-center">
                Console output will appear here...
              </div>
            ) : (
              consoleOutput.map((log, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "py-1 px-2 border-b border-[#2a2a2a] flex items-start gap-2",
                    log.method === 'error' && "text-red-400 bg-red-500/5",
                    log.method === 'warn' && "text-yellow-400 bg-yellow-500/5",
                    log.method === 'info' && "text-blue-400",
                    log.method === 'log' && "text-[#cccccc]"
                  )}
                >
                  <span className="text-[#6e6e6e] flex-shrink-0 w-16">{log.timestamp}</span>
                  <span className="flex-1 whitespace-pre-wrap break-all">{log.content}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}