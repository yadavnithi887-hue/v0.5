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

      if (['node_modules', 'dist'].includes(entry.name)) return;

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

// ... (सभी Git और Extension हैंडलर्स वैसे ही रहेंगे) ...
// --- Git Handlers ---
// 1. Get Detailed Status (Staged, Unstaged, Branch, Remote)
ipcMain.handle('git:status', async (event, cwd) => {
  return new Promise((resolve) => {
    if (!fs.existsSync(path.join(cwd, '.git'))) {
      resolve({ isRepo: false, files: [], branch: '', hasRemote: false });
      return;
    }

    // Command to get branch and remote in one go
    const command = 'git branch --show-current && git remote -v';

    exec(command, { cwd }, (err, stdout) => {
      const output = stdout.split('\n');
      const currentBranch = output[0] ? output[0].trim() : 'HEAD';
      const hasRemote = output.length > 1 && output[1].trim() !== '';

      // Get File Status
      exec('git status --porcelain', { cwd }, (error, stdoutStatus) => {
        if (error) { resolve({ isRepo: true, files: [], branch: currentBranch, hasRemote }); return; }

        const files = stdoutStatus.split('\n').filter(line => line.trim() !== '').map(line => {
          let fileName = line.substring(3).trim();
          if (fileName.startsWith('"') && fileName.endsWith('"')) fileName = fileName.slice(1, -1);

          const statusCode = line.substring(0, 2);
          const isStaged = statusCode[0] !== ' ' && statusCode[0] !== '?';
          let status = 'M';
          if (statusCode.includes('??')) status = 'U';
          else if (statusCode.includes('D')) status = 'D';
          else if (statusCode.includes('A')) status = 'A';
          return { path: fileName, status, staged: isStaged };
        });

        resolve({ isRepo: true, files, branch: currentBranch, hasRemote });
      });
    });
  });
});

// 2. Initialize Repo
ipcMain.handle('git:init', async (event, cwd) => {
  return new Promise(r => exec('git init', { cwd }, (e) => r({ success: !e })));
});

// 3. Stage & Unstage
ipcMain.handle('git:stage', async (event, { cwd, file }) => {
  return new Promise(r => exec(`git add "${file}"`, { cwd }, (e) => r(!e)));
});
ipcMain.handle('git:unstage', async (event, { cwd, file }) => {
  const cmd = file === '.' ? 'git restore --staged .' : `git restore --staged "${file}"`;
  return new Promise(r => exec(cmd, { cwd }, (e) => r(!e)));
});

// 4. Commit
ipcMain.handle('git:commit', async (event, { cwd, message }) => {
  return new Promise(r => exec(`git commit -m "${message}"`, { cwd }, (e) => r({ success: !e, error: e?.message })));
});

// 5. Branch Management
ipcMain.handle('git:getBranches', async (event, cwd) => {
  return new Promise(r => exec('git branch -a', { cwd }, (e, out) => r(e ? [] : [...new Set(out.split('\n').map(b => b.trim().replace('* ', '')).filter(b => b && !b.includes('->')).map(b => b.replace('remotes/origin/', '')))])));
});
ipcMain.handle('git:checkout', async (event, { cwd, branch }) => {
  return new Promise(r => exec(`git checkout "${branch}"`, { cwd }, (e) => r({ success: !e })));
});
ipcMain.handle('git:createBranch', async (event, { cwd, branch }) => {
  return new Promise(r => exec(`git checkout -b "${branch}"`, { cwd }, (e) => r({ success: !e })));
});

