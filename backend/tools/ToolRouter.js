// backend/tools/ToolRouter.js
// Enhanced: Passes io to CommandTools, manages workspace path for FileSystemTools
import FileSystemTools from './FileSystemTools.js';
import CommandTools from './CommandTools.js';
import WebTools from './WebTools.js';
import MemoryTools from './MemoryTools.js';
import ArtifactTools from './ArtifactTools.js';
import TaskBoundaryTools from './TaskBoundaryTools.js';
import DiagnosticsTools from './DiagnosticsTools.js';

class ToolRouter {
    constructor(io) {
        this.io = io;
        this.fsTools = new FileSystemTools(io);
        this.cmdTools = new CommandTools(io);  // Now receives io for live terminal streaming
        this.webTools = new WebTools();
        this.memoryTools = new MemoryTools(io);
        this.artifactTools = new ArtifactTools(io);
        this.taskBoundaryTools = new TaskBoundaryTools(io);
        this.diagnosticsTools = new DiagnosticsTools(io);

        // Setup socket listeners for user input on AI terminal
        this.cmdTools.setupSocketListeners();
    }

    /**
     * Set the workspace path — locks FileSystemTools to this directory
     * Called by GatewayManager when a session starts or workspace changes
     */
    setWorkspacePath(workspacePath) {
        if (workspacePath) {
            this.fsTools.setWorkspacePath(workspacePath);
            this.cmdTools.setWorkspacePath(workspacePath);
            console.log(`[WORKSPACE] Locked to: ${workspacePath}`);
        }
    }

    setSessionId(sessionId) {
        this.artifactTools.setSessionId(sessionId);
        this.taskBoundaryTools.setSessionId(sessionId);
    }

    _isFsTool(toolName) {
        return [
            'view_file',
            'list_dir',
            'write_to_file',
            'replace_file_content',
            'multi_replace_file_content',
        ].includes(toolName);
    }

    _extractFsPath(parameters = {}) {
        return parameters.AbsolutePath || parameters.TargetFile || parameters.DirectoryPath || '';
    }

    _isArtifactPath(rawPath) {
        const p = String(rawPath || '').replace(/\\/g, '/').toLowerCase();
        return p.includes('/.brain/');
    }

    _assertFsBoundary(toolName, parameters = {}) {
        if (!this._isFsTool(toolName)) return;
        const targetPath = this._extractFsPath(parameters);
        if (!targetPath) return;
        if (!this._isArtifactPath(targetPath)) return;
        console.warn(`[TOOL] Blocked generic FS tool on artifact path: ${toolName} -> ${targetPath}`);
        throw new Error('Artifact path is blocked for generic file tools. Use brain_list_artifacts, brain_read_artifact, brain_write_artifact.');
    }

    async execute(toolName, parameters) {
        console.log(`[TOOL] Executing: ${toolName}`);
        this._assertFsBoundary(toolName, parameters);

        switch (toolName) {
            // ==================== File System Tools ====================
            case 'view_file':
                return await this.fsTools.viewFile(parameters);
            case 'list_dir':
                return await this.fsTools.listDir(parameters);
            case 'write_to_file':
                return await this.fsTools.writeToFile(parameters);
            case 'replace_file_content':
                return await this.fsTools.replaceFileContent(parameters);
            case 'find_by_name':
                return await this.fsTools.findByName(parameters);
            case 'grep_search':
                return await this.fsTools.grepSearch(parameters);
            case 'view_file_outline':
                return await this.fsTools.viewFileOutline(parameters);
            case 'view_code_item':
                return await this.fsTools.viewCodeItem(parameters);
            case 'multi_replace_file_content':
                return await this.fsTools.multiReplaceFileContent(parameters);

            // ==================== Command Tools ====================
            case 'run_command':
                return await this.cmdTools.runCommand(parameters);
            case 'command_status':
                return await this.cmdTools.commandStatus(parameters);
            case 'send_command_input':
                return await this.cmdTools.sendCommandInput(parameters);
            case 'read_terminal':
                return await this.cmdTools.readTerminal(parameters);

            // ==================== Web Tools ====================
            case 'search_web':
                return await this.webTools.searchWeb(parameters);
            case 'read_url_content':
                return await this.webTools.readUrlContent(parameters);
            case 'browser_subagent':
                return await this.webTools.browserAction(parameters);

            // ==================== Memory Tools ====================
            case 'read_user_profile':
                return await this.memoryTools.readUserProfile();
            case 'update_user_profile':
                return await this.memoryTools.updateUserProfile(parameters);
            case 'read_agent_memory':
                return await this.memoryTools.readAgentMemory();
            case 'update_agent_memory':
                return await this.memoryTools.updateAgentMemory(parameters);

            // ==================== Artifact Tools ====================
            case 'brain_list_artifacts':
                return await this.artifactTools.listArtifacts();
            case 'brain_read_artifact':
                return await this.artifactTools.readArtifact(parameters);
            case 'brain_write_artifact':
                return await this.artifactTools.writeArtifact(parameters);
            case 'task_boundary':
                return await this.taskBoundaryTools.taskBoundary(parameters);

            // ==================== Diagnostics Tools ====================
            case 'check_problems':
                return await this.diagnosticsTools.checkProblems(parameters);

            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
}

export default ToolRouter;

