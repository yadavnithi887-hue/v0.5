// main.cjs

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const pty = require('node-pty');
const chokidar = require('chokidar');
const { exec } = require('child_process');

// ... (बाकी के require स्टेटमेंट्स वैसे ही रहेंगे) ...
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const liveServer = require('live-server');
const prettier = require('prettier');
// Temporarily disabled - needs Electron rebuild for Windows
// const Database = require('better-sqlite3');
// const dbPath = path.join(app.getPath('userData'), 'devstudio.db');
// const db = new Database(dbPath);
// db.exec(`
//   CREATE TABLE IF NOT EXISTS file_history (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     file_path TEXT NOT NULL,
//     content TEXT NOT NULL,
//     timestamp INTEGER NOT NULL,
//     change_type TEXT DEFAULT 'save'
//   );
//   CREATE INDEX IF NOT EXISTS idx_file_path ON file_history(file_path);
// `);

// Mock db for Timeline handlers (temporary)
const db = {
  prepare: () => ({
    all: () => [],
    get: () => null,
    run: () => { }
  })
};

let mainWindow;
let terminals = {};
let fileWatcher = null;
let serverInstance = null;

// --- Helper: Path Normalizer ---
const normalizePath = (p) => p.replace(/\\/g, '/');

// --- 1. Terminal Logic ---
// ... (यह सेक्शन वैसा ही रहेगा) ...
function createTerminal(cwdPath) {
  const targetPath = cwdPath && fs.existsSync(cwdPath) ? cwdPath : os.homedir();
  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
  const id = Date.now().toString();

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: targetPath,
    env: process.env,
    useConpty: false
  });

  terminals[id] = ptyProcess;

  ptyProcess.on('data', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:incomingData', { id, data });
    }
  });

  ptyProcess.on('exit', () => { delete terminals[id]; });

  return id;
}


function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800, backgroundColor: '#1e1e1e', title: 'DevStudio',
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.cjs') },
  });

  // Suppress harmless DevTools console errors
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    // Filter out Autofill-related DevTools errors (they're harmless)
    if (message.includes('Autofill.enable') || message.includes('Autofill.setAddresses')) {
      event.preventDefault();
    }
  });

  // mainWindow.webContents.openDevTools(); // डीबगिंग के लिए इसे अनकम्मेंट करें
  mainWindow.loadURL('http://localhost:5173');
}

// --- IPC HANDLERS ---

