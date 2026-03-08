const makeRules = (syntax) => ([
  { token: 'comment', foreground: syntax.comment, fontStyle: 'italic' },
  { token: 'keyword', foreground: syntax.keyword },
  { token: 'storage', foreground: syntax.keyword },
  { token: 'string', foreground: syntax.string },
  { token: 'number', foreground: syntax.number },
  { token: 'type', foreground: syntax.type },
  { token: 'function', foreground: syntax.function },
  { token: 'variable', foreground: syntax.variable },
  { token: 'delimiter.bracket', foreground: syntax.bracket },
  { token: 'tag', foreground: syntax.keyword },
  { token: 'attribute.name', foreground: syntax.variable },
  { token: 'attribute.value', foreground: syntax.string }
]);

const createTheme = ({
  id,
  name,
  type = 'dark',
  dataTheme = type === 'light' ? 'light' : type === 'sepia' ? 'sepia' : id,
  ui,
  syntax
}) => ({
  id,
  name,
  type,
  dataTheme,
  vars: {
    '--primary': ui.accent,
    '--primary-gradient': `linear-gradient(135deg, ${ui.accent} 0%, ${ui.highlight} 100%)`,
    '--app-bg-gradient': 'none',
    '--ide-bg': ui.bg,
    '--ide-sidebar': ui.sidebar,
    '--ide-activitybar': ui.activity,
    '--ide-border': ui.border,
    '--ide-fg': ui.fg,
    '--ide-fg-secondary': ui.muted,
    '--ide-accent': ui.accent
  },
  monaco: {
    base: type === 'light' || type === 'sepia' ? 'vs' : 'vs-dark',
    inherit: true,
    rules: makeRules(syntax),
    colors: {
      'editor.background': ui.bg,
      'editor.foreground': ui.editorFg || ui.fg,
      'editorLineNumber.foreground': ui.lineNumber,
      'editorLineNumber.activeForeground': ui.lineNumberActive,
      'editorGutter.background': ui.bg,
      'editor.lineHighlightBackground': ui.lineHighlight,
      'editorCursor.foreground': ui.cursor,
      'editorWhitespace.foreground': ui.whitespace,
      'editorIndentGuide.background': ui.whitespace,
      'editorIndentGuide.activeBackground': ui.lineNumber,
      'editor.selectionBackground': ui.selection,
      'editor.inactiveSelectionBackground': ui.inactiveSelection,
      'editorBracketMatch.background': ui.lineHighlight,
      'editorBracketMatch.border': ui.accent,
      'minimap.background': ui.sidebar,
      'minimap.selectionHighlight': ui.minimapSelection,
      'scrollbarSlider.background': ui.scrollbar,
      'scrollbarSlider.hoverBackground': ui.scrollbarHover,
      'scrollbarSlider.activeBackground': ui.scrollbarActive
    }
  },
  terminal: {
    background: ui.bg,
    foreground: ui.editorFg || ui.fg,
    cursor: ui.cursor,
    cursorAccent: ui.bg,
    selection: ui.selection,
    black: ui.bg,
    red: syntax.keyword,
    green: syntax.function,
    yellow: syntax.string,
    blue: syntax.type,
    magenta: syntax.number,
    cyan: syntax.bracket,
    white: ui.fg
  }
});

