// src/lib/fileIcons.js

// Base URL for Material Icon Theme (Official CDN)
const CDN_URL = "https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons";
const ICONIFY_VSCODE_URL = "https://api.iconify.design/vscode-icons";
const ICONIFY_MDI_URL = "https://api.iconify.design/mdi";
const ICONIFY_CARBON_URL = "https://api.iconify.design/carbon";

// ── No Fallback SVGs: Using empty transparent space during load ──
// The user prefers the aesthetic of the original icons, so we don't display inline SVGs.
const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

// ── In-Memory Icon Cache ──
// Once an icon is successfully fetched, store the blob data-URL for instant future use.
export const iconCache = new Map();
const fetchingSet = new Set(); // Prevent duplicate fetches
const cacheListeners = new Map(); // Notify components when cache is updated

function notifyCacheListeners(url) {
  const listeners = cacheListeners.get(url);
  if (listeners) {
    listeners.forEach(fn => fn());
  }
}

export function subscribeCacheUpdate(url, callback) {
  if (!cacheListeners.has(url)) {
    cacheListeners.set(url, new Set());
  }
  cacheListeners.get(url).add(callback);
  return () => {
    const s = cacheListeners.get(url);
    if (s) {
      s.delete(callback);
      if (s.size === 0) cacheListeners.delete(url);
    }
  };
}

export async function fetchAndCacheIcon(url) {
  if (iconCache.has(url) || fetchingSet.has(url)) return;
  fetchingSet.add(url);
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const dataUrl = URL.createObjectURL(blob);
    iconCache.set(url, dataUrl);
    notifyCacheListeners(url);
  } catch {
    // Failed to fetch — fallback stays visible, no layout shift
    iconCache.set(url, null); // Mark as checked so we don't retry endlessly
  } finally {
    fetchingSet.delete(url);
  }
}

// 1. EXACT FILE NAMES (Highest Priority)
const fileNames = {
  'package.json': 'nodejs',
  'package-lock.json': 'nodejs',
  'yarn.lock': 'yarn',
  'pnpm-lock.yaml': 'pnpm',
  'tsconfig.json': 'tsconfig',
  'jsconfig.json': 'jsconfig',
  '.gitignore': 'git',
  '.gitattributes': 'git',
  '.env': 'tune',
  '.env.example': 'tune',
  'readme.md': 'readme',
  'license': 'license',
  'license.txt': 'license',
  'dockerfile': 'docker',
  'docker-compose.yml': 'docker',
  'makefile': 'makefile',
  'robots.txt': 'robots',
  'vite.config.js': 'vite',
  'vite.config.ts': 'vite',
  'tailwind.config.js': 'tailwindcss',
  'tailwind.config.ts': 'tailwindcss',
  'next.config.js': 'next',
  'vercel.json': 'vercel',
  'netlify.toml': 'netlify',
  'index.html': 'html',
  'favicon.ico': 'favicon',
  'cargo.toml': 'rust',
  'cargo.lock': 'rust',
  'gemfile': 'ruby',
  'gemfile.lock': 'ruby',
  'rakefile': 'ruby',
  'go.mod': 'go',
  'go.sum': 'go',
  'requirements.txt': 'python',
  'pipfile': 'python',
  'poetry.lock': 'python',
  'cmakelists.txt': 'cmake',
  'webpack.config.js': 'webpack',
  'rollup.config.js': 'rollup',
  '.eslintrc': 'eslint',
  '.prettierrc': 'prettier',
  '.babelrc': 'babel',
  'jest.config.js': 'jest',
};

