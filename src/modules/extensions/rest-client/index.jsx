import React, { useState } from 'react';
import { Globe, Play, Trash2 } from 'lucide-react';

export const metadata = {
    id: 'devstudio.rest-client',
    name: 'REST Client',
    version: '1.0.0',
    description: 'Test HTTP APIs directly from the side panel.',
    author: 'DevStudio Team',
    icon: 'Globe',
    readme: `
# REST Client

## Features
- GET, POST, PUT, DELETE Support
- JSON Response formatting
`
};

export const settings = [
    {
        id: 'rest.defaultMethod',
        label: 'Default Method',
        type: 'select',
        options: ['GET', 'POST', 'PUT', 'DELETE'],
        default: 'GET',
        description: 'Default HTTP method for new requests',
        section: 'extensions',
        extensionId: metadata.id
    }
];

const RestPanel = ({ context }) => {
    const [requestText, setRequestText] = useState(`POST https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY
Content-Type: application/json

{
  "contents": [{
    "parts": [{
      "text": "Write a short poem about coding"
    }]
  }]
}`);
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);

    const parseRequest = (text) => {
        const lines = text.trim().split('\n');
        if (lines.length === 0) return null;

        // First line: METHOD URL
        const firstLine = lines[0].trim();
        const firstLineMatch = firstLine.match(/^(GET|POST|PUT|DELETE|PATCH)\s+(.+)$/i);

        let parsedMethod = 'GET';
        let url = '';
        let startLine = 0;

        if (firstLineMatch) {
            parsedMethod = firstLineMatch[1].toUpperCase();
            url = firstLineMatch[2].trim();
            startLine = 1;
        } else {
            // If no method, assume it's just URL
            url = firstLine;
            startLine = 1;
        }

        // Parse headers and body
        const headers = {};
        let bodyStartIndex = startLine;

        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i].trim();

            // Empty line marks end of headers, start of body
            if (line === '') {
                bodyStartIndex = i + 1;
                break;
            }

            // Parse header: "Key: Value"
            const headerMatch = line.match(/^(.+?):\s*(.+)$/);
            if (headerMatch) {
                headers[headerMatch[1].trim()] = headerMatch[2].trim();
            }
        }

        // Body is everything after empty line
        const body = lines.slice(bodyStartIndex).join('\n').trim();

        return { method: parsedMethod, url, headers, body };
    };

    const sendRequest = async () => {
        const parsed = parseRequest(requestText);
        if (!parsed || !parsed.url) {
            context.window.showErrorMessage("Invalid request format");
            return;
        }

        setLoading(true);
        setResponse(null);

        try {
            const fetchOptions = {
                method: parsed.method,
                headers: parsed.headers || {}
            };

            if (parsed.body && ['POST', 'PUT', 'PATCH'].includes(parsed.method)) {
                fetchOptions.body = parsed.body;
            }

            const res = await fetch(parsed.url, fetchOptions);
            const contentType = res.headers.get('content-type');

            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await res.json();
                setResponse(JSON.stringify(data, null, 2));
            } else {
                data = await res.text();
                setResponse(data);
            }

            context.window.showInformationMessage(`Request ${res.status} ${res.statusText}`);
        } catch (e) {
            setResponse('Error: ' + e.message);
            context.window.showErrorMessage("Request Failed: " + e.message);
        }

        setLoading(false);
    };

    return (
        <div className="h-full flex flex-col bg-[#252526] text-white">
            <div className="p-3 border-b border-[#3c3c3c] bg-[#1e1e1e] flex flex-col gap-2">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#888]">HTTP Request</span>
                    <button
                        onClick={() => setRequestText(`GET https://jsonplaceholder.typicode.com/todos/1`)}
                        className="text-xs text-[#007fd4] hover:underline"
                    >
                        Load Example
                    </button>
                </div>
                <textarea
                    className="bg-[#1e1e1e] text-xs p-2 rounded outline-none text-white border border-[#3c3c3c] focus:border-[#007fd4] font-mono resize-none"
                    value={requestText}
                    onChange={e => setRequestText(e.target.value)}
                    placeholder={`POST https://api.example.com/endpoint\nContent-Type: application/json\n\n{\n  "key": "value"\n}`}
                    rows={8}
                />
                <button
                    onClick={sendRequest}
                    disabled={loading}
                    className="bg-[#007fd4] text-white text-xs py-2 rounded hover:bg-[#006bb3] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? 'Sending...' : <><Play size={12} fill="currentColor" /> Send Request</>}
                </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {response && (
                    <div className="flex-1 overflow-auto p-2">
                        <pre className="text-xs text-[#ce9178] font-mono whitespace-pre-wrap break-all">
                            {response}
                        </pre>
                    </div>
                )}
                {!response && !loading && (
                    <div className="flex-1 flex items-center justify-center text-xs text-gray-500">
                        <div className="text-center">
                            <p>Enter HTTP request above and click Send</p>
                            <p className="mt-2 text-[10px] text-gray-600">Format: METHOD URL</p>
                            <p className="text-[10px] text-gray-600">Headers (Key: Value)</p>
                            <p className="text-[10px] text-gray-600">Empty line, then body</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const activate = (context) => {
    context.registerSidebarPanel(
        'rest-client',
        {
            icon: 'globe',
            label: 'REST Client',
        },
        (props) => <RestPanel context={context} {...props} />
    );

    console.log("REST Client Activated");
};
