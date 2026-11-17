import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('historical accepted bargains are baselined and do not repopulate the buyer cart', () => {
  const source = readFileSync(new URL('../src/context/useNegotiationChatState.ts', import.meta.url), 'utf8');
  assert.match(source, /const newlyAccepted = previous != null && previous !== 'ACCEPTED' && status === 'ACCEPTED'/);
  assert.match(source, /if \(product && newlyAccepted && chat\.currentAgreedPrice != null\)/);
  assert.match(source, /lastSeenStatusRef\.current\.clear\(\)/);
  assert.doesNotMatch(source, /status === 'ACCEPTED' && previous !== 'ACCEPTED'/);
});

test('only a previously observed non-accepted to accepted transition is eligible for cart addition', () => {
  const isNewlyAccepted = (previous, status) => previous != null && previous !== 'ACCEPTED' && status === 'ACCEPTED';
  assert.equal(isNewlyAccepted(undefined, 'ACCEPTED'), false);
  assert.equal(isNewlyAccepted('ACCEPTED', 'ACCEPTED'), false);
  assert.equal(isNewlyAccepted('PENDING_SELLER', 'ACCEPTED'), true);
  assert.equal(isNewlyAccepted('PENDING_BUYER', 'ACCEPTED'), true);
  assert.equal(isNewlyAccepted('REJECTED', 'ACCEPTED'), true);
});
