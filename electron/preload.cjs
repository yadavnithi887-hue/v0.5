// preload.cjs

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ✅ नया फंक्शन यहाँ जोड़ें
  executeCommand: (command, cwd) => ipcRenderer.invoke('executeCommand', { command, cwd }),

  // --- File System API ---
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  openPath: (path) => ipcRenderer.invoke('fs:openPath', path),
  saveFile: (path, content) => ipcRenderer.invoke('fs:saveFile', { path, content }),
  readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
  deletePath: (path) => ipcRenderer.invoke('fs:deletePath', path),
  renamePath: (oldPath, newPath) => ipcRenderer.invoke('fs:renamePath', { oldPath, newPath }),
  createFile: (path, content) => ipcRenderer.invoke('fs:createFile', { path, content }),
  createFolder: (path) => ipcRenderer.invoke('fs:createFolder', path),
  restoreSnapshot: (filePath, content, isNewFile) => ipcRenderer.invoke('fs:restoreSnapshot', { filePath, content, isNewFile }),
  onFileChanged: (callback) => {
    ipcRenderer.on('fs:changed', callback);
    return () => ipcRenderer.removeListener('fs:changed', callback);
  },

  // ✅ getHomePath के लिए नया हैंडलर जोड़ें
  getHomePath: () => ipcRenderer.invoke('os:homedir'),

  // --- Window API ---
  closeWindow: () => ipcRenderer.invoke('window:close'),

  // --- Terminal API ---
  createTerminal: (cwd) => ipcRenderer.invoke('terminal:create', cwd),
  writeTerminal: (id, data) => ipcRenderer.invoke('terminal:write', { id, data }),
  resizeTerminal: (id, dims) => ipcRenderer.invoke('terminal:resize', { id, ...dims }),
  killTerminal: (id) => ipcRenderer.invoke('terminal:kill', id),
  onTerminalData: (callback) => {
    const sub = (event, { id, data }) => callback(id, data);
    ipcRenderer.on('terminal:incomingData', sub);
    return () => ipcRenderer.removeListener('terminal:incomingData', sub);
  },

  // --- AI Terminal PTY API (Proxy for Backend) ---
  executeAIPtyTerminal: (opts) => ipcRenderer.invoke('terminal:aiExecutePty', opts),
  writeAIPtyTerminal: (commandId, data) => ipcRenderer.invoke('terminal:aiWritePty', { commandId, data }),
  killAIPtyTerminal: (commandId) => ipcRenderer.invoke('terminal:aiKillPty', commandId),
  onAIPtyTerminalData: (commandId, callback) => {
    const channel = `terminal:aiData-${commandId}`;
    const sub = (event, data) => callback(data);
    ipcRenderer.on(channel, sub);
    return () => ipcRenderer.removeListener(channel, sub);
  },
  onAIPtyTerminalExit: (commandId, callback) => {
    const channel = `terminal:aiExit-${commandId}`;
    const sub = (event, data) => callback(data);
    ipcRenderer.on(channel, sub);
    return () => ipcRenderer.removeListener(channel, sub);
  },

  // --- Git API (Secure) ---
  getGitStatus: (cwd) => ipcRenderer.invoke('git:status', cwd),
  gitInit: (cwd) => ipcRenderer.invoke('git:init', cwd),
  gitStage: (cwd, file) => ipcRenderer.invoke('git:stage', { cwd, file }),
  gitUnstage: (cwd, file) => ipcRenderer.invoke('git:unstage', { cwd, file }),
  gitCommit: (cwd, message) => ipcRenderer.invoke('git:commit', { cwd, message }),
  gitPush: (data) => ipcRenderer.invoke('git:push', data),
  gitPull: (cwd) => ipcRenderer.invoke('git:pull', cwd),
  getGithubRepos: (token) => ipcRenderer.invoke('git:getGithubRepos', token),
  gitPublish: (data) => ipcRenderer.invoke('git:publish', data),
  getGitBranches: (cwd) => ipcRenderer.invoke('git:getBranches', cwd),
  gitCheckout: (cwd, branch) => ipcRenderer.invoke('git:checkout', { cwd, branch }),
  gitCreateBranch: (cwd, branch) => ipcRenderer.invoke('git:createBranch', { cwd, branch }),
  gitDeleteBranch: (cwd, branch, force) => ipcRenderer.invoke('git:deleteBranch', { cwd, branch, force }),
  gitMerge: (cwd, branch) => ipcRenderer.invoke('git:merge', { cwd, branch }),
  gitLog: (cwd, maxCount) => ipcRenderer.invoke('git:log', { cwd, maxCount }),
  gitDiff: (cwd, file, staged) => ipcRenderer.invoke('git:diff', { cwd, file, staged }),
  gitStash: (cwd, message) => ipcRenderer.invoke('git:stash', { cwd, message }),
  gitStashList: (cwd) => ipcRenderer.invoke('git:stashList', cwd),
  gitStashApply: (cwd, index) => ipcRenderer.invoke('git:stashApply', { cwd, index }),
  gitStashPop: (cwd, index) => ipcRenderer.invoke('git:stashPop', { cwd, index }),
  gitStashDrop: (cwd, index) => ipcRenderer.invoke('git:stashDrop', { cwd, index }),
  gitDiscard: (cwd, file) => ipcRenderer.invoke('git:discard', { cwd, file }),
  gitClone: (url, targetDir, token) => ipcRenderer.invoke('git:clone', { url, targetDir, token }),


  // --- Extension APIs ---
  startLiveServer: (root) => ipcRenderer.invoke('ext:live-server:start', root),
  stopLiveServer: () => ipcRenderer.invoke('ext:live-server:stop'),
  formatWithPrettier: (data) => ipcRenderer.invoke('ext:prettier:format', data),

  // --- Timeline API ---
  getFileHistory: (filePath) => ipcRenderer.invoke('timeline:getHistory', filePath),
  getFileVersion: (filePath, id) => ipcRenderer.invoke('timeline:getVersion', { filePath, id }),

  // --- Settings Panel API ---
  getExtensionUIRegistry: () => ipcRenderer.invoke('extensions:getUIRegistry'),
  onExtensionUIRegistryUpdate: (callback) => {
    const channel = 'extensions:uiRegistryUpdate';
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
    return () => {
      ipcRenderer.removeAllListeners(channel);
    };
  }
});