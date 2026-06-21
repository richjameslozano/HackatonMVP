// Feature: coin-spending-store, Property 2: Purchasability classification
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { isPurchasable } from '../store-helpers';

// ─── Property 2: Purchasability Classification ──────────────────────────────

describe('isPurchasable - Property 2: Purchasability classification', () => {
  /**
   * **Validates: Requirements 2.3, 2.4, 2.6, 3.2, 3.3, 3.8**
   *
   * For any member balance (non-negative integer), item cost (positive integer 1–100,000),
   * and stock quantity (integer: -1 or ≥ 0), an item is purchasable if and only if
   * balance >= cost AND (stockQuantity === -1 OR stockQuantity > 0).
   */
  it('should classify purchasability correctly for all valid inputs', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 200000 }),
        fc.integer({ min: 1, max: 100000 }),
        fc.oneof(fc.constant(-1), fc.nat({ max: 100 })),
        (balance, cost, stock) => {
          const result = isPurchasable(balance, cost, stock);
          const expected = balance >= cost && (stock === -1 || stock > 0);

          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});
