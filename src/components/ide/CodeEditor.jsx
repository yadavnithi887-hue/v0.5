import React, { useRef, useEffect, useState } from 'react';
import Editor, { DiffEditor, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { Sparkles, X, Check, XCircle } from 'lucide-react';
import FindReplace from './FindReplace';
import { defineMonacoThemes, getMonacoThemeName } from '@/lib/ideThemes';

// Configure loader to use the local Monaco instance
loader.config({ monaco });

export default function CodeEditor({
  file,
  onContentChange,
  settings,
  onValidate,
  focusLine,
  focusSeverity,
  extensionButtons = [],
  onExtensionButtonClick,
  onMount,
  // Diff mode props
  diffMode = false,
  originalContent = '',
  diffLabel = '',
  onCloseDiff,
  // AI diff props
  isAiDiff = false,
  onAcceptDiff,
  onRejectDiff
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const [showFindReplace, setShowFindReplace] = useState(false);

  // Language Detector — comprehensive map, defaults to 'plaintext' (NOT 'javascript'!)
  const getLanguage = (filename) => {
    if (!filename) return 'plaintext';
    const lower = String(filename).toLowerCase();
    // Handle dotfiles
    if (lower === '.gitignore' || lower === '.dockerignore' || lower === '.npmignore' || lower === '.eslintignore') return 'plaintext';
    if (lower === '.env' || lower.startsWith('.env.')) return 'ini';
    if (lower === '.editorconfig') return 'ini';
    if (lower === '.babelrc' || lower === '.prettierrc' || lower === '.eslintrc') return 'json';
    if (lower === 'dockerfile') return 'dockerfile';
    if (lower === 'makefile' || lower === 'gnumakefile') return 'plaintext';
    if (lower === 'procfile' || lower === 'gemfile' || lower === 'rakefile') return 'ruby';
    if (lower.endsWith('.d.ts')) return 'typescript';
    const ext = lower.includes('.') ? lower.split('.').pop() : '';
    if (!ext) return 'plaintext';
    const map = {
      // JavaScript / TypeScript
      js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
      ts: 'typescript', tsx: 'typescript', mts: 'typescript', cts: 'typescript',
      // Web
      html: 'html', htm: 'html', xhtml: 'html',
      css: 'css', scss: 'scss', sass: 'scss', less: 'less',
      // Data
      json: 'json', jsonc: 'json', json5: 'json', geojson: 'json',
      yaml: 'yaml', yml: 'yaml',
      xml: 'xml', svg: 'xml', xsl: 'xml', xsd: 'xml',
      toml: 'ini', ini: 'ini', cfg: 'ini', conf: 'ini',
      // Languages
      py: 'python', pyw: 'python', pyx: 'python',
      java: 'java', kt: 'kotlin', scala: 'scala', groovy: 'groovy',
      cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', hxx: 'cpp', hh: 'cpp',
      c: 'c', h: 'c',
      cs: 'csharp',
      go: 'go', rs: 'rust', dart: 'dart', r: 'r',
      rb: 'ruby', erb: 'ruby',
      php: 'php', phtml: 'php',
      swift: 'swift', m: 'objective-c',
      lua: 'lua', pl: 'perl', pm: 'perl',
      sql: 'sql', psql: 'sql',
      sh: 'shell', bash: 'shell', zsh: 'shell', fish: 'shell',
      bat: 'bat', cmd: 'bat', ps1: 'powershell', psm1: 'powershell',
      // Frameworks
      vue: 'html', svelte: 'html', astro: 'html',
      // Text/Docs
      md: 'markdown', mdx: 'markdown', markdown: 'markdown',
      txt: 'plaintext', text: 'plaintext', log: 'plaintext', out: 'plaintext',
      csv: 'plaintext', tsv: 'plaintext',
      // Config
      lock: 'json', npmrc: 'ini', yarnrc: 'yaml', prettierrc: 'json',
      eslintrc: 'json', babelrc: 'json',
      env: 'ini', example: 'plaintext',
      // Other
      graphql: 'graphql', gql: 'graphql',
      proto: 'protobuf',
      tf: 'hcl', hcl: 'hcl',
      dockerfile: 'dockerfile',
    };
    return map[ext] || 'plaintext';
  };

  // Theme + Compiler Defaults (Before Mount)
  const handleBeforeMount = (monacoInstance) => {
    defineMonacoThemes(monacoInstance);

    // Configure TypeScript/JavaScript defaults to reduce false positives
    const tsDefaults = monacoInstance.languages.typescript.typescriptDefaults;
    const jsDefaults = monacoInstance.languages.typescript.javascriptDefaults;

    const sharedOptions = {
      target: monacoInstance.languages.typescript.ScriptTarget.ESNext,
      module: monacoInstance.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monacoInstance.languages.typescript.ModuleResolutionKind.NodeJs,
      jsx: monacoInstance.languages.typescript.JsxEmit.ReactJSX,
      allowJs: true,
      allowNonTsExtensions: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      strict: false,
      noEmit: true,
      skipLibCheck: true,
      isolatedModules: true,
      resolveJsonModule: true,
    };

    tsDefaults.setCompilerOptions(sharedOptions);
    jsDefaults.setCompilerOptions(sharedOptions);

    // Disable eager validation to reduce noise
    tsDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: true,      // hide 'suggestions' like unused vars
    });
    jsDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: true,
    });
  };

  // Monaco Mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Call onMount callback if provided
    if (onMount) onMount(editor);

    // Add Ctrl+F keyboard shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      setShowFindReplace(true);
    });

    // Add Escape to close find/replace
    editor.addCommand(monaco.KeyCode.Escape, () => {
      if (showFindReplace) {
        setShowFindReplace(false);
      }
    });

    // Force theme application
    monaco.editor.setTheme(getMonacoThemeName(settings.ideTheme));

    // Validation Listener — only reports diagnostics for languages that support them
    const DIAGNOSTIC_LANGUAGES = new Set([
      'javascript', 'typescript', 'json', 'css', 'scss', 'less', 'html'
    ]);
    monaco.editor.onDidChangeMarkers(() => {
      const model = editor.getModel();
      if (!model) return;
      const lang = model.getLanguageId();
      // Skip diagnostics for non-diagnostic languages (plaintext, markdown, etc.)
      if (!DIAGNOSTIC_LANGUAGES.has(lang)) {
        if (onValidate) onValidate([]);
        return;
      }
      const markers = monaco.editor.getModelMarkers({ resource: model.uri });
      const formattedProblems = markers.map(m => ({
        file: file.name,
        filePath: file.realPath || file.path || file.id || file.name,
        message: m.message,
        line: m.startLineNumber,
        column: m.startColumn,
        severity: m.severity === 8 ? 'Error' : 'Warning',
        source: m.source || (lang === 'json' ? 'JSON' : lang === 'css' || lang === 'scss' || lang === 'less' ? 'CSS' : lang === 'html' ? 'HTML' : 'TS/JS'),
        code: typeof m.code === 'string' ? m.code : m.code?.value
      }));
      if (onValidate) onValidate(formattedProblems);
    });
  };

  // Apply All Settings from Settings Panel
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const editor = editorRef.current;
      monacoRef.current.editor.setTheme(getMonacoThemeName(settings.ideTheme));

      editor.updateOptions({
        // Font Settings
        fontSize: settings.fontSize || 14,
        fontFamily: settings.fontFamily || "'JetBrains Mono', 'Fira Code', Consolas, monospace",
        fontLigatures: settings.fontLigatures !== false,
        lineHeight: settings.lineHeight || Math.round((settings.fontSize || 14) * 1.6),
        letterSpacing: settings.letterSpacing || 0,

        // Tab Settings
        tabSize: settings.tabSize || 2,
        insertSpaces: settings.insertSpaces !== false,

        // Word Wrap
        wordWrap: settings.wordWrap || 'off',

        // Line Numbers
        lineNumbers: settings.lineNumbers || 'on',

        // Cursor Settings
        cursorBlinking: settings.cursorBlinking || 'smooth',
        cursorStyle: settings.cursorStyle || 'line',
        cursorWidth: settings.cursorWidth || 2,

        // Whitespace
        renderWhitespace: settings.renderWhitespace || 'selection',

        // Scrolling
        smoothScrolling: settings.smoothScrolling !== false,
        mouseWheelZoom: settings.mouseWheelZoom !== false,
        scrollbar: {
          verticalScrollbarSize: settings.scrollbar === 'hidden' ? 0 : 10,
          horizontalScrollbarSize: settings.scrollbar === 'hidden' ? 0 : 10,
          vertical: settings.scrollbar || 'auto',
          horizontal: settings.scrollbar || 'auto',
        },

        // Minimap
        minimap: {
          enabled: settings.minimap !== false,
          side: settings.minimapSide || 'right',
          scale: settings.minimapScale || 1,
          showSlider: settings.minimapShowSlider || 'mouseover',
        },

        // Folding
        folding: settings.folding !== false,
        foldingHighlight: settings.foldingHighlight !== false,

        // Line Highlight
        renderLineHighlight: settings.renderLineHighlight || 'line',

        // Bracket Settings
        bracketPairColorization: { enabled: settings.bracketPairColorization !== false },
        guides: {
          indentation: settings.guidesIndentation !== false,
          bracketPairs: settings.bracketPairColorization !== false,
        },
        matchBrackets: settings.matchBrackets || 'always',

        // Auto Closing
        autoClosingBrackets: settings.autoClosingBrackets || 'languageDefined',
        autoClosingQuotes: settings.autoClosingQuotes || 'languageDefined',
        stickyScroll: { enabled: settings.stickyScroll === true },
        occurrencesHighlight: settings.occurrencesHighlight !== false ? 'singleFile' : 'off',
        links: settings.links !== false,
        inlineSuggest: { enabled: settings.inlineSuggest !== false },
        quickSuggestions: settings.quickSuggestions !== false,
      });
    }
  }, [settings]);

  // Focus Line with Error/Warning Highlighting
  useEffect(() => {
    if (editorRef.current && monacoRef.current && focusLine) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;

      editor.revealLineInCenter(focusLine);
      editor.setPosition({ lineNumber: focusLine, column: 1 });
      editor.focus();

      const decorationClass = focusSeverity === 'Error'
        ? 'error-line-highlight'
        : focusSeverity === 'Warning'
          ? 'warning-line-highlight'
          : 'info-line-highlight';

      decorationsRef.current = editor.deltaDecorations(
        decorationsRef.current,
        [{
          range: new monaco.Range(focusLine, 1, focusLine, 1),
          options: {
            isWholeLine: true,
            className: decorationClass,
            glyphMarginClassName: focusSeverity === 'Error' ? 'error-glyph' : 'warning-glyph',
            overviewRuler: {
              color: focusSeverity === 'Error' ? '#f14c4c' : '#cca700',
              position: monaco.editor.OverviewRulerLane.Full
            }
          }
        }]
      );

      setTimeout(() => {
        if (editorRef.current) {
          decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
        }
      }, 3000);
    }
  }, [focusLine, focusSeverity, file?.id]);

  if (!file) return <div className="flex-1 bg-[var(--ide-bg)]" />;

  return (
    <div className="flex-1 h-full flex flex-col bg-[var(--ide-bg)] relative">

      {/* Extension Buttons Toolbar */}
      {extensionButtons && extensionButtons.length > 0 && (
        <div className="bg-[var(--ide-sidebar)] border-b border-[var(--ide-border)] px-3 py-1 flex items-center gap-2">
          {extensionButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => {
                if (btn.command && onExtensionButtonClick) {
                  onExtensionButtonClick(btn.command);
                } else if (btn.onClick) {
                  try { btn.onClick(); } catch (e) { console.error(e); }
                }
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--ide-fg-secondary)] hover:bg-[var(--ide-activitybar)] rounded transition-colors"
              title={btn.tooltip || btn.label}
            >
              {btn.icon ? (
                <span className="text-sm">{btn.icon}</span>
              ) : (
                <Sparkles size={12} className="text-yellow-400" />
              )}
              <span>{btn.label || btn.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* Diff Mode Header */}
      {diffMode && (onCloseDiff || isAiDiff) && (
        <div className="border-b border-[var(--ide-border)] px-3 py-2 flex items-center justify-between" style={{ background: isAiDiff ? '#1a2233' : 'var(--ide-sidebar)' }}>
          <div className="text-xs text-[var(--ide-fg-secondary)]" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isAiDiff && <Sparkles size={13} style={{ color: '#a78bfa' }} />}
            <span className="font-semibold">{isAiDiff ? 'AI Edit Review:' : 'Comparing:'}</span>
            <span>{diffLabel || 'Original'} ↔ Modified</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isAiDiff && onAcceptDiff && (
              <button
                onClick={onAcceptDiff}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 5, border: 'none', background: '#22c55e', color: '#fff', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#16a34a'}
                onMouseLeave={e => e.currentTarget.style.background = '#22c55e'}
                title="Accept AI changes"
              >
                <Check size={13} /> Accept
              </button>
            )}
            {isAiDiff && onRejectDiff && (
              <button
                onClick={onRejectDiff}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 5, border: 'none', background: '#ef4444', color: '#fff', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
                onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
                title="Reject AI changes and restore original"
              >
                <XCircle size={13} /> Reject
              </button>
            )}
            {!isAiDiff && onCloseDiff && (
              <button
                onClick={onCloseDiff}
                className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--ide-fg-secondary)] hover:bg-[var(--ide-activitybar)] rounded transition-colors"
                title="Close Diff View"
              >
                <X size={14} /> Close Diff
              </button>
            )}
          </div>
        </div>
      )}

      {/* Find/Replace Widget */}
      {showFindReplace && editorRef.current && (
        <FindReplace
          editor={editorRef.current}
          onClose={() => setShowFindReplace(false)}
        />
      )}

      {/* Monaco Editor or DiffEditor */}
      {diffMode ? (
        <DiffEditor
          height="100%"
          width="100%"
          language={getLanguage(file.name)}
          original={originalContent}
          modified={file.content}
          theme={getMonacoThemeName(settings.ideTheme)}
          beforeMount={handleBeforeMount}
          options={{
            readOnly: true,
            renderSideBySide: !isAiDiff,
            fontSize: settings.fontSize || 14,
            fontFamily: settings.fontFamily || "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            lineHeight: settings.lineHeight || Math.round((settings.fontSize || 14) * 1.6),
            fontLigatures: settings.fontLigatures !== false,
            letterSpacing: settings.letterSpacing || 0,
            minimap: { enabled: settings.minimap !== false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderOverviewRuler: true,
            diffWordWrap: settings.wordWrap || 'off',
          }}
          onMount={(editor, monaco) => {
            if (onMount) onMount(editor.getModifiedEditor());
          }}
        />
      ) : (
        <Editor
          height="100%"
          width="100%"
          language={getLanguage(file.name)}
          value={file.content}
          theme={getMonacoThemeName(settings.ideTheme)}
          path={file.path}
          beforeMount={handleBeforeMount}
          onMount={handleEditorDidMount}
          onChange={(value) => onContentChange(file.id, value)}
          options={{
            // Font
            fontSize: settings.fontSize || 14,
            fontFamily: settings.fontFamily || "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            fontLigatures: settings.fontLigatures !== false,
            lineHeight: settings.lineHeight || Math.round((settings.fontSize || 14) * 1.6),
            letterSpacing: settings.letterSpacing || 0,

            // Tab
            tabSize: settings.tabSize || 2,
            insertSpaces: settings.insertSpaces !== false,

            // Word Wrap
            wordWrap: settings.wordWrap || 'off',

            // Line Numbers
            lineNumbers: settings.lineNumbers || 'on',

            // Cursor
            cursorBlinking: settings.cursorBlinking || 'smooth',
            cursorStyle: settings.cursorStyle || 'line',
            cursorWidth: settings.cursorWidth || 2,

            // Whitespace
            renderWhitespace: settings.renderWhitespace || 'selection',

            // Scrolling
            smoothScrolling: settings.smoothScrolling !== false,
            mouseWheelZoom: settings.mouseWheelZoom !== false,
            scrollBeyondLastLine: false,

            // Minimap
            minimap: {
              enabled: settings.minimap !== false,
              side: settings.minimapSide || 'right',
              scale: settings.minimapScale || 1,
              showSlider: settings.minimapShowSlider || 'mouseover',
            },

            // Folding
            folding: settings.folding !== false,
            foldingHighlight: settings.foldingHighlight !== false,

            // Line Highlight
            renderLineHighlight: settings.renderLineHighlight || 'line',

            // Brackets
            bracketPairColorization: { enabled: settings.bracketPairColorization !== false },
            guides: {
              indentation: settings.guidesIndentation !== false,
              bracketPairs: settings.bracketPairColorization !== false,
            },
            matchBrackets: settings.matchBrackets || 'always',

            // Auto Closing
            autoClosingBrackets: settings.autoClosingBrackets || 'languageDefined',
            autoClosingQuotes: settings.autoClosingQuotes || 'languageDefined',
            stickyScroll: { enabled: settings.stickyScroll === true },
            occurrencesHighlight: settings.occurrencesHighlight !== false ? 'singleFile' : 'off',
            links: settings.links !== false,

            // Layout
            automaticLayout: true,
            padding: { top: 10 },
            selectOnLineNumbers: true,
            roundedSelection: false,

            // IntelliSense / Autocomplete
            quickSuggestions: {
              other: settings.quickSuggestions !== false,
              comments: false,
              strings: settings.quickSuggestions !== false,
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            wordBasedSuggestions: 'allDocuments',

            // Parameter Hints
            parameterHints: {
              enabled: true,
              cycle: true,
            },

            // Suggest Settings
            suggest: {
              showMethods: true,
              showFunctions: true,
              showConstructors: true,
              showFields: true,
              showVariables: true,
              showClasses: true,
              showStructs: true,
              showInterfaces: true,
              showModules: true,
              showProperties: true,
              showEvents: true,
              showOperators: true,
              showUnits: true,
              showValues: true,
              showConstants: true,
              showEnums: true,
              showEnumMembers: true,
              showKeywords: true,
              showWords: true,
              showColors: true,
              showFiles: true,
              showReferences: true,
              showFolders: true,
              showTypeParameters: true,
              showSnippets: true,
              insertMode: 'insert',
              filterGraceful: true,
              snippetsPreventQuickSuggestions: false,
              localityBonus: true,
              shareSuggestSelections: true,
              showIcons: true,
              preview: true,
              previewMode: 'subword',
            },

            // Hover Settings
            hover: {
              enabled: true,
              delay: 300,
              sticky: true,
            },

            // Code Actions
            lightbulb: {
              enabled: 'on',
            },
          }}
        />
      )}
    </div>
  );
}
