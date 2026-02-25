// backend/ai/AIBrain.js
import { getToolDeclarations } from './ToolSchemas.js';
import PromptBuilder from './PromptBuilder.js';

class AIBrain {
    constructor(tokenManager, toolRouter, io) {
        this.tokenManager = tokenManager;
        this.toolRouter = toolRouter;
        this.io = io;
        this.promptBuilder = new PromptBuilder();

        this.API_BASE = 'https://cloudcode-pa.googleapis.com';
        this.model = 'gemini-3-flash';
        this.DEFAULT_MODEL = 'gemini-3-flash';
        this.MAX_TOOL_ITERATIONS = 25;
    }

    setModel(modelName) {
        const normalizeMap = {
            'google-antigravity/gemini-3-flash': 'gemini-3-flash',
            'google-antigravity/gemini-3-pro-high': 'gemini-3-pro-high',
            'google-antigravity/gemini-3-pro-low': 'gemini-3-pro-low',
            'gemini-2.0-flash': 'gemini-3-flash',
            'gemini-2.0-pro': 'gemini-3-pro-high',
            'gemini-3-flash': 'gemini-3-flash',
            'gemini-3-pro-high': 'gemini-3-pro-high',
            'gemini-3-pro-low': 'gemini-3-pro-low',
            'claude-sonnet-4.6': 'claude-sonnet-4.6',
            'claude-opus-4.6': 'claude-opus-4.6',
            'gpt-oss-120b': 'gpt-oss-120b',
        };
        this.model = normalizeMap[modelName] || modelName;
        console.log(`[MODEL] Switched to: ${this.model}`);
    }

