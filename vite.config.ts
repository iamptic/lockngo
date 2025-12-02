import { defineConfig } from 'vite'
import pages from '@hono/vite-cloudflare-pages'

export default defineConfig({
  plugins: [pages()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './src/index.tsx', // Hono worker
        // We don't need to specify html here if we copy it via 'public'
      }
    }
  }
})
