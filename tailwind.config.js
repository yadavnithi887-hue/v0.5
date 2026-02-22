/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ide: {
          bg: 'var(--ide-bg)',
          sidebar: 'var(--ide-sidebar)',
          activitybar: 'var(--ide-activitybar)',
          border: 'var(--ide-border)',
          fg: 'var(--ide-fg)',
          'fg-secondary': 'var(--ide-fg-secondary)',
          accent: 'var(--ide-accent)'
        }
      }
    },
  },
  plugins: [],
}