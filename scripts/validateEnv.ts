/**
 * Prebuild env-validation guard for the Render Static Site build.
 *
 * Exports a pure `validateEnv` function (safe to import in tests) and a CLI
 * entrypoint (run via `tsx scripts/validateEnv.ts`) that fails the build when
 * any required VITE_ variable is missing.
 *
 * Requirements: 3.5
 */

import { pathToFileURL } from 'node:url';
import process from 'node:process';

/** The canonical list of required frontend build-time variables. */
export const REQUIRED_VITE_VARS = [
  'VITE_BACKEND_URL',
  'VITE_WS_URL',
  'VITE_LARK_APP_ID',
  'VITE_LARK_APP_TOKEN',
  'VITE_LARK_REDIRECT_URI',
  'VITE_API_SHARED_SECRET',
] as const;

/**
 * Validates that every required VITE_ variable is present and non-empty.
 *
 * A variable is considered missing when it is absent, an empty string, or
 * whitespace-only. All missing names are collected (the check does not stop at
 * the first one).
 *
 * This function is pure: it reads only the provided `env` map and performs no
 * I/O or process side effects.
 */
export function validateEnv(
  env: Record<string, string | undefined>,
): { ok: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const name of REQUIRED_VITE_VARS) {
    const value = env[name];
    if (value === undefined || value.trim() === '') {
      missing.push(name);
    }
  }

  return { ok: missing.length === 0, missing };
}

/**
 * CLI entrypoint: validate `process.env`, print missing names to stderr, and
 * exit non-zero when any required variable is absent.
 */
function main(): void {
  const { ok, missing } = validateEnv(process.env);

  if (!ok) {
    process.stderr.write(
      'Missing required environment variable(s) for the build:\n',
    );
    for (const name of missing) {
      process.stderr.write(`  - ${name}\n`);
    }
    process.exit(1);
  }

  process.exit(0);
}

// Only run the side-effecting CLI logic when this module is executed directly
// (via tsx), not when imported by tests, so importing `validateEnv` stays pure.
const invokedPath = process.argv[1];
const isDirectRun =
  typeof invokedPath === 'string' &&
  import.meta.url === pathToFileURL(invokedPath).href;

if (isDirectRun) {
  main();
}
