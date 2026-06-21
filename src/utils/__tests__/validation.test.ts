import { describe, it, expect } from 'vitest';
import {
  validateTaskTitle,
  validateTaskDescription,
  validateRejectionReason,
} from '../validation';

describe('validateTaskTitle', () => {
  it('rejects empty string', () => {
    const result = validateTaskTitle('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Title is required and must be 1–100 characters');
  });

  it('rejects whitespace-only string', () => {
    const result = validateTaskTitle('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Title is required and must be 1–100 characters');
  });

  it('rejects string longer than 100 characters', () => {
    const result = validateTaskTitle('a'.repeat(101));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Title is required and must be 1–100 characters');
  });

  it('accepts valid title of 1 character', () => {
    const result = validateTaskTitle('a');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts valid title at exactly 100 characters', () => {
    const result = validateTaskTitle('a'.repeat(100));
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts normal title', () => {
    const result = validateTaskTitle('Complete onboarding module');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('validateTaskDescription', () => {
  it('accepts empty string (optional field)', () => {
    const result = validateTaskDescription('');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts description at exactly 500 characters', () => {
    const result = validateTaskDescription('a'.repeat(500));
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects description longer than 500 characters', () => {
    const result = validateTaskDescription('a'.repeat(501));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Description must be 500 characters or fewer');
  });

  it('accepts normal description', () => {
    const result = validateTaskDescription('This is a task description.');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('validateRejectionReason', () => {
  it('rejects empty string', () => {
    const result = validateRejectionReason('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rejection reason is required (max 250 characters)');
  });

  it('rejects whitespace-only string', () => {
    const result = validateRejectionReason('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rejection reason is required (max 250 characters)');
  });

  it('rejects string longer than 250 characters', () => {
    const result = validateRejectionReason('a'.repeat(251));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rejection reason is required (max 250 characters)');
  });

  it('accepts valid reason of 1 character', () => {
    const result = validateRejectionReason('x');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts valid reason at exactly 250 characters', () => {
    const result = validateRejectionReason('a'.repeat(250));
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts normal rejection reason', () => {
    const result = validateRejectionReason('Not aligned with sprint goals');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

// ─── Property-Based Tests (fast-check) ──────────────────────────────────────

import * as fc from 'fast-check';
import {
  validateDifficulty,
  validateCoinValue,
  validateAdminTaskTitle,
  validateAdminTaskDescription,
} from '../validation';

// Feature: coin-store-system, Property 1: Difficulty validation accepts only valid values
// **Validates: Requirements 1.1, 1.4**
describe('Property 1: Difficulty validation accepts only valid values', () => {
  it('returns valid=true for any valid difficulty value', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('easy', 'medium', 'hard'),
        (input) => {
          const result = validateDifficulty(input);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns valid=false for any arbitrary string that is not easy/medium/hard', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s !== 'easy' && s !== 'medium' && s !== 'hard'),
        (input) => {
          const result = validateDifficulty(input);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns valid=false for non-string types', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.double(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined),
          fc.constant([]),
          fc.constant({})
        ),
        (input) => {
          const result = validateDifficulty(input);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: coin-store-system, Property 5: Coin value validation range
// **Validates: Requirements 3.3, 3.5**
describe('Property 5: Coin value validation range', () => {
  it('returns valid=true for any positive integer in [1, 10000]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        (input) => {
          const result = validateCoinValue(input);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns valid=false for zero, negatives, and values > 10000', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(0),
          fc.integer({ max: -1 }),
          fc.integer({ min: 10001 })
        ),
        (input) => {
          const result = validateCoinValue(input);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns valid=false for decimals (non-integers)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 10000, noInteger: true }),
        (input) => {
          const result = validateCoinValue(input);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns valid=false for NaN and non-numeric types', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(NaN),
          fc.string(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined),
          fc.constant([]),
          fc.constant({})
        ),
        (input) => {
          const result = validateCoinValue(input);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: coin-store-system, Property 11: Admin task form field validation
// **Validates: Requirements 5.5, 5.7**
describe('Property 11: Admin task form field validation', () => {
  describe('Admin task title validation', () => {
    it('accepts non-whitespace-only strings with 1–100 characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
          (input) => {
            const result = validateAdminTaskTitle(input);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects empty strings', () => {
      const result = validateAdminTaskTitle('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects whitespace-only strings', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }).map((len) => ' '.repeat(len)),
          (input) => {
            const result = validateAdminTaskTitle(input);
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects strings exceeding 100 characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 101, maxLength: 200 }),
          (input) => {
            const result = validateAdminTaskTitle(input);
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Admin task description validation', () => {
    it('accepts non-empty strings with 1–500 characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 500 }),
          (input) => {
            const result = validateAdminTaskDescription(input);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects empty strings', () => {
      const result = validateAdminTaskDescription('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects strings exceeding 500 characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 501, maxLength: 600 }),
          (input) => {
            const result = validateAdminTaskDescription(input);
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
