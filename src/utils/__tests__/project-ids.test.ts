import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { serializeProjectIds, deserializeProjectIds } from '../project-ids';

// ─── Property 10: Project IDs serialization round-trip ──────────────────────
// Feature: coin-store-system, Property 10: Project IDs serialization round-trip
// **Validates: Requirements 5.6**

describe('Property 10: Project IDs serialization round-trip', () => {
  // Project IDs are non-empty strings without commas, no leading/trailing whitespace
  // The deserializer trims each ID after splitting, so round-trip only holds
  // for strings that are already trimmed and non-empty.
  const projectIdArb = fc.string({ minLength: 1 }).filter(
    (s) => !s.includes(',') && s.trim().length > 0 && s === s.trim()
  );

  it('serializeProjectIds → deserializeProjectIds round-trips exactly for non-empty string arrays without commas', () => {
    fc.assert(
      fc.property(
        fc.array(projectIdArb, { minLength: 1, maxLength: 20 }),
        (ids) => {
          const serialized = serializeProjectIds(ids);
          const deserialized = deserializeProjectIds(serialized);

          expect(deserialized).toEqual(ids);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('serialized string has exactly n-1 commas for n IDs', () => {
    fc.assert(
      fc.property(
        fc.array(projectIdArb, { minLength: 1, maxLength: 20 }),
        (ids) => {
          const serialized = serializeProjectIds(ids);
          const commaCount = (serialized.match(/,/g) || []).length;

          expect(commaCount).toBe(ids.length - 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('deserialized result equals original array', () => {
    fc.assert(
      fc.property(
        fc.array(projectIdArb, { minLength: 0, maxLength: 20 }),
        (ids) => {
          const serialized = serializeProjectIds(ids);
          const deserialized = deserializeProjectIds(serialized);

          expect(deserialized).toEqual(ids);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('handles empty array serialization', () => {
    const serialized = serializeProjectIds([]);
    const deserialized = deserializeProjectIds(serialized);
    expect(deserialized).toEqual([]);
  });
});
