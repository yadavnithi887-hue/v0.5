// backend/tools/ToolRouter.js
// Enhanced: Passes io to CommandTools, manages workspace path for FileSystemTools
import FileSystemTools from './FileSystemTools.js';
import CommandTools from './CommandTools.js';
import WebTools from './WebTools.js';

class ToolRouter {
    constructor(io) {
        this.io = io;
        this.fsTools = new FileSystemTools(io);
        this.cmdTools = new CommandTools(io);  // Now receives io for live terminal streaming
        this.webTools = new WebTools();

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
            console.log(`[WORKSPACE] Locked to: ${workspacePath}`);
        }
    }

    async execute(toolName, parameters) {
        console.log(`[TOOL] Executing: ${toolName}`);

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

            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
}

export default ToolRouter;
