import type { LarkFilter, LarkRecord, LarkSort } from '../types';
import { LARK_CONFIG } from './config';
import { getTenantToken, withRetry, createTimeoutSignal } from './auth.service';

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
 * Lists records from a Bitable table using the search endpoint.
 * Supports optional filter and sort via request body.
 */
export async function listRecords(
    tableId: string,
    filter?: LarkFilter,
    sort?: LarkSort[]
): Promise<LarkRecord[]> {
    return withRetry(async () => {
        const token = await getTenantToken();
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
        const token = await getTenantToken();
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
        const token = await getTenantToken();
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
        const token = await getTenantToken();
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
                data?: { record?: { record_id: string; fields: Record<string, unknown> } };
            };

            if (data.code !== 0) {
                throw new Error(`updateRecord API error: ${data.msg} (code ${data.code})`);
            }

            // Lark API may not always return the full record in the response
            if (data.data?.record) {
                return {
                    record_id: data.data.record.record_id,
                    fields: data.data.record.fields,
                };
            }

            // Fallback: re-fetch the record to get the updated state
            const refetchUrl = `${getBaseTableUrl(tableId)}/${recordId}`;
            const { signal: refetchSignal, cleanup: refetchCleanup } = createTimeoutSignal();
            try {
                const refetchResponse = await fetch(refetchUrl, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    signal: refetchSignal,
                });
                if (refetchResponse.ok) {
                    const refetchData = (await refetchResponse.json()) as {
                        data?: { record?: { record_id: string; fields: Record<string, unknown> } };
                    };
                    if (refetchData.data?.record) {
                        return {
                            record_id: refetchData.data.record.record_id,
                            fields: refetchData.data.record.fields,
                        };
                    }
                }
            } finally {
                refetchCleanup();
            }

            // Last resort: return what we know
            return {
                record_id: recordId,
                fields,
            };
        } finally {
            cleanup();
        }
    });
}
