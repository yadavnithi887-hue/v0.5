// File: src/modules/extensions/live-server/index.jsx

import { Server, ServerOff, Globe } from 'lucide-react';

export const metadata = {
  id: 'devstudio.live-server',
  name: 'Live Server',
  version: '1.1.0',
  description: 'Launch a local development server with live reload for static pages.',
  author: 'DevStudio Team',
  icon: 'Globe',
  readme: `
# Live Server Extension

## Features
- 🌐 Local development server
- 🔄 Live reload on file changes
- ⚡ Fast and lightweight
- 🎯 Easy start/stop controls

## Usage
1. Open a folder with HTML/CSS/JS files
2. Click "Go Live" in the status bar
3. Your default browser will open with the live server
4. Click again to stop the server

## Status Bar
The extension adds a "Go Live" button to the status bar that shows:
- Server status (running/stopped)
- Port number when active
- Click to start/stop
  `
};

export const settings = [
  {
    id: 'liveServer.port',
    label: 'Port',
    type: 'number',
    default: 5500,
    description: 'Port number for the live server',
    section: 'extensions',
    extensionId: metadata.id
  },
  {
    id: 'liveServer.autoOpen',
    label: 'Auto Open Browser',
    type: 'toggle',
    default: true,
    description: 'Automatically open browser when server starts',
    section: 'extensions',
    extensionId: metadata.id
  }
];

let serverRunning = false;

export const activate = (context) => {
  const { toast, electronAPI, getWorkspaceRoot } = context;

  const updateStatusBar = (isRunning, port = null) => {
    context.window.createStatusBarItem({
      id: 'live-server-btn',
      text: isRunning ? `🌐 Port: ${port}` : 'Go Live',
      command: isRunning ? 'liveServer.stop' : 'liveServer.start',
      tooltip: isRunning ? 'Click to stop live server' : 'Click to start live server',
      color: isRunning ? '#34d399' : '#cccccc'
    });
  };

  context.registerCommand('liveServer.start', async () => {
    if (serverRunning) return toast.warning("Server is already running!");
    
    const root = getWorkspaceRoot();
    if (!root) return toast.error("Please open a folder first!");

    toast.info("Starting live server...");
    
    const res = await electronAPI.startLiveServer(root);
    
    if (res.success) {
      serverRunning = true;
      updateStatusBar(true, res.port);
      toast.success(`Server is live at http://localhost:${res.port}`);
    } else {
      toast.error(`Failed to start server: ${res.error}`);
    }
  });

  context.registerCommand('liveServer.stop', async () => {
    if (!serverRunning) return toast.warning("Server is not running.");
    
    await electronAPI.stopLiveServer();
    serverRunning = false;
    updateStatusBar(false);
    toast.info("Live server stopped.");
  });

  updateStatusBar(false);

  console.log("🌐 Live Server Extension Activated!");
};

export const deactivate = () => {
  console.log("🌐 Live Server Extension Deactivated");
};