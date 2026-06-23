/**
 * Unit tests for the prebuild env-validation guard.
 *
 * Covers edge cases for `validateEnv`:
 *   - a single missing variable reports exactly that one name
 *   - empty-string and whitespace-only values are treated as missing
 *   - all required variables present → ok === true, missing === []
 *
 * Validates: Requirements 3.5
 */

import { describe, it, expect } from 'vitest';
import { validateEnv, REQUIRED_VITE_VARS } from './validateEnv';

/** Build an env map where every required var has a valid non-empty value. */
function fullyPopulatedEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const name of REQUIRED_VITE_VARS) {
    env[name] = `value-for-${name}`;
  }
  return env;
}

describe('validateEnv', () => {
  it('reports exactly the one missing variable name when a single var is absent', () => {
    const env = fullyPopulatedEnv();
    const targetName = REQUIRED_VITE_VARS[2];
    delete env[targetName];

    const result = validateEnv(env);

    expect(result.ok).toBe(false);
    expect(result.missing).toEqual([targetName]);
  });

  it('treats an empty-string value as missing', () => {
    const env = fullyPopulatedEnv();
    const targetName = REQUIRED_VITE_VARS[0];
    env[targetName] = '';

    const result = validateEnv(env);

    expect(result.ok).toBe(false);
    expect(result.missing).toEqual([targetName]);
  });

  it('treats a whitespace-only value as missing', () => {
    const env = fullyPopulatedEnv();
    const targetName = REQUIRED_VITE_VARS[1];
    env[targetName] = '   \t  ';

    const result = validateEnv(env);

    expect(result.ok).toBe(false);
    expect(result.missing).toEqual([targetName]);
  });

  it('treats an undefined value as missing', () => {
    const env = fullyPopulatedEnv();
    const targetName = REQUIRED_VITE_VARS[3];
    env[targetName] = undefined as unknown as string;

    const result = validateEnv(env);

    expect(result.ok).toBe(false);
    expect(result.missing).toEqual([targetName]);
  });

  it('returns ok === true and missing === [] when all required vars are present', () => {
    const env = fullyPopulatedEnv();

    const result = validateEnv(env);

    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('collects every missing name when multiple vars are absent', () => {
    const result = validateEnv({});

    expect(result.ok).toBe(false);
    expect(result.missing).toEqual([...REQUIRED_VITE_VARS]);
  });
});
