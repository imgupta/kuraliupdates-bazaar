import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ignoreBuildScript = resolve(repoRoot, 'scripts/vercel-ignore-build.mjs');

function fixture(changedPath, contents = 'updated') {
  const directory = mkdtempSync(resolve(tmpdir(), 'ku-vercel-ignore-'));
  const git = (...args) => execFileSync('git', args, { cwd: directory, stdio: 'ignore' });
  git('init', '-q');
  git('config', 'user.email', 'ci@example.invalid');
  git('config', 'user.name', 'CI test');
  mkdirSync(dirname(resolve(directory, changedPath)), { recursive: true });
  writeFileSync(resolve(directory, changedPath), 'initial');
  git('add', '.');
  git('commit', '-qm', 'initial');
  const previous = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8' }).trim();
  writeFileSync(resolve(directory, changedPath), contents);
  git('add', '.');
  git('commit', '-qm', 'change');
  const current = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8' }).trim();
  return { directory, previous, current };
}

function run(target, env = {}, cwd = repoRoot) {
  return spawnSync(process.execPath, [ignoreBuildScript, target], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

test('missing or zero Vercel commit metadata fails open and keeps the build', () => {
  const result = run('buyer', { VERCEL_GIT_PREVIOUS_SHA: '0'.repeat(40), VERCEL_GIT_COMMIT_SHA: '' });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /proceeding with build/);
});

test('documentation-only change skips the role portal build', () => {
  const f = fixture('docs/notes.md');
  try {
    const result = run('buyer', {
      VERCEL_GIT_PREVIOUS_SHA: f.previous,
      VERCEL_GIT_COMMIT_SHA: f.current,
    }, f.directory);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Skipping buyer portal build/);
  } finally {
    rmSync(f.directory, { recursive: true, force: true });
  }
});

test('a Buyer-only change builds Buyer and skips Seller', () => {
  const f = fixture('src/features/buyer/BuyerPortal.tsx');
  try {
    const env = { VERCEL_GIT_PREVIOUS_SHA: f.previous, VERCEL_GIT_COMMIT_SHA: f.current };
    const buyer = run('buyer', env, f.directory);
    const seller = run('seller', env, f.directory);
    assert.equal(buyer.status, 1, buyer.stderr);
    assert.match(buyer.stdout, /Building buyer portal/);
    assert.equal(seller.status, 0, seller.stderr);
    assert.match(seller.stdout, /Skipping seller portal build/);
  } finally {
    rmSync(f.directory, { recursive: true, force: true });
  }
});

test('an unknown runtime change fails safe and builds every role portal', () => {
  const f = fixture('src/shared/new-runtime.ts');
  try {
    const result = run('admin', {
      VERCEL_GIT_PREVIOUS_SHA: f.previous,
      VERCEL_GIT_COMMIT_SHA: f.current,
    }, f.directory);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /Building admin portal/);
  } finally {
    rmSync(f.directory, { recursive: true, force: true });
  }
});

test('unresolvable commit comparison fails open and keeps the build', () => {
  const f = fixture('src/features/buyer/BuyerPortal.tsx');
  try {
    const result = run('buyer', {
      VERCEL_GIT_PREVIOUS_SHA: 'f'.repeat(40),
      VERCEL_GIT_COMMIT_SHA: f.current,
    }, f.directory);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Could not compare Vercel commits; proceeding with build/);
  } finally {
    rmSync(f.directory, { recursive: true, force: true });
  }
});
