/**
 * Auth Service
 *
 * Manages tenant access token acquisition, caching, and retry logic for
 * Lark Base API calls. Extracted from lark-api.service.ts to separate
 * authentication concerns from API request logic.
 *
 * Credentials are sourced from credential-store.ts (env vars with config.ts fallback).
 */

import { RETRY_CONFIG } from './config';
import { getCredentials } from './credential-store';

// ─── Token Cache ────────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number; // Unix ms
}

let tokenCache: TokenCache | null = null;

// ─── Internal Helpers ───────────────────────────────────────────────────────

const REQUEST_TIMEOUT_MS = RETRY_CONFIG.timeoutMs;

// Dev: Vite proxy (/lark-api). Prod: backend reverse-proxy to avoid browser CORS.
const baseUrl = import.meta.env.DEV
  ? '/lark-api'
  : `${import.meta.env.VITE_BACKEND_URL ?? ''}/lark-api`;

/**
 * Creates an AbortController that auto-aborts after the configured timeout.
 * Uses setTimeout so it works with fake timers in tests.
 */
export function createTimeoutSignal(): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
}

async function fetchTenantToken(): Promise<string> {
  const now = Date.now();

  if (tokenCache && tokenCache.expiresAt > now) {
    return tokenCache.token;
  }

  const credentials = getCredentials();
  const { signal, cleanup } = createTimeoutSignal();

  try {
    const response = await fetch(
      `${baseUrl}/auth/v3/tenant_access_token/internal`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: credentials.appId,
          app_secret: credentials.appSecret,
        }),
        signal,
      }
    );

    if (!response.ok) {
      throw new Error(`Token fetch failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      code: number;
      msg: string;
      tenant_access_token: string;
      expire: number;
    };

    if (data.code !== 0) {
      throw new Error(`Token fetch error: ${data.msg} (code ${data.code})`);
    }

    tokenCache = {
      token: data.tenant_access_token,
      expiresAt: now + (data.expire - 60) * 1000,
    };

    return data.tenant_access_token;
  } finally {
    cleanup();
  }
}

// ─── Retry Logic ────────────────────────────────────────────────────────────

/**
 * Executes a function with up to 3 retries.
 * On each retry, the token cache is invalidated so a fresh token is obtained.
 * AbortError from timeout is translated to a readable timeout message.
 * Non-retryable errors (token issues, record not found) are thrown immediately.
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
      } else {
        lastError = error;
      }

      // Non-retryable errors: token issues and business logic errors
      const errorMsg = lastError instanceof Error ? lastError.message : '';
      if (errorMsg.startsWith('Token fetch') || errorMsg.includes('record not found')) {
        throw lastError;
      }

      if (attempt < RETRY_CONFIG.maxAttempts) {
        // Invalidate token cache so next attempt fetches a fresh token
        tokenCache = null;
      }
    }
  }

  throw lastError;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns a valid tenant access token, fetching a new one if the cache
 * is empty or expired.
 */
export async function getTenantToken(): Promise<string> {
  return fetchTenantToken();
}

/**
 * Invalidates the token cache so the next call to getTenantToken()
 * will fetch a fresh token. Used before retries per requirements.
 */
export function invalidateTokenCache(): void {
  tokenCache = null;
}

/**
 * Resets the token cache to null. Exposed for testing purposes only.
 */
export function resetTokenCache(): void {
  tokenCache = null;
}
