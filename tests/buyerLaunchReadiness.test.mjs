import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const audit = readFileSync('docs/BUYER-LAUNCH-READINESS-AUDIT.md', 'utf8');

test('buyer launch audit separates deployed source from launch approval', () => {
  assert.match(audit, /NOT APPROVED FOR PUBLIC BUYER LAUNCH/);
  assert.match(audit, /NOT cleared for public launch/);
});

test('buyer launch audit retains critical technical gates', () => {
  for (const phrase of [
    'V48/V49/V50',
    'Oracle multi-session checkout/idempotency/stock rollback',
    'Full endpoint × role × owner IDOR matrix',
    'Trusted proxy chain/IP rate limiting',
    'Backup/restore and migration recovery',
    'India-only hosting/data residency',
    'Indian legal/tax/payment/marketplace/labour review',
  ]) assert.ok(audit.includes(phrase), `Missing launch gate: ${phrase}`);
});

test('external approvals cannot be marked complete by a code PR', () => {
  assert.match(audit, /External launch approvals \(cannot be established by a code PR\)/);
  assert.match(audit, /A skipped or unavailable test is NOT VERIFIED, not passed/);
});
