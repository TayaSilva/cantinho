import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
  // SVGs pequenos não são embutidos em base64: ficam como arquivos e o
  // navegador desenha cada sprite com nitidez.
  build: { assetsInlineLimit: 0 },
});
