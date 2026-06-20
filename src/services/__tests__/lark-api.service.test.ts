import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listRecords, getRecord, createRecord, updateRecord } from '../lark-api.service';
import { resetTokenCache } from '../auth.service';

// ─── Mock fetch globally ────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockTokenResponse() {
    return {
        ok: true,
        json: async () => ({
            code: 0,
            msg: 'ok',
            tenant_access_token: 'test-token-123',
            expire: 7200,
        }),
    };
}

function mockSuccessResponse(data: unknown) {
    return {
        ok: true,
        json: async () => ({ code: 0, msg: 'ok', data }),
    };
}

function mockErrorResponse(status: number, statusText: string) {
    return {
        ok: false,
        status,
        statusText,
        json: async () => ({ code: status, msg: statusText }),
    };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('lark-api.service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetTokenCache();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('listRecords', () => {
        it('should fetch records from the search endpoint', async () => {
            mockFetch
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(
                    mockSuccessResponse({
                        items: [
                            { record_id: 'rec1', fields: { name: 'Test Quest' } },
                            { record_id: 'rec2', fields: { name: 'Another Quest' } },
                        ],
                    }),
                );

            const result = await listRecords('tbl_quests');

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({ record_id: 'rec1', fields: { name: 'Test Quest' } });
            expect(result[1]).toEqual({ record_id: 'rec2', fields: { name: 'Another Quest' } });
        });

        it('should pass filter and sort to the request body', async () => {
            mockFetch
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(mockSuccessResponse({ items: [] }));

            const filter = {
                conjunction: 'and' as const,
                conditions: [{ field_name: 'role', operator: 'is' as const, value: ['agent'] }],
            };
            const sort = [{ field_name: 'created_at', order: 'desc' as const }];

            await listRecords('tbl_quests', filter, sort);

            const lastCall = mockFetch.mock.calls[1];
            const body = JSON.parse(lastCall![1]?.body as string) as unknown;
            expect(body).toEqual({ filter, sort });
        });

        it('should return empty array when no items exist', async () => {
            mockFetch
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(mockSuccessResponse({}));

            const result = await listRecords('tbl_quests');
            expect(result).toEqual([]);
        });
    });

    describe('getRecord', () => {
        it('should fetch a single record by ID', async () => {
            mockFetch
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(
                    mockSuccessResponse({
                        record: { record_id: 'rec1', fields: { name: 'Test' } },
                    }),
                );

            const result = await getRecord('tbl_members', 'rec1');

            expect(result).toEqual({ record_id: 'rec1', fields: { name: 'Test' } });
        });

        it('should throw when record is not found', async () => {
            mockFetch
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(mockSuccessResponse({}));

            await expect(getRecord('tbl_members', 'nonexistent')).rejects.toThrow(
                'getRecord: record not found',
            );
        });
    });

    describe('createRecord', () => {
        it('should create a record and return it', async () => {
            mockFetch
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(
                    mockSuccessResponse({
                        record: { record_id: 'rec_new', fields: { title: 'New Quest' } },
                    }),
                );

            const result = await createRecord('tbl_quests', { title: 'New Quest' });

            expect(result).toEqual({ record_id: 'rec_new', fields: { title: 'New Quest' } });
        });

        it('should send fields in the request body', async () => {
            mockFetch
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(
                    mockSuccessResponse({
                        record: { record_id: 'rec_new', fields: { title: 'Hello' } },
                    }),
                );

            await createRecord('tbl_quests', { title: 'Hello', status: 'pending' });

            const lastCall = mockFetch.mock.calls[1];
            const body = JSON.parse(lastCall![1]?.body as string) as unknown;
            expect(body).toEqual({ fields: { title: 'Hello', status: 'pending' } });
        });
    });

    describe('updateRecord', () => {
        it('should update a record and return the updated version', async () => {
            mockFetch
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(
                    mockSuccessResponse({
                        record: { record_id: 'rec1', fields: { status: 'active' } },
                    }),
                );

            const result = await updateRecord('tbl_quests', 'rec1', { status: 'active' });

            expect(result).toEqual({ record_id: 'rec1', fields: { status: 'active' } });
        });

        it('should use PUT method', async () => {
            mockFetch
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(
                    mockSuccessResponse({
                        record: { record_id: 'rec1', fields: { status: 'active' } },
                    }),
                );

            await updateRecord('tbl_quests', 'rec1', { status: 'active' });

            const lastCall = mockFetch.mock.calls[1];
            expect(lastCall![1]?.method).toBe('PUT');
        });
    });

    describe('retry logic', () => {
        it('should retry up to 3 times on failure', async () => {
            mockFetch
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(mockErrorResponse(500, 'Internal Server Error'))
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(mockErrorResponse(500, 'Internal Server Error'))
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(mockErrorResponse(500, 'Internal Server Error'));

            await expect(listRecords('tbl_quests')).rejects.toThrow('listRecords failed: 500');
        });

        it('should succeed on second attempt after first failure', async () => {
            mockFetch
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(mockErrorResponse(500, 'Internal Server Error'))
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(
                    mockSuccessResponse({ items: [{ record_id: 'rec1', fields: {} }] }),
                );

            const result = await listRecords('tbl_quests');

            expect(result).toHaveLength(1);
        });
    });

    describe('token management', () => {
        it('should include Bearer token in Authorization header', async () => {
            mockFetch
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(mockSuccessResponse({ items: [] }));

            await listRecords('tbl_quests');

            const recordCall = mockFetch.mock.calls[1];
            expect(recordCall![1]?.headers).toMatchObject({
                Authorization: 'Bearer test-token-123',
            });
        });

        it('should cache token across multiple calls', async () => {
            mockFetch
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(mockSuccessResponse({ items: [] }))
                .mockResolvedValueOnce(mockSuccessResponse({ items: [] }));

            await listRecords('tbl_quests');
            await listRecords('tbl_quests');

            // Token should only be fetched once (first call), then cached for the second
            const tokenCalls = mockFetch.mock.calls.filter(
                (call) => (call[0] as string).includes('tenant_access_token'),
            );
            expect(tokenCalls).toHaveLength(1);
        });

        it('should throw when token request fails', async () => {
            mockFetch.mockResolvedValueOnce(mockErrorResponse(401, 'Unauthorized'));

            await expect(listRecords('tbl_quests')).rejects.toThrow('Token fetch failed: 401');
        });

        it('should throw when Lark returns non-zero code for token', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    code: 10003,
                    msg: 'Invalid app_id',
                    tenant_access_token: '',
                    expire: 0,
                }),
            });

            await expect(listRecords('tbl_quests')).rejects.toThrow(
                'Token fetch error: Invalid app_id (code 10003)',
            );
        });
    });

    describe('timeout via AbortController', () => {
        it('should pass an AbortSignal to fetch calls', async () => {
            mockFetch
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(mockSuccessResponse({ items: [] }));

            await listRecords('tbl_quests');

            const recordCall = mockFetch.mock.calls[1];
            expect(recordCall![1]?.signal).toBeInstanceOf(AbortSignal);
        });

        it('should throw timeout error when request is aborted', async () => {
            // Simulate AbortError being thrown immediately (as if the signal was already aborted)
            const abortError = new DOMException('The operation was aborted.', 'AbortError');

            mockFetch.mockImplementation((url: string) => {
                if ((url as string).includes('tenant_access_token')) {
                    return Promise.resolve(mockTokenResponse());
                }
                // Immediately reject with AbortError to simulate timeout
                return Promise.reject(abortError);
            });

            await expect(listRecords('tbl_quests')).rejects.toThrow(
                'Request timed out after 10000ms',
            );
        });
    });

    describe('endpoint construction', () => {
        it('should call the correct search endpoint for listRecords', async () => {
            mockFetch
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(mockSuccessResponse({ items: [] }));

            await listRecords('tblMyTable');

            const recordCall = mockFetch.mock.calls[1];
            expect(recordCall![0]).toContain('/bitable/v1/apps/');
            expect(recordCall![0]).toContain('/tables/tblMyTable/records/search');
        });

        it('should call the correct endpoint for getRecord', async () => {
            mockFetch
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(
                    mockSuccessResponse({ record: { record_id: 'rec1', fields: {} } }),
                );

            await getRecord('tblMyTable', 'rec1');

            const recordCall = mockFetch.mock.calls[1];
            expect(recordCall![0]).toContain('/tables/tblMyTable/records/rec1');
            expect(recordCall![1]?.method).toBe('GET');
        });

        it('should call the correct endpoint for createRecord', async () => {
            mockFetch
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(
                    mockSuccessResponse({ record: { record_id: 'rec1', fields: {} } }),
                );

            await createRecord('tblMyTable', { title: 'Test' });

            const recordCall = mockFetch.mock.calls[1];
            expect(recordCall![0]).toContain('/tables/tblMyTable/records');
            expect(recordCall![0]).not.toContain('/search');
            expect(recordCall![1]?.method).toBe('POST');
        });

        it('should call the correct endpoint for updateRecord', async () => {
            mockFetch
                .mockResolvedValueOnce(mockTokenResponse())
                .mockResolvedValueOnce(
                    mockSuccessResponse({ record: { record_id: 'rec1', fields: {} } }),
                );

            await updateRecord('tblMyTable', 'rec1', { status: 'active' });

            const recordCall = mockFetch.mock.calls[1];
            expect(recordCall![0]).toContain('/tables/tblMyTable/records/rec1');
            expect(recordCall![1]?.method).toBe('PUT');
        });
    });
});
