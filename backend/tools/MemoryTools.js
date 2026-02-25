// backend/tools/MemoryTools.js
import fs from 'fs';
import path from 'path';
import os from 'os';

class MemoryTools {
    constructor(io) {
        this.io = io;
        this.workspaceDir = path.join(os.homedir(), '.vsdev', 'workspace');

        // Ensure the directory exists
        if (!fs.existsSync(this.workspaceDir)) {
            fs.mkdirSync(this.workspaceDir, { recursive: true });
        }

        this.userProfilePath = path.join(this.workspaceDir, 'USER.md');
        this.agentMemoryPath = path.join(this.workspaceDir, 'MEMORY.md');

        // Ensure default files exist
        this._ensureDefaults();
    }

    _ensureDefaults() {
        if (!fs.existsSync(this.userProfilePath)) {
            fs.writeFileSync(this.userProfilePath, `# User Profile\n\n## Preferences\n- Language: Hindi/English\n- Experience: Developer\n\n## Notes\nAdd any personal notes here...\n`, 'utf-8');
        }

        if (!fs.existsSync(this.agentMemoryPath)) {
            fs.writeFileSync(this.agentMemoryPath, `# Long-term Memory\n\n## Important Notes\n- \n\n## Project Context\n- \n\n## User Preferences\n- \n`, 'utf-8');
        }
    }

    // 1. read_user_profile
    async readUserProfile() {
        console.log(`[MEMORY] read_user_profile called`);
        if (!fs.existsSync(this.userProfilePath)) {
            this._ensureDefaults();
        }
        return fs.readFileSync(this.userProfilePath, 'utf-8');
    }

    // 2. update_user_profile
    async updateUserProfile({ Content, Append }) {
        console.log(`[MEMORY] update_user_profile called (Append: ${Append})`);

        if (Append) {
            fs.appendFileSync(this.userProfilePath, `\n${Content}`, 'utf-8');
            return `Successfully appended to User Profile at ${this.userProfilePath}`;
        } else {
            fs.writeFileSync(this.userProfilePath, Content, 'utf-8');
            return `Successfully updated User Profile at ${this.userProfilePath}`;
        }
    }

    // 3. read_agent_memory
    async readAgentMemory() {
        console.log(`[MEMORY] read_agent_memory called`);
        if (!fs.existsSync(this.agentMemoryPath)) {
            this._ensureDefaults();
        }
        return fs.readFileSync(this.agentMemoryPath, 'utf-8');
    }

    // 4. update_agent_memory
    async updateAgentMemory({ Content, Append }) {
        console.log(`[MEMORY] update_agent_memory called (Append: ${Append})`);

        if (Append) {
            fs.appendFileSync(this.agentMemoryPath, `\n${Content}`, 'utf-8');
            return `Successfully appended to Agent Memory at ${this.agentMemoryPath}`;
        } else {
            fs.writeFileSync(this.agentMemoryPath, Content, 'utf-8');
            return `Successfully updated Agent Memory at ${this.agentMemoryPath}`;
        }
    }
}

export default MemoryTools;
