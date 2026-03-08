import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
            detail: { sessionId: currentSessionId || 'unknown-session', artifactName },
        }));
        return;
    }
    window.dispatchEvent(new CustomEvent('devstudio:open-file-ref', {
        detail: { path: raw },
    }));
}

function childrenText(children) {
    if (children == null) return '';
    if (typeof children === 'string' || typeof children === 'number') return String(children);
    if (Array.isArray(children)) return children.map(childrenText).join('');
    if (children?.props?.children != null) return childrenText(children.props.children);
    return '';
}

const ALERT_CLASS_MAP = {
    NOTE: 'ai-alert-note',
    TIP: 'ai-alert-tip',
    IMPORTANT: 'ai-alert-important',
    WARNING: 'ai-alert-warning',
    CAUTION: 'ai-alert-caution',
};

let mermaidInitialized = false;
let mermaidApiPromise = null;
async function ensureMermaid() {
    if (!mermaidApiPromise) {
        mermaidApiPromise = import('mermaid').then((mod) => mod.default || mod);
    }
    const mermaidApi = await mermaidApiPromise;
    if (mermaidInitialized) return mermaidApi;
    mermaidApi.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        themeVariables: {
            background: '#17181d',
            lineColor: '#d4d7dd',
            textColor: '#eceff7',
            primaryColor: '#202534',
            primaryBorderColor: '#7f8db7',
            primaryTextColor: '#f3f6ff',
            secondaryColor: '#1d202a',
            secondaryBorderColor: '#8a8f9f',
            secondaryTextColor: '#e6e9ef',
            tertiaryColor: '#1a1d24',
            tertiaryBorderColor: '#8a93ab',
            tertiaryTextColor: '#f0f2f8',
        },
        flowchart: {
            curve: 'basis',
            htmlLabels: false,
            useMaxWidth: true,
        },
        sequence: {
            useMaxWidth: true,
            actorFontSize: 15,
            messageFontSize: 14,
        },
    });
    mermaidInitialized = true;
    return mermaidApi;
}

function MermaidBlock({ code }) {
    const [svg, setSvg] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let canceled = false;

        const render = async () => {
            if (!code) return;
            try {
                const mermaidApi = await ensureMermaid();
                const id = `mmd-${Math.random().toString(36).slice(2, 9)}`;
                const result = await mermaidApi.render(id, code);
                if (!canceled) {
                    setSvg(result?.svg || '');
                    setError('');
                }
            } catch (e) {
                if (!canceled) {
                    setSvg('');
                    setError(String(e?.message || 'Failed to render Mermaid'));
                }
            }
        };

        render();
        return () => {
            canceled = true;
        };
    }, [code]);

    return (
        <section className="ai-mermaid-shell">
            <div className="ai-mermaid-head">Mermaid Diagram</div>
            <div className="ai-mermaid-body">
                {svg ? (
                    <div className="ai-mermaid-svg" dangerouslySetInnerHTML={{ __html: svg }} />
                ) : (
                    <pre className="ai-mermaid-fallback">{code}{error ? `\n\n[Mermaid Error] ${error}` : ''}</pre>
                )}
            </div>
        </section>
    );
}

function CodeBlock({ className, children }) {
    const [copied, setCopied] = useState(false);
    const text = String(children || '');
    const language = String(className || '').replace(/^language-/, '') || 'text';
    const isMermaid = language.toLowerCase() === 'mermaid';

    if (isMermaid) return <MermaidBlock code={text.trim()} />;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 900);
        } catch {
            setCopied(false);
        }
    };

    return (
        <section className="ai-code-shell">
            <div className="ai-code-head">
                <span>{language}</span>
                <button type="button" onClick={copy} className="ai-code-copy">{copied ? 'Copied' : 'Copy'}</button>
            </div>
            <pre><code>{text}</code></pre>
        </section>
    );
}

