import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

const root = import.meta.dirname || process.cwd();
const portalHtmlByRole: Record<string, string> = {
  buyer: 'portal-buyer.html',
  seller: 'portal-seller.html',
  delivery: 'portal-delivery.html',
  professional: 'portal-daily-help.html',
  admin: 'portal-admin.html',
};

function renamePortalHtml(sourceHtml: string): Plugin {
  return {
    name: 'kuraliupdates-portal-index',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlName = Object.keys(bundle).find((fileName) => fileName.endsWith('.html'));
      if (!htmlName || bundle[htmlName]?.type !== 'asset') {
        throw new Error(`Expected an HTML asset for portal entry "${sourceHtml}" in the build output.`);
      }
      if (htmlName !== 'index.html') {
        const html = bundle[htmlName];
        bundle['index.html'] = { ...html, fileName: 'index.html' };
        delete bundle[htmlName];
      }
    },
  };
}

export default defineConfig(() => {
  const portal = process.env.VITE_PORTAL;
  const portalHtml = portal ? portalHtmlByRole[portal] : undefined;
  const plugins = [react(), tailwindcss()];
  if (portalHtml) plugins.push(renamePortalHtml(portalHtml));

  return {
    plugins,
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
