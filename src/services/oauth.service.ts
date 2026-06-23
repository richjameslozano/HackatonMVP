/**
 * OAuth Service
 *
 * Handles Lark OAuth authorization flow, code exchange for user tokens,
 * and session persistence in browser sessionStorage.
 *
 * The service manages user-level authentication (User Access Token) which
 * is distinct from the tenant-level token managed by auth.service.ts.
 */

import { getTenantToken } from './auth.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const LARK_AUTHORIZE_URL = 'https://open.larksuite.com/open-apis/authen/v1/index';

// Token exchange goes through the proxy (XHR is CORS-sensitive). Dev: Vite
// proxy. Prod: backend reverse-proxy. The authorize redirect below stays direct
// because it is a full-page browser navigation (no CORS).
const baseUrl = import.meta.env.DEV
  ? '/lark-api'
  : `${import.meta.env.VITE_BACKEND_URL ?? ''}/lark-api`;

const TOKEN_EXCHANGE_PATH = '/authen/v1/access_token';

const SESSION_STORAGE_KEY = 'sp-tracker-user-token';

const DEFAULT_REDIRECT_URI = 'http://localhost:5173/auth/callback';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OAuthConfig {
  appId: string;
  redirectUri: string;
  state?: string;
}

export interface UserTokenResponse {
  accessToken: string;
  openId: string;
  expiresIn: number;
  displayName: string;
}

export interface StoredSession {
  userAccessToken: string;
  openId: string;
  expiresAt: number;
  displayName?: string;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Constructs the Lark OAuth authorization URL with required query parameters.
 * The user is redirected to this URL to initiate the sign-in flow.
 */
export function buildAuthorizationUrl(config: OAuthConfig): string {
  const url = new URL(LARK_AUTHORIZE_URL);
  url.searchParams.set('app_id', config.appId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  if (config.state) {
    url.searchParams.set('state', config.state);
  }
  return url.toString();
}

/**
 * Exchanges an authorization code for a User Access Token by POSTing
 * to the Lark authen token endpoint.
 *
 * Requires a valid app_access_token (tenant token) in the Authorization header.
 * Returns the access token, the user's open_id, and the token's lifetime.
 */
export async function exchangeCodeForToken(code: string): Promise<UserTokenResponse> {
  // Lark requires app_access_token (tenant token) to authorize this call
  const appAccessToken = await getTenantToken();

  const response = await fetch(`${baseUrl}${TOKEN_EXCHANGE_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${appAccessToken}`,
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    code: number;
    msg: string;
    data?: {
      access_token: string;
      token_type: string;
      expires_in: number;
      name: string;
      en_name: string;
      avatar_url: string;
      avatar_thumb: string;
      avatar_middle: string;
      avatar_big: string;
      open_id: string;
      union_id: string;
      tenant_key: string;
    };
  };

  if (data.code !== 0 || !data.data) {
    throw new Error(`Token exchange error: ${data.msg} (code ${data.code})`);
  }

  return {
    accessToken: data.data.access_token,
    openId: data.data.open_id,
    expiresIn: data.data.expires_in,
    displayName: data.data.name || data.data.en_name || '',
  };
}

/**
 * Reads the stored session from localStorage (preferred) or sessionStorage (legacy fallback).
 * Returns null if no session exists or if the session has expired.
 */
export function getStoredSession(): StoredSession | null {
  // Check localStorage first (new), then fall back to sessionStorage (legacy)
  let raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    // Migrate to localStorage if found in sessionStorage
    if (raw) {
      localStorage.setItem(SESSION_STORAGE_KEY, raw);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }
  if (!raw) {
    return null;
  }

  try {
    const session = JSON.parse(raw) as StoredSession;

    // Validate required fields
    if (!session.userAccessToken || !session.openId || !session.expiresAt) {
      return null;
    }

    // Check expiration
    if (session.expiresAt <= Date.now()) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Persists the user session to localStorage so it survives page refreshes
 * and tab switches.
 */
export function storeSession(session: StoredSession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

/**
 * Removes the stored session from both localStorage and sessionStorage.
 */
export function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Returns the configured redirect URI from environment variable,
 * falling back to the default localhost callback URL.
 */
export function getRedirectUri(): string {
  const envUri = import.meta.env.VITE_LARK_REDIRECT_URI;
  return envUri && envUri !== '' ? (envUri as string) : DEFAULT_REDIRECT_URI;
}