export default function AIReportView({ file }) {
    const content = String(file?.content || '');
    const title = file?.name || 'Artifact';
    const sessionId = String(file?.id || '').split(':')[1] || 'unknown-session';

    // ── Image Preview Mode ──
    const isImagePreview = content.startsWith('__IMAGE_PREVIEW__');
    const [imgIdx, setImgIdx] = useState(0);
    const [imgScale, setImgScale] = useState(1);
    const [imgPos, setImgPos] = useState({ x: 0, y: 0 });
    const [imgDragging, setImgDragging] = useState(false);
    const imgStartRef = React.useRef({ x: 0, y: 0 });

    const imgData = useMemo(() => {
        if (!isImagePreview) return null;
        try {
            return JSON.parse(content.slice('__IMAGE_PREVIEW__'.length));
        } catch { return null; }
    }, [content, isImagePreview]);

    useEffect(() => {
        if (imgData) {
            setImgIdx(imgData.currentIndex || 0);
            setImgScale(1);
            setImgPos({ x: 0, y: 0 });
        }
    }, [imgData]);

    if (isImagePreview && imgData && imgData.images?.length > 0) {
        const imgs = imgData.images;
        const cur = imgs[imgIdx] || imgs[0];
        const resetZoom = () => { setImgScale(1); setImgPos({ x: 0, y: 0 }); };
        const zoomIn = () => setImgScale(s => Math.min(s + 0.25, 5));
        const zoomOut = () => setImgScale(s => Math.max(s - 0.25, 0.25));
        const goPrev = () => { setImgIdx(i => Math.max(0, i - 1)); resetZoom(); };
        const goNext = () => { setImgIdx(i => Math.min(imgs.length - 1, i + 1)); resetZoom(); };

        return (
            <div className="img-preview-root" onWheel={e => {
                if (e.ctrlKey || e.metaKey) { e.preventDefault(); e.deltaY < 0 ? zoomIn() : zoomOut(); }
            }}>
                {/* Toolbar */}
                <div className="img-preview-toolbar">
                    <div className="img-preview-info">
                        <span className="img-preview-name">{cur.name}</span>
                        {imgs.length > 1 && <span className="img-preview-counter">{imgIdx + 1} / {imgs.length}</span>}
                        <span className="img-preview-zoom">{(imgScale * 100).toFixed(0)}%</span>
                    </div>
                    <div className="img-preview-actions">
                        {imgs.length > 1 && (<>
                            <button className="img-preview-btn" disabled={imgIdx === 0} onClick={goPrev} title="Previous">◀</button>
                            <button className="img-preview-btn" disabled={imgIdx === imgs.length - 1} onClick={goNext} title="Next">▶</button>
                            <span className="img-preview-sep" />
                        </>)}
                        <button className="img-preview-btn" onClick={zoomOut} title="Zoom Out">−</button>
                        <button className="img-preview-btn" onClick={resetZoom} title="Fit">⊡</button>
                        <button className="img-preview-btn" onClick={zoomIn} title="Zoom In">+</button>
                    </div>
                </div>

                {/* Image Canvas */}
                <div className="img-preview-canvas"
                    onMouseDown={e => { e.preventDefault(); setImgDragging(true); imgStartRef.current = { x: e.clientX - imgPos.x, y: e.clientY - imgPos.y }; }}
                    onMouseMove={e => { if (imgDragging) setImgPos({ x: e.clientX - imgStartRef.current.x, y: e.clientY - imgStartRef.current.y }); }}
                    onMouseUp={() => setImgDragging(false)}
                    onMouseLeave={() => setImgDragging(false)}
                >
                    <img
                        src={cur.dataUrl}
                        alt={cur.name}
                        className="img-preview-image"
                        draggable={false}
                        style={{
                            transform: `translate(${imgPos.x}px, ${imgPos.y}px) scale(${imgScale})`,
                            transition: imgDragging ? 'none' : 'transform 0.12s ease-out',
                        }}
                    />
                </div>

                <style>{`
                    .img-preview-root { display: flex; flex-direction: column; height: 100%; background: #1a1a1a; overflow: hidden; }
                    .img-preview-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; border-bottom: 1px solid #2e2e2e; background: #252526; flex-shrink: 0; }
                    .img-preview-info { display: flex; align-items: center; gap: 10px; }
                    .img-preview-name { font-size: 13px; font-weight: 600; color: #d4d4d4; }
                    .img-preview-counter { font-size: 11px; color: #888; background: #333; padding: 2px 8px; border-radius: 4px; }
                    .img-preview-zoom { font-size: 11px; color: #666; }
                    .img-preview-actions { display: flex; align-items: center; gap: 4px; }
                    .img-preview-btn { border: 1px solid #3c3c3c; background: #2d2d30; color: #d4d4d4; border-radius: 4px; padding: 4px 10px; font-size: 13px; cursor: pointer; min-width: 28px; text-align: center; }
                    .img-preview-btn:hover { background: #3c3c3c; }
                    .img-preview-btn:disabled { opacity: 0.3; cursor: default; }
                    .img-preview-sep { width: 1px; height: 18px; background: #3c3c3c; margin: 0 6px; }
                    .img-preview-canvas { flex: 1; overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: grab; background: repeating-conic-gradient(#222 0% 25%, #1a1a1a 0% 50%) 50% / 20px 20px; }
                    .img-preview-canvas:active { cursor: grabbing; }
                    .img-preview-image { max-width: 90%; max-height: 90%; object-fit: contain; pointer-events: none; transform-origin: center center; border-radius: 4px; }
                `}</style>
            </div>
        );
    }

    // ── Normal Artifact View ──
    const rendered = autoLinkCommonFiles(content);
    const images = useMemo(() => {
        const found = [];
        const re = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
        let m;
        while ((m = re.exec(content)) !== null) found.push(m[1]);
        return found.slice(0, 16);
    }, [content]);
    const [imageIdx, setImageIdx] = useState(0);

    useEffect(() => {
        setImageIdx(0);
    }, [title, content]);

    return (
        <div className="ai-report-root">
            <div className="ai-report-wrap">
                <div className="ai-report-meta">Artifact Preview</div>
                <h1 className="ai-report-title">{title}</h1>

                {images.length > 0 && (
                    <section className="ai-media-strip">
                        <header className="ai-media-header">
                            <span>Demonstration</span>
                            <span>{imageIdx + 1}/{images.length}</span>
                        </header>
                        <div className="ai-media-stage">
                            <button type="button" disabled={imageIdx <= 0} onClick={() => setImageIdx((v) => Math.max(0, v - 1))} className="ai-media-nav">Previous</button>
                            <img src={images[imageIdx]} alt={`artifact-media-${imageIdx + 1}`} className="ai-media-image" />
                            <button type="button" disabled={imageIdx >= images.length - 1} onClick={() => setImageIdx((v) => Math.min(images.length - 1, v + 1))} className="ai-media-nav">Next</button>
                        </div>
                    </section>
                )}

                <main className="ai-report-markdown">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            a: ({ href, children }) => (
                                <button type="button" onClick={() => openReference(href || '', sessionId)} className="ai-md-link">
                                    {children}
                                </button>
                            ),
                            blockquote: ({ children }) => {
                                const raw = childrenText(children).trim();
                                const match = raw.match(/^\[!([A-Z]+)\]\s*/);
                                if (!match) return <blockquote>{children}</blockquote>;
                                const label = match[1];
                                const className = ALERT_CLASS_MAP[label] || 'ai-alert-note';
                                const plain = raw.replace(/^\[![A-Z]+\]\s*/, '').trim();
                                return (
                                    <section className={`ai-alert ${className}`}>
                                        <div className="ai-alert-title">{label}</div>
                                        <div>{plain}</div>
                                    </section>
                                );
                            },
                            code: ({ className, children, ...props }) => {
                                const maybeInline = props?.inline === true || !className;
                                if (maybeInline) return <code>{children}</code>;
                                return <CodeBlock className={className} children={children} />;
                            },
                        }}
                    >
                        {rendered}
                    </ReactMarkdown>
                </main>
            </div>

            <style>{`
                .ai-report-root {
                    --tone-a: #1e1e1e;
                    --tone-b: #252526;
                    --tone-c: #2d2d30;
                    --border: #3c3c3c;
                    --text-main: #d4d4d4;
                    --text-soft: #bdbdbd;
                    height: 100%;
                    overflow: auto;
                    color: var(--text-main);
                    font-family: "Segoe UI", "Inter", system-ui, sans-serif;
                    background: linear-gradient(180deg, var(--tone-a) 0%, var(--tone-b) 100%);
                }
                .ai-report-wrap {
                    max-width: 1030px;
                    margin: 0 auto;
                    padding: 20px 30px 56px;
                }
                .ai-report-meta {
                    color: var(--text-soft);
                    font-size: 12px;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                }
                .ai-report-title {
                    margin: 0 0 16px;
                    font-size: 41px;
                    line-height: 1.1;
                    font-weight: 620;
                    color: #f3f3f3;
                }
                .ai-report-markdown h1,
                .ai-report-markdown h2,
                .ai-report-markdown h3 {
                    color: #f1f1f1;
                    margin: 1.08em 0 0.45em;
                    font-weight: 620;
                    letter-spacing: 0.01em;
                }
                .ai-report-markdown p,
                .ai-report-markdown li {
                    color: var(--text-main);
                    line-height: 1.74;
                    font-size: 1.02rem;
                }
                .ai-report-markdown ul,
                .ai-report-markdown ol {
                    padding-left: 1.5em;
                }
                .ai-report-markdown hr {
                    border: none;
                    border-top: 1px solid var(--border);
                    margin: 20px 0;
                }
                .ai-report-markdown pre {
                    margin: 0;
                }
                .ai-report-markdown code {
                    background: var(--tone-c);
                    color: #e0e0e0;
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    padding: 1px 6px;
                    font-size: 0.93em;
                    font-family: "Consolas", "SFMono-Regular", monospace;
                }
                .ai-report-markdown blockquote {
                    margin: 12px 0;
                    border-left: 2px solid #7a7a7a;
                    padding: 10px 12px;
                    border-radius: 0 8px 8px 0;
                    background: var(--tone-c);
                }
                .ai-report-markdown table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 16px 0;
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    overflow: hidden;
                }
                .ai-report-markdown th,
                .ai-report-markdown td {
                    border: 1px solid var(--border);
                    text-align: left;
                    padding: 8px 10px;
                }
                .ai-report-markdown th {
                    background: var(--tone-c);
                    color: #f0f0f0;
                    font-weight: 600;
                }
                .ai-report-markdown td {
                    background: var(--tone-b);
                }
                .ai-report-markdown input[type="checkbox"] {
                    accent-color: #bdbdbd;
                    margin-right: 8px;
                    transform: translateY(1px);
                }
                .ai-md-link {
                    border: none;
                    background: none;
                    color: #d4d4d4;
                    padding: 0;
                    cursor: pointer;
                    text-decoration: underline;
                    text-decoration-color: #8a8a8a;
                }
                .ai-alert {
                    margin: 12px 0;
                    border-left: 3px solid;
                    border-radius: 0 10px 10px 0;
                    padding: 10px 12px;
                    background: var(--tone-c);
                }
                .ai-alert-title {
                    font-size: 11px;
                    letter-spacing: 0.08em;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                    font-weight: 700;
                }
                .ai-alert-note { border-color: #8d8d8d; }
                .ai-alert-note .ai-alert-title { color: #d5d5d5; }
                .ai-alert-tip { border-color: #8d8d8d; }
                .ai-alert-tip .ai-alert-title { color: #d5d5d5; }
                .ai-alert-important { border-color: #8d8d8d; }
                .ai-alert-important .ai-alert-title { color: #d5d5d5; }
                .ai-alert-warning { border-color: #8d8d8d; }
                .ai-alert-warning .ai-alert-title { color: #d5d5d5; }
                .ai-alert-caution { border-color: #8d8d8d; }
                .ai-alert-caution .ai-alert-title { color: #d5d5d5; }

                .ai-code-shell {
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    overflow: hidden;
                    background: var(--tone-b);
                    margin: 12px 0;
                }
                .ai-code-head {
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 10px;
                    color: #cdcdcd;
                    border-bottom: 1px solid var(--border);
                    background: var(--tone-c);
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }
                .ai-code-copy {
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    background: var(--tone-b);
                    color: #dfdfdf;
                    padding: 3px 8px;
                    font-size: 11px;
                    cursor: pointer;
                }
                .ai-code-shell pre {
                    overflow: auto;
                    padding: 11px 12px;
                }
                .ai-code-shell pre code {
                    border: none;
                    padding: 0;
                    border-radius: 0;
                    background: transparent;
                    color: #e7e7e7;
                }

                .ai-mermaid-shell {
                    margin: 12px 0;
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    overflow: hidden;
                    background: var(--tone-b);
                }
                .ai-mermaid-head {
                    height: 32px;
                    display: flex;
                    align-items: center;
                    padding: 0 10px;
                    border-bottom: 1px solid var(--border);
                    background: var(--tone-c);
                    color: #d7d7d7;
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }
                .ai-mermaid-body {
                    overflow: auto;
                    padding: 12px;
                    background: var(--tone-b);
                }
                .ai-mermaid-svg svg {
                    width: 100%;
                    height: auto;
                }
                .ai-mermaid-fallback {
                    margin: 0;
                    color: #d9d9d9;
                }

                .ai-media-strip {
                    margin: 6px 0 16px;
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    overflow: hidden;
                    background: var(--tone-b);
                }
                .ai-media-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    height: 34px;
                    padding: 0 10px;
                    border-bottom: 1px solid var(--border);
                    color: #d4d4d4;
                    font-size: 12px;
                    letter-spacing: 0.03em;
                    background: var(--tone-c);
                }
                .ai-media-stage {
                    display: grid;
                    grid-template-columns: auto 1fr auto;
                    gap: 8px;
                    align-items: center;
                    padding: 10px;
                }
                .ai-media-image {
                    width: 100%;
                    max-height: 360px;
                    object-fit: contain;
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    background: var(--tone-a);
                }
                .ai-media-nav {
                    border: 1px solid var(--border);
                    background: var(--tone-c);
                    color: #e2e2e2;
                    border-radius: 8px;
                    font-size: 12px;
                    padding: 7px 10px;
                    min-width: 84px;
                    cursor: pointer;
                }
                .ai-media-nav:disabled {
                    opacity: 0.42;
                    cursor: default;
                }
            `}</style>
        </div>
    );
}
