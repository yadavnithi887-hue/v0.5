// backend/ai/AIBrain.js
import { getToolDeclarations, getOpenAITools } from './ToolSchemas.js';
import PromptBuilder from './PromptBuilder.js';

class AIBrain {
    constructor(tokenManager, toolRouter, io) {
        this.tokenManager = tokenManager;
        this.toolRouter = toolRouter;
        this.io = io;
        this.promptBuilder = new PromptBuilder();

        this.API_BASE = 'https://cloudcode-pa.googleapis.com';
        this.API_FALLBACKS = [
            'https://autopush-cloudcode-pa.sandbox.googleapis.com',
            'https://daily-cloudcode-pa.sandbox.googleapis.com'
        ];
        this.MODAL_DEFAULT_ENDPOINT = 'https://api.us-west-2.modal.direct/v1/chat/completions';
        this.MODAL_CTX_TOKENS = 32000;
        this.MODAL_MAX_TOKENS = 32000;
        this.model = 'gemini-3-flash';
        this.DEFAULT_MODEL = 'gemini-3-flash';
        this.MAX_TOOL_ITERATIONS = 25;
    }

    setModel(modelName) {
        // Map display/frontend model IDs to actual Google API model identifiers.
        // The cloudcode-pa.googleapis.com API requires real model names like
        // 'gemini-2.5-flash', 'gemini-2.5-pro', etc.
        const normalizeMap = {
            // Primary models — these are the correct API identifiers
            'gemini-3-flash': 'gemini-3-flash',
            'gemini-3.1-pro-low': 'gemini-3.1-pro-low',
            'gemini-3.1-pro-high': 'gemini-3.1-pro-high',
            // Prefixed variants (frontend sends these)
            'google-antigravity/gemini-3-flash': 'gemini-3-flash',
            'google-antigravity/gemini-3.1-pro-high': 'gemini-3.1-pro-high',
            'google-antigravity/gemini-3.1-pro-low': 'gemini-3.1-pro-low',
            // Backward aliases — old fake model names → real API names
            'gemini-3.1-low': 'gemini-3.1-pro-low',
            'google-antigravity/gemini-3.1-low': 'gemini-3.1-pro-low',
            'gemini-2.5-flash': 'gemini-3-flash',
            'gemini-2.5-pro': 'gemini-3.1-pro-high',
            'gemini-2.5-flash-lite': 'gemini-3.1-pro-low',
            'gemini-2.0-flash': 'gemini-3-flash',
            'gemini-2.0-pro': 'gemini-3.1-pro-high',
            // Claude models (routed through Cloud Code)
            'claude-opus-4-6-thinking': 'claude-opus-4-6-thinking',
            'claude-opus-4-6': 'claude-opus-4-6',
            'claude-opus-4-5-thinking': 'claude-opus-4-5-thinking',
            'claude-sonnet-4-5': 'claude-sonnet-4-5',
            'claude-sonnet-4.6': 'claude-sonnet-4-5',
            'claude-opus-4.6': 'claude-opus-4-6',
            // Third-party / Modal models
            'gpt-oss-120b-medium': 'gpt-oss-120b-medium',
            'gpt-oss-120b': 'gpt-oss-120b-medium',
            'gpt-oss-*': 'gpt-oss-*',
            'zai-org/GLM-5-FP8': 'zai-org/GLM-5-FP8',
            'zai-org/GLM-5-Air': 'zai-org/GLM-5-Air',
        };
        this.model = normalizeMap[modelName] || modelName;
        console.log(`[MODEL] Switched to: ${this.model}`);
    }

    _isModalModel(modelName = this.model) {
        const m = String(modelName || '').toLowerCase();
        return m.startsWith('zai-org/') || m.startsWith('glm-');
    }

    async think(userMessage, sessionContext, attachments = []) {
        if (this._isModalModel()) {
            return await this._thinkWithModal(userMessage, sessionContext, attachments);
        }

        const accessToken = await this.tokenManager.getAccessToken();
        if (!accessToken) {
            const err = new Error('Google Antigravity auth missing. Sign in or select a Modal model.');
            err.code = 'AUTH_REQUIRED';
            err.stage = 'auth';
            err.retryable = false;
            throw err;
        }

        return await this._thinkWithGemini(userMessage, sessionContext, accessToken, attachments);
    }

