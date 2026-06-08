import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolves the absolute path to the ketcher-standalone package directory.
 * The Indigo WASM binary and its worker JS file reside inside this package
 * under the `dist/` subfolder after install.
 */
const ketcherStandaloneDir = path.resolve(
  __dirname,
  'node_modules/ketcher-standalone/dist'
);

/**
 * GitHub Pages deployment base.
 * - In CI/production: Vite sets base to '/OrgoTesterV2/' so all asset
 *   references (JS chunks, CSS, WASM) are prefixed correctly.
 * - In local dev: base defaults to '/' so the dev server works without config.
 *
 * Override with: VITE_BASE_URL env var or the GitHub Actions build step.
 */
const base = process.env.VITE_BASE_URL ?? '/OrgoTesterV2/';

export default defineConfig(({ command }) => ({
  // ─── Base URL ─────────────────────────────────────────────────────────────
  // Must match the GitHub Pages repo path. In dev mode Vite ignores this and
  // serves from '/'. BrowserRouter in App.jsx reads import.meta.env.BASE_URL
  // at runtime so routing stays consistent across environments.
  base: command === 'serve' ? '/' : base,

  // ─── Plugins ──────────────────────────────────────────────────────────────
  plugins: [
    react(),

    /**
     * viteStaticCopy — copies the Indigo WASM binary and worker files from
     * node_modules into the build output's public root during `vite build`.
     *
     * WHY THIS IS NECESSARY:
     * ketcher-standalone dynamically loads its WASM module via a relative URL
     * at runtime (e.g., new Worker('./indigo.worker.js')). Vite's default
     * asset pipeline does NOT automatically bundle Worker files or .wasm
     * binaries referenced this way — it only handles static `import` calls.
     * Copying them to the build root ensures the browser can resolve them at
     * the same relative path the Ketcher library expects.
     */
    viteStaticCopy({
      targets: [
        {
          src: `${ketcherStandaloneDir}/indigoService.worker.js`,
          dest: '',  // copy to root of dist/
        },
        {
          src: `${ketcherStandaloneDir}/*.wasm`,
          dest: '',  // copy all .wasm files to root of dist/
        },
      ],
      // Silently skip if the file doesn't exist yet (pre-install state).
      silent: true,
    }),
  ],

  // ─── Asset Handling ───────────────────────────────────────────────────────
  // Explicitly tell Vite to treat .wasm files as static assets so they are
  // never transformed or inlined, even if they appear in import statements.
  assetsInclude: ['**/*.wasm'],

  // ─── Dev Server ───────────────────────────────────────────────────────────
  server: {
    port: 5173,
    // Serve WASM and worker files from node_modules during development.
    // The `fs.allow` setting lets Vite's dev server read outside the project
    // root, which is necessary to serve ketcher-standalone's dist/ folder.
    fs: {
      allow: [__dirname, ketcherStandaloneDir],
    },
  },

  // ─── Build Options ────────────────────────────────────────────────────────
  build: {
    outDir: 'dist',
    // Ensure .wasm files are never inlined as base64 data URIs; they must
    // remain as separate files so the browser can stream them efficiently.
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // Keep WASM and worker files at the root of the assets output so
        // Ketcher's runtime URL resolution doesn't need any path remapping.
        assetFileNames: (assetInfo) => {
          if (
            assetInfo.name?.endsWith('.wasm') ||
            assetInfo.name?.includes('worker')
          ) {
            return '[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },

  // ─── Path Aliases ─────────────────────────────────────────────────────────
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@context': path.resolve(__dirname, './src/context'),
      '@data': path.resolve(__dirname, './src/data'),
      '@features': path.resolve(__dirname, './src/features'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },

  // ─── Vitest Configuration ─────────────────────────────────────────────────
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    // Exclude node_modules from test collection, but DO include tests/ dir.
    include: ['tests/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx'],
    },
  },
}));