// 2. EXTENSIONS (Medium Priority)
const fileExtensions = {
  // Web Technologies
  html: 'html', htm: 'html', xhtml: 'html',
  css: 'css', scss: 'sass', sass: 'sass', less: 'less', styl: 'stylus',
  js: 'javascript', cjs: 'javascript', mjs: 'javascript',
  jsx: 'react', tsx: 'react_ts',
  ts: 'typescript', 'd.ts': 'typescript-def',
  json: 'json', jsonc: 'json', json5: 'json',
  xml: 'xml', svg: 'svg',

  // Systems Programming
  c: 'c', h: 'c',
  cpp: 'cpp', cc: 'cpp', cxx: 'cpp', 'c++': 'cpp', hpp: 'cpp', hh: 'cpp', hxx: 'cpp',
  cs: 'csharp', csx: 'csharp',
  go: 'go',
  rs: 'rust', rlib: 'rust',
  zig: 'zig',
  nim: 'nim',
  v: 'vlang',

  // Object-Oriented Languages
  java: 'java', class: 'java', jar: 'java',
  kt: 'kotlin', kts: 'kotlin',
  scala: 'scala', sc: 'scala',
  groovy: 'groovy', gvy: 'groovy',

  // Scripting Languages
  py: 'python', pyw: 'python', pyc: 'python', pyi: 'python',
  rb: 'ruby', erb: 'ruby', rake: 'ruby',
  php: 'php', phtml: 'php',
  pl: 'perl', pm: 'perl',
  lua: 'lua',
  tcl: 'tcl',

  // Functional Languages
  hs: 'haskell', lhs: 'haskell',
  ml: 'ocaml', mli: 'ocaml',
  fs: 'fsharp', fsx: 'fsharp', fsi: 'fsharp',
  clj: 'clojure', cljs: 'clojure', cljc: 'clojure', edn: 'clojure',
  erl: 'erlang', hrl: 'erlang',
  ex: 'elixir', exs: 'elixir',
  elm: 'elm',
  purs: 'purescript',

  // JVM Languages
  jl: 'julia',

  // Mobile Development
  swift: 'swift',
  dart: 'dart',

  // Data Science & Statistics
  r: 'r', rmd: 'r',
  mat: 'matlab', m: 'matlab',

  // Shell & Scripting
  sh: 'console', bash: 'console', zsh: 'console', fish: 'console',
  bat: 'console', cmd: 'console',
  ps1: 'powershell', psm1: 'powershell', psd1: 'powershell',

  // Assembly & Low-Level
  asm: 'assembly', s: 'assembly', inc: 'assembly', nasm: 'assembly',

  // Other Systems Languages
  ada: 'ada', adb: 'ada', ads: 'ada',
  d: 'd',
  pas: 'pascal', pp: 'pascal',
  for: 'fortran', f90: 'fortran', f95: 'fortran',
  cob: 'cobol', cbl: 'cobol',

  // Automation & Scripting
  ahk: 'autohotkey',
  au3: 'autoit',

  // Game Development
  gd: 'godot', gdscript: 'godot',
  unity: 'unity',

  // Web Assembly
  wasm: 'wasm', wat: 'wasm',

  // Query Languages
  sql: 'database', mysql: 'database', pgsql: 'database',
  graphql: 'graphql', gql: 'graphql',

  // Markup & Documentation
  md: 'markdown', mdown: 'markdown', markdown: 'markdown',
  tex: 'tex', latex: 'tex',
  rst: 'rst', adoc: 'asciidoc',

  // Config & Data
  yaml: 'yaml', yml: 'yaml',
  toml: 'toml',
  ini: 'settings', conf: 'settings', cfg: 'settings', properties: 'settings',
  env: 'tune',

  // Database
  db: 'database', sqlite: 'database', sqlite3: 'database',
  mdb: 'database',

  // Infrastructure as Code
  tf: 'terraform', tfvars: 'terraform',

  // Frontend Frameworks
  vue: 'vue',
  svelte: 'svelte',
  astro: 'astro',

  // Build Tools
  cmake: 'cmake',
  gradle: 'gradle',

  // Media Files
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', ico: 'image',
  webp: 'image', bmp: 'image', tiff: 'image', tif: 'image',
  pdf: 'pdf',

  // Archives
  zip: 'zip', rar: 'zip', '7z': 'zip', tar: 'zip', gz: 'zip',
  bz2: 'zip', xz: 'zip',

  // Executables & Libraries
  exe: 'exe', msi: 'exe', app: 'exe',
  dll: 'lib', so: 'lib', dylib: 'lib', a: 'lib',

  // Fonts
  ttf: 'font', otf: 'font', woff: 'font', woff2: 'font', eot: 'font',

  // Certificates & Security
  pem: 'lock', key: 'lock', crt: 'certificate', cer: 'certificate',

  // Other
  proto: 'protobuf',
  thrift: 'thrift',
  avro: 'avro',
  prisma: 'prisma',

  // Cloud & DevOps
  dockerfile: 'docker',
  k8s: 'kubernetes',

  // Audio/Video (if needed)
  mp3: 'audio', wav: 'audio', ogg: 'audio', flac: 'audio',
  mp4: 'video', avi: 'video', mov: 'video', mkv: 'video',
};