    async think(userMessage, sessionContext) {
        const accessToken = await this.tokenManager.getAccessToken();
        const projectId = this.tokenManager.getProjectId();
        if (!accessToken) {
            const err = new Error('Not authenticated. Please sign in first.');
            err.code = 'AUTH_REQUIRED';
            err.stage = 'auth';
            err.retryable = false;
            throw err;
        }

        const systemPrompt = this.promptBuilder.buildSystemPrompt(sessionContext);
        const contents = this.promptBuilder.buildContents(userMessage, sessionContext);

        let currentContents = [...contents];
        const allToolCalls = [];
        let totalTokens = 0;
        let iterations = 0;

        while (iterations < this.MAX_TOOL_ITERATIONS) {
            iterations++;
            this._emitActivity('thinking', { message: 'AI is thinking...' });

            let response;
            try {
                response = await this._callGemini(accessToken, projectId, systemPrompt, currentContents);
            } catch (err) {
                const shouldFallbackModel = (
                    err?.stage === 'api_http'
                    && String(err?.code || '').toUpperCase() === 'NOT_FOUND'
                    && this.model !== this.DEFAULT_MODEL
                );

                if (shouldFallbackModel) {
                    const previousModel = this.model;
                    this.model = this.DEFAULT_MODEL;
                    console.warn(`[MODEL] API returned NOT_FOUND for model "${previousModel}". Falling back to "${this.DEFAULT_MODEL}" and retrying.`);
                    this._emitActivity('model_fallback', {
                        from: previousModel,
                        to: this.DEFAULT_MODEL,
                        reason: 'NOT_FOUND',
                    });
                    try {
                        response = await this._callGemini(accessToken, projectId, systemPrompt, currentContents);
                    } catch (retryErr) {
                        retryErr.stage = retryErr.stage || 'model_call';
                        retryErr.iteration = iterations;
                        retryErr.toolFailures = allToolCalls.filter((t) => t.success === false).slice(-5);
                        throw retryErr;
                    }
                } else {
                err.stage = err.stage || 'model_call';
                err.iteration = iterations;
                err.toolFailures = allToolCalls.filter((t) => t.success === false).slice(-5);
                throw err;
                }
            }

            totalTokens += response.usageMetadata?.totalTokenCount || 0;
            const candidate = response.candidates?.[0];
            if (!candidate || !candidate.content) break;

            currentContents.push(candidate.content);
            const parts = candidate.content.parts || [];
            const functionCalls = parts.filter((p) => p.functionCall);
            const textParts = parts.filter((p) => p.text);

            if (functionCalls.length > 0) {
                const toolResults = [];
                for (const fc of functionCalls) {
                    const toolName = fc.functionCall.name;
                    const toolArgs = fc.functionCall.args || {};
                    console.log(`[TOOL] [${iterations}] Calling: ${toolName}`);
                    this._emitActivity('tool_call', {
                        tool: toolName,
                        args: toolArgs,
                        iteration: iterations,
                    });
                    try {
                        const result = await this.toolRouter.execute(toolName, toolArgs);
                        const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
                        toolResults.push({ functionResponse: { name: toolName, response: { content: resultStr } } });
                        allToolCalls.push({ tool: toolName, args: toolArgs, success: true });
                        this._emitActivity('tool_result', {
                            tool: toolName,
                            success: true,
                            iteration: iterations,
                        });
                    } catch (err) {
                        console.error(`[TOOL] ${toolName} FAILED: ${err.message}`);
                        const isUnknownTool = /unknown tool/i.test(String(err?.message || ''));
                        const safeToolMessage = isUnknownTool
                            ? 'Requested tool is unavailable. Continue using available tools and provide best-effort output.'
                            : err.message;

                        toolResults.push({ functionResponse: { name: toolName, response: { error: safeToolMessage } } });
                        allToolCalls.push({
                            tool: toolName,
                            args: toolArgs,
                            success: false,
                            error: safeToolMessage,
                            code: isUnknownTool ? 'UNKNOWN_TOOL' : 'TOOL_ERROR',
                        });
                        this._emitActivity('tool_result', {
                            tool: toolName,
                            success: false,
                            error: safeToolMessage,
                            iteration: iterations,
                        });

                        if (isUnknownTool) {
                            this._emitActivity('tool_warning', {
                                message: `Tool not found: ${toolName}`,
                                tool: toolName,
                            });
                        }
                    }
                }
                currentContents.push({ role: 'user', parts: toolResults });
                continue;
            }

            if (textParts.length > 0) {
                return {
                    response: textParts.map((p) => p.text).join(''),
                    toolCalls: allToolCalls,
                    tokensUsed: totalTokens,
                    iterations,
                };
            }

            break;
        }

        const failedTools = allToolCalls.filter((t) => t.success === false);
        const unknownToolCount = failedTools.filter((t) => t.code === 'UNKNOWN_TOOL').length;
        const genericReason = unknownToolCount > 0
            ? 'Some internal tools were unavailable, so I continued with available context.'
            : 'A temporary internal issue interrupted completion.';

        return {
            response: `I could not fully complete this turn. ${genericReason} Please continue with your next instruction.`,
            toolCalls: allToolCalls,
            tokensUsed: totalTokens,
            iterations,
        };
    }

