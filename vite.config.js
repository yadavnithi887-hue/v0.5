import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // <--- यह लाइन बहुत जरूरी है!
  plugins: [react()],
  optimizeDeps: {
    exclude: ['monaco-editor']
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
