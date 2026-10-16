import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

const root = import.meta.dirname || process.cwd();
const portalHtmlByRole: Record<string, string> = {
  buyer: 'portal-buyer.html',
  seller: 'portal-seller.html',
  delivery: 'portal-delivery.html',
  professional: 'portal-daily-help.html',
  admin: 'portal-admin.html',
};

export default defineConfig(() => {
  const portal = process.env.VITE_PORTAL;
  const portalHtml = portal ? portalHtmlByRole[portal] : undefined;
  return {
    // Each role portal is deployed as a standalone Vercel project at the
    // hostname root (e.g. buyer.kuraliupdates.com/). Using /buyer/, /seller/,
    // etc. here makes the browser request bundles from nonexistent nested
    // paths and leaves the React root blank. The monolithic app also uses /
    // and keeps its role routes client-side.
    base: '/',
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': path.resolve(root, '.') } },
    ...(portalHtml ? { build: { rollupOptions: { input: path.resolve(root, portalHtml) } } } : {}),
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
