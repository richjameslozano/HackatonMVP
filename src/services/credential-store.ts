/**
 * Credential Store
 *
 * Reads Lark app credentials from environment variables (VITE_LARK_APP_ID,
 * VITE_LARK_APP_SECRET, VITE_LARK_APP_TOKEN) with fallback to config.ts
 * values for local development convenience.
 *
 * Also provides validation and warning utilities to detect placeholder
 * credentials before any API calls are attempted.
 */

import { LARK_CONFIG } from './config';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Credentials {
  appId: string;
  appSecret: string;
  baseAppToken: string;
}

// ─── Placeholder Detection ──────────────────────────────────────────────────

/**
 * Pattern that matches common placeholder credential values.
 * Catches strings like: "your_app_id_here", "YOUR_LARK_APP_SECRET",
 * "REPLACE_ME", "your-token-here", "placeholder", etc.
 */
const PLACEHOLDER_PATTERN = /^(your[_-]|placeholder|replace[_-]?me|xxx|TODO)/i;

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERN.test(value.trim());
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Reads credentials from environment variables, falling back to config.ts
 * values when env vars are not set or are empty strings.
 */
export function getCredentials(): Credentials {
  const appId =
    import.meta.env.VITE_LARK_APP_ID && import.meta.env.VITE_LARK_APP_ID !== ''
      ? (import.meta.env.VITE_LARK_APP_ID as string)
      : LARK_CONFIG.appId;

  const appSecret =
    import.meta.env.VITE_LARK_APP_SECRET && import.meta.env.VITE_LARK_APP_SECRET !== ''
      ? (import.meta.env.VITE_LARK_APP_SECRET as string)
      : LARK_CONFIG.appSecret;

  const baseAppToken =
    import.meta.env.VITE_LARK_APP_TOKEN && import.meta.env.VITE_LARK_APP_TOKEN !== ''
      ? (import.meta.env.VITE_LARK_APP_TOKEN as string)
      : LARK_CONFIG.baseAppToken;

  return { appId, appSecret, baseAppToken };
}

/**
 * Returns false if any credential value matches a placeholder pattern,
 * indicating the credentials are not properly configured.
 */
export function validateCredentials(creds: Credentials): boolean {
  return (
    !isPlaceholder(creds.appId) &&
    !isPlaceholder(creds.appSecret) &&
    !isPlaceholder(creds.baseAppToken)
  );
}

/**
 * Logs a console warning for each credential that still matches a
 * placeholder pattern. Should be called before any API request is attempted.
 */
export function warnIfPlaceholder(creds: Credentials): void {
  if (isPlaceholder(creds.appId)) {
    console.warn(
      '[credential-store] VITE_LARK_APP_ID is still a placeholder value. Set a real app_id in your .env file.',
    );
  }
  if (isPlaceholder(creds.appSecret)) {
    console.warn(
      '[credential-store] VITE_LARK_APP_SECRET is still a placeholder value. Set a real app_secret in your .env file.',
    );
  }
  if (isPlaceholder(creds.baseAppToken)) {
    console.warn(
      '[credential-store] VITE_LARK_APP_TOKEN is still a placeholder value. Set a real app_token in your .env file.',
    );
  }
}
