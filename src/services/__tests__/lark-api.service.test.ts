import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock the store ─────────────────────────────────────────────────────────

const mockSetBackendError = vi.fn();
const mockSetBackendWarning = vi.fn();

vi.mock('../../store/app.store', () => ({
    useAppStore: {
        getState: () => ({
            backendError: null,
            backendWarning: null,
            setBackendError: mockSetBackendError,
            setBackendWarning: mockSetBackendWarning,
        }),
    },
}));

// ─── Mock config ────────────────────────────────────────────────────────────

vi.mock('../config', () => ({
    BACKEND_CONFIG: {
        baseUrl: 'http://localhost:8000',
        apiSecret: 'test-shared-secret',
    },
    LARK_CONFIG: {
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
        baseAppToken: 'test-base-token',
        baseUrl: '/lark-api',
    },
    TABLE_IDS: {
        members: 'tblMembers',
        quests: 'tblQuests',
    },
    RETRY_CONFIG: {
        maxAttempts: 3,
        timeoutMs: 10_000,
    },
}));

// ─── Mock fetch globally ────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ─── Import after mocks ─────────────────────────────────────────────────────

import { listRecords, getRecord, createRecord, updateRecord } from '../lark-api.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockSuccessResponse(data: unknown) {
    return {
        ok: true,
        status: 200,
        json: async () => data,
        text: async () => JSON.stringify(data),
    };
}

