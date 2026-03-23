import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSwapObservation } from '../src/parser.js';

const sampleMessage = {
  createdAt: '2026-03-23T00:00:00.000Z',
  transaction: {
    slot: 321,
    transaction: {
      signature: Uint8Array.from([1, 2, 3, 4]),
      transaction: {
        message: {
          accountKeys: [
            Uint8Array.from([0x00]),
            'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
            'wallet-1'
          ]
        },
        signatures: [Uint8Array.from([1, 2, 3, 4])]
      },
      meta: {
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
};

test('extractSwapObservation derives pair, price, and volumes from a LaserStream transaction update', () => {
  const swap = extractSwapObservation(sampleMessage, [
    { name: 'jupiter', programId: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4' },
  ]);

  assert.ok(swap);
  assert.equal(swap.dex, 'jupiter');
  assert.equal(swap.slot, 321);
  assert.equal(swap.pair, 'So11111111111111111111111111111111111111112/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  assert.equal(swap.baseVolume, 2);
  assert.equal(swap.quoteVolume, 60);
  assert.equal(swap.price, 30);
  assert.equal(swap.observedAt, '2026-03-23T00:00:00.000Z');
});
