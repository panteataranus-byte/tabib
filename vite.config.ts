import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works from any static host path (GitHub Pages, Netlify, a sub-folder).
// `--mode artifact` builds a single self-contained page for the hosted demo: every asset is
// inlined so scripts/build-artifact.mjs can fold the whole app into one HTML file.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react()],
  build:
    mode === 'artifact'
      ? { sourcemap: false, outDir: 'dist-artifact', assetsInlineLimit: () => true, cssCodeSplit: false, modulePreload: false, copyPublicDir: false }
      : { sourcemap: false },
}));
