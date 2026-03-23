import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSubscribeRequest } from '../src/stream.js';

test('buildSubscribeRequest creates a LaserStream gRPC transactions filter map', () => {
  const request = buildSubscribeRequest({
    commitment: 'confirmed',
    programFilters: [{ name: 'jupiter', programId: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4' }],
    includeAccounts: ['extra-account'],
    excludeAccounts: ['exclude-me'],
    requiredAccounts: ['must-have'],
  }, {
    CONFIRMED: 1,
    FINALIZED: 2,
    PROCESSED: 0,
  });

  assert.deepEqual(request.transactions['dex-monitor'], {
    accountInclude: ['JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', 'extra-account'],
    accountExclude: ['exclude-me'],
    accountRequired: ['must-have'],
    vote: false,
    failed: false,
  });
  assert.equal(request.commitment, 1);
});
