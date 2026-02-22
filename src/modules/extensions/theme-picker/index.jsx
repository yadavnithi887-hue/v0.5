import React, { useState, useEffect } from 'react';
import { Palette, CheckCircle } from 'lucide-react';

export const metadata = {
    id: 'devstudio.theme-picker',
    name: 'Theme Picker',
    version: '1.0.0',
    description: 'Easily switch between different color themes.',
    author: 'DevStudio Team',
    icon: 'Palette',
    readme: `
# Theme Picker

## Features
- One-click theme switching
- Preview themes instantly
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

const themes = [
    {
        id: 'dark-modern',
        name: 'Dark Modern',
        type: 'dark',
        vars: {
            '--ide-bg': '#1e1e1e',
            '--ide-sidebar': '#252526',
            '--ide-activitybar': '#333333',
            '--ide-border': '#3c3c3c',
            '--ide-fg': '#ffffff',
            '--ide-fg-secondary': '#cccccc',
            '--ide-accent': '#007fd4'
        }
    },
    {
        id: 'light-modern',
        name: 'Light Modern',
        type: 'light',
        vars: {
            '--ide-bg': '#ffffff',
            '--ide-sidebar': '#f3f3f3',
            '--ide-activitybar': '#eeeeee',
            '--ide-border': '#e5e5e5',
            '--ide-fg': '#000000',
            '--ide-fg-secondary': '#616161',
            '--ide-accent': '#0078d4'
        }
    },
    {
        id: 'sepia',
        name: 'Sepia (Reading Mode)',
        type: 'light',
        vars: {
            '--ide-bg': '#f4ecd8',
            '--ide-sidebar': '#efe7d2',
            '--ide-activitybar': '#e3dac1',
            '--ide-border': '#dcd3bd',
            '--ide-fg': '#5b4636',
            '--ide-fg-secondary': '#8f7e6f',
            '--ide-accent': '#b85c38'
        }
    },
    {
        id: 'github-light',
        name: 'GitHub Light',
        type: 'light',
        vars: {
            '--ide-bg': '#ffffff',
            '--ide-sidebar': '#f6f8fa',
            '--ide-activitybar': '#e1e4e8',
            '--ide-border': '#d1d5da',
            '--ide-fg': '#24292e',
            '--ide-fg-secondary': '#586069',
            '--ide-accent': '#0366d6'
        }
    },
    {
        id: 'monokai',
        name: 'Monokai',
        type: 'dark',
        vars: {
            '--ide-bg': '#272822',
            '--ide-sidebar': '#1e1f1c',
            '--ide-activitybar': '#171814',
            '--ide-border': '#1e1f1c',
            '--ide-fg': '#f8f8f2',
            '--ide-fg-secondary': '#cfcfc2',
            '--ide-accent': '#a6e22e'
        }
    },
    {
        id: 'dracula',
        name: 'Dracula',
        type: 'dark',
        vars: {
            '--ide-bg': '#282a36',
            '--ide-sidebar': '#21222c',
            '--ide-activitybar': '#191a21',
            '--ide-border': '#44475a',
            '--ide-fg': '#f8f8f2',
            '--ide-fg-secondary': '#6272a4',
            '--ide-accent': '#bd93f9'
        }
    },
    {
        id: 'nord',
        name: 'Nord',
        type: 'dark',
        vars: {
            '--ide-bg': '#2e3440',
            '--ide-sidebar': '#3b4252',
            '--ide-activitybar': '#434c5e',
            '--ide-border': '#4c566a',
            '--ide-fg': '#eceff4',
            '--ide-fg-secondary': '#d8dee9',
            '--ide-accent': '#88c0d0'
        }
    },
    {
        id: 'solarized-dark',
        name: 'Solarized Dark',
        type: 'dark',
        vars: {
            '--ide-bg': '#002b36',
            '--ide-sidebar': '#073642',
            '--ide-activitybar': '#00212b',
            '--ide-border': '#073642',
            '--ide-fg': '#839496',
            '--ide-fg-secondary': '#586e75',
            '--ide-accent': '#268bd2'
        }
    },
    {
        id: 'one-dark-pro',
        name: 'One Dark Pro',
        type: 'dark',
        vars: {
            '--ide-bg': '#282c34',
            '--ide-sidebar': '#21252b',
            '--ide-activitybar': '#1e2127',
            '--ide-border': '#181a1f',
            '--ide-fg': '#abb2bf',
            '--ide-fg-secondary': '#5c6370',
            '--ide-accent': '#61afef'
        }
    }
];

const ThemePanel = ({ context }) => {
    const [activeTheme, setActiveTheme] = useState('dark-modern');

    // Load saved theme on mount
    useEffect(() => {
        const saved = localStorage.getItem('devstudio-theme');
        if (saved) {
            applyTheme(saved, false);
        }
    }, []);

    const applyTheme = (id, save = true) => {
        const theme = themes.find(t => t.id === id);
        if (!theme) return;

        setActiveTheme(id);

        console.log('Applying theme:', id, theme.vars);

        // Apply variables to root
        const root = document.documentElement;

        Object.entries(theme.vars).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        // Add theme type class for CSS targeting
        root.classList.remove('theme-light', 'theme-dark');
        root.classList.add(theme.type === 'light' ? 'theme-light' : 'theme-dark');

        // Exclude Monaco editor and Terminal from theme changes
        // They should always stay dark for better code readability
        const monacoEditors = document.querySelectorAll('.monaco-editor');
        const terminals = document.querySelectorAll('.terminal-container, .xterm');

        monacoEditors.forEach(editor => {
            editor.style.backgroundColor = '#1e1e1e';
            editor.style.color = '#d4d4d4';
        });

        terminals.forEach(terminal => {
            terminal.style.backgroundColor = '#1e1e1e';
            terminal.style.color = '#cccccc';
        });

        if (save) {
            localStorage.setItem('devstudio-theme', id);
            if (context.toast) {
                context.toast.success(`Applied theme: ${theme.name}`);
            }
        }
    };

    return (
        <div className="h-full bg-ide-sidebar text-ide-fg p-3">
            <div className="text-xs uppercase text-ide-fg-secondary mb-4 font-bold tracking-wide">Installed Themes</div>

            <div className="grid grid-cols-1 gap-2">
                {themes.map(theme => (
                    <div key={theme.id}
                        onClick={() => applyTheme(theme.id)}
                        className={`p-3 rounded cursor-pointer border transition-all flex items-center justify-between group ${activeTheme === theme.id ? 'bg-ide-activitybar border-ide-accent' : 'border-transparent hover:bg-ide-activitybar'
                            }`}>
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full border border-ide-fg-secondary/20" style={{ background: theme.vars['--ide-bg'] }}></div>
                            <span className="text-sm font-medium">{theme.name}</span>
                        </div>
                        {activeTheme === theme.id && <CheckCircle size={14} className="text-ide-accent" />}
                    </div>
                ))}
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

    console.log("Theme Picker Activated");

    // Attempt to restore theme on activation
    const saved = localStorage.getItem('devstudio-theme');
    if (saved) {
        const theme = themes.find(t => t.id === saved);
        if (theme) {
            const root = document.documentElement;
            Object.entries(theme.vars).forEach(([key, value]) => {
                root.style.setProperty(key, value);
            });
            // Add theme type class
            root.classList.remove('theme-light', 'theme-dark');
            root.classList.add(theme.type === 'light' ? 'theme-light' : 'theme-dark');
        }
    }
};