// --- ✅ नया: जेनेरिक कमांड एग्जीक्यूशन हैंडलर ---
ipcMain.handle('executeCommand', async (event, { command, cwd }) => {
  // अगर कोई cwd नहीं दिया गया है, तो os के होम डायरेक्टरी का उपयोग करें
  const executionPath = cwd && fs.existsSync(cwd) ? cwd : os.homedir();

  return new Promise((resolve) => {
    exec(command, { cwd: executionPath }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Execution Error: ${stderr}`);
        resolve({ success: false, error: stderr || error.message });
        return;
      }
      resolve({ success: true, output: stdout });
    });
  });
});

// --- Terminal Handlers ---
// ... (यह सेक्शन वैसा ही रहेगा) ...
ipcMain.handle('terminal:create', (event, cwd) => createTerminal(cwd));
ipcMain.handle('terminal:write', (event, { id, data }) => { if (terminals[id]) terminals[id].write(data); });
ipcMain.handle('terminal:resize', (event, { id, cols, rows }) => { if (terminals[id]) try { terminals[id].resize(cols, rows); } catch (e) { } });
ipcMain.handle('terminal:kill', (event, id) => { if (terminals[id]) { terminals[id].kill(); delete terminals[id]; } });

// --- AI Terminal PTY Handlers (Proxy for Backend) ---
ipcMain.handle('terminal:aiExecutePty', (event, { commandId, command, cwd }) => {
  const targetPath = cwd && fs.existsSync(cwd) ? cwd : os.homedir();
  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

  // Create a login shell mimicking standard terminal behavior 
  // and run the user's specific command
  let args = [];
  if (os.platform() === 'win32') {
    args = ['-NoProfile', '-Command', command];
  } else {
    args = ['-c', command];
  }

  const ptyProcess = pty.spawn(shell, args, {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: targetPath,
    env: process.env,
    useConpty: false // Required on some win32 setups for stability with node-pty
  });

  terminals[`ai-${commandId}`] = ptyProcess;

  ptyProcess.on('data', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(`terminal:aiData-${commandId}`, { data });
    }
  });

  ptyProcess.on('exit', (exitCode) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(`terminal:aiExit-${commandId}`, { exitCode });
    }
    delete terminals[`ai-${commandId}`];
  });

  return { success: true };
});

ipcMain.handle('terminal:aiWritePty', (event, { commandId, data }) => {
  const ptyProc = terminals[`ai-${commandId}`];
  if (ptyProc) {
    ptyProc.write(data);
  }
});

ipcMain.handle('terminal:aiKillPty', (event, commandId) => {
  const ptyProc = terminals[`ai-${commandId}`];
  if (ptyProc) {
    ptyProc.kill();
    delete terminals[`ai-${commandId}`];
  }
});


// --- File System Watcher ---
// ... (यह और बाकी की सभी फाइलें वैसी ही रहेंगी, कोई बदलाव नहीं) ...
function startWatching(folderPath) {
  if (fileWatcher) fileWatcher.close();
  fileWatcher = chokidar.watch(folderPath, { ignored: [/node_modules/, /(^|[\/\\])\.git/], persistent: true, ignoreInitial: true });
  fileWatcher.on('all', () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('fs:changed'); });
}

ipcMain.handle('dialog:openFolder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (canceled) return null;
  const rootPath = filePaths[0];
  startWatching(rootPath);
  const data = readDirectoryRecursively(rootPath, rootPath);
  return { ...data, rootPath: normalizePath(rootPath) };
});

ipcMain.handle('fs:openPath', async (e, p) => {
  if (!fs.existsSync(p)) return null;
  startWatching(p);
  const data = readDirectoryRecursively(p, p);
  return { ...data, rootPath: normalizePath(p) };
});

function readDirectoryRecursively(dirPath, rootPath) {
  let fileList = [], folderList = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    entries.forEach(entry => {
      const fullPath = path.join(dirPath, entry.name);
      const normalizedPath = normalizePath(fullPath);
      const relativePath = normalizePath(path.relative(rootPath, fullPath));
      const parentFolder = normalizePath(path.dirname(relativePath));

      if (['node_modules', 'dist', '.git'].includes(entry.name)) return;

      if (entry.isDirectory()) {
        folderList.push({ name: entry.name, path: relativePath, realPath: normalizedPath });
        const sub = readDirectoryRecursively(fullPath, rootPath);
        fileList = [...fileList, ...sub.files];
        folderList = [...folderList, ...sub.folders];
      } else {
        fileList.push({ id: normalizedPath, name: entry.name, path: relativePath, folder: parentFolder === '.' ? '' : parentFolder, realPath: normalizedPath, content: '' });
      }
    });
  } catch (e) { }
  return { files: fileList, folders: folderList };
}

ipcMain.handle('fs:readFile', async (e, p) => { try { return fs.readFileSync(p, 'utf-8'); } catch { return ''; } });
// Modified to save file history
ipcMain.handle('fs:saveFile', async (e, { path, content }) => {
  try {
    fs.writeFileSync(path, content, 'utf-8');

    // Save to history database
    const stmt = db.prepare('INSERT INTO file_history (file_path, content, timestamp, change_type) VALUES (?, ?, ?, ?)');
    stmt.run(path, content, Date.now(), 'save');

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
ipcMain.handle('fs:createFile', async (e, { path, content }) => { try { if (fs.existsSync(path)) return { success: false, error: 'File already exists' }; fs.writeFileSync(path, content || '', 'utf-8'); return { success: true }; } catch (err) { return { success: false, error: err.message }; } });
ipcMain.handle('fs:createFolder', async (e, p) => { try { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); return { success: true }; } catch (err) { return { success: false, error: err.message }; } });
ipcMain.handle('fs:deletePath', async (e, p) => { try { fs.rmSync(p, { recursive: true, force: true }); return { success: true }; } catch (err) { return { success: false, error: err.message }; } });
ipcMain.handle('fs:renamePath', async (e, { oldPath, newPath }) => { try { fs.renameSync(oldPath, newPath); return { success: true }; } catch (err) { return { success: false, error: err.message }; } });

// --- Snapshot Restore (for AI Accept/Reject) ---
ipcMain.handle('fs:restoreSnapshot', async (e, { filePath, content, isNewFile }) => {
  try {
    if (isNewFile) {
      // AI created this file — delete it on reject
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        // Clean up empty parent dirs created by AI
        const parentDir = path.dirname(filePath);
        try {
          const items = fs.readdirSync(parentDir);
          if (items.length === 0) fs.rmdirSync(parentDir);
        } catch { /* ignore */ }
      }
    } else {
      // Restore original content
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- Timeline Handlers ---
ipcMain.handle('timeline:getHistory', async (event, filePath) => {
  try {
    const stmt = db.prepare('SELECT id, timestamp, change_type FROM file_history WHERE file_path = ? ORDER BY timestamp DESC LIMIT 100');
    const history = stmt.all(filePath);
    return { success: true, history };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('timeline:getVersion', async (event, { filePath, id }) => {
  try {
    const stmt = db.prepare('SELECT content, timestamp FROM file_history WHERE file_path = ? AND id = ?');
    const version = stmt.get(filePath, id);
    return { success: true, version };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('window:close', () => mainWindow.close());
ipcMain.handle('os:homedir', () => os.homedir());

// --- Git Handlers (Secure — powered by simple-git) ---
const simpleGit = require('simple-git');

// Helper: get a safe simple-git instance for a given directory
const getGit = (cwd) => simpleGit({ baseDir: cwd, binary: 'git', maxConcurrentProcesses: 4 });

// 1. Get Detailed Status
ipcMain.handle('git:status', async (event, cwd) => {
  try {
    if (!fs.existsSync(path.join(cwd, '.git'))) {
      return { isRepo: false, files: [], branch: '', hasRemote: false, ahead: 0, behind: 0 };
    }
    const git = getGit(cwd);
    const status = await git.status();
    const remotes = await git.getRemotes(true);
    const hasRemote = remotes.length > 0 && remotes.some(r => r.name === 'origin');

    // Build file list from status
    const files = [];
    // Staged files
    status.staged.forEach(f => {
      const entry = status.files.find(fi => fi.path === f);
      let st = 'M';
      if (entry) {
        if (entry.index === 'A' || entry.index === '?') st = 'A';
        else if (entry.index === 'D') st = 'D';
        else if (entry.index === 'R') st = 'R';
        else st = entry.index || 'M';
      }
      files.push({ path: f, status: st, staged: true });
    });
    // Unstaged (modified, deleted, not_added, etc.)
    status.modified.forEach(f => {
      if (!files.some(fi => fi.path === f && !fi.staged)) {
        files.push({ path: f, status: 'M', staged: false });
      }
    });
    status.deleted.forEach(f => {
      if (!files.some(fi => fi.path === f && !fi.staged)) {
        files.push({ path: f, status: 'D', staged: false });
      }
    });
    status.not_added.forEach(f => {
      files.push({ path: f, status: 'U', staged: false });
    });
    status.renamed.forEach(r => {
      files.push({ path: r.to, status: 'R', staged: true, oldPath: r.from });
    });

    return {
      isRepo: true,
      files,
      branch: status.current || 'HEAD',
      hasRemote,
      ahead: status.ahead || 0,
      behind: status.behind || 0,
      tracking: status.tracking || ''
    };
  } catch (e) {
    return { isRepo: false, files: [], branch: '', hasRemote: false, ahead: 0, behind: 0, error: e.message };
  }
});

// 2. Initialize Repo
ipcMain.handle('git:init', async (event, cwd) => {
  try {
    const git = getGit(cwd);
    await git.init();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 3. Stage & Unstage (safe — no shell interpolation)
ipcMain.handle('git:stage', async (event, { cwd, file }) => {
  try {
    const git = getGit(cwd);
    await git.add(file);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('git:unstage', async (event, { cwd, file }) => {
  try {
    const git = getGit(cwd);
    await git.reset(['HEAD', '--', file]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 4. Commit (safe — message passed as argument, never interpolated into shell)
ipcMain.handle('git:commit', async (event, { cwd, message }) => {
  try {
    const git = getGit(cwd);
    const result = await git.commit(message);
    return { success: true, summary: { changes: result.summary.changes, insertions: result.summary.insertions, deletions: result.summary.deletions } };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 5. Branch Management
ipcMain.handle('git:getBranches', async (event, cwd) => {
  try {
    const git = getGit(cwd);
    const branchSummary = await git.branch(['-a']);
    const localBranches = branchSummary.all
      .map(b => b.replace('remotes/origin/', ''))
      .filter(b => b && !b.includes('->'));
    return { success: true, branches: [...new Set(localBranches)], current: branchSummary.current };
  } catch (e) {
    return { success: false, branches: [], error: e.message };
  }
});

ipcMain.handle('git:checkout', async (event, { cwd, branch }) => {
  try {
    const git = getGit(cwd);
    await git.checkout(branch);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('git:createBranch', async (event, { cwd, branch }) => {
  try {
    const git = getGit(cwd);
    await git.checkoutLocalBranch(branch);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('git:deleteBranch', async (event, { cwd, branch, force }) => {
  try {
    const git = getGit(cwd);
    await git.deleteLocalBranch(branch, force || false);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('git:merge', async (event, { cwd, branch }) => {
  try {
    const git = getGit(cwd);
    const result = await git.merge([branch]);
    return { success: true, result: result.result };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 6. Push & Pull (secure — token injected into remote URL safely)
ipcMain.handle('git:push', async (event, { cwd, token }) => {
  try {
    const git = getGit(cwd);
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(r => r.name === 'origin');
    if (!origin) {
      return { success: false, error: 'No remote URL configured for origin.' };
    }

    let pushUrl = origin.refs.push || origin.refs.fetch;
    if (token && pushUrl.startsWith('https://github.com/')) {
      pushUrl = pushUrl.replace('https://', `https://${token}@`);
    }

    await git.push(pushUrl);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('git:pull', async (event, cwd) => {
  try {
    const git = getGit(cwd);
    const result = await git.pull();
    return { success: true, summary: result.summary };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 7. Publish to GitHub
ipcMain.handle('git:publish', async (event, { cwd, token, repoName, description, isPrivate, useExisting, existingRepoUrl, gitignoreTemplate, addReadme }) => {
  try {
    const git = getGit(cwd);
    let remoteUrl = existingRepoUrl;

    if (!useExisting) {
      const payload = {
        name: repoName,
        private: isPrivate
      };

      if (description) payload.description = description;
      if (gitignoreTemplate) payload.gitignore_template = gitignoreTemplate;
      if (addReadme) payload.auto_init = true;

      const createResponse = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await createResponse.json();

      if (!createResponse.ok) {
        if (data.errors && data.errors[0]?.message.includes('name already exists')) {
          const userResp = await fetch('https://api.github.com/user', { headers: { 'Authorization': `Bearer ${token}` } });
          const userData = await userResp.json();
          remoteUrl = `https://github.com/${userData.login}/${repoName}.git`;
        } else {
          throw new Error(data.message || `GitHub API failed with status ${createResponse.status}`);
        }
      } else {
        remoteUrl = data.clone_url;
      }
    }

    if (!remoteUrl) throw new Error('Could not determine remote URL.');

    const authRemoteUrl = remoteUrl.replace('https://', `https://${token}@`);

    // Initialize if not already a repo
    const isRepo = fs.existsSync(path.join(cwd, '.git'));
    if (!isRepo) await git.init();

    await git.add('.');

    try {
      await git.commit('Initial commit');
    } catch (commitErr) {
      // Ignore if nothing to commit
      if (!commitErr.message.includes('nothing to commit')) throw commitErr;
    }

    await git.branch(['-M', 'main']);

    // Set remote
    const remotes = await git.getRemotes();
    if (remotes.some(r => r.name === 'origin')) {
      await git.remote(['set-url', 'origin', authRemoteUrl]);
    } else {
      await git.addRemote('origin', authRemoteUrl);
    }

    try {
      await git.push(['-u', 'origin', 'main']);
      return { success: true };
    } catch (pushError) {
      // Revert remote on push failure
      try { await git.removeRemote('origin'); } catch (_) { }
      throw pushError;
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 8. Get User's Repos from GitHub
ipcMain.handle('git:getGithubRepos', async (event, token) => {
  if (!token) return { success: false, error: 'Token not provided' };
  try {
    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return { success: false, error: 'Failed to fetch repos from GitHub' };
    const repos = await response.json();
    return { success: true, repos: repos.map(repo => ({ name: repo.name, clone_url: repo.clone_url, private: repo.private, description: repo.description })) };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 9. Commit History (Log)
ipcMain.handle('git:log', async (event, { cwd, maxCount }) => {
  try {
    const git = getGit(cwd);
    const log = await git.log({ maxCount: maxCount || 50 });
    return {
      success: true,
      commits: log.all.map(c => ({
        hash: c.hash,
        hashShort: c.hash.substring(0, 7),
        message: c.message,
        author: c.author_name,
        email: c.author_email,
        date: c.date
      }))
    };
  } catch (e) {
    return { success: false, commits: [], error: e.message };
  }
});

// 10. Diff (file-level)
ipcMain.handle('git:diff', async (event, { cwd, file, staged }) => {
  try {
    const git = getGit(cwd);
    const args = staged ? ['--cached'] : [];
    if (file) args.push('--', file);
    const diff = await git.diff(args);
    return { success: true, diff };
  } catch (e) {
    return { success: false, diff: '', error: e.message };
  }
});

// 11. Stash Management
ipcMain.handle('git:stash', async (event, { cwd, message }) => {
  try {
    const git = getGit(cwd);
    if (message) {
      await git.stash(['push', '-m', message]);
    } else {
      await git.stash(['push']);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('git:stashList', async (event, cwd) => {
  try {
    const git = getGit(cwd);
    const result = await git.stashList();
    return {
      success: true,
      stashes: result.all.map((s, i) => ({
        index: i,
        hash: s.hash,
        message: s.message,
        date: s.date
      }))
    };
  } catch (e) {
    return { success: false, stashes: [], error: e.message };
  }
});

ipcMain.handle('git:stashApply', async (event, { cwd, index }) => {
  try {
    const git = getGit(cwd);
    await git.stash(['apply', `stash@{${index || 0}}`]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('git:stashPop', async (event, { cwd, index }) => {
  try {
    const git = getGit(cwd);
    await git.stash(['pop', `stash@{${index || 0}}`]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('git:stashDrop', async (event, { cwd, index }) => {
  try {
    const git = getGit(cwd);
    await git.stash(['drop', `stash@{${index || 0}}`]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 12. Discard File Changes
ipcMain.handle('git:discard', async (event, { cwd, file }) => {
  try {
    const git = getGit(cwd);
    const status = await git.status();
    const isUntracked = status.not_added.includes(file);
    if (isUntracked) {
      // Delete untracked file
      const fullPath = path.join(cwd, file);
      if (fs.existsSync(fullPath)) fs.rmSync(fullPath, { force: true });
    } else {
      // Restore tracked file to last committed state
      await git.checkout(['--', file]);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 13. Clone Repository
ipcMain.handle('git:clone', async (event, { url, targetDir, token }) => {
  try {
    let cloneUrl = url;
    if (token && cloneUrl.startsWith('https://github.com/')) {
      cloneUrl = cloneUrl.replace('https://', `https://${token}@`);
    }
    const git = simpleGit();
    await git.clone(cloneUrl, targetDir);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
// --- 🔥 EXTENSION HANDLERS ---
// 1. Live Server
ipcMain.handle('ext:live-server:start', async (event, rootPath) => {
  if (serverInstance) liveServer.shutdown();
  if (!rootPath) return { success: false, error: 'No root path' };
  serverInstance = liveServer.start({ port: 5500, root: rootPath, open: true });
  return { success: true, url: `http://localhost:5500` };
});
ipcMain.handle('ext:live-server:stop', async () => { if (serverInstance) liveServer.shutdown(); return { success: true }; });

// 2. Prettier
ipcMain.handle('ext:prettier:format', async (event, { code, filePath }) => {
  try {
    const formatted = await prettier.format(code, { filepath: filePath });
    return { success: true, formatted };
  } catch (err) { return { success: false, error: err.message }; }
});

app.on('ready', createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (mainWindow === null) createWindow(); });