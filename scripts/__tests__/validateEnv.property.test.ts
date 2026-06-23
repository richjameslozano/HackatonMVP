/**
 * Property test for the env-validation prebuild guard.
 *
 * Feature: deployment-vercel, Property 1: Missing required VITE_ variable fails
 * the build with the variable name.
 *
 * Validates: Requirements 3.5
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { REQUIRED_VITE_VARS, validateEnv } from '../validateEnv';

/** Build a fully-populated env where every required var has a non-empty value. */
function fullyPopulatedEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const name of REQUIRED_VITE_VARS) {
    env[name] = `value-for-${name}`;
  }
  return env;
}

describe('validateEnv — Property 1: missing required VITE_ vars fail and are named', () => {
  it('reports exactly the removed variables as missing (and only those)', () => {
    fc.assert(
      fc.property(
        // Random subset of the six required vars to remove from a full env.
        fc.subarray([...REQUIRED_VITE_VARS]),
        (toRemove) => {
          const env = fullyPopulatedEnv();
          for (const name of toRemove) {
            delete env[name];
          }

          const { ok, missing } = validateEnv(env);

          if (toRemove.length === 0) {
            // Empty-subset case: nothing removed → valid.
            expect(ok).toBe(true);
            expect(missing).toEqual([]);
          } else {
            // At least one removed → invalid, and missing names exactly the removed set.
            expect(ok).toBe(false);
            expect([...missing].sort()).toEqual([...toRemove].sort());
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
