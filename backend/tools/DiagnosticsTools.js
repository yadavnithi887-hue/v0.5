// backend/tools/DiagnosticsTools.js
// Provides AI with access to IDE's Problems panel (Monaco diagnostics)
// Uses socket.io to request real-time diagnostic data from the frontend

class DiagnosticsTools {
    constructor(io) {
        this.io = io;
        this.TIMEOUT_MS = 8000; // 8 second timeout for frontend response
    }

    /**
     * check_problems — reads the IDE's Problems panel
     * Emits a socket request to the frontend, which reads Monaco markers
     * and returns them. Optionally filters by file paths.
     *
     * @param {Object} params
     * @param {string[]} [params.FilePaths] - Optional file paths to filter
     * @returns {string} Formatted problems report for the AI
     */
    async checkProblems(params = {}) {
        const filterPaths = Array.isArray(params.FilePaths) ? params.FilePaths : [];

        return new Promise((resolve) => {
            let resolved = false;

            // Timeout safety — if frontend doesn't respond in time
            const timer = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    resolve(this._formatReport([], filterPaths, true));
                }
            }, this.TIMEOUT_MS);

            // Emit request to ALL connected frontend clients
            // The frontend Layout.jsx socket handler will respond
            this.io.emit('diagnostics:request', {
                filterPaths,
                requestId: Date.now().toString(36),
                timestamp: Date.now()
            });

            // Listen for the response (one-time listener)
            const responseHandler = (data) => {
                if (resolved) return;
                resolved = true;
                clearTimeout(timer);

                // Remove this one-time listener from all sockets
                for (const [, socket] of this.io.sockets?.sockets || new Map()) {
                    socket.off('diagnostics:response', responseHandler);
                }

                const problems = Array.isArray(data?.problems) ? data.problems : [];
                resolve(this._formatReport(problems, filterPaths, false));
            };

            // Attach handler to all connected sockets
            for (const [, socket] of this.io.sockets?.sockets || new Map()) {
                socket.on('diagnostics:response', responseHandler);
            }
        });
    }

    /**
     * Format the problems into a clear, structured report for the AI
     */
    _formatReport(problems, filterPaths = [], timedOut = false) {
        if (timedOut) {
            return [
                '⚠️ DIAGNOSTICS TIMEOUT: IDE frontend did not respond within 8 seconds.',
                'The IDE might not be open or the frontend socket is disconnected.',
                'Try again or proceed with caution.'
            ].join('\n');
        }

        // Apply path filter if provided
        let filtered = problems;
        if (filterPaths.length > 0) {
            const normalizedFilters = filterPaths.map(p =>
                String(p || '').replace(/\\/g, '/').toLowerCase()
            );
            filtered = problems.filter(p => {
                const norm = String(p.filePath || '').replace(/\\/g, '/').toLowerCase();
                return normalizedFilters.some(f => norm.includes(f) || f.includes(norm));
            });
        }

        if (filtered.length === 0) {
            return '✅ No problems found. All files are clean — 0 errors, 0 warnings.';
        }

        // Group by file
        const byFile = new Map();
        for (const p of filtered) {
            const key = p.filePath || p.file || 'unknown';
            if (!byFile.has(key)) byFile.set(key, []);
            byFile.get(key).push(p);
        }

        const errorCount = filtered.filter(p => p.severity === 'Error').length;
        const warningCount = filtered.filter(p => p.severity === 'Warning').length;

        const lines = [
            `❌ PROBLEMS FOUND: ${errorCount} error(s), ${warningCount} warning(s) across ${byFile.size} file(s).`,
            ''
        ];

        for (const [filePath, fileProblems] of byFile) {
            const fileName = filePath.split(/[\\/]/).pop();
            lines.push(`📄 ${fileName} (${filePath}):`);
            for (const p of fileProblems) {
                const icon = p.severity === 'Error' ? '🔴' : '🟡';
                const loc = `Line ${p.line || '?'}, Col ${p.column || '?'}`;
                const src = p.source ? ` [${p.source}]` : '';
                lines.push(`  ${icon} ${loc}: ${p.message}${src}`);
            }
            lines.push('');
        }

        lines.push('⚡ ACTION REQUIRED: Fix all errors above, then call check_problems again to verify.');

        return lines.join('\n');
    }
}

export default DiagnosticsTools;
