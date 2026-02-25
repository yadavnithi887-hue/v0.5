import fs from 'fs';
import path from 'path';
import os from 'os';

class ArtifactTools {
    constructor(io) {
        this.io = io;
        this.sessionId = null;
        this.baseDir = path.join(os.homedir(), '.vsdev', 'brain');
        this.allowedNames = [
            'task.md',
            'implementation_plan.md',
            'walkthrough.md',
        ];
        this._ensureDir(this.baseDir);
    }

    setSessionId(sessionId) {
        this.sessionId = this._sanitizeSessionId(sessionId);
    }

    _sanitizeSessionId(sessionId) {
        const raw = String(sessionId || '').trim();
        if (!raw) return null;
        // Keep folder names stable and safe on all platforms.
        return raw.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || null;
    }

    _ensureDir(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    _getSessionDir() {
        const sid = this.sessionId || 'ide-local-session';
        const dir = path.join(this.baseDir, sid);
        this._ensureDir(dir);
        return dir;
    }

    _isAllowedArtifactName(name) {
        if (this.allowedNames.includes(name)) return true;
        return /^task\.md\.resolved\.\d+$/i.test(name);
    }

    _resolveArtifactPath(artifactName) {
        const name = String(artifactName || '').trim();
        if (!this._isAllowedArtifactName(name)) {
            throw new Error(`Artifact not allowed: ${name}`);
        }
        return path.join(this._getSessionDir(), name);
    }

    _emitRefresh(targetPath) {
        if (!this.io) return;
        try {
            this.io.emit('fs:refresh', { path: path.dirname(targetPath) });
        } catch {
            // ignore socket refresh issues
        }
    }

    async listArtifacts() {
        const dir = this._getSessionDir();
        console.log(`[ARTIFACT] list for session "${this.sessionId || 'ide-local-session'}": ${dir}`);
        const items = fs.readdirSync(dir, { withFileTypes: true })
            .filter((d) => d.isFile() && this._isAllowedArtifactName(d.name))
            .map((d) => {
                const abs = path.join(dir, d.name);
                const s = fs.statSync(abs);
                return {
                    name: d.name,
                    absolutePath: abs,
                    sizeBytes: s.size,
                    updatedAt: s.mtimeMs,
                };
            })
            .sort((a, b) => b.updatedAt - a.updatedAt);
        return items;
    }

    async readArtifact({ ArtifactName }) {
        const filePath = this._resolveArtifactPath(ArtifactName);
        console.log(`[ARTIFACT] read: ${filePath}`);
        if (!fs.existsSync(filePath)) {
            return '';
        }
        return fs.readFileSync(filePath, 'utf-8');
    }

    async writeArtifact({ ArtifactName, Content, Append }) {
        const filePath = this._resolveArtifactPath(ArtifactName);
        const text = String(Content || '');
        console.log(`[ARTIFACT] write: ${filePath} (append=${!!Append})`);
        if (Append) {
            fs.appendFileSync(filePath, text, 'utf-8');
        } else {
            fs.writeFileSync(filePath, text, 'utf-8');
        }
        this._emitRefresh(filePath);
        return {
            success: true,
            artifact: ArtifactName,
            absolutePath: filePath,
            bytesWritten: Buffer.byteLength(text, 'utf-8'),
            append: !!Append,
        };
    }
}

export default ArtifactTools;