    async _thinkWithGemini(userMessage, sessionContext, preloadedAccessToken = null, attachments = []) {
        const accessToken = preloadedAccessToken || await this.tokenManager.getAccessToken();
        const projectId = this.tokenManager.getProjectId();
        if (!accessToken) {
            const err = new Error('Not authenticated. Please sign in first.');
            err.code = 'AUTH_REQUIRED';
            err.stage = 'auth';
            err.retryable = false;
            throw err;
        }

        const systemPrompt = this.promptBuilder.buildSystemPrompt(sessionContext);
        const contents = this.promptBuilder.buildContents(userMessage, sessionContext, attachments);

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
                err.stage = err.stage || 'model_call';
                err.iteration = iterations;
                err.toolFailures = allToolCalls.filter((t) => t.success === false).slice(-5);
                throw err;
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

    async _thinkWithModal(userMessage, sessionContext, attachments = []) {
        const modalCfg = this.tokenManager.getModalConfig?.() || {};
        const apiKey = String(modalCfg.apiKey || '').trim();
        if (!apiKey) {
            const err = new Error('Modal API key missing. Configure it in Settings > AI Gateway > Modal GLM Provider.');
            err.code = 'AUTH_REQUIRED';
            err.stage = 'auth';
            err.retryable = false;
            throw err;
        }

        const endpoint = modalCfg.endpoint || this.MODAL_DEFAULT_ENDPOINT;
        const systemPrompt = this._buildModalSystemPrompt(sessionContext);
        const contents = this.promptBuilder.buildContents(userMessage, sessionContext, attachments);
        const messages = this._toOpenAIMessages(systemPrompt, contents);

        const allToolCalls = [];
        let totalTokens = 0;
        let iterations = 0;

        while (iterations < this.MAX_TOOL_ITERATIONS) {
            iterations++;
            this._emitActivity('thinking', { message: 'AI is thinking...' });

            const boundedMessages = this._trimModalMessagesToCtx(messages, this.MODAL_CTX_TOKENS);
            let response;
            try {
                response = await this._callModal(endpoint, apiKey, boundedMessages);
            } catch (err) {
                if (allToolCalls.length > 0) {
                    this._emitActivity('tool_warning', {
                        message: `Model interrupted (${err.status || err.code || 'error'}). Returning partial progress.`,
                    });
                    const partial = 'Request interrupted by provider. Partial work was completed; please continue with your next instruction.';
                    this._emitChunkedStream(partial);
                    return {
                        response: partial,
                        toolCalls: allToolCalls,
                        tokensUsed: totalTokens,
                        iterations,
                    };
                }
                throw err;
            }
            totalTokens += Number(response?.usage?.total_tokens || 0);

            const choice = response?.choices?.[0];
            const assistantMessage = choice?.message || {};
            const toolCalls = Array.isArray(assistantMessage.tool_calls) ? assistantMessage.tool_calls : [];

            if (toolCalls.length > 0) {
                messages.push({
                    role: 'assistant',
                    content: assistantMessage.content || '',
                    tool_calls: toolCalls,
                });

                for (const tc of toolCalls) {
                    const toolName = tc?.function?.name;
                    if (!toolName) continue;

                    let toolArgs = {};
                    try {
                        toolArgs = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : {};
                    } catch {
                        toolArgs = {};
                    }

                    this._emitActivity('tool_call', {
                        tool: toolName,
                        args: toolArgs,
                        iteration: iterations,
                    });

                    let toolContent;
                    try {
                        const result = await this.toolRouter.execute(toolName, toolArgs);
                        toolContent = typeof result === 'string' ? result : JSON.stringify(result);
                        allToolCalls.push({ tool: toolName, args: toolArgs, success: true });
                        this._emitActivity('tool_result', {
                            tool: toolName,
                            success: true,
                            iteration: iterations,
                        });
                    } catch (err) {
                        const safeMessage = err?.message || 'Tool execution failed';
                        toolContent = JSON.stringify({ error: safeMessage });
                        allToolCalls.push({
                            tool: toolName,
                            args: toolArgs,
                            success: false,
                            error: safeMessage,
                            code: 'TOOL_ERROR',
                        });
                        this._emitActivity('tool_result', {
                            tool: toolName,
                            success: false,
                            error: safeMessage,
                            iteration: iterations,
                        });
                    }

                    messages.push({
                        role: 'tool',
                        tool_call_id: tc.id,
                        name: toolName,
                        content: toolContent,
                    });
                }

                continue;
            }

            const responseText = String(assistantMessage.content || '').trim();
            this._emitChunkedStream(responseText);
            return {
                response: responseText,
                toolCalls: allToolCalls,
                tokensUsed: totalTokens,
                iterations,
            };
        }

        const fallback = 'I could not fully complete this turn due to tool-iteration limits. Please continue with your next instruction.';
        this._emitChunkedStream(fallback);
        return {
            response: fallback,
            toolCalls: allToolCalls,
            tokensUsed: totalTokens,
            iterations,
        };
    }

    _toOpenAIMessages(systemPrompt, contents) {
        const messages = [{ role: 'system', content: systemPrompt }];
        for (const entry of contents || []) {
            const role = entry?.role === 'model' ? 'assistant' : 'user';
            const content = (entry?.parts || []).map((p) => String(p?.text || '')).join('\n').trim();
            messages.push({ role, content });
        }
        return messages;
    }

    _buildModalSystemPrompt(sessionContext = {}) {
        const workspace = sessionContext.workspacePath || 'workspace';
        return [
            'You are a fast coding assistant.',
            'Think briefly, then act.',
            'Use tools when needed, especially before claiming file state.',
            'Return concise, direct responses.',
            `Workspace root: ${workspace}`,
        ].join('\n');
    }

    _emitSimpleStream(text) {
        const streamId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        if (this.io) {
            this.io.emit('chat:stream', {
                id: streamId,
                type: 'done',
                content: text,
                thoughtContent: '',
                durationMs: 0,
                isStreaming: false,
            });
        }
    }

    _emitChunkedStream(text) {
        const finalText = String(text || '');
        if (!finalText) {
            this._emitSimpleStream('');
            return;
        }
        const streamId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        let built = '';
        const chunks = finalText.match(/.{1,120}/g) || [finalText];
        for (const chunk of chunks) {
            built += chunk;
            if (this.io) {
                this.io.emit('chat:stream', {
                    id: streamId,
                    type: 'text',
                    content: built,
                    isStreaming: true,
                });
            }
        }
        if (this.io) {
            this.io.emit('chat:stream', {
                id: streamId,
                type: 'done',
                content: finalText,
                thoughtContent: '',
                durationMs: 0,
                isStreaming: false,
            });
        }
    }

    _trimModalMessagesToCtx(messages, ctxTokens = 32000) {
        const maxChars = Math.max(4000, Math.floor(ctxTokens * 4));
        const input = Array.isArray(messages) ? messages : [];
        const out = [];
        let size = 0;

        for (let i = input.length - 1; i >= 0; i--) {
            const m = input[i];
            const s = JSON.stringify(m || {});
            if (size + s.length > maxChars && out.length > 0) break;
            out.unshift(m);
            size += s.length;
        }

        if (input[0]?.role === 'system' && out[0]?.role !== 'system') {
            out.unshift(input[0]);
        }

        return out;
    }

    async _callModal(endpoint, apiKey, messages) {
        let response;
        try {
            response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    max_tokens: this.MODAL_MAX_TOKENS,
                    ctx: this.MODAL_CTX_TOKENS,
                    tools: getOpenAITools(),
                    tool_choice: 'auto',
                }),
            });
        } catch (err) {
            const e = new Error(`Network error while contacting Modal API: ${err.message}`);
            e.code = 'NETWORK_ERROR';
            e.stage = 'api_fetch';
            e.retryable = true;
            throw e;
        }

        if (!response.ok) {
            const raw = await response.text().catch(() => '');
            const parsed = this._extractApiError(raw);
            const e = new Error(parsed.message || `Modal API request failed with HTTP ${response.status}`);
            e.code = parsed.code || this._mapHttpStatusToCode(response.status, raw);
            e.stage = 'api_http';
            e.status = response.status;
            e.details = parsed.details || raw || null;
            e.retryable = response.status >= 500 || response.status === 429;
            throw e;
        }

        return await response.json();
    }

    async _callGemini(accessToken, projectId, systemInstruction, contents) {
        // Find correct endpoint, starting with daily sandbox
        const url = `${this.API_BASE}/v1internal:streamGenerateContent?alt=sse`;

        // Antigravity API model name handling:
        // - Pro models: tier suffix IS part of the model name (gemini-3-pro-high, gemini-3.1-pro-low)
        // - Flash models: bare name (gemini-3-flash) + thinkingLevel param
        let thinkingLevel;
        let apiModelName = this.model;
        const isFlashModel = this.model.includes('-flash');
        const isProModel = this.model.includes('-pro');

        if (isFlashModel) {
            // Flash: strip tier suffix and use it as thinkingLevel param
            if (this.model.endsWith('-high')) {
                thinkingLevel = 'high';
                apiModelName = this.model.replace(/-high$/, '');
            } else if (this.model.endsWith('-low')) {
                thinkingLevel = 'low';
                apiModelName = this.model.replace(/-low$/, '');
            } else if (this.model.endsWith('-medium')) {
                thinkingLevel = 'medium';
                apiModelName = this.model.replace(/-medium$/, '');
            } else if (this.model.endsWith('-minimal')) {
                thinkingLevel = 'minimal';
                apiModelName = this.model.replace(/-minimal$/, '');
            }
        }
        // Pro models: keep the full model name as-is (tier is part of the name)
        // e.g. gemini-3.1-pro-high stays gemini-3.1-pro-high

        const body = {
            project: projectId,
            model: apiModelName,
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

        // Enable thinking for ALL models as requested by user
        body.request.generationConfig = body.request.generationConfig || {};
        body.request.generationConfig.thinkingConfig = {
            includeThoughts: true
        };

        // Add additional thinking properties based on model type
        if (isFlashModel && thinkingLevel) {
            body.request.generationConfig.thinkingConfig.thinkingLevel = thinkingLevel;
        } else if (this.model.startsWith('claude')) {
            // Claude uses thinkingBudget
            body.request.generationConfig.thinkingConfig.thinkingBudget = 32768;
        }

        let response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Antigravity/1.19.6 Chrome/138.0.7204.235 Electron/37.3.1 Safari/537.36',
                    'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
                    'Client-Metadata': '{"ideType":"ANTIGRAVITY","platform":"WINDOWS","pluginType":"GEMINI"}',
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
