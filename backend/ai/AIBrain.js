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
        this.MAX_TOOL_ITERATIONS = 25;
    }

    setModel(modelName) {
        // Normalize display/config names to Antigravity API model IDs
        const normalizeMap = {
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
        if (!accessToken) throw new Error('Not authenticated.');

        const systemPrompt = this.promptBuilder.buildSystemPrompt(sessionContext);
        const contents = this.promptBuilder.buildContents(userMessage, sessionContext);

        let currentContents = [...contents];
        const allToolCalls = [];
        let totalTokens = 0;
        let iterations = 0;

        while (iterations < this.MAX_TOOL_ITERATIONS) {
            iterations++;
            this._emitActivity('thinking', { message: 'AI is thinking...' });

            const response = await this._callGemini(accessToken, projectId, systemPrompt, currentContents);
            totalTokens += response.usageMetadata?.totalTokenCount || 0;

            const candidate = response.candidates?.[0];
            if (!candidate || !candidate.content) break;

            currentContents.push(candidate.content);
            const parts = candidate.content.parts || [];
            const functionCalls = parts.filter(p => p.functionCall);
            const textParts = parts.filter(p => p.text);

            if (functionCalls.length > 0) {
                const toolResults = [];
                for (const fc of functionCalls) {
                    const toolName = fc.functionCall.name;
                    const toolArgs = fc.functionCall.args || {};
                    console.log(`[TOOL] [${iterations}] Calling: ${toolName}`);
                    try {
                        const result = await this.toolRouter.execute(toolName, toolArgs);
                        const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

                        toolResults.push({ functionResponse: { name: toolName, response: { content: resultStr } } });
                        allToolCalls.push({ tool: toolName, args: toolArgs, success: true });
                    } catch (err) {
                        console.error(`[TOOL] ${toolName} FAILED: ${err.message}`);
                        toolResults.push({ functionResponse: { name: toolName, response: { error: err.message } } });
                        allToolCalls.push({ tool: toolName, args: toolArgs, success: false, error: err.message });
                    }
                }
                currentContents.push({ role: 'user', parts: toolResults });
                continue;
            } else if (textParts.length > 0) {
                return {
                    response: textParts.map(p => p.text).join(''),
                    toolCalls: allToolCalls,
                    tokensUsed: totalTokens,
                    iterations: iterations
                };
            }
            break;
        }

        return {
            response: '⚠️ Could not reach a final answer. Please try again.',
            toolCalls: allToolCalls,
            tokensUsed: totalTokens,
            iterations: iterations
        };
    }

    async _callGemini(accessToken, projectId, systemInstruction, contents) {
        const url = `${this.API_BASE}/v1internal:streamGenerateContent?alt=sse`;
        const body = {
            project: projectId,
            model: this.model,
            requestType: "agent",
            userAgent: "antigravity",
            request: {
                contents,
                systemInstruction: {
                    role: "user",
                    parts: [{ text: systemInstruction }]
                },
                tools: getToolDeclarations()
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'User-Agent': 'antigravity/1.15.8 darwin/arm64',
                'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1'
            },
            body: JSON.stringify(body)
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = { candidates: [{ content: { role: 'model', parts: [] } }] };
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.startsWith('data:')) continue;
                try {
                    const chunk = JSON.parse(line.slice(5).trim());
                    const chunkResp = chunk.response;
                    if (chunkResp?.candidates?.[0]?.content?.parts) {
                        for (const part of chunkResp.candidates[0].content.parts) {
                            fullResponse.candidates[0].content.parts.push(part);
                        }
                    }
                    if (chunkResp?.usageMetadata) fullResponse.usageMetadata = chunkResp.usageMetadata;
                } catch (e) { }
            }
        }
        return fullResponse;
    }

    _emitActivity(type, data) { if (this.io) this.io.emit('ai:activity', { type, data, timestamp: Date.now() }); }
}

export default AIBrain;
