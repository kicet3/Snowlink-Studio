import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { studioSource, studioCss } from './studio-build.mjs';

export default defineConfig({ base: '/studio-media/', plugins: [studioSource(), react(), tailwindcss()], css: { postcss: { plugins: [studioCss()] } }, build: { outDir: 'dist', manifest: true, rollupOptions: { input: 'src/studio-entry.tsx', preserveEntrySignatures: 'exports-only', output: { entryFileNames: 'studio-entry.js' } } } });
