import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ─── Mock lark-api.service ──────────────────────────────────────────────────

const mockListRecords = vi.fn();
const mockExtractNumberValue = vi.fn();

vi.mock('../lark-api.service', () => ({
  listRecords: (...args: unknown[]) => mockListRecords(...args),
  extractNumberValue: (...args: unknown[]) => mockExtractNumberValue(...args),
  getRecord: vi.fn(),
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
  extractTextValue: vi.fn(),
}));

vi.mock('../auth.service', () => ({
  withRetry: <T>(fn: () => Promise<T>) => fn(),
  getTenantToken: vi.fn().mockResolvedValue('test-token'),
  createTimeoutSignal: () => ({ signal: new AbortController().signal, cleanup: () => {} }),
}));

import { calculateCoinsForDifficulty, getCoinBalance } from '../coin.service';

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('coin.service - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Feature: coin-store-system, Property 2: Coin calculation with config fallback
  // **Validates: Requirements 1.2, 2.1, 2.2, 3.4, 3.7, 8.4**
  describe('Property 2: Coin calculation with config fallback', () => {
    const coinConfigArb = fc.record({
      easy_coins: fc.integer({ min: 1, max: 10000 }),
      medium_coins: fc.integer({ min: 1, max: 10000 }),
      hard_coins: fc.integer({ min: 1, max: 10000 }),
    });

    const difficultyArb = fc.option(fc.constantFrom('easy' as const, 'medium' as const, 'hard' as const));

    it('returns config values mapped to the correct difficulty', async () => {
      await fc.assert(
        fc.asyncProperty(coinConfigArb, difficultyArb, async (config, difficulty) => {
          // Mock listRecords to return a config record
          mockListRecords.mockResolvedValue([
            {
              record_id: 'rec_config',
              fields: {
                easy_coins: config.easy_coins,
                medium_coins: config.medium_coins,
                hard_coins: config.hard_coins,
              },
            },
          ]);

          // Mock extractNumberValue to return actual number values
          mockExtractNumberValue.mockImplementation((value: unknown) => {
            if (typeof value === 'number') return value;
            return 0;
          });

          const result = await calculateCoinsForDifficulty(difficulty);

          // null/undefined difficulty treated as 'easy'
          if (difficulty === null || difficulty === undefined) {
            expect(result).toBe(config.easy_coins);
          } else if (difficulty === 'easy') {
            expect(result).toBe(config.easy_coins);
          } else if (difficulty === 'medium') {
            expect(result).toBe(config.medium_coins);
          } else if (difficulty === 'hard') {
            expect(result).toBe(config.hard_coins);
          }

          // Result is always a positive integer >= 1
          expect(result).toBeGreaterThanOrEqual(1);
          expect(Number.isInteger(result)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('returns default values when no config exists', async () => {
      await fc.assert(
        fc.asyncProperty(difficultyArb, async (difficulty) => {
          // Mock listRecords to return empty array (no config)
          mockListRecords.mockResolvedValue([]);

          const result = await calculateCoinsForDifficulty(difficulty);

          // Default values: easy=1, medium=3, hard=5
          if (difficulty === null || difficulty === undefined) {
            expect(result).toBe(1); // null treated as easy
          } else if (difficulty === 'easy') {
            expect(result).toBe(1);
          } else if (difficulty === 'medium') {
            expect(result).toBe(3);
          } else if (difficulty === 'hard') {
            expect(result).toBe(5);
          }

          // Result is always a positive integer >= 1
          expect(result).toBeGreaterThanOrEqual(1);
          expect(Number.isInteger(result)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });
  });

  // Feature: coin-store-system, Property 3: Coin balance is non-negative sum of coins_awarded
  // **Validates: Requirements 2.4**
  describe('Property 3: Coin balance is non-negative sum of coins_awarded', () => {
    const coinsAwardedArrayArb = fc.array(fc.nat({ max: 10000 }));

    it('returns the sum of all coins_awarded values for a member', async () => {
      await fc.assert(
        fc.asyncProperty(coinsAwardedArrayArb, async (coinsArray) => {
          // Mock listRecords to return records with the generated coins_awarded values
          const records = coinsArray.map((coins, index) => ({
            record_id: `rec_${index}`,
            fields: {
              member_id: 'member_test',
              coins_awarded: coins,
            },
          }));

          mockListRecords.mockResolvedValue(records);

          // Mock extractNumberValue to return the number directly
          mockExtractNumberValue.mockImplementation((value: unknown) => {
            if (typeof value === 'number') return value;
            return 0;
          });

          const result = await getCoinBalance('member_test');

          // Expected sum
          const expectedSum = coinsArray.reduce((sum, val) => sum + val, 0);

          expect(result).toBe(expectedSum);

          // Result is always >= 0
          expect(result).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 },
      );
    });

    it('returns 0 for empty array (no completions)', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          // Mock listRecords to return empty array
          mockListRecords.mockResolvedValue([]);

          const result = await getCoinBalance('member_test');

          expect(result).toBe(0);
          expect(result).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 },
      );
    });
  });
});