// 3. FOLDERS (Specific names)
const folderNames = {
  src: 'src',
  source: 'src',
  dist: 'dist', build: 'dist', out: 'dist', output: 'dist',
  public: 'public', www: 'public', static: 'public',
  assets: 'assets', images: 'images', img: 'images',
  components: 'components', widgets: 'components',
  api: 'api', rest: 'api',
  services: 'services',
  utils: 'utils', tools: 'tools', helpers: 'helper',
  lib: 'lib', libs: 'lib', libraries: 'lib',
  hooks: 'hook',
  styles: 'style', css: 'style', scss: 'style',
  layouts: 'layout',
  routes: 'routes', router: 'routes', routing: 'routes',
  views: 'views', pages: 'views', screens: 'views',
  controllers: 'controller', ctrl: 'controller',
  models: 'model', entities: 'model', schemas: 'model',
  types: 'typescript', interfaces: 'interface',
  test: 'test', tests: 'test', __tests__: 'test', spec: 'test',
  scripts: 'script',
  node_modules: 'node',
  electron: 'electron',
  config: 'config', configuration: 'config', settings: 'config',
  auth: 'secure', security: 'secure', authentication: 'secure',
  server: 'server', backend: 'server',
  client: 'client', frontend: 'client',
  db: 'database', database: 'database', sql: 'database', migrations: 'database',
  logs: 'log', log: 'log',
  temp: 'temp', tmp: 'temp', cache: 'temp',
  include: 'include', includes: 'include',
  docs: 'docs', documentation: 'docs', doc: 'docs',
  examples: 'examples', demos: 'examples',
  '.git': 'git',
  '.github': 'github',
  '.vscode': 'vscode',
  '.idea': 'intellij',
  'docker': 'docker',
  'kubernetes': 'kubernetes',
  'terraform': 'terraform',
  'middleware': 'middleware',
  'plugins': 'plugin',
  'extensions': 'plugin',
  'vendors': 'lib',
  'packages': 'package',
};

const resolveIconName = (filename, isFolder, isOpen) => {
  const name = filename.toLowerCase();
  const parts = name.split('.');
  const ext = parts.pop();
  const ext2 = parts.length > 0 ? `${parts.pop()}.${ext}` : null; // e.g., .d.ts, .test.js

  let iconName = 'file';

  if (isFolder) {
    // Folder logic
    if (folderNames[name]) {
      iconName = `folder-${folderNames[name]}`;
    } else {
      iconName = 'folder';
    }
    if (isOpen) iconName += '-open';
  } else {
    // File Logic
    // 1. Exact Match (package.json)
    if (fileNames[name]) {
      iconName = fileNames[name];
    }
    // 2. Double Extension Match (.d.ts, .test.js)
    else if (ext2 && fileExtensions[ext2]) {
      iconName = fileExtensions[ext2];
    }
    // 3. Single Extension Match (.js, .cpp)
    else if (fileExtensions[ext]) {
      iconName = fileExtensions[ext];
    }
    // 4. Default
    else {
      iconName = 'file';
    }
  }

  return iconName;
};

