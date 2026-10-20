export const PORTALS = ['buyer', 'seller', 'delivery', 'daily-help', 'admin'];

const PORTAL_PATHS = {
  buyer: ['src/features/buyer/', 'src/entries/buyer.tsx', 'portal-buyer.html'],
  seller: ['src/features/seller/', 'src/entries/seller.tsx', 'portal-seller.html'],
  delivery: ['src/features/delivery/', 'src/entries/delivery.tsx', 'portal-delivery.html'],
  'daily-help': ['src/features/daily-help/', 'src/entries/daily-help.tsx', 'portal-daily-help.html'],
  admin: ['src/features/admin/', 'src/entries/admin.tsx', 'portal-admin.html'],
};

export function isNonRuntimePath(file) {
  const path = file.replaceAll(String.fromCharCode(92), '/');
  return (
    path.endsWith('.md') ||
    path.startsWith('docs/') ||
    path.startsWith('.github/') ||
    path.startsWith('tests/') ||
    path.startsWith('e2e/') ||
    path.startsWith('playwright-report/') ||
    path.startsWith('test-results/') ||
    path.startsWith('scripts/') ||
    path === '.gitignore' ||
    path === 'AGENTS.md' ||
    path === 'CONTRIBUTING.md' ||
    path === 'E2E_TESTING.md' ||
    path === 'DEPLOYMENT.md' ||
    path === 'ARCHITECTURE.md'
  );
}

export function isPortalIrrelevantPath(file) {
  const path = file.replaceAll(String.fromCharCode(92), '/');
  return isNonRuntimePath(path) || path === 'index.html';
}

function owningPortal(file) {
  for (const portal of PORTALS) {
    if (PORTAL_PATHS[portal].some((prefix) => file === prefix || file.startsWith(prefix))) {
      return portal;
    }
  }
  return null;
}

/**
 * Returns role portals affected by a commit.
 * Unknown runtime paths intentionally fan out to all portals.
 */
export function affectedPortals(changedFiles) {
  const runtimeFiles = changedFiles
    .map((file) => file.replaceAll(String.fromCharCode(92), '/'))
    .filter((file) => !isPortalIrrelevantPath(file));

  if (runtimeFiles.length === 0) return [];

  const affected = new Set();
  let sharedRuntimeChange = false;

  for (const file of runtimeFiles) {
    const portal = owningPortal(file);
    if (portal) affected.add(portal);
    else sharedRuntimeChange = true;
  }

  return sharedRuntimeChange ? [...PORTALS] : PORTALS.filter((portal) => affected.has(portal));
}
