import React, { useRef, useEffect, useState } from 'react';
import Editor, { DiffEditor, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { Sparkles, X } from 'lucide-react';
import FindReplace from './FindReplace';

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
  onCloseDiff
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const [showFindReplace, setShowFindReplace] = useState(false);

  // Language Detector
  const getLanguage = (filename) => {
    if (!filename) return 'javascript';
    const ext = filename.split('.').pop().toLowerCase();
    const map = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      css: 'css', html: 'html', json: 'json', md: 'markdown', py: 'python',
      java: 'java', cpp: 'cpp', c: 'c', sql: 'sql', go: 'go', rs: 'rust',
      php: 'php', rb: 'ruby', swift: 'swift', kt: 'kotlin', scala: 'scala',
      sh: 'shell', bash: 'shell', zsh: 'shell', yaml: 'yaml', yml: 'yaml',
      xml: 'xml', svg: 'xml', vue: 'vue', scss: 'scss', sass: 'sass', less: 'less'
    };
    return map[ext] || 'javascript';
  };

  // Theme Definition (Before Mount)
  const handleBeforeMount = (monaco) => {
    monaco.editor.defineTheme('devstudio-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        // Comments - Green Italic
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'comment.line', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'comment.block', foreground: '6A9955', fontStyle: 'italic' },

        // Keywords - Purple/Pink
        { token: 'keyword', foreground: 'C586C0' },
        { token: 'keyword.control', foreground: 'C586C0' },
        { token: 'keyword.operator', foreground: 'C586C0' },
        { token: 'storage', foreground: '569CD6' },
        { token: 'storage.type', foreground: '569CD6' },
        { token: 'storage.modifier', foreground: '569CD6' },

        // Strings - Orange
        { token: 'string', foreground: 'CE9178' },
        { token: 'string.quoted', foreground: 'CE9178' },
        { token: 'string.template', foreground: 'CE9178' },

        // Numbers - Light Green
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'constant.numeric', foreground: 'B5CEA8' },

        // Regex - Red
        { token: 'regexp', foreground: 'D16969' },

        // Types & Classes - Cyan
        { token: 'type', foreground: '4EC9B0' },
        { token: 'class', foreground: '4EC9B0' },
        { token: 'type.identifier', foreground: '4EC9B0' },
        { token: 'entity.name.type', foreground: '4EC9B0' },

        // Functions - Yellow
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'entity.name.function', foreground: 'DCDCAA' },
        { token: 'support.function', foreground: 'DCDCAA' },

        // Variables - Light Blue
        { token: 'variable', foreground: '9CDCFE' },
        { token: 'variable.parameter', foreground: '9CDCFE' },
        { token: 'variable.other', foreground: '9CDCFE' },

        // Operators - Light Gray
        { token: 'operator', foreground: 'D4D4D4' },
        { token: 'punctuation', foreground: 'D4D4D4' },

        // HTML Specific
        { token: 'tag', foreground: '569CD6' },
        { token: 'tag.html', foreground: '569CD6' },
        { token: 'metatag', foreground: '569CD6' },
        { token: 'metatag.content.html', foreground: '9CDCFE' },
        { token: 'metatag.html', foreground: '569CD6' },
        { token: 'attribute.name', foreground: '9CDCFE' },
        { token: 'attribute.name.html', foreground: '9CDCFE' },
        { token: 'attribute.value', foreground: 'CE9178' },
        { token: 'attribute.value.html', foreground: 'CE9178' },
        { token: 'delimiter.html', foreground: '808080' },

        // CSS Specific
        { token: 'selector', foreground: 'D7BA7D' },
        { token: 'attribute.name.css', foreground: '9CDCFE' },
        { token: 'attribute.value.css', foreground: 'CE9178' },
        { token: 'attribute.value.number.css', foreground: 'B5CEA8' },
        { token: 'attribute.value.unit.css', foreground: 'B5CEA8' },

        // JSON
        { token: 'string.key.json', foreground: '9CDCFE' },
        { token: 'string.value.json', foreground: 'CE9178' },

        // Markdown
        { token: 'markup.heading', foreground: '569CD6', fontStyle: 'bold' },
        { token: 'markup.bold', fontStyle: 'bold' },
        { token: 'markup.italic', fontStyle: 'italic' },

        // Misc
        { token: 'delimiter', foreground: '808080' },
        { token: 'delimiter.bracket', foreground: 'FFD700' },
        { token: 'delimiter.parenthesis', foreground: 'DA70D6' },
        { token: 'delimiter.square', foreground: '569CD6' },

        // Constants
        { token: 'constant', foreground: '4FC1FF' },
        { token: 'constant.language', foreground: '569CD6' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editorLineNumber.foreground': '#5a5a5a',
        'editorLineNumber.activeForeground': '#c6c6c6',
        'editorGutter.background': '#1e1e1e',
        'editorGutter.modifiedBackground': '#0c7d9d',
        'editorGutter.addedBackground': '#587c0c',
        'editorGutter.deletedBackground': '#94151b',
        'editor.lineHighlightBackground': '#2a2d2e',
        'editor.lineHighlightBorder': '#282828',
        'editorCursor.foreground': '#aeafad',
        'editorCursor.background': '#000000',
        'editorWhitespace.foreground': '#3e3e42',
        'editorIndentGuide.background': '#404040',
        'editorIndentGuide.activeBackground': '#707070',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
        'editor.selectionHighlightBackground': '#add6ff26',
        'editorBracketMatch.background': '#0064001a',
        'editorBracketMatch.border': '#888888',
      }
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
    monaco.editor.setTheme('devstudio-dark');

    // Validation Listener
    monaco.editor.onDidChangeMarkers(() => {
      const model = editor.getModel();
      if (model) {
        const markers = monaco.editor.getModelMarkers({ resource: model.uri });
        const formattedProblems = markers.map(m => ({
          file: file.name,
          message: m.message,
          line: m.startLineNumber,
          severity: m.severity === 8 ? 'Error' : 'Warning',
          source: m.source || 'TS/JS'
        }));
        if (onValidate) onValidate(formattedProblems);
      }
    });
  };

  // Apply All Settings from Settings Panel
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const editor = editorRef.current;

      editor.updateOptions({
        // Font Settings
        fontSize: settings.fontSize || 14,
        fontFamily: settings.fontFamily || "'Fira Code', Consolas, monospace",
        fontLigatures: true,

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

        // Auto Closing
        autoClosingBrackets: settings.autoClosingBrackets || 'languageDefined',
        autoClosingQuotes: settings.autoClosingQuotes || 'languageDefined',
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

  if (!file) return <div className="flex-1 bg-[#1e1e1e]" />;

  return (
    <div className="flex-1 h-full flex flex-col bg-[#1e1e1e] relative">

      {/* Extension Buttons Toolbar */}
      {extensionButtons && extensionButtons.length > 0 && (
        <div className="bg-[#2d2d2d] border-b border-[#3c3c3c] px-3 py-1 flex items-center gap-2">
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
              className="flex items-center gap-1 px-2 py-1 text-xs text-[#cccccc] hover:bg-[#3c3c3c] rounded transition-colors"
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
      {diffMode && onCloseDiff && (
        <div className="bg-[#2d2d2d] border-b border-[#3c3c3c] px-3 py-2 flex items-center justify-between">
          <div className="text-xs text-[#cccccc]">
            <span className="font-semibold">Comparing:</span> {diffLabel || 'Previous Version'} ↔ Current
          </div>
          <button
            onClick={onCloseDiff}
            className="flex items-center gap-1 px-2 py-1 text-xs text-[#cccccc] hover:bg-[#3c3c3c] rounded transition-colors"
            title="Close Diff View"
          >
            <X size={14} />
            Close Diff
          </button>
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
          theme="devstudio-dark"
          options={{
            readOnly: false,
            renderSideBySide: true,
            fontSize: settings.fontSize || 14,
            fontFamily: settings.fontFamily || "'Fira Code', Consolas, monospace",
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
          theme="devstudio-dark"
          path={file.path}
          beforeMount={handleBeforeMount}
          onMount={handleEditorDidMount}
          onChange={(value) => onContentChange(file.id, value)}
          options={{
            // Font
            fontSize: settings.fontSize || 14,
            fontFamily: settings.fontFamily || "'Fira Code', Consolas, monospace",
            fontLigatures: true,

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

            // Auto Closing
            autoClosingBrackets: settings.autoClosingBrackets || 'languageDefined',
            autoClosingQuotes: settings.autoClosingQuotes || 'languageDefined',

            // Layout
            automaticLayout: true,
            padding: { top: 10 },
            selectOnLineNumbers: true,
            roundedSelection: false,

            // IntelliSense / Autocomplete
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true,
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
