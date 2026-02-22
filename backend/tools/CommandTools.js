// backend/tools/CommandTools.js
// Enhanced: Now emits live terminal output via Socket.IO so the IDE can show an "AI Terminal"
import { exec } from 'child_process';
import { randomUUID } from 'crypto';

class CommandTools {
    constructor(io) {
        this.io = io; // Socket.IO instance for live streaming
        this.runningCommands = new Map();
        this.currentAiTerminalId = null; // Track current AI terminal for reuse
        this.currentAiTerminalDone = true; // Is the current terminal's command done?
    }

    /**
     * Emit AI terminal events to the frontend
     */
    _emitTerminal(event, data) {
        if (this.io) {
            this.io.emit('terminal:ai-output', { event, terminalId: this.currentAiTerminalId, ...data, timestamp: Date.now() });
        }
    }

    // 10. run_command
    async runCommand({ CommandLine, Cwd, WaitMsBeforeAsync }) {
        const id = randomUUID();

        let childProcess;
        let output = [];
        let errorOutput = [];
        let isDone = false;
        let exitCode = null;

        // Decide: reuse existing AI terminal or create new one
        // Reuse if previous command is done (terminal is free)
        // Create new if no terminal exists or previous is still running
        let createNewTerminal = false;
        if (!this.currentAiTerminalId || !this.currentAiTerminalDone) {
            // No terminal or previous still running → new terminal
            this.currentAiTerminalId = `ai-terminal-${Date.now()}`;
            createNewTerminal = true;
        }
        this.currentAiTerminalDone = false;

        try {
            console.log(`[COMMAND] Starting [${id}]: ${CommandLine} in ${Cwd}`);

            // Notify frontend: new AI command started
            this._emitTerminal('start', {
                commandId: id,
                command: CommandLine,
                cwd: Cwd,
                newTerminal: createNewTerminal
            });

            // Execute command
            childProcess = exec(CommandLine, { cwd: Cwd, maxBuffer: 1024 * 1024 * 10 });

            // Store command state
            this.runningCommands.set(id, {
                process: childProcess,
                output,
                errorOutput,
                status: 'running',
                startTime: Date.now(),
                command: CommandLine
            });

            // Capture stdout — stream live to frontend
            childProcess.stdout.on('data', (data) => {
                const text = data.toString();
                output.push(text);
                this._emitTerminal('stdout', { commandId: id, data: text });
            });

            // Capture stderr — stream live to frontend
            childProcess.stderr.on('data', (data) => {
                const text = data.toString();
                errorOutput.push(text);
                this._emitTerminal('stderr', { commandId: id, data: text });
            });

            // Handle completion
            childProcess.on('close', (code) => {
                isDone = true;
                exitCode = code;
                this.currentAiTerminalDone = true; // Terminal is free for reuse
                const cmd = this.runningCommands.get(id);
                if (cmd) {
                    cmd.status = 'done';
                    cmd.exitCode = code;
                }
                console.log(`[COMMAND] Finished [${id}] exit code: ${code}`);
                this._emitTerminal('exit', { commandId: id, exitCode: code });
            });

            // Error handling
            childProcess.on('error', (err) => {
                isDone = true;
                this.currentAiTerminalDone = true; // Terminal is free for reuse
                const cmd = this.runningCommands.get(id);
                if (cmd) {
                    cmd.status = 'error';
                    cmd.error = err.message;
                    cmd.errorOutput.push(err.message);
                }
                console.error(`[COMMAND] Error [${id}]:`, err);
                this._emitTerminal('error', { commandId: id, error: err.message });
            });

            // Wait logic
            if (WaitMsBeforeAsync > 0) {
                await new Promise(resolve => setTimeout(resolve, Math.min(WaitMsBeforeAsync, 10000)));
            }

            // Check status after wait
            if (isDone) {
                // Command finished
                return {
                    commandId: id,
                    status: exitCode === 0 ? 'done' : 'error',
                    output: output.join(''),
                    error: errorOutput.join(''),
                    exitCode
                };
            } else {
                // Still running (backgrounded)
                return {
                    commandId: id,
                    status: 'running',
                    message: 'Command running in background. Use command_status to check progress.'
                };
            }

        } catch (error) {
            this._emitTerminal('error', { commandId: id, error: error.message });
            return {
                commandId: id,
                status: 'error',
                error: error.message
            };
        }
    }

    // 12. command_status
    async commandStatus({ CommandId, OutputCharacterCount, WaitDurationSeconds }) {
        const cmd = this.runningCommands.get(CommandId);
        if (!cmd) {
            throw new Error(`Command ID not found: ${CommandId}`);
        }

        // Wait for command completion if requested
        if (WaitDurationSeconds && WaitDurationSeconds > 0 && cmd.status === 'running') {
            const waitMs = Math.min(WaitDurationSeconds, 300) * 1000;
            const startTime = Date.now();
            await new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (cmd.status !== 'running' || (Date.now() - startTime) >= waitMs) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 500);
            });
        }

        let outputStr = cmd.output.join('');
        let errorStr = cmd.errorOutput.join('');

        // Truncate if requested
        if (OutputCharacterCount) {
            if (outputStr.length > OutputCharacterCount) {
                outputStr = outputStr.slice(-OutputCharacterCount); // Keep last N chars
            }
            if (errorStr.length > OutputCharacterCount) {
                errorStr = errorStr.slice(-OutputCharacterCount);
            }
        }

        return {
            status: cmd.status,
            output: outputStr,
            error: errorStr,
            exitCode: cmd.exitCode
        };
    }

    // 11. send_command_input
    async sendCommandInput({ CommandId, Input, Terminate, WaitMs, SafeToAutoRun }) {
        const cmd = this.runningCommands.get(CommandId);
        if (!cmd) {
            throw new Error(`Command ID not found: ${CommandId}`);
        }

        if (cmd.status !== 'running') {
            throw new Error(`Command is not running (Status: ${cmd.status})`);
        }

        const { process } = cmd;

        if (Terminate) {
            process.kill();
            this._emitTerminal('exit', { commandId: CommandId, exitCode: -1, terminated: true });
            // Wait a bit to allow cleanup
            await new Promise(resolve => setTimeout(resolve, WaitMs || 500));
            return `Terminated command ${CommandId}`;
        }

        if (Input) {
            // Write to stdin
            process.stdin.write(Input);
            this._emitTerminal('stdin', { commandId: CommandId, data: Input });

            // Wait for potential output
            await new Promise(resolve => setTimeout(resolve, WaitMs || 1000));

            // Return recent output (last 1000 chars as context)
            const recentOutput = cmd.output.join('').slice(-1000);
            return recentOutput;
        }

        throw new Error('Either Input or Terminate must be specified');
    }

    // 13. read_terminal
    async readTerminal({ ProcessID, Name }) {
        const cmd = this.runningCommands.get(ProcessID);
        if (cmd) {
            return cmd.output.join('');
        }

        return `Terminal session '${ProcessID}' not found. (Note: Only 'run_command' IDs are currently supported)`;
    }

    /**
     * Setup Socket.IO listener for user input from frontend AI terminal
     * Call this once during server init
     */
    setupSocketListeners() {
        if (!this.io) return;
        this.io.on('connection', (socket) => {
            socket.on('terminal:ai-input', ({ commandId, data }) => {
                const cmd = this.runningCommands.get(commandId);
                if (cmd && cmd.status === 'running' && cmd.process?.stdin) {
                    cmd.process.stdin.write(data);
                }
            });
        });
    }
}

export default CommandTools;
