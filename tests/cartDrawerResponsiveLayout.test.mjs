import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/Buyer/CartDrawer.tsx', import.meta.url), 'utf8');

test('cart drawer fits the mobile viewport without an extra left offset', () => {
  assert.match(source, /fixed inset-y-0 right-0 z-10 flex w-full max-w-full sm:w-auto/);
  assert.match(source, /h-full w-full min-w-0 flex-col overflow-x-hidden[^"]*sm:w-screen sm:max-w-md/);
  assert.doesNotMatch(source, /max-w-full flex pl-10/);
});

test('coupon form and bill summary can shrink within the cart drawer', () => {
  assert.match(source, /flex min-w-0 gap-2/);
  assert.match(source, /min-w-0 flex-1 px-3 py-1\.5/);
  assert.match(source, /min-w-0 p-3 sm:p-4 bg-slate-50/);
  assert.match(source, /min-w-0 space-y-1\.5 text-xs/);
});
