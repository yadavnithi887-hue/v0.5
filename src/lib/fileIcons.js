// src/lib/fileIcons.js

// Base URL for Material Icon Theme (Official CDN)
const CDN_URL = "https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons";

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
  jl: 'julia',
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
  pp: 'puppet',
  
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
  svg: 'svg',
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
  k8s: 'kubernetes', yaml: 'yaml',
  
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
  server: 'server', backend: 'server', api: 'api',
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

// 🔥 MAIN LOGIC FUNCTION
export const getIconUrl = (filename, isFolder, isOpen) => {
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

  return `${CDN_URL}/${iconName}.svg`;
};