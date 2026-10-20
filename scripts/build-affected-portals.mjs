#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { affectedPortals } from './portal-build-impact.mjs';

const event = process.env.GITHUB_EVENT_NAME;
const head = process.env.GITHUB_SHA || 'HEAD';
let base;

if (event === 'pull_request' && process.env.GITHUB_BASE_REF) {
  base = `origin/${process.env.GITHUB_BASE_REF}`;
} else if (process.env.GITHUB_EVENT_BEFORE && !/^0+$/.test(process.env.GITHUB_EVENT_BEFORE)) {
  base = process.env.GITHUB_EVENT_BEFORE;
} else {
  // Manual/scheduled runs without a usable event base conservatively build all portals.
  base = null;
}

let changedFiles;
try {
  if (!base) throw new Error('No trustworthy base commit');
  changedFiles = execFileSync('git', ['diff', '--name-only', `${base}...${head}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).split(/\r?\n/).filter(Boolean);
} catch {
  console.log('Could not calculate changed files safely; building all role portals.');
  changedFiles = ['__unknown_runtime_change__'];
}

const affected = affectedPortals(changedFiles);
if (affected.length === 0) {
  console.log('No role-portal runtime changes detected; skipping all five portal builds.');
  process.exit(0);
}

console.log(`Building only affected role portals: ${affected.join(', ')}`);
for (const portal of affected) {
  const result = spawnSync('bun', ['run', `build:${portal}`], { stdio: 'inherit' });
  if (result.error) {
    console.error(`Failed to launch build for ${portal}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);

  try {
    execFileSync('test', ['-s', `dist/${portal}/index.html`], { stdio: 'ignore' });
  } catch {
    console.error(`Expected output is missing for ${portal}: dist/${portal}/index.html`);
    process.exit(1);
  }
}