    async _callGemini(accessToken, projectId, systemInstruction, contents) {
        const url = `${this.API_BASE}/v1internal:streamGenerateContent?alt=sse`;
        const body = {
            project: projectId,
            model: this.model,
            requestType: 'agent',
            userAgent: 'antigravity',
            request: {
                contents,
                systemInstruction: {
                    role: 'user',
                    parts: [{ text: systemInstruction }],
                },
                tools: getToolDeclarations(),
            },
        };

        let response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'antigravity/1.15.8 darwin/arm64',
                    'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
                },
                body: JSON.stringify(body),
            });
        } catch (err) {
            const e = new Error(`Network error while contacting AI API: ${err.message}`);
            e.code = 'NETWORK_ERROR';
            e.stage = 'api_fetch';
            e.retryable = true;
            throw e;
        }

        if (!response.ok) {
            const raw = await response.text().catch(() => '');
            const parsed = this._extractApiError(raw);
            const e = new Error(parsed.message || `AI API request failed with HTTP ${response.status}`);
            e.code = parsed.code || this._mapHttpStatusToCode(response.status, raw);
            e.stage = 'api_http';
            e.status = response.status;
            e.details = parsed.details || raw || null;
            e.retryable = response.status >= 500 || response.status === 429;
            throw e;
        }

        if (!response.body) {
            const e = new Error('AI API returned an empty response stream');
            e.code = 'EMPTY_STREAM';
            e.stage = 'api_stream';
            e.retryable = true;
            throw e;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const fullResponse = { candidates: [{ content: { role: 'model', parts: [] } }] };
        let buffer = '';

        const streamId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        let currentThought = '';
        let currentText = '';
        const thoughtStartTime = Date.now();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.startsWith('data:')) continue;
                const chunkInfo = line.slice(5).trim();
                if (!chunkInfo) continue;

                let chunk;
                try {
                    chunk = JSON.parse(chunkInfo);
                } catch {
                    continue;
                }

                const chunkResp = chunk.response;

                if (chunkResp?.error) {
                    const apiErr = chunkResp.error;
                    const e = new Error(apiErr.message || 'AI API stream returned an error');
                    e.code = apiErr.status || apiErr.code || 'STREAM_ERROR';
                    e.stage = 'api_stream';
                    e.details = JSON.stringify(apiErr);
                    e.retryable = true;
                    throw e;
                }

                if (chunkResp?.candidates?.[0]?.content?.parts) {
                    for (const part of chunkResp.candidates[0].content.parts) {
                        fullResponse.candidates[0].content.parts.push(part);
                        const isThought = part.thought === true || part.executableCode || part.codeExecutionResult;

                        if (isThought) {
                            currentThought += (part.text || part.executableCode?.code || part.codeExecutionResult?.outcome || JSON.stringify(part) || '');
                            if (this.io) {
                                this.io.emit('chat:stream', {
                                    id: streamId,
                                    type: 'thought',
                                    content: currentThought,
                                    durationMs: Date.now() - thoughtStartTime,
                                    isStreaming: true,
                                });
                            }
                        } else if (part.text) {
                            currentText += part.text;
                            if (this.io) {
                                this.io.emit('chat:stream', {
                                    id: streamId,
                                    type: 'text',
                                    content: currentText,
                                    isStreaming: true,
                                });
                            }
                        }
                    }
                }

                if (chunkResp?.usageMetadata) fullResponse.usageMetadata = chunkResp.usageMetadata;
            }
        }

        if (this.io) {
            this.io.emit('chat:stream', {
                id: streamId,
                type: 'done',
                content: currentText,
                thoughtContent: currentThought,
                durationMs: Date.now() - thoughtStartTime,
                isStreaming: false,
            });
        }

        return fullResponse;
    }

    _extractApiError(raw) {
        if (!raw) return { message: '', code: '', details: '' };
        try {
            const parsed = JSON.parse(raw);
            const err = parsed?.error || parsed;
            return {
                message: err?.message || '',
                code: err?.status || err?.code || '',
                details: raw,
            };
        } catch {
            return { message: raw.slice(0, 400), code: '', details: raw };
        }
    }

    _mapHttpStatusToCode(status, raw = '') {
        const body = String(raw || '').toLowerCase();
        if (status === 429 && body.includes('quota')) return 'QUOTA_EXCEEDED';
        if (status === 429) return 'RATE_LIMITED';
        if (status === 401 || status === 403) return 'AUTH_ERROR';
        if (status === 503) return 'SERVICE_UNAVAILABLE';
        if (status >= 500) return 'API_SERVER_ERROR';
        return `HTTP_${status}`;
    }

    _emitActivity(type, data) {
        if (this.io) this.io.emit('ai:activity', { type, data, timestamp: Date.now() });
    }
}

export default AIBrain;
