import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react({
    jsxRuntime: 'automatic',
    babel: {
      plugins: [],
      // Force Babel transform instead of esbuild for JSX files
      // This avoids esbuild's regex/unicode parsing bugs
    }
  })],
  server: { port: 3000 },
  esbuild: {
    // Use Babel for JSX, only use esbuild for non-JSX files
    include: /\.js$/,
    exclude: /\.jsx$/,
  }
})