// 6. Push & Pull
// main.js
ipcMain.handle('git:push', async (event, { cwd, token }) => { // <--- यहाँ बदलें
  console.log(`Pushing to repo in: ${cwd}`); // <-- डीबगिंग के लिए लॉग जोड़ें
  return new Promise((resolve) => {
    exec('git remote get-url origin', { cwd }, (err, url) => {
      if (err || !url) {
        console.error("Git Push Error: No remote found.");
        resolve({ success: false, error: 'No remote URL configured for origin' });
        return;
      }
      let repoUrl = url.trim();
      if (token && repoUrl.startsWith('https://github.com/')) {
        repoUrl = repoUrl.replace('https://', `https://${token}@`);
      }

      // डीबगिंग के लिए कमांड को लॉग करें (टोकन को छोड़कर)
      console.log(`Executing push command for URL: ${repoUrl.replace(token, '****')}`);

      exec(`git push "${repoUrl}"`, { cwd }, (error, stdout, stderr) => {
        if (error) {
          console.error('Git Push Stderr:', stderr); // <-- वास्तविक त्रुटि को लॉग करें!
          resolve({ success: false, error: stderr || error.message });
          return;
        }
        resolve({ success: true });
      });
    });
  });
});
ipcMain.handle('git:pull', async (event, cwd) => {
  return new Promise(r => exec('git pull', { cwd }, (e) => r({ success: !e, error: e?.message })));
});

// main.js - इस पूरे फंक्शन को बदलें

// 7. Publish to GitHub (New & Improved)
// main.js - ipcMain.handle('git:publish', ...) को इससे बदलें

ipcMain.handle('git:publish', async (event, { cwd, token, repoName, isPrivate, useExisting, existingRepoUrl }) => {
  console.log('--- Starting Publish Process ---');
  console.log('Received data:', { repoName, isPrivate, useExisting });

  try {
    let remoteUrl = existingRepoUrl;

    // 1. अगर नया बना रहे हैं तो रिमोट यूआरएल बनाएं या प्राप्त करें
    if (!useExisting) {
      console.log(`Attempting to create NEW repository named: ${repoName}`);
      const createResponse = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: repoName, private: isPrivate })
      });
      const data = await createResponse.json();
      console.log('GitHub API Response:', data);

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

    if (!remoteUrl) {
      throw new Error('Could not determine remote URL.');
    }

    const authRemoteUrl = remoteUrl.replace('https://', `https://${token}@`);

    // 2. Git कमांड को एक-एक करके चलाएं
    const run = (cmd) => new Promise((resolve, reject) => {
      console.log(`Executing: ${cmd.replace(token, '****')}`);
      exec(cmd, { cwd }, (err, stdout, stderr) => {
        // कुछ सामान्य, गैर-घातक चेतावनियों को अनदेखा करें
        if (err && !stderr.includes('already exists') && !stderr.includes('up-to-date')) {
          console.error(`Command failed: ${cmd}\nStderr: ${stderr}`);
          return reject(new Error(stderr));
        }
        resolve(stdout);
      });
    });

    await run('git init');
    await run('git add .');
    await run('git commit -m "Initial commit" || echo "No changes to commit"'); // अगर कोई बदलाव न हो तो विफल न हों
    await run('git branch -M main');
    await run(`git remote add origin "${authRemoteUrl}" || git remote set-url origin "${authRemoteUrl}"`);

    // 🔥 मुख्य बदलाव: अंतिम पुश को try/catch में रखें
    try {
      await run('git push -u origin main');
      console.log('--- Publish Process Successful ---');
      return { success: true };
    } catch (pushError) {
      // 🔥 अगर पुश विफल होता है, तो रिमोट को हटा दें!
      console.error('Push failed. Reverting by removing remote.');
      await run('git remote remove origin');
      throw pushError; // मूल त्रुटि को आगे फेंकें
    }

  } catch (e) {
    console.error('--- Publish Process FAILED ---');
    console.error('Error:', e.message);
    return { success: false, error: e.message };
  }
});
// 8. Get User's Repos from GitHub
ipcMain.handle('git:getGithubRepos', async (event, token) => {
  if (!token) {
    return { success: false, error: 'Token not provided' };
  }
  try {
    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      return { success: false, error: 'Failed to fetch repos from GitHub' };
    }
    const repos = await response.json();
    // हम केवल नाम और क्लोन यूआरएल भेजेंगे जो हमें चाहिए
    const repoData = repos.map(repo => ({
      name: repo.name,
      clone_url: repo.clone_url
    }));
    return { success: true, repos: repoData };
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