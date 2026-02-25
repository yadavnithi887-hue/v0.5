import React from 'react';
import ReactMarkdown from 'react-markdown';

function autoLinkCommonFiles(text) {
    const src = String(text || '');
    const re = /\b([A-Za-z0-9_\-./\\]+\.(?:html|css|js|jsx|ts|tsx|json|md|txt|yml|yaml|xml|svg|png|jpg|jpeg|gif|py|java|go|rs|php|c|cpp|h|hpp|sql|sh|bat|ps1))\b/g;
    return src.replace(re, '[`$1`]($1)');
}

function openReference(href, currentSessionId) {
    const raw = String(href || '').trim();
    if (!raw) return;
    if (/^artifact:\/\//i.test(raw)) {
        const artifactName = decodeURIComponent(raw.replace(/^artifact:\/\//i, '').split('?')[0] || '');
        if (!artifactName) return;
        window.dispatchEvent(new CustomEvent('devstudio:open-ai-artifact', {
            detail: { sessionId: currentSessionId || 'unknown-session', artifactName }
        }));
        return;
    }
    window.dispatchEvent(new CustomEvent('devstudio:open-file-ref', {
        detail: { path: raw }
    }));
}

export default function AIReportView({ file }) {
    const content = String(file?.content || '');
    const title = file?.name || 'Artifact';
    const sessionId = String(file?.id || '').split(':')[1] || 'unknown-session';
    const rendered = autoLinkCommonFiles(content);

    return (
        <div style={{ height: '100%', overflow: 'auto', background: 'radial-gradient(1200px 500px at 20% -10%, rgba(125,179,255,0.12), transparent), #0f1116', color: '#d4d4d4', fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif' }}>
            <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px 28px 44px' }}>
                <div style={{ marginBottom: 12, color: '#9fb5d6', fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase' }}>Artifact Preview</div>
                <h1 style={{ margin: 0, marginBottom: 18, fontSize: 30, lineHeight: 1.15, color: '#f3f7ff', fontFamily: '"Space Grotesk", "Segoe UI", sans-serif' }}>{title}</h1>
                <div style={{ border: '1px solid rgba(125,179,255,0.22)', borderRadius: 12, background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))', padding: 20, boxShadow: '0 14px 35px rgba(0,0,0,0.35)' }}>
                    <div className="ai-report-markdown">
                        <ReactMarkdown
                            components={{
                                a: ({ href, children }) => (
                                    <button
                                        type="button"
                                        onClick={() => openReference(href || '', sessionId)}
                                        style={{ border: 'none', background: 'none', color: '#8bc3ff', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                                    >
                                        {children}
                                    </button>
                                ),
                                code: ({ className, children }) => {
                                    const text = String(children || '');
                                    const isMermaid = String(className || '').includes('language-mermaid');
                                    if (isMermaid) {
                                        return (
                                            <div className="ai-mermaid-block">
                                                <div className="ai-mermaid-header">Mermaid Diagram</div>
                                                <pre>{text}</pre>
                                            </div>
                                        );
                                    }
                                    return <code className={className}>{children}</code>;
                                }
                            }}
                        >
                            {rendered}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
            <style>{`
                .ai-report-markdown h1, .ai-report-markdown h2, .ai-report-markdown h3 {
                    color: #ecf3ff;
                    margin-top: 1.05em;
                    margin-bottom: 0.5em;
                    font-family: "Space Grotesk", "Segoe UI", sans-serif;
                }
                .ai-report-markdown p, .ai-report-markdown li {
                    line-height: 1.8;
                    color: #ccd6e7;
                }
                .ai-report-markdown pre {
                    background: #141821;
                    border: 1px solid rgba(125,179,255,0.18);
                    border-radius: 8px;
                    padding: 11px 12px;
                    overflow: auto;
                }
                .ai-report-markdown code {
                    background: rgba(125,179,255,0.16);
                    color: #d9eaff;
                    padding: 2px 6px;
                    border-radius: 5px;
                }
                .ai-report-markdown pre code {
                    background: transparent;
                    padding: 0;
                    border-radius: 0;
                    color: #d7dfed;
                }
                .ai-report-markdown blockquote {
                    margin: 12px 0;
                    border-left: 3px solid rgba(125,179,255,0.45);
                    padding: 8px 12px;
                    background: rgba(125,179,255,0.08);
                    border-radius: 0 8px 8px 0;
                }
                .ai-report-markdown table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 12px 0;
                }
                .ai-report-markdown th, .ai-report-markdown td {
                    border: 1px solid rgba(255,255,255,0.12);
                    padding: 8px 10px;
                    text-align: left;
                }
                .ai-mermaid-block {
                    margin: 10px 0;
                    border: 1px solid rgba(125,179,255,0.24);
                    border-radius: 10px;
                    overflow: hidden;
                    background: #111723;
                }
                .ai-mermaid-header {
                    font-size: 11px;
                    letter-spacing: 0.2px;
                    color: #9ec8ff;
                    background: rgba(125,179,255,0.1);
                    padding: 6px 10px;
                }
            `}</style>
        </div>
    );
}
