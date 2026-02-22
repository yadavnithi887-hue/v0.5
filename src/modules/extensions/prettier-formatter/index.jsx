// File: src/modules/extensions/prettier-formatter/index.jsx

export const metadata = {
  id: 'devstudio.prettier-formatter',
  name: 'Prettier Code Formatter',
  version: '1.1.0',
  description: 'Auto-format your code using Prettier with customizable options.',
  author: 'DevStudio Team',
  icon: 'Zap',
  readme: `
# Prettier Formatter Extension

## Features
- ✨ Format code with Prettier
- 🎨 Support for multiple languages
- ⚙️ Customizable formatting options
- ⌨️ Keyboard shortcut (Ctrl+Shift+F)
- 🔘 Editor toolbar button

## Supported Languages
- JavaScript/TypeScript
- HTML/CSS
- JSON
- Markdown
- And more...

## Usage
1. Open any supported file
2. Click the "Format" button in the editor toolbar
3. Or press Ctrl+Shift+F (Cmd+Shift+F on Mac)

## Configuration
Customize formatting options in Settings > Extensions > Prettier
  `
};

export const settings = [
  {
    id: 'prettier.tabWidth',
    label: 'Tab Width',
    type: 'number',
    default: 2,
    description: 'Number of spaces per indentation level',
    section: 'extensions',
    extensionId: metadata.id
  },
  {
    id: 'prettier.useTabs',
    label: 'Use Tabs',
    type: 'toggle',
    default: false,
    description: 'Use tabs instead of spaces',
    section: 'extensions',
    extensionId: metadata.id
  },
  {
    id: 'prettier.semi',
    label: 'Semicolons',
    type: 'toggle',
    default: true,
    description: 'Add semicolons at the end of statements',
    section: 'extensions',
    extensionId: metadata.id
  },
  {
    id: 'prettier.singleQuote',
    label: 'Single Quotes',
    type: 'toggle',
    default: true,
    description: 'Use single quotes instead of double quotes',
    section: 'extensions',
    extensionId: metadata.id
  }
];

export function activate(context) {
  console.log('✨ Prettier: Activating...');

  context.registerCommand('prettier.format', async () => {
    console.log('✨ Prettier: Formatting code...');

    if (!window.electronAPI || !window.electronAPI.formatWithPrettier) {
      context.window.showErrorMessage('Prettier not available (Electron API missing)');
      return;
    }

    const activeFile = getActiveFile();

    if (!activeFile || !activeFile.content) {
      context.window.showWarningMessage('No file is currently open or file is empty');
      return;
    }

    context.window.showInformationMessage('Formatting code...');

    try {
      const settings = context.getSettings();

      const result = await window.electronAPI.formatWithPrettier({
        code: activeFile.content,
        filePath: activeFile.realPath || activeFile.path || activeFile.name,
        options: {
          tabWidth: settings['prettier.tabWidth'] || 2,
          useTabs: settings['prettier.useTabs'] || false,
          semi: settings['prettier.semi'] !== false,
          singleQuote: settings['prettier.singleQuote'] !== false,
          trailingComma: 'es5',
          printWidth: 80
        }
      });

      if (result.success) {
        updateEditorContent(result.formatted);
        context.window.showInformationMessage('✅ Code formatted successfully!');
      } else {
        context.window.showErrorMessage(`❌ Format failed: ${result.error}`);
        console.error('Prettier error:', result.error);
      }
    } catch (err) {
      console.error('Prettier error:', err);
      context.window.showErrorMessage('Format error: ' + err.message);
    }
  });

  context.window.registerEditorButton({
    id: 'prettier.formatButton',
    label: 'Format',
    icon: '✨',
    tooltip: 'Format document with Prettier (Ctrl+Shift+F)',
    command: 'prettier.format',
    position: 'right'
  });

  registerKeyboardShortcut();

  console.log('✅ Prettier Extension Activated!');
}

function getActiveFile() {
  if (window.__activeFile) {
    return window.__activeFile;
  }

  try {
    const editor = window.monaco?.editor?.getModels?.()?.[0];
    if (editor) {
      return {
        content: editor.getValue(),
        path: editor.uri?.path || 'untitled.js',
        name: editor.uri?.path?.split('/').pop() || 'untitled.js'
      };
    }
  } catch (e) {
    console.error('Error getting active file:', e);
  }

  return null;
}

function updateEditorContent(newContent) {
  window.dispatchEvent(new CustomEvent('prettier:formatted', {
    detail: { content: newContent }
  }));

  try {
    const editor = window.monaco?.editor?.getModels?.()?.[0];
    if (editor) {
      editor.setValue(newContent);
    }
  } catch (e) {
    console.error('Error updating editor:', e);
  }
}

function registerKeyboardShortcut() {
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      if (window.registry) {
        window.registry.executeCommand('prettier.format');
      }
    }
  });
}

export function deactivate() {
  console.log('✨ Prettier Extension Deactivated');
}