export const getMaterialIconUrl = (filename, isFolder, isOpen) => {
  const iconName = resolveIconName(filename, isFolder, isOpen);
  return `${CDN_URL}/${iconName}.svg`;
};

// 🔥 MAIN LOGIC FUNCTION
export const getIconUrl = (filename, isFolder, isOpen) => {
  const iconName = resolveIconName(filename, isFolder, isOpen);
  const pack = getActiveIconPack();
  switch (pack) {
    case 'vscode-icons':
      return getVSCodeIconsUrl(filename, isFolder, isOpen);
    case 'mdi':
      return getMdiPackUrl(filename, isFolder, isOpen);
    case 'carbon':
      return getCarbonPackUrl(filename, isFolder, isOpen);
    case 'mono':
      return getMonoPackUrl(filename, isFolder, isOpen);
    default:
      return `${CDN_URL}/${iconName}.svg`;
  }
};

// Get inline fallback SVG for a given icon name (instant, no network)
export const getFallbackIconUrl = (filename, isFolder, isOpen) => {
  return TRANSPARENT_PIXEL;
};

const getActiveIconPack = () => {
  try {
    if (typeof window === 'undefined') return 'material';

    const extensionStatesRaw = localStorage.getItem('extension_states');
    if (extensionStatesRaw) {
      const extensionStates = JSON.parse(extensionStatesRaw);
      if (extensionStates['devstudio.icon-pack'] === false) {
        return 'material';
      }
    }

    const isEnabled = localStorage.getItem('devstudio-icon-pack-enabled');
    if (isEnabled === 'false') return 'material';

    return localStorage.getItem('devstudio-icon-pack') || 'material';
  } catch {
    return 'material';
  }
};

import vscodeIconsMap from './vscodeIconsMap.json';

const getVSCodeIconsUrl = (filename, isFolder, isOpen) => {
  const lowerName = String(filename || '').toLowerCase();

  // Extract parts for double extensions (.d.ts, .test.js)
  const parts = lowerName.split('.');
  const ext = parts.pop();
  const ext2 = parts.length > 0 ? `${parts.pop()}.${ext}` : null;

  if (isFolder) {
    if (vscodeIconsMap.folderNames[lowerName]) {
      const folderKey = isOpen
        ? vscodeIconsMap.folderNames[lowerName] + '-opened'
        : vscodeIconsMap.folderNames[lowerName];
      return `${ICONIFY_VSCODE_URL}:${folderKey}.svg`;
    }

    // Fallback to default folder
    const defaultFolderKey = isOpen ? 'default-folder-opened' : 'default-folder';
    return `${ICONIFY_VSCODE_URL}:${defaultFolderKey}.svg`;
  }

  // File Logic:

  // 1. Exact Match (package.json, dockerfile)
  if (vscodeIconsMap.fileNames[lowerName]) {
    return `${ICONIFY_VSCODE_URL}:${vscodeIconsMap.fileNames[lowerName]}.svg`;
  }

  // 2. Double Extension Match (.d.ts, .test.js)
  if (ext2 && vscodeIconsMap.fileExtensions[ext2]) {
    return `${ICONIFY_VSCODE_URL}:${vscodeIconsMap.fileExtensions[ext2]}.svg`;
  }

  // 3. Single Extension Match (.js, .cpp)
  if (vscodeIconsMap.fileExtensions[ext]) {
    return `${ICONIFY_VSCODE_URL}:${vscodeIconsMap.fileExtensions[ext]}.svg`;
  }

  // 4. Default File Fallback
  return `${ICONIFY_VSCODE_URL}:default-file.svg`;
};

