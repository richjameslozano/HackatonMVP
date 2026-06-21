import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { truncateDescription, formatCoinBalance } from '../formatting';

// ─── Property 7: Description truncation at 150 characters ───────────────────
// Feature: coin-spending-store, Property 3: Description truncation at 150 characters
// **Validates: Requirements 2.1**

describe('truncateDescription - Property 3', () => {
  it('returns original string unchanged when length <= 150', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 150 }),
        (input) => {
          const result = truncateDescription(input);
          expect(result).toBe(input);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('truncates strings longer than 150 to first 150 chars + "…"', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 151, maxLength: 500 }),
        (input) => {
          const result = truncateDescription(input);
          expect(result).toBe(input.slice(0, 150) + '\u2026');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('output never exceeds 151 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 500 }),
        (input) => {
          const result = truncateDescription(input);
          expect(result.length).toBeLessThanOrEqual(151);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 12: Coin balance formatting ───────────────────────────────────
// Feature: coin-store-system, Property 12: Coin balance formatting
// **Validates: Requirements 7.3**

describe('formatCoinBalance - Property 12', () => {
  it('produces the same result as Intl.NumberFormat for non-negative integers', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10_000_000 }),
        (value) => {
          const result = formatCoinBalance(value);
          const expected = new Intl.NumberFormat().format(value);
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('never returns an empty string', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10_000_000 }),
        (value) => {
          const result = formatCoinBalance(value);
          expect(result.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('never contains a negative sign', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10_000_000 }),
        (value) => {
          const result = formatCoinBalance(value);
          expect(result).not.toContain('-');
        }
      ),
      { numRuns: 100 }
    );
  });
});
