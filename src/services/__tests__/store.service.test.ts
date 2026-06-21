import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ─── Mock lark-api.service ──────────────────────────────────────────────────

const mockListRecords = vi.fn();

vi.mock('../lark-api.service', () => ({
  listRecords: (...args: unknown[]) => mockListRecords(...args),
  extractNumberValue: (value: unknown) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  },
  extractTextValue: (value: unknown) => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (typeof first === 'object' && first !== null && 'text' in first) {
        return (first as { text: string }).text;
      }
      if (typeof first === 'string') return first;
    }
    return '';
  },
  getRecord: vi.fn(),
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
}));

vi.mock('../auth.service', () => ({
  withRetry: <T>(fn: () => Promise<T>) => fn(),
  getTenantToken: vi.fn().mockResolvedValue('test-token'),
  createTimeoutSignal: () => ({ signal: new AbortController().signal, cleanup: () => {} }),
}));

import { getSpendableBalance } from '../store.service';

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('store.service - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Feature: coin-spending-store, Property 1: Spendable balance is non-negative difference
  // **Validates: Requirements 4.1, 4.2**
  describe('Property 1: Spendable balance is non-negative difference of earned minus spent', () => {
    const awardedArb = fc.array(fc.nat({ max: 10000 }));
    const spentArb = fc.array(fc.integer({ min: 1, max: 10000 }));

    it('returns max(0, sum(awarded) - sum(spent)) for any awarded/spent arrays', async () => {
      await fc.assert(
        fc.asyncProperty(awardedArb, spentArb, async (awardedValues, spentValues) => {
          // Mock listRecords: first call returns quest completions, second returns purchases
          const completionRecords = awardedValues.map((coins, index) => ({
            record_id: `comp_${index}`,
            fields: { coins_awarded: coins, member_id: 'member_test' },
          }));

          const purchaseRecords = spentValues.map((coins, index) => ({
            record_id: `purch_${index}`,
            fields: { coins_spent: coins, member_id: 'member_test' },
          }));

          mockListRecords
            .mockResolvedValueOnce(completionRecords)
            .mockResolvedValueOnce(purchaseRecords);

          const result = await getSpendableBalance('member_test');

          const totalAwarded = awardedValues.reduce((sum, val) => sum + val, 0);
          const totalSpent = spentValues.reduce((sum, val) => sum + val, 0);
          const expected = Math.max(0, totalAwarded - totalSpent);

          expect(result).toBe(expected);
          expect(result).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 },
      );
    });

    it('always returns a non-negative value even when spent exceeds awarded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.nat({ max: 100 }), { minLength: 0, maxLength: 5 }),
          fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 10 }),
          async (awardedValues, spentValues) => {
            const completionRecords = awardedValues.map((coins, index) => ({
              record_id: `comp_${index}`,
              fields: { coins_awarded: coins, member_id: 'member_test' },
            }));

            const purchaseRecords = spentValues.map((coins, index) => ({
              record_id: `purch_${index}`,
              fields: { coins_spent: coins, member_id: 'member_test' },
            }));

            mockListRecords
              .mockResolvedValueOnce(completionRecords)
              .mockResolvedValueOnce(purchaseRecords);

            const result = await getSpendableBalance('member_test');

            expect(result).toBeGreaterThanOrEqual(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('returns 0 when member has no records', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          mockListRecords
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);

          const result = await getSpendableBalance('member_test');

          expect(result).toBe(0);
          expect(result).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 },
      );
    });
  });
});