const getMdiPackUrl = (filename, isFolder, isOpen) => {
  const lowerName = String(filename || '').toLowerCase();
  const ext = lowerName.includes('.') ? lowerName.split('.').pop() : '';

  if (isFolder) {
    const folderIcon = isOpen ? 'folder-open-outline' : 'folder-outline';
    return `${ICONIFY_MDI_URL}:${folderIcon}.svg`;
  }

  const mdiByExt = {
    js: 'language-javascript',
    jsx: 'react',
    ts: 'language-typescript',
    tsx: 'react',
    html: 'language-html5',
    css: 'language-css3',
    scss: 'sass',
    json: 'code-json',
    md: 'language-markdown',
    py: 'language-python',
    java: 'language-java',
    go: 'language-go',
    php: 'language-php',
    rb: 'language-ruby',
    vue: 'vuejs',
    sql: 'database',
    yml: 'file-document-outline',
    yaml: 'file-document-outline',
    xml: 'xml',
    sh: 'console',
    ps1: 'powershell',
  };

  if (lowerName === 'package.json' || lowerName === 'package-lock.json') {
    return `${ICONIFY_MDI_URL}:nodejs.svg`;
  }
  if (lowerName === 'dockerfile') {
    return `${ICONIFY_MDI_URL}:docker.svg`;
  }

  return `${ICONIFY_MDI_URL}:${mdiByExt[ext] || 'file-outline'}.svg`;
};

const getCarbonPackUrl = (filename, isFolder, isOpen) => {
  const lowerName = String(filename || '').toLowerCase();
  const ext = lowerName.includes('.') ? lowerName.split('.').pop() : '';

  if (isFolder) {
    const folderIcon = isOpen ? 'folder-open' : 'folder';
    return `${ICONIFY_CARBON_URL}:${folderIcon}.svg`;
  }

  const carbonByExt = {
    js: 'logo-javascript',
    jsx: 'logo-react',
    ts: 'logo-typescript',
    tsx: 'logo-react',
    html: 'logo-html5',
    css: 'logo-css3',
    scss: 'logo-sass',
    json: 'json',
    md: 'text-align-left',
    py: 'logo-python',
    java: 'logo-java',
    go: 'logo-go',
    php: 'logo-php',
    rb: 'logo-ruby',
    vue: 'logo-vue',
    sql: 'sql',
    yml: 'document',
    yaml: 'document',
    xml: 'code',
    sh: 'terminal',
    ps1: 'terminal',
  };

  if (lowerName === 'package.json' || lowerName === 'package-lock.json') {
    return `${ICONIFY_CARBON_URL}:logo-nodejs.svg`;
  }
  if (lowerName === 'dockerfile') {
    return `${ICONIFY_CARBON_URL}:logo-docker.svg`;
  }

  return `${ICONIFY_CARBON_URL}:${carbonByExt[ext] || 'document'}.svg`;
};

const MONO_SVG = {
  folder: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#D4D4D4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.5h6l2 2H21v9.5A2 2 0 0 1 19 20H5a2 2 0 0 1-2-2V6.5Z"/></svg>'),
  folderOpen: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#D4D4D4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.8 8.4h18.4l-1.4 9A2 2 0 0 1 17.8 19H6.2a2 2 0 0 1-2-1.6l-1.4-9Z"/><path d="M3.4 8.4V6.8A1.8 1.8 0 0 1 5.2 5h5.2l1.6 1.8h6"/></svg>'),
  file: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#CFCFCF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/></svg>'),
};

const getMonoPackUrl = (_filename, isFolder, isOpen) => {
  if (isFolder) {
    return `data:image/svg+xml,${isOpen ? MONO_SVG.folderOpen : MONO_SVG.folder}`;
  }
  return `data:image/svg+xml,${MONO_SVG.file}`;
};

// The CachedFileIcon component has been moved to its respective JSX files to avoid SyntaxError in .js files.
