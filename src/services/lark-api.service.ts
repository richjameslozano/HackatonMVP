import type { LarkFilter, LarkRecord, LarkSort } from '../types';
import { BACKEND_CONFIG, LARK_CONFIG } from './config';
import { createTimeoutSignal, getTenantToken } from './auth.service';
import { useAppStore } from '../store/app.store';

// ─── Constants ──────────────────────────────────────────────────────────────

const RETRY_DELAY_502_MS = 3_000;
const RETRY_DELAY_503_MS = 10_000;

// ─── Backend Error Handling ─────────────────────────────────────────────────

/**
 * Checks if an error is a network error (fetch threw, not an HTTP response).
 */
function isNetworkError(error: unknown): boolean {
    if (error instanceof TypeError) return true;
    if (error instanceof DOMException && error.name === 'AbortError') return true;
    return false;
}

/**
 * Delays execution for the specified number of milliseconds.
 */
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps a backend API call with connectivity-aware error handling:
 * - On HTTP 502 or network error: shows error banner, retries once after 3 seconds
 * - On HTTP 503 (queue full): shows transient warning, retries after 10 seconds (flush interval)
 * - Other errors: throws immediately for upstream handling
 */
async function withBackendRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
        const result = await fn();
        // On success, clear any previous backend error/warning
        const store = useAppStore.getState();
        if (store.backendError) store.setBackendError(null);
        if (store.backendWarning) store.setBackendWarning(null);
        return result;
    } catch (error) {
        const status = extractHttpStatus(error);

        if (status === 502 || isNetworkError(error)) {
            // Show error banner for connectivity issues
            useAppStore.getState().setBackendError(
                'Temporary connectivity issue with the backend. Retrying...'
            );

            // Retry once after 3 seconds
            await delay(RETRY_DELAY_502_MS);

            try {
                const result = await fn();
                useAppStore.getState().setBackendError(null);
                return result;
            } catch (retryError) {
                // Retry failed — keep the error banner visible and throw
                useAppStore.getState().setBackendError(
                    'Backend is currently unavailable. Please try again later.'
                );
                throw retryError;
            }
        }

        if (status === 503) {
            // Show transient warning for queue full
            useAppStore.getState().setBackendWarning(
                'Write queue is full. Retrying after flush completes...'
            );

            // Retry after flush interval (10 seconds)
            await delay(RETRY_DELAY_503_MS);

            try {
                const result = await fn();
                useAppStore.getState().setBackendWarning(null);
                return result;
            } catch (retryError) {
                useAppStore.getState().setBackendWarning(
                    'Write queue is still full. Please try again in a moment.'
                );
                throw retryError;
            }
        }

        // For all other errors, re-throw without retry
        throw error;
    }
}

/**
 * Extracts HTTP status code from an error message (e.g. "listRecords failed: 502").
 */
function extractHttpStatus(error: unknown): number | null {
    if (error instanceof Error) {
        const match = error.message.match(/failed:\s*(\d{3})/);
        if (match && match[1]) return parseInt(match[1], 10);
    }
    return null;
}

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

// ─── URL Construction ───────────────────────────────────────────────────────

function getBaseTableUrl(tableId: string): string {
    return `${LARK_CONFIG.baseUrl}/bitable/v1/apps/${LARK_CONFIG.baseAppToken}/tables/${tableId}/records`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Lists records from a table using the backend search endpoint.
 * Supports optional filter and sort via request body.
 */
export async function listRecords(
    tableId: string,
    filter?: LarkFilter,
    sort?: LarkSort[]
): Promise<LarkRecord[]> {
    return withBackendRetry(async () => {
        const url = `${getBaseTableUrl(tableId)}/search`;

        const body: Record<string, unknown> = {};
        if (filter) body.filter = filter;
        if (sort) body.sort = sort;

        const { signal, cleanup } = createTimeoutSignal();

        try {
            const token = await getTenantToken();
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
 * Gets a single record by ID from a table via the backend.
 */
export async function getRecord(
    tableId: string,
    recordId: string
): Promise<LarkRecord> {
    return withBackendRetry(async () => {
        const url = `${getBaseTableUrl(tableId)}/${recordId}`;

        const { signal, cleanup } = createTimeoutSignal();

        try {
            const token = await getTenantToken();
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
 * Creates a new record in a table via the backend.
 * If sync=true, the record is created directly in Lark (returns permanent ID).
 * If sync=false (default), it's queued for batch flush (returns temp ID).
 */
export async function createRecord(
    tableId: string,
    fields: Record<string, unknown>,
    options?: { sync?: boolean }
): Promise<LarkRecord> {
    return withBackendRetry(async () => {
        const url = `${getBaseTableUrl(tableId)}`;

        const { signal, cleanup } = createTimeoutSignal();

        try {
            const token = await getTenantToken();
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
 * Updates an existing record in a table via the backend.
 */
export async function updateRecord(
    tableId: string,
    recordId: string,
    fields: Record<string, unknown>
): Promise<LarkRecord> {
    return withBackendRetry(async () => {
        const url = `${getBaseTableUrl(tableId)}/${recordId}`;

        const { signal, cleanup } = createTimeoutSignal();

        try {
            const token = await getTenantToken();
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
                data?: { record?: { record_id: string; fields: Record<string, unknown> } };
            };

            if (data.data?.record) {
                return {
                    record_id: data.data.record.record_id,
                    fields: data.data.record.fields,
                };
            }

            return {
                record_id: recordId,
                fields,
            };
        } finally {
            cleanup();
        }
    });
}
