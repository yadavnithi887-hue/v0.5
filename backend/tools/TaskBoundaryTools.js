// backend/tools/TaskBoundaryTools.js
// Handles task boundary updates for structured AI progress tracking.

class TaskBoundaryTools {
    constructor(io) {
        this.io = io;
        this.sessionId = 'ide-local-session';
        this.allowedModes = new Set(['PLANNING', 'EXECUTION', 'VERIFICATION']);
    }

    setSessionId(sessionId) {
        if (sessionId) this.sessionId = String(sessionId);
    }

    async taskBoundary(parameters = {}) {
        const modeRaw = String(parameters.Mode || 'EXECUTION').toUpperCase();
        const mode = this.allowedModes.has(modeRaw) ? modeRaw : 'EXECUTION';
        const taskName = String(parameters.TaskName || '').trim();
        const taskSummary = String(parameters.TaskSummary || '').trim();
        const taskStatus = String(parameters.TaskStatus || '').trim();

        if (!taskName) {
            throw new Error('TaskName is required for task_boundary.');
        }

        const payload = {
            sessionId: this.sessionId,
            mode,
            taskName,
            taskSummary,
            taskStatus,
            timestamp: Date.now(),
        };

        if (this.io) {
            this.io.emit('ai:task-boundary', payload);
        }

        return JSON.stringify({
            success: true,
            message: 'Task boundary updated',
            ...payload,
        });
    }
}

export default TaskBoundaryTools;