function mockErrorResponse(status: number) {
    return {
        ok: false,
        status,
        json: async () => ({ error: `Error ${status}` }),
        text: async () => `Error ${status}`,
    };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('lark-api.service (backend migration)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    // ─── Requirement 6.1: Calls go to backend URL ───────────────────────────

    describe('backend URL routing', () => {
        it('listRecords calls POST to {BACKEND_CONFIG.baseUrl}/api/tables/{tableId}/records/search', async () => {
            mockFetch.mockResolvedValueOnce(
                mockSuccessResponse({ records: [{ record_id: 'rec1', fields: { name: 'Test' } }] }),
            );

            const promise = listRecords('tblQuests');
            // Advance timers to resolve any internal timeouts
            await vi.runAllTimersAsync();
            await promise;

            expect(mockFetch).toHaveBeenCalledTimes(1);
            const [url, options] = mockFetch.mock.calls[0]!;
            expect(url).toBe('http://localhost:8000/api/tables/tblQuests/records/search');
            expect(options.method).toBe('POST');
        });

        it('getRecord calls GET to {BACKEND_CONFIG.baseUrl}/api/tables/{tableId}/records/{recordId}', async () => {
            mockFetch.mockResolvedValueOnce(
                mockSuccessResponse({ record_id: 'rec1', fields: { name: 'Test' } }),
            );

            const promise = getRecord('tblQuests', 'rec1');
            await vi.runAllTimersAsync();
            await promise;

            expect(mockFetch).toHaveBeenCalledTimes(1);
            const [url, options] = mockFetch.mock.calls[0]!;
            expect(url).toBe('http://localhost:8000/api/tables/tblQuests/records/rec1');
            expect(options.method).toBe('GET');
        });

        it('createRecord calls POST to {BACKEND_CONFIG.baseUrl}/api/tables/{tableId}/records', async () => {
            mockFetch.mockResolvedValueOnce(
                mockSuccessResponse({ record_id: 'temp_abc', fields: { title: 'New' } }),
            );

            const promise = createRecord('tblQuests', { title: 'New' });
            await vi.runAllTimersAsync();
            await promise;

            expect(mockFetch).toHaveBeenCalledTimes(1);
            const [url, options] = mockFetch.mock.calls[0]!;
            expect(url).toBe('http://localhost:8000/api/tables/tblQuests/records');
            expect(options.method).toBe('POST');
        });

        it('updateRecord calls PUT to {BACKEND_CONFIG.baseUrl}/api/tables/{tableId}/records/{recordId}', async () => {
            mockFetch.mockResolvedValueOnce(
                mockSuccessResponse({ record_id: 'rec1', fields: { status: 'active' } }),
            );

            const promise = updateRecord('tblQuests', 'rec1', { status: 'active' });
            await vi.runAllTimersAsync();
            await promise;

            expect(mockFetch).toHaveBeenCalledTimes(1);
            const [url, options] = mockFetch.mock.calls[0]!;
            expect(url).toBe('http://localhost:8000/api/tables/tblQuests/records/rec1');
            expect(options.method).toBe('PUT');
        });

        it('does NOT call Lark API directly (no /open-apis or /lark-api in URL)', async () => {
            mockFetch.mockResolvedValueOnce(
                mockSuccessResponse({ records: [] }),
            );

            const promise = listRecords('tblQuests');
            await vi.runAllTimersAsync();
            await promise;

            const [url] = mockFetch.mock.calls[0]!;
            expect(url).not.toContain('/open-apis');
            expect(url).not.toContain('/lark-api');
            expect(url).not.toContain('larksuite.com');
        });
    });

    // ─── Requirement 6.2: Authorization header uses shared secret ────────────

    describe('Authorization header', () => {
        it('all requests include Authorization: Bearer {BACKEND_CONFIG.apiSecret} header', async () => {
            mockFetch.mockResolvedValue(
                mockSuccessResponse({ records: [], record_id: 'rec1', fields: {} }),
            );

            const p1 = listRecords('tblQuests');
            await vi.runAllTimersAsync();
            await p1;

            const p2 = getRecord('tblQuests', 'rec1');
            await vi.runAllTimersAsync();
            await p2;

            const p3 = createRecord('tblQuests', { title: 'x' });
            await vi.runAllTimersAsync();
            await p3;

            const p4 = updateRecord('tblQuests', 'rec1', { status: 'done' });
            await vi.runAllTimersAsync();
            await p4;

            for (const call of mockFetch.mock.calls) {
                const options = call[1] as RequestInit;
                const headers = options.headers as Record<string, string>;
                expect(headers.Authorization).toBe('Bearer test-shared-secret');
            }
        });

        it('does NOT use tenant_access_token for authorization', async () => {
            mockFetch.mockResolvedValueOnce(
                mockSuccessResponse({ records: [] }),
            );

            const promise = listRecords('tblQuests');
            await vi.runAllTimersAsync();
            await promise;

            // Should only be 1 call (no separate token fetch)
            expect(mockFetch).toHaveBeenCalledTimes(1);
            // The URL should not be a token endpoint
            const [url] = mockFetch.mock.calls[0]!;
            expect(url).not.toContain('tenant_access_token');
        });
    });

    // ─── Requirement 6.6: Error banner on 502 and retry after 3 seconds ─────

    describe('HTTP 502 handling', () => {
        it('on HTTP 502 response, sets backendError state (error banner shown)', async () => {
            mockFetch
                .mockResolvedValueOnce(mockErrorResponse(502))
                .mockResolvedValueOnce(
                    mockSuccessResponse({ records: [{ record_id: 'rec1', fields: {} }] }),
                );

            const promise = listRecords('tblQuests');

            // Let the first fetch resolve (502), which triggers setBackendError
            await vi.advanceTimersByTimeAsync(0);

            expect(mockSetBackendError).toHaveBeenCalledWith(
                expect.stringContaining('Retrying'),
            );

            // Advance 3 seconds for the retry delay
            await vi.advanceTimersByTimeAsync(3_000);
            await promise;
        });

        it('on HTTP 502, retries once after 3 seconds', async () => {
            mockFetch
                .mockResolvedValueOnce(mockErrorResponse(502))
                .mockResolvedValueOnce(
                    mockSuccessResponse({ records: [{ record_id: 'rec1', fields: {} }] }),
                );

            const promise = listRecords('tblQuests');

            // Initially only 1 call made
            await vi.advanceTimersByTimeAsync(0);
            expect(mockFetch).toHaveBeenCalledTimes(1);

            // Advance less than 3 seconds — no retry yet
            await vi.advanceTimersByTimeAsync(2_999);
            expect(mockFetch).toHaveBeenCalledTimes(1);

            // Advance to 3 seconds — retry fires
            await vi.advanceTimersByTimeAsync(1);
            await promise;

            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it('clears backendError on successful retry', async () => {
            mockFetch
                .mockResolvedValueOnce(mockErrorResponse(502))
                .mockResolvedValueOnce(
                    mockSuccessResponse({ records: [] }),
                );

            const promise = listRecords('tblQuests');
            await vi.advanceTimersByTimeAsync(3_000);
            await promise;

            // Should clear error after successful retry
            expect(mockSetBackendError).toHaveBeenCalledWith(null);
        });

        it('keeps error banner visible if retry also fails', async () => {
            mockFetch
                .mockResolvedValueOnce(mockErrorResponse(502))
                .mockResolvedValueOnce(mockErrorResponse(502));

            const promise = listRecords('tblQuests').catch(() => {});
            await vi.advanceTimersByTimeAsync(3_000);
            await promise;

            // Should set a persistent error message
            expect(mockSetBackendError).toHaveBeenLastCalledWith(
                expect.stringContaining('unavailable'),
            );
        });
    });
});
