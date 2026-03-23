import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

test('loadConfig resolves built-in DEX aliases into program filters', () => {
  const config = loadConfig({
    HELIUS_API_KEY: 'demo-key',
    DEX_PROGRAMS: 'jupiter,raydium-clmm',
    LASERSTREAM_GRPC_ENDPOINT: 'https://laserstream-mainnet-ewr.helius-rpc.com',
  });

  assert.equal(config.programFilters.length, 2);
  assert.equal(config.programFilters[0].programId, 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4');
  assert.equal(config.commitment, 'confirmed');
});
