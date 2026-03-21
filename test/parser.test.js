import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSwapObservation } from '../src/parser.js';

const sampleMessage = {
  params: {
    result: {
      context: { slot: 321 },
      value: {
        transaction: {
          transaction: {
            message: {
              accountKeys: [
                { pubkey: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4' },
                { pubkey: 'wallet-1' }
              ]
            },
            signatures: ['sig-123']
          },
          meta: {
            err: null,
            preTokenBalances: [
              {
                owner: 'wallet-1',
                mint: 'So11111111111111111111111111111111111111112',
                uiTokenAmount: { uiAmount: 10 }
              },
              {
                owner: 'wallet-1',
                mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                uiTokenAmount: { uiAmount: 100 }
              }
            ],
            postTokenBalances: [
              {
                owner: 'wallet-1',
                mint: 'So11111111111111111111111111111111111111112',
                uiTokenAmount: { uiAmount: 8 }
              },
              {
                owner: 'wallet-1',
                mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                uiTokenAmount: { uiAmount: 160 }
              }
            ]
          }
        }
      }
    }
  }
};

test('extractSwapObservation derives pair, price, and volumes from token balance deltas', () => {
  const swap = extractSwapObservation(sampleMessage, [
    { name: 'jupiter', programId: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4' },
  ]);

  assert.ok(swap);
  assert.equal(swap.dex, 'jupiter');
  assert.equal(swap.pair, 'So11111111111111111111111111111111111111112/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  assert.equal(swap.baseVolume, 2);
  assert.equal(swap.quoteVolume, 60);
  assert.equal(swap.price, 30);
});
