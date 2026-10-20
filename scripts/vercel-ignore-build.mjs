#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { affectedPortals, isNonRuntimePath, PORTALS } from './portal-build-impact.mjs';

const target = process.argv[2];
if (![...PORTALS, 'site'].includes(target)) {
  console.error('Usage: node scripts/vercel-ignore-build.mjs <buyer|seller|delivery|daily-help|admin|site>');
  // Unknown target must build rather than accidentally suppress a release.
  process.exit(1);
}

const previous = process.env.VERCEL_GIT_PREVIOUS_SHA;
const current = process.env.VERCEL_GIT_COMMIT_SHA;

if (!previous || !current || /^0+$/.test(previous) || /^0+$/.test(current)) {
  console.log('Vercel commit comparison is unavailable; proceeding with build (fail open).');
  process.exit(1);
}

let changedFiles;
try {
  changedFiles = execFileSync('git', ['diff', '--name-only', `${previous}...${current}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).split(/\r?\n/).filter(Boolean);
} catch {
  console.log('Could not compare Vercel commits; proceeding with build (fail open).');
  process.exit(1);
}

if (target === 'site') {
  const hasRuntimeChanges = changedFiles.some((file) => !isNonRuntimePath(file));
  if (!hasRuntimeChanges) {
    console.log('Skipping site build: this commit changes only documentation, tests, workflows, or build-support scripts.');
    process.exit(0);
  }
  console.log('Building site: a runtime-affecting file changed.');
  process.exit(1);
}

const affected = affectedPortals(changedFiles);
if (!affected.includes(target)) {
  console.log(`Skipping ${target} portal build; affected portals: ${affected.join(', ') || 'none'}.`);
  process.exit(0);
}

console.log(`Building ${target} portal; affected portals: ${affected.join(', ')}.`);
process.exit(1);
