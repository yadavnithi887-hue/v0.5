// backend/tools/CommandTools.js
// Enhanced: Now emits live terminal output via Socket.IO so the IDE can show an "AI Terminal"
// Enhanced: Requires user confirmation before executing commands
import { exec } from 'child_process';
import { randomUUID } from 'crypto';

class CommandTools {
    constructor(io) {
        this.io = io; // Socket.IO instance for live streaming
        this.runningCommands = new Map();
        this.pendingConfirmations = new Map(); // confirmId -> { resolve, reject, timeout }
        this.currentAiTerminalId = null; // Track current AI terminal for reuse
        this.currentAiTerminalDone = true; // Is the current terminal's command done?
        this.workspacePath = null;
        this.CONFIRMATION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minute timeout
    }

    setWorkspacePath(workspacePath) {
        this.workspacePath = workspacePath ? String(workspacePath) : null;
    }

    _normalizePath(p) {
        return String(p || '').replace(/\\/g, '/').toLowerCase();
    }

    _resolveCwd(cwd) {
        const safeBase = this.workspacePath || cwd || process.cwd();
        if (!cwd) return safeBase;
        if (!this.workspacePath) return cwd;

        const base = this._normalizePath(this.workspacePath);
        const target = this._normalizePath(cwd);
        if (target.startsWith(base)) return cwd;
        return safeBase;
    }

    _isBackendDangerousCommand(commandLine) {
        const cmd = String(commandLine || '').toLowerCase();
        const patterns = [
            /taskkill\s+\/f\s+\/im\s+node\.exe/,
            /taskkill\s+\/im\s+node\.exe/,
            /stop-process\s+-name\s+node\b/,
            /pkill\s+(-f\s+)?node\b/,
            /killall\s+node\b/,
            /wmic\s+process\s+where\s+.*node\.exe.*delete/,
        ];
        return patterns.some((re) => re.test(cmd));
    }

    /**
     * Emit AI terminal events to the frontend
     */
    _emitTerminal(event, data) {
        if (this.io) {
            this.io.emit('terminal:ai-output', { event, terminalId: this.currentAiTerminalId, ...data, timestamp: Date.now() });
        }
    }

