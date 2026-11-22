import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Deploy note: serve the built `index.html` with `Cache-Control: no-cache` or short max-age + `must-revalidate`
 * so browsers pick up new entrypoints after a release. Fingerprinted files under `assets/` can stay immutable.
 */

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  /**
   * Vite 6 can run a second dependency-optimization pass when third-party packages are
   * discovered only through the `@shared/*` path alias. That rewrites `node_modules/.vite/deps`
   * while the browser may still request the previous chunk URLs, producing missing-file
   * errors in the console. Pre-bundling these deps from project entry avoids that race; see
   * https://github.com/vitejs/vite/issues/20010
   */
  optimizeDeps: {
    include: ['moment', 'react-hook-form', 'zod'],
  },
});
