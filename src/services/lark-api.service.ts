import type { LarkFilter, LarkRecord, LarkSort } from '../types';
import { LARK_CONFIG, RETRY_CONFIG } from './config';

// ─── Lark Field Value Extraction ────────────────────────────────────────────

/**
 * Extracts a plain string from a Lark Bitable field value.
 * Lark returns text fields as arrays: [{text: "value", type: "text"}]
 * This handles both the array format and plain string format.
 */
export function extractTextValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (typeof first === 'object' && first !== null && 'text' in first) {
      return (first as { text: string }).text;
    }
    if (typeof first === 'string') return first;
  }
  return '';
}

/**
 * Extracts a number from a Lark Bitable field value.
 */
export function extractNumberValue(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

// ─── Token Cache ────────────────────────────────────────────────────────────

interface TokenCache {
    token: string;
    expiresAt: number; // Unix ms
}

let tokenCache: TokenCache | null = null;

/**
 * Resets the internal token cache. Exposed for testing purposes only.
 */
export function _resetTokenCache(): void {
    tokenCache = null;
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

const REQUEST_TIMEOUT_MS = RETRY_CONFIG.timeoutMs;

/**
 * Creates an AbortController that auto-aborts after the configured timeout.
 * Uses setTimeout so it works with fake timers in tests.
 */
function createTimeoutSignal(): { signal: AbortSignal; cleanup: () => void } {
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

    const { signal, cleanup } = createTimeoutSignal();

    try {
        const response = await fetch(
            `${LARK_CONFIG.baseUrl}/auth/v3/tenant_access_token/internal`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app_id: LARK_CONFIG.appId,
                    app_secret: LARK_CONFIG.appSecret,
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
 * On each retry, the token cache is reset so a fresh token is obtained.
 * AbortError from timeout is translated to a readable timeout message.
 * Non-retryable errors (token issues, record not found) are thrown immediately.
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
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
                // Reset token cache so next attempt fetches a fresh token
                tokenCache = null;
            }
        }
    }

    throw lastError;
}

// ─── URL Construction ───────────────────────────────────────────────────────

function getBaseTableUrl(tableId: string): string {
    return `${LARK_CONFIG.baseUrl}/bitable/v1/apps/${LARK_CONFIG.baseAppToken}/tables/${tableId}/records`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Lists records from a Bitable table using the search endpoint.
 * Supports optional filter and sort via request body.
 */
export async function listRecords(
    tableId: string,
    filter?: LarkFilter,
    sort?: LarkSort[]
): Promise<LarkRecord[]> {
    return withRetry(async () => {
        const token = await fetchTenantToken();
        const url = `${getBaseTableUrl(tableId)}/search`;

        const body: Record<string, unknown> = {};
        if (filter) body.filter = filter;
        if (sort) body.sort = sort;

        const { signal, cleanup } = createTimeoutSignal();

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
                signal,
            });

            if (!response.ok) {
                throw new Error(`listRecords failed: ${response.status}`);
            }

            const data = (await response.json()) as {
                code: number;
                msg: string;
                data: { items?: Array<{ record_id: string; fields: Record<string, unknown> }> };
            };

            if (!data.data?.items) {
                return [];
            }

            return data.data.items.map((item) => ({
                record_id: item.record_id,
                fields: item.fields,
            }));
        } finally {
            cleanup();
        }
    });
}

/**
 * Gets a single record by ID from a Bitable table.
 */
export async function getRecord(
    tableId: string,
    recordId: string
): Promise<LarkRecord> {
    return withRetry(async () => {
        const token = await fetchTenantToken();
        const url = `${getBaseTableUrl(tableId)}/${recordId}`;

        const { signal, cleanup } = createTimeoutSignal();

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                signal,
            });

            if (!response.ok) {
                throw new Error(`getRecord failed: ${response.status}`);
            }

            const data = (await response.json()) as {
                code: number;
                msg: string;
                data: { record?: { record_id: string; fields: Record<string, unknown> } };
            };

            if (!data.data?.record) {
                throw new Error('getRecord: record not found');
            }

            return {
                record_id: data.data.record.record_id,
                fields: data.data.record.fields,
            };
        } finally {
            cleanup();
        }
    });
}

/**
 * Creates a new record in a Bitable table.
 */
export async function createRecord(
    tableId: string,
    fields: Record<string, unknown>
): Promise<LarkRecord> {
    return withRetry(async () => {
        const token = await fetchTenantToken();
        const url = getBaseTableUrl(tableId);

        const { signal, cleanup } = createTimeoutSignal();

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fields }),
                signal,
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`createRecord failed: ${response.status} - ${errorBody}`);
            }

            const data = (await response.json()) as {
                code: number;
                msg: string;
                data: { record: { record_id: string; fields: Record<string, unknown> } };
            };

            if (data.code !== 0) {
                throw new Error(`createRecord API error: ${data.msg} (code ${data.code})`);
            }

            return {
                record_id: data.data.record.record_id,
                fields: data.data.record.fields,
            };
        } finally {
            cleanup();
        }
    });
}

/**
 * Updates an existing record in a Bitable table.
 */
export async function updateRecord(
    tableId: string,
    recordId: string,
    fields: Record<string, unknown>
): Promise<LarkRecord> {
    return withRetry(async () => {
        const token = await fetchTenantToken();
        const url = `${getBaseTableUrl(tableId)}/${recordId}`;

        const { signal, cleanup } = createTimeoutSignal();

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fields }),
                signal,
            });

            if (!response.ok) {
                throw new Error(`updateRecord failed: ${response.status}`);
            }

            const data = (await response.json()) as {
                code: number;
                msg: string;
                data: { record: { record_id: string; fields: Record<string, unknown> } };
            };

            return {
                record_id: data.data.record.record_id,
                fields: data.data.record.fields,
            };
        } finally {
            cleanup();
        }
    });
}