    /**
     * Request user confirmation before executing a command.
     * Emits 'ai:request-confirmation' and waits for 'ide:confirm-response'.
     * Returns true if approved, throws if rejected or timed out.
     */
    async _requestUserConfirmation(commandLine, cwd) {
        const confirmId = `confirm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        // Shorten the cwd for display
        const shortCwd = cwd ? String(cwd).replace(/\\/g, '/').split('/').slice(-2).join('/') : '';

        // Emit confirmation request to the frontend
        if (this.io) {
            this.io.emit('ai:request-confirmation', {
                confirmId,
                toolName: 'run_command',
                command: commandLine,
                cwd: shortCwd,
                fullCwd: cwd,
                timestamp: Date.now(),
            });
        }

        console.log(`[COMMAND] Waiting for user confirmation [${confirmId}]: ${commandLine}`);

        // Wait for the user to respond
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingConfirmations.delete(confirmId);
                reject(new Error('Command confirmation timed out after 5 minutes. The user did not respond. Please inform the user and try again later.'));
            }, this.CONFIRMATION_TIMEOUT_MS);

            this.pendingConfirmations.set(confirmId, { resolve, reject, timeout, commandLine });
        });
    }

    /**
     * Handle a confirmation response from the frontend.
     * Called from the socket listener.
     */
    handleConfirmationResponse(confirmId, approved) {
        const pending = this.pendingConfirmations.get(confirmId);
        if (!pending) return false;

        clearTimeout(pending.timeout);
        this.pendingConfirmations.delete(confirmId);

        if (approved) {
            console.log(`[COMMAND] User APPROVED command [${confirmId}]: ${pending.commandLine}`);
            pending.resolve(true);
        } else {
            console.log(`[COMMAND] User REJECTED command [${confirmId}]: ${pending.commandLine}`);
            pending.reject(new Error('User rejected this command. Do not run this command. Try an alternative approach or report to the user that the command was not allowed.'));
        }
        return true;
    }

    // 10. run_command
    async runCommand({ CommandLine, Cwd, WaitMsBeforeAsync, SafeToAutoRun }) {
        const id = randomUUID();
        if (!CommandLine || String(CommandLine).trim().length === 0) {
            throw new Error('CommandLine is required for run_command.');
        }
        if (this._isBackendDangerousCommand(CommandLine)) {
            throw new Error('Blocked command: this command can terminate IDE/backend Node processes.');
        }
        const effectiveCwd = this._resolveCwd(Cwd);

        // ── User confirmation gate ──
        // Always require confirmation unless SafeToAutoRun is true
        if (SafeToAutoRun !== true) {
            await this._requestUserConfirmation(CommandLine, effectiveCwd);
        }

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
            console.log(`[COMMAND] Starting [${id}]: ${CommandLine} in ${effectiveCwd}`);

            // Notify frontend: new AI command started
            this._emitTerminal('start', {
                commandId: id,
                command: CommandLine,
                cwd: effectiveCwd,
                newTerminal: createNewTerminal
            });

            // Emitting to frontend to start PTY!
            if (this.io && this.io.engine.clientsCount > 0) {
                // Store command state WITHOUT local child process
                this.runningCommands.set(id, {
                    output,
                    errorOutput,
                    status: 'running',
                    startTime: Date.now(),
                    command: CommandLine,
                    isDone: false,
                    exitCode: null
                });

                this.io.emit('terminal:ai-request-pty', {
                    commandId: id,
                    command: CommandLine,
                    cwd: effectiveCwd
                });
            } else {
                // Fallback to exec if there is no UI socket connected
                const childProcess = exec(CommandLine, { cwd: effectiveCwd, maxBuffer: 1024 * 1024 * 10 });
                this.runningCommands.set(id, {
                    process: childProcess,
                    output,
                    errorOutput,
                    status: 'running',
                    startTime: Date.now(),
                    command: CommandLine,
                    isDone: false,
                    exitCode: null
                });

                childProcess.stdout.on('data', (data) => {
                    const text = data.toString();
                    output.push(text);
                    this._emitTerminal('stdout', { commandId: id, data: text });
                });

                childProcess.stderr.on('data', (data) => {
                    const text = data.toString();
                    errorOutput.push(text);
                    this._emitTerminal('stderr', { commandId: id, data: text });
                });

                childProcess.on('close', (code) => {
                    const cmd = this.runningCommands.get(id);
                    if (cmd) {
                        cmd.status = 'done';
                        cmd.exitCode = code;
                        cmd.isDone = true;
                    }
                    this.currentAiTerminalDone = true;
                    this._emitTerminal('exit', { commandId: id, exitCode: code });
                });

                childProcess.on('error', (err) => {
                    const cmd = this.runningCommands.get(id);
                    if (cmd) {
                        cmd.status = 'error';
                        cmd.error = err.message;
                        cmd.errorOutput.push(err.message);
                        cmd.isDone = true;
                    }
                    this.currentAiTerminalDone = true;
                    this._emitTerminal('error', { commandId: id, error: err.message });
                });
            }

            // Wait logic
            if (WaitMsBeforeAsync > 0) {
                let waitRemaining = Math.max(0, Math.min(WaitMsBeforeAsync, 10000));
                const interval = 100;
                while (waitRemaining > 0) {
                    const cmd = this.runningCommands.get(id);
                    if (cmd && cmd.isDone) {
                        exitCode = cmd.exitCode;
                        break;
                    }
                    await new Promise(r => setTimeout(r, interval));
                    waitRemaining -= interval;
                }
            }

            const cmd = this.runningCommands.get(id);
            if (cmd && cmd.isDone) {
                // Command finished
                return {
                    commandId: id,
                    status: cmd.status === 'done' && cmd.exitCode === 0 ? 'done' : 'error',
                    output: cmd.output.join(''),
                    error: cmd.errorOutput.join(''),
                    exitCode: cmd.exitCode
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

        const { process } = cmd; // process is null for PTY proxy

        if (Terminate) {
            if (process) {
                process.kill();
            } else if (this.io) {
                this.io.emit('terminal:ai-kill-pty', { commandId: CommandId });
            }
            this._emitTerminal('exit', { commandId: CommandId, exitCode: -1, terminated: true });

            // Wait a bit to allow cleanup
            await new Promise(resolve => setTimeout(resolve, WaitMs || 500));
            return `Terminated command ${CommandId}`;
        }

        if (Input) {
            if (process) {
                // Write to local fallback stdin
                process.stdin.write(Input);
            } else if (this.io) {
                // Proxy input to PTY
                this.io.emit('terminal:ai-input', { commandId: CommandId, data: Input });
            }
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
     * and for command confirmation responses.
     * Call this once during server init
     */
    setupSocketListeners() {
        if (!this.io) return;
        this.io.on('connection', (socket) => {
            // Forward CLI inputs to fallback process, if any
            socket.on('terminal:ai-input', ({ commandId, data }) => {
                const cmd = this.runningCommands.get(commandId);
                if (cmd && cmd.status === 'running' && cmd.process?.stdin) {
                    cmd.process.stdin.write(data);
                }
            });

            // Listen for PTY proxy streams from the React frontend
            socket.on('terminal:pty-stream', (data) => {
                const { commandId, event, data: text, exitCode, error } = data;
                const cmd = this.runningCommands.get(commandId);
                if (!cmd) return;

                if (event === 'stdout' && text) {
                    // Strip ANSI codes before saving to cmd.output so the AI gets clean text
                    // eslint-disable-next-line no-control-regex
                    const cleanText = String(text).replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
                    cmd.output.push(cleanText);
                    // Broadcast raw ANSI stream to all frontends
                    this._emitTerminal('stdout', { commandId, data: text });
                } else if (event === 'exit') {
                    cmd.status = 'done';
                    cmd.exitCode = exitCode;
                    cmd.isDone = true;
                    this.currentAiTerminalDone = true;
                    this._emitTerminal('exit', { commandId, exitCode });
                } else if (event === 'error') {
                    cmd.status = 'error';
                    cmd.error = error;
                    cmd.errorOutput.push(error);
                    cmd.isDone = true;
                    this.currentAiTerminalDone = true;
                    this._emitTerminal('error', { commandId, error });
                } else if (event === 'start') {
                    this._emitTerminal('start', {
                        commandId,
                        command: data.command,
                        cwd: data.cwd,
                        newTerminal: true
                    });
                }
            });

            // Listen for confirmation responses from the IDE
            socket.on('ide:confirm-response', ({ confirmId, approved }) => {
                this.handleConfirmationResponse(confirmId, approved);
            });
        });
    }
}

export default CommandTools;
