import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const viteConfig = read('vite.config.ts');
const ignoreScript = read('scripts/vercel-ignore-build.mjs');
const impactScript = read('scripts/portal-build-impact.mjs');

const portals = [
  { id: 'buyer', role: 'buyer', html: 'portal-buyer.html', entry: 'buyer.tsx', feature: 'src/features/buyer/', dashboard: 'BuyerPortal', output: 'dist/buyer', script: 'build:buyer' },
  { id: 'seller', role: 'seller', html: 'portal-seller.html', entry: 'seller.tsx', feature: 'src/features/seller/', dashboard: 'SellerDashboard', output: 'dist/seller', script: 'build:seller' },
  { id: 'delivery', role: 'delivery', html: 'portal-delivery.html', entry: 'delivery.tsx', feature: 'src/features/delivery/', dashboard: 'DeliveryDashboard', output: 'dist/delivery', script: 'build:delivery' },
  { id: 'daily-help', role: 'professional', html: 'portal-daily-help.html', entry: 'daily-help.tsx', feature: 'src/features/daily-help/', dashboard: 'DailyHelpProfessionalDashboard', output: 'dist/daily-help', script: 'build:daily-help', viteRole: 'professional' },
  { id: 'admin', role: 'admin', html: 'portal-admin.html', entry: 'admin.tsx', feature: 'src/features/admin/', dashboard: 'AdminDashboard', output: 'dist/admin', script: 'build:admin' },
];

test('each portal build command writes a standalone index.html in its configured output directory', () => {
  for (const portal of portals) {
    const viteRole = portal.viteRole || portal.id;
    assert.equal(
      packageJson.scripts[portal.script],
      `VITE_PORTAL=${viteRole} vite build --outDir ${portal.output} && cp ${portal.output}/${portal.html} ${portal.output}/index.html`,
      `${portal.id} build script and output contract drifted`,
    );
    assert.ok(viteConfig.includes(`${viteRole}: '${portal.html}'`), `${portal.id} HTML entry missing from Vite mapping`);
    assert.ok(read(portal.html).includes(`/src/entries/${portal.entry}`), `${portal.id} HTML points to the wrong entry module`);
    const entry = read(`src/entries/${portal.entry}`);
    assert.ok(entry.includes(`mountPortal('${portal.role}', ${portal.dashboard})`), `${portal.id} entry mounts the wrong role/dashboard`);
    assert.ok(impactScript.includes(`'${portal.feature}'`), `${portal.id} feature path is not classified as portal-owned`);
  }
});

test('all six Vercel ignore-build targets are supported by the repository script', () => {
  for (const target of [...portals.map((portal) => portal.id), 'site']) {
    assert.ok(ignoreScript.includes(`'${target}'`) || ignoreScript.includes(`"${target}"`), `ignore-build target missing: ${target}`);
  }
});

test('the combined Bazaar build remains the root Vite build', () => {
  assert.equal(packageJson.scripts.build, 'vite build');
});
