import { useEffect, useMemo, useRef, useState } from 'react';
import { Palette, CheckCircle, Star } from 'lucide-react';
import { IDE_THEMES, DEFAULT_IDE_THEME_ID, applyIdeTheme } from '@/lib/ideThemes';

export const metadata = {
  id: 'devstudio.theme-picker',
  name: 'Theme Picker',
  version: '1.1.0',
  description: 'Apply the same IDE theme system used by Settings.',
  author: 'DevStudio Team',
  icon: 'Palette',
  readme: `
# Theme Picker

## Features
- Uses the same theme source as Settings
- Keeps editor, terminal, and workspace in sync
- Highlights Sepia as the focused reading theme
`
};

export const settings = [
  {
    id: 'theme.autoSave',
    label: 'Auto Save Theme',
    type: 'checkbox',
    default: true,
    description: 'Save selected theme to local storage',
    section: 'appearance',
    extensionId: metadata.id
  }
];

const featuredThemeId = 'sepia';

function getStoredSettings() {
  const savedSettings = localStorage.getItem('devstudio-settings');
  return savedSettings ? JSON.parse(savedSettings) : {};
}

function getPreferredExtensionTheme() {
  return (
    localStorage.getItem('devstudio-extension-theme') ||
    localStorage.getItem('devstudio-theme') ||
    DEFAULT_IDE_THEME_ID
  );
}

function persistThemeSelection(themeId) {
  const parsed = getStoredSettings();
  localStorage.setItem('devstudio-settings', JSON.stringify({
    ...parsed,
    themeSource: 'extension'
  }));
  localStorage.setItem('devstudio-extension-theme', themeId);
}

const ThemePanel = ({ context }) => {
  const [activeTheme, setActiveTheme] = useState(DEFAULT_IDE_THEME_ID);
  const scrollRef = useRef(null);
  const scrollTopRef = useRef(0);

  const orderedThemes = useMemo(() => {
    const featured = IDE_THEMES.find((theme) => theme.id === featuredThemeId);
    const rest = IDE_THEMES.filter((theme) => theme.id !== featuredThemeId);
    return featured ? [featured, ...rest] : IDE_THEMES;
  }, []);

  useEffect(() => {
    const saved = getPreferredExtensionTheme();
    setActiveTheme(saved);
  }, []);

  const applyThemeSelection = (id) => {
    scrollTopRef.current = scrollRef.current?.scrollTop || 0;
    setActiveTheme(id);
    applyIdeTheme(id, { save: true });
    persistThemeSelection(id);
    window.dispatchEvent(new CustomEvent('devstudio:theme-source-change', {
      detail: { source: 'extension', themeId: id }
    }));
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollTopRef.current;
      }
    });

    const selected = IDE_THEMES.find((theme) => theme.id === id);
    if (context.toast && selected) {
      context.toast.success(`Theme changed to ${selected.name}`, {
        description: selected.id === featuredThemeId
          ? 'Sepia keeps contrast softer and more consistent for long coding sessions.'
          : 'Workspace, editor, terminal, and settings are now using the same theme source.'
      });
    }
  };

  return (
    <div
      ref={scrollRef}
      onScroll={(event) => {
        scrollTopRef.current = event.currentTarget.scrollTop;
      }}
      className="h-full min-h-0 overflow-y-auto overscroll-contain p-4"
      style={{
        background: 'var(--ide-sidebar)',
        color: 'var(--ide-fg)'
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div
            className="text-xs font-bold uppercase tracking-[0.18em]"
            style={{ color: 'var(--ide-fg-secondary)' }}
          >
            Installed Themes
          </div>
          <div className="mt-1 text-sm" style={{ color: 'var(--ide-fg-secondary)' }}>
            One source of truth for workspace theming
          </div>
        </div>
        <Palette size={16} style={{ color: 'var(--ide-accent)' }} />
      </div>

      <div className="grid grid-cols-1 gap-2">
        {orderedThemes.map((theme) => {
          const isActive = activeTheme === theme.id;
          const isFeatured = theme.id === featuredThemeId;

          return (
            <button
              key={theme.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyThemeSelection(theme.id)}
              className="w-full p-3 text-left border transition-all duration-150"
              style={{
                background: isActive ? 'var(--ide-bg)' : 'transparent',
                borderColor: isActive ? 'var(--ide-accent)' : 'var(--ide-border)',
                color: 'var(--ide-fg)',
                borderRadius: 12
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full border"
                    style={{
                      background: theme.vars['--ide-bg'],
                      borderColor: theme.vars['--ide-border']
                    }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{theme.name}</span>
                      {isFeatured && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                          style={{
                            background: 'var(--ide-bg)',
                            border: '1px solid var(--ide-accent)',
                            color: 'var(--ide-accent)'
                          }}
                        >
                          <Star size={10} />
                          Focus
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs" style={{ color: 'var(--ide-fg-secondary)' }}>
                      {isFeatured
                        ? 'Balanced contrast for long sessions and calmer reading.'
                        : 'Uses the same workspace palette across editor, terminal, and settings.'}
                    </p>
                  </div>
                </div>

                {isActive && <CheckCircle size={16} style={{ color: 'var(--ide-accent)' }} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const activate = (context) => {
  context.registerSidebarPanel(
    'theme-picker',
    {
      icon: 'palette',
      label: 'Themes',
    },
    (props) => <ThemePanel context={context} {...props} />
  );

  const settings = getStoredSettings();
  const saved = getPreferredExtensionTheme();

  if (settings.themeSource === 'extension') {
    applyIdeTheme(saved, { save: false });
  }
};