export const IDE_THEMES = [
  createTheme({
    id: 'kimbie-dark',
    name: 'Kimbie Dark',
    ui: {
      bg: '#221a0f',
      sidebar: '#2b2217',
      activity: '#18120c',
      border: '#3d2f20',
      fg: '#d3af86',
      muted: '#a57a4c',
      accent: '#f79a32',
      highlight: '#ffcc66',
      editorFg: '#d3af86',
      lineNumber: '#7a6047',
      lineNumberActive: '#f0c674',
      lineHighlight: '#2d2317',
      cursor: '#f79a32',
      whitespace: '#4b3b2a',
      selection: '#4f3d26',
      inactiveSelection: '#3c2d1f',
      minimapSelection: '#f79a3244',
      scrollbar: '#4b3b2a88',
      scrollbarHover: '#6d533988',
      scrollbarActive: '#f79a3288'
    },
    syntax: {
      comment: 'A57A4C',
      keyword: 'F79A32',
      string: 'D6BA7D',
      number: '98676A',
      type: '8ABEB7',
      function: 'A1B56C',
      variable: 'D3AF86',
      bracket: 'F0C674'
    }
  }),
  createTheme({
    id: 'monokai',
    name: 'Monokai',
    ui: {
      bg: '#272822',
      sidebar: '#1f201b',
      activity: '#171814',
      border: '#3e3d32',
      fg: '#f8f8f2',
      muted: '#c8c8bf',
      accent: '#a6e22e',
      highlight: '#66d9ef',
      editorFg: '#f8f8f2',
      lineNumber: '#75715e',
      lineNumberActive: '#f8f8f2',
      lineHighlight: '#3e3d32',
      cursor: '#f8f8f0',
      whitespace: '#49483e',
      selection: '#49483e',
      inactiveSelection: '#3a3a30',
      minimapSelection: '#a6e22e44',
      scrollbar: '#49483e88',
      scrollbarHover: '#75715e88',
      scrollbarActive: '#a6e22e88'
    },
    syntax: {
      comment: '75715E',
      keyword: 'F92672',
      string: 'E6DB74',
      number: 'AE81FF',
      type: '66D9EF',
      function: 'A6E22E',
      variable: 'F8F8F2',
      bracket: 'FD971F'
    }
  }),
  createTheme({
    id: 'monokai-dimmed',
    name: 'Monokai Dimmed',
    ui: {
      bg: '#1f1f1b',
      sidebar: '#191916',
      activity: '#121210',
      border: '#34342f',
      fg: '#f0e8d7',
      muted: '#b2ab9b',
      accent: '#8cc663',
      highlight: '#58c4dd',
      editorFg: '#f0e8d7',
      lineNumber: '#696457',
      lineNumberActive: '#f0e8d7',
      lineHighlight: '#2a2925',
      cursor: '#8cc663',
      whitespace: '#3a3933',
      selection: '#3d3b34',
      inactiveSelection: '#2e2d28',
      minimapSelection: '#8cc66344',
      scrollbar: '#3d3b3488',
      scrollbarHover: '#69645788',
      scrollbarActive: '#8cc66388'
    },
    syntax: {
      comment: '7A7466',
      keyword: 'F56D73',
      string: 'CFCB8F',
      number: 'B49AE5',
      type: '7FB8D6',
      function: '8CC663',
      variable: 'F0E8D7',
      bracket: 'F3C96A'
    }
  }),
  createTheme({
    id: 'red',
    name: 'Red',
    ui: {
      bg: '#3b0000',
      sidebar: '#4a0505',
      activity: '#5b0000',
      border: '#811010',
      fg: '#ffd7d7',
      muted: '#e29b9b',
      accent: '#ff4d4d',
      highlight: '#ffa07a',
      editorFg: '#ffe5e5',
      lineNumber: '#b16969',
      lineNumberActive: '#ffd7d7',
      lineHighlight: '#540808',
      cursor: '#ff8080',
      whitespace: '#6a2323',
      selection: '#7d1b1b',
      inactiveSelection: '#611212',
      minimapSelection: '#ff4d4d44',
      scrollbar: '#7d1b1b88',
      scrollbarHover: '#b2222288',
      scrollbarActive: '#ff4d4d88'
    },
    syntax: {
      comment: 'B16969',
      keyword: 'FF5C57',
      string: 'FFD479',
      number: 'FF9F80',
      type: '7AD0FF',
      function: '7FE089',
      variable: 'FFE5E5',
      bracket: 'FFB347'
    }
  }),
  createTheme({
    id: 'solarized-dark',
    name: 'Solarized Dark',
    ui: {
      bg: '#002b36',
      sidebar: '#073642',
      activity: '#00212b',
      border: '#094352',
      fg: '#839496',
      muted: '#657b83',
      accent: '#268bd2',
      highlight: '#2aa198',
      editorFg: '#93a1a1',
      lineNumber: '#586e75',
      lineNumberActive: '#93a1a1',
      lineHighlight: '#073642',
      cursor: '#d33682',
      whitespace: '#124d5c',
      selection: '#0b5160',
      inactiveSelection: '#073b47',
      minimapSelection: '#268bd244',
      scrollbar: '#0b516088',
      scrollbarHover: '#2aa19888',
      scrollbarActive: '#268bd288'
    },
    syntax: {
      comment: '586E75',
      keyword: '859900',
      string: '2AA198',
      number: 'D33682',
      type: 'B58900',
      function: '268BD2',
      variable: '93A1A1',
      bracket: 'CB4B16'
    }
  }),
  createTheme({
    id: 'synthwave-84',
    name: "SynthWave '84",
    ui: {
      bg: '#241b2f',
      sidebar: '#1d1526',
      activity: '#15101d',
      border: '#4b2a73',
      fg: '#f8f8f2',
      muted: '#c8bce4',
      accent: '#ff7edb',
      highlight: '#36f9f6',
      editorFg: '#f8f8f2',
      lineNumber: '#8a6ea8',
      lineNumberActive: '#ffffff',
      lineHighlight: '#34294f',
      cursor: '#36f9f6',
      whitespace: '#4b3d67',
      selection: '#68438a',
      inactiveSelection: '#4a3166',
      minimapSelection: '#ff7edb44',
      scrollbar: '#68438a88',
      scrollbarHover: '#36f9f688',
      scrollbarActive: '#ff7edb88'
    },
    syntax: {
      comment: '7F7097',
      keyword: 'FF7EDB',
      string: 'F97E72',
      number: 'FFB454',
      type: '36F9F6',
      function: '72F1B8',
      variable: 'F8F8F2',
      bracket: 'FADA5E'
    }
  }),
  createTheme({
    id: 'tokyo-night',
    name: 'Tokyo Night',
    ui: {
      bg: '#1a1b26',
      sidebar: '#16161e',
      activity: '#11111a',
      border: '#2a2f4a',
      fg: '#c0caf5',
      muted: '#7a84a7',
      accent: '#7aa2f7',
      highlight: '#bb9af7',
      editorFg: '#c0caf5',
      lineNumber: '#565f89',
      lineNumberActive: '#c0caf5',
      lineHighlight: '#24283b',
      cursor: '#7aa2f7',
      whitespace: '#2f3549',
      selection: '#283457',
      inactiveSelection: '#202541',
      minimapSelection: '#7aa2f744',
      scrollbar: '#28345788',
      scrollbarHover: '#7aa2f788',
      scrollbarActive: '#bb9af788'
    },
    syntax: {
      comment: '565F89',
      keyword: 'BB9AF7',
      string: '9ECE6A',
      number: 'FF9E64',
      type: '7DCFFF',
      function: '7AA2F7',
      variable: 'C0CAF5',
      bracket: 'E0AF68'
    }
  }),
  createTheme({
    id: 'tokyo-night-storm',
    name: 'Tokyo Night Storm',
    ui: {
      bg: '#24283b',
      sidebar: '#1f2335',
      activity: '#181b2b',
      border: '#30374f',
      fg: '#c0caf5',
      muted: '#8c94b9',
      accent: '#7aa2f7',
      highlight: '#f7768e',
      editorFg: '#d5dcff',
      lineNumber: '#565f89',
      lineNumberActive: '#d5dcff',
      lineHighlight: '#2f334d',
      cursor: '#7aa2f7',
      whitespace: '#39405d',
      selection: '#3b4261',
      inactiveSelection: '#2c3148',
      minimapSelection: '#7aa2f744',
      scrollbar: '#3b426188',
      scrollbarHover: '#7aa2f788',
      scrollbarActive: '#f7768e88'
    },
    syntax: {
      comment: '565F89',
      keyword: 'F7768E',
      string: '9ECE6A',
      number: 'FF9E64',
      type: '7DCFFF',
      function: '7AA2F7',
      variable: 'D5DCFF',
      bracket: 'E0AF68'
    }
  }),
  createTheme({
    id: 'tomorrow-night-blue',
    name: 'Tomorrow Night Blue',
    ui: {
      bg: '#002451',
      sidebar: '#001b3f',
      activity: '#00152f',
      border: '#00346e',
      fg: '#ffffff',
      muted: '#a7bed9',
      accent: '#4dacff',
      highlight: '#99ccff',
      editorFg: '#ffffff',
      lineNumber: '#6f90b4',
      lineNumberActive: '#ffffff',
      lineHighlight: '#00346e',
      cursor: '#ffffff',
      whitespace: '#19436f',
      selection: '#004c99',
      inactiveSelection: '#003a75',
      minimapSelection: '#4dacff44',
      scrollbar: '#004c9988',
      scrollbarHover: '#4dacff88',
      scrollbarActive: '#99ccff88'
    },
    syntax: {
      comment: '7285B7',
      keyword: 'FF9DA4',
      string: 'D1F1A9',
      number: 'FFCC66',
      type: '99FFFF',
      function: 'BBDAFF',
      variable: 'FFFFFF',
      bracket: 'FFD700'
    }
  }),
  createTheme({
    id: 'dark-high-contrast',
    name: 'Dark High Contrast',
    ui: {
      bg: '#000000',
      sidebar: '#0a0a0a',
      activity: '#050505',
      border: '#f0f0f0',
      fg: '#ffffff',
      muted: '#d7d7d7',
      accent: '#ffd700',
      highlight: '#00ffff',
      editorFg: '#ffffff',
      lineNumber: '#d7d7d7',
      lineNumberActive: '#ffffff',
      lineHighlight: '#111111',
      cursor: '#ffffff',
      whitespace: '#3f3f3f',
      selection: '#264f78',
      inactiveSelection: '#1e3a5f',
      minimapSelection: '#ffd70044',
      scrollbar: '#264f7888',
      scrollbarHover: '#00ffff88',
      scrollbarActive: '#ffd70088'
    },
    syntax: {
      comment: 'A0A0A0',
      keyword: 'FFD700',
      string: '00FF00',
      number: 'FF7B72',
      type: '00FFFF',
      function: 'FFFFFF',
      variable: 'FFFFFF',
      bracket: 'FFA500'
    }
  }),
  createTheme({
    id: 'light-high-contrast',
    name: 'Light High Contrast',
    type: 'light',
    ui: {
      bg: '#ffffff',
      sidebar: '#f2f2f2',
      activity: '#e6e6e6',
      border: '#111111',
      fg: '#000000',
      muted: '#333333',
      accent: '#0000ff',
      highlight: '#7a00cc',
      editorFg: '#000000',
      lineNumber: '#444444',
      lineNumberActive: '#000000',
      lineHighlight: '#f7f7f7',
      cursor: '#000000',
      whitespace: '#bbbbbb',
      selection: '#cce8ff',
      inactiveSelection: '#e6f3ff',
      minimapSelection: '#0000ff33',
      scrollbar: '#cce8ff88',
      scrollbarHover: '#0000ff66',
      scrollbarActive: '#7a00cc66'
    },
    syntax: {
      comment: '555555',
      keyword: '0000FF',
      string: '008000',
      number: 'B00020',
      type: '7A00CC',
      function: '795E26',
      variable: '000000',
      bracket: 'C75C00'
    }
  }),
  createTheme({
    id: 'light-visual-studio',
    name: 'Light (Visual Studio)',
    type: 'light',
    ui: {
      bg: '#ffffff',
      sidebar: '#f3f3f3',
      activity: '#ececec',
      border: '#d0d0d0',
      fg: '#1e1e1e',
      muted: '#616161',
      accent: '#007acc',
      highlight: '#005fb8',
      editorFg: '#1e1e1e',
      lineNumber: '#a0a0a0',
      lineNumberActive: '#1e1e1e',
      lineHighlight: '#f8f8f8',
      cursor: '#000000',
      whitespace: '#dddddd',
      selection: '#add6ff',
      inactiveSelection: '#d7ebff',
      minimapSelection: '#007acc33',
      scrollbar: '#add6ff88',
      scrollbarHover: '#007acc66',
      scrollbarActive: '#005fb866'
    },
    syntax: {
      comment: '008000',
      keyword: '0000FF',
      string: 'A31515',
      number: '098658',
      type: '267F99',
      function: '795E26',
      variable: '001080',
      bracket: 'AF00DB'
    }
  }),
  createTheme({
    id: 'light-modern',
    name: 'Light Modern',
    type: 'light',
    ui: {
      bg: '#ffffff',
      sidebar: '#f3f3f3',
      activity: '#e7e7e7',
      border: '#d9d9d9',
      fg: '#1f2328',
      muted: '#57606a',
      accent: '#0078d4',
      highlight: '#4090ff',
      editorFg: '#24292f',
      lineNumber: '#8c959f',
      lineNumberActive: '#57606a',
      lineHighlight: '#f6f8fa',
      cursor: '#0969da',
      whitespace: '#d0d7de',
      selection: '#add6ff',
      inactiveSelection: '#ddf4ff',
      minimapSelection: '#0969da33',
      scrollbar: '#add6ff88',
      scrollbarHover: '#0969da66',
      scrollbarActive: '#4090ff66'
    },
    syntax: {
      comment: '6A737D',
      keyword: 'AF00DB',
      string: '032F62',
      number: '005CC5',
      type: '267F99',
      function: '795E26',
      variable: '24292F',
      bracket: '6F42C1'
    }
  }),
  createTheme({
    id: 'light-plus',
    name: 'Light+',
    type: 'light',
    ui: {
      bg: '#ffffff',
      sidebar: '#f8f8f8',
      activity: '#eeeeee',
      border: '#dddddd',
      fg: '#000000',
      muted: '#616161',
      accent: '#267f99',
      highlight: '#0451a5',
      editorFg: '#000000',
      lineNumber: '#a1a1a1',
      lineNumberActive: '#000000',
      lineHighlight: '#f5f5f5',
      cursor: '#000000',
      whitespace: '#d7d7d7',
      selection: '#add6ff',
      inactiveSelection: '#e5f3ff',
      minimapSelection: '#267f9933',
      scrollbar: '#add6ff88',
      scrollbarHover: '#267f9966',
      scrollbarActive: '#0451a566'
    },
    syntax: {
      comment: '008000',
      keyword: '0000FF',
      string: 'A31515',
      number: '098658',
      type: '267F99',
      function: '795E26',
      variable: '001080',
      bracket: 'AF00DB'
    }
  }),
  createTheme({
    id: 'quiet-light',
    name: 'Quiet Light',
    type: 'light',
    ui: {
      bg: '#f5f5f5',
      sidebar: '#ececec',
      activity: '#e4e4e4',
      border: '#d3d3d3',
      fg: '#333333',
      muted: '#707070',
      accent: '#295f91',
      highlight: '#b85c38',
      editorFg: '#333333',
      lineNumber: '#9a9a9a',
      lineNumberActive: '#333333',
      lineHighlight: '#eeeeee',
      cursor: '#295f91',
      whitespace: '#cfcfcf',
      selection: '#d6e4f0',
      inactiveSelection: '#e7eef4',
      minimapSelection: '#295f9133',
      scrollbar: '#d6e4f088',
      scrollbarHover: '#295f9166',
      scrollbarActive: '#b85c3866'
    },
    syntax: {
      comment: '8C8C8C',
      keyword: 'AF00DB',
      string: '0F7B0F',
      number: 'B85C38',
      type: '295F91',
      function: '795E26',
      variable: '333333',
      bracket: 'B85C38'
    }
  }),
  createTheme({
    id: 'solarized-light',
    name: 'Solarized Light',
    type: 'light',
    ui: {
      bg: '#fdf6e3',
      sidebar: '#f5efdb',
      activity: '#eee8d5',
      border: '#d8ceb8',
      fg: '#657b83',
      muted: '#93a1a1',
      accent: '#268bd2',
      highlight: '#2aa198',
      editorFg: '#586e75',
      lineNumber: '#93a1a1',
      lineNumberActive: '#586e75',
      lineHighlight: '#f7f0dc',
      cursor: '#d33682',
      whitespace: '#ddd4be',
      selection: '#e8ddc3',
      inactiveSelection: '#f3ead3',
      minimapSelection: '#268bd233',
      scrollbar: '#e8ddc388',
      scrollbarHover: '#268bd266',
      scrollbarActive: '#2aa19866'
    },
    syntax: {
      comment: '93A1A1',
      keyword: '859900',
      string: '2AA198',
      number: 'D33682',
      type: 'B58900',
      function: '268BD2',
      variable: '586E75',
      bracket: 'CB4B16'
    }
  }),
  createTheme({
    id: 'tokyo-night-light',
    name: 'Tokyo Night Light',
    type: 'light',
    ui: {
      bg: '#d5d6db',
      sidebar: '#cbccd1',
      activity: '#c1c2c7',
      border: '#b7b9c0',
      fg: '#343b58',
      muted: '#565a6e',
      accent: '#34548a',
      highlight: '#5a4a78',
      editorFg: '#343b58',
      lineNumber: '#8c909f',
      lineNumberActive: '#343b58',
      lineHighlight: '#d0d2d8',
      cursor: '#34548a',
      whitespace: '#b6b9c2',
      selection: '#b9c7e4',
      inactiveSelection: '#cfd6e4',
      minimapSelection: '#34548a33',
      scrollbar: '#b9c7e488',
      scrollbarHover: '#34548a66',
      scrollbarActive: '#5a4a7866'
    },
    syntax: {
      comment: '848CB5',
      keyword: '5A4A78',
      string: '587539',
      number: '965027',
      type: '0F4B6E',
      function: '34548A',
      variable: '343B58',
      bracket: '8F5E15'
    }
  }),
  createTheme({
    id: 'abyss',
    name: 'Abyss',
    ui: {
      bg: '#000c18',
      sidebar: '#00111f',
      activity: '#000a12',
      border: '#002540',
      fg: '#cdd6f4',
      muted: '#6c7b95',
      accent: '#0090ff',
      highlight: '#00bcff',
      editorFg: '#cdd6f4',
      lineNumber: '#3d5168',
      lineNumberActive: '#cdd6f4',
      lineHighlight: '#001626',
      cursor: '#00bcff',
      whitespace: '#173149',
      selection: '#073655',
      inactiveSelection: '#052842',
      minimapSelection: '#0090ff44',
      scrollbar: '#07365588',
      scrollbarHover: '#0090ff88',
      scrollbarActive: '#00bcff88'
    },
    syntax: {
      comment: '4B6479',
      keyword: '00AFFF',
      string: 'C3E88D',
      number: 'F78C6C',
      type: '89DDFF',
      function: '82AAFF',
      variable: 'CDD6F4',
      bracket: 'FFCB6B'
    }
  }),
  createTheme({
    id: 'dark-visual-studio',
    name: 'Dark (Visual Studio)',
    ui: {
      bg: '#1e1e1e',
      sidebar: '#252526',
      activity: '#2d2d30',
      border: '#3c3c3c',
      fg: '#d4d4d4',
      muted: '#a6a6a6',
      accent: '#007acc',
      highlight: '#4fc1ff',
      editorFg: '#d4d4d4',
      lineNumber: '#858585',
      lineNumberActive: '#c6c6c6',
      lineHighlight: '#2a2d2e',
      cursor: '#aeafad',
      whitespace: '#3e3e42',
      selection: '#264f78',
      inactiveSelection: '#3a3d41',
      minimapSelection: '#007acc44',
      scrollbar: '#264f7888',
      scrollbarHover: '#007acc88',
      scrollbarActive: '#4fc1ff88'
    },
    syntax: {
      comment: '6A9955',
      keyword: '569CD6',
      string: 'CE9178',
      number: 'B5CEA8',
      type: '4EC9B0',
      function: 'DCDCAA',
      variable: '9CDCFE',
      bracket: 'FFD700'
    }
  }),
  createTheme({
    id: 'dark-modern',
    name: 'Dark Modern',
    ui: {
      bg: '#181818',
      sidebar: '#1f1f1f',
      activity: '#252526',
      border: '#313131',
      fg: '#e6e6e6',
      muted: '#b0b0b0',
      accent: '#4f8cff',
      highlight: '#7c8dff',
      editorFg: '#e6e6e6',
      lineNumber: '#6b7280',
      lineNumberActive: '#e6e6e6',
      lineHighlight: '#232323',
      cursor: '#4f8cff',
      whitespace: '#303030',
      selection: '#2e3a59',
      inactiveSelection: '#252e46',
      minimapSelection: '#4f8cff44',
      scrollbar: '#2e3a5988',
      scrollbarHover: '#4f8cff88',
      scrollbarActive: '#7c8dff88'
    },
    syntax: {
      comment: '7E8294',
      keyword: '7C8DFF',
      string: 'D7BA7D',
      number: 'FF9671',
      type: '4EC9B0',
      function: '4F8CFF',
      variable: 'E6E6E6',
      bracket: 'C586C0'
    }
  }),
  createTheme({
    id: 'dark-plus',
    name: 'Dark+',
    ui: {
      bg: '#1e1e1e',
      sidebar: '#252526',
      activity: '#333333',
      border: '#3c3c3c',
      fg: '#ffffff',
      muted: '#cccccc',
      accent: '#007fd4',
      highlight: '#4fc1ff',
      editorFg: '#d4d4d4',
      lineNumber: '#5a5a5a',
      lineNumberActive: '#c6c6c6',
      lineHighlight: '#2a2d2e',
      cursor: '#aeafad',
      whitespace: '#3e3e42',
      selection: '#264f78',
      inactiveSelection: '#3a3d41',
      minimapSelection: '#818cf84d',
      scrollbar: '#264f7888',
      scrollbarHover: '#007fd488',
      scrollbarActive: '#4fc1ff88'
    },
    syntax: {
      comment: '6A9955',
      keyword: 'C586C0',
      string: 'CE9178',
      number: 'B5CEA8',
      type: '4EC9B0',
      function: 'DCDCAA',
      variable: '9CDCFE',
      bracket: '818CF8'
    }
  }),
  createTheme({
    id: 'sepia',
    name: 'Sepia',
    type: 'sepia',
    dataTheme: 'sepia',
    ui: {
      bg: '#f4ecd8',
      sidebar: '#efe7d2',
      activity: '#e3dac1',
      border: '#d0c3aa',
      fg: '#5b4636',
      muted: '#7d6a58',
      accent: '#b85c38',
      highlight: '#c97b5b',
      editorFg: '#5b4636',
      lineNumber: '#b8aa91',
      lineNumberActive: '#7d6a58',
      lineHighlight: '#eee3c9',
      cursor: '#b85c38',
      whitespace: '#d0c3aa',
      selection: '#d8b48c66',
      inactiveSelection: '#e8d7bd',
      minimapSelection: '#b85c3833',
      scrollbar: '#d8b48c88',
      scrollbarHover: '#b85c3866',
      scrollbarActive: '#c97b5b66'
    },
    syntax: {
      comment: '8A7A63',
      keyword: '9A3412',
      string: '7C2D12',
      number: 'B45309',
      type: '92400E',
      function: '78350F',
      variable: '5B4636',
      bracket: 'B85C38'
    }
  })
];

export const DEFAULT_IDE_THEME_ID = 'dark-modern';

export function getIdeTheme(themeId) {
  return IDE_THEMES.find((theme) => theme.id === themeId) || IDE_THEMES.find((theme) => theme.id === DEFAULT_IDE_THEME_ID) || IDE_THEMES[0];
}

export function getMonacoThemeName(themeId) {
  return `devstudio-${getIdeTheme(themeId).id}`;
}

export function defineMonacoThemes(monaco) {
  IDE_THEMES.forEach((theme) => {
    monaco.editor.defineTheme(getMonacoThemeName(theme.id), theme.monaco);
  });
}

export function applyIdeTheme(themeId, { save = true } = {}) {
  const theme = getIdeTheme(themeId);
  const root = document.documentElement;

  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  root.dataset.theme = theme.type === 'light' ? 'light' : theme.type === 'sepia' ? 'sepia' : theme.id;
  root.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
  root.classList.add(theme.type === 'light' ? 'theme-light' : theme.type === 'sepia' ? 'theme-sepia' : 'theme-dark');

  if (save) {
    localStorage.setItem('devstudio-theme', theme.id);
  }

  return theme;
}
