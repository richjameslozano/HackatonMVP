import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendMessage, _resetTokenCache } from '../lark-bot.service';
import type { LarkMessage } from '../../types';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('lark-bot.service', () => {
    beforeEach(() => {
        _resetTokenCache();
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function mockTokenResponse() {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                code: 0,
                msg: 'ok',
                tenant_access_token: 'test-token-123',
                expire: 7200,
            }),
        });
    }

    function mockSendSuccess(messageId = 'msg_001') {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                code: 0,
                msg: 'success',
                data: { message_id: messageId },
            }),
        });
    }

    const testMessage: LarkMessage = {
        msg_type: 'text',
        content: JSON.stringify({ text: 'Hello, World!' }),
    };

    describe('sendMessage', () => {
        it('returns success with messageId on successful send', async () => {
            mockTokenResponse();
            mockSendSuccess('msg_abc');

            const result = await sendMessage('ou_user123', testMessage);

            expect(result).toEqual({
                success: true,
                messageId: 'msg_abc',
            });
        });

        it('calls the correct Lark IM v1 endpoint with open_id', async () => {
            mockTokenResponse();
            mockSendSuccess();

            await sendMessage('ou_user123', testMessage);

            // Second call is the send message call
            const sendCall = mockFetch.mock.calls[1];
            expect(sendCall?.[0]).toContain('/im/v1/messages?receive_id_type=open_id');
        });

        it('includes Authorization header with Bearer token', async () => {
            mockTokenResponse();
            mockSendSuccess();

            await sendMessage('ou_user123', testMessage);

            const sendCall = mockFetch.mock.calls[1];
            const headers = (sendCall?.[1] as RequestInit).headers as Record<string, string>;
            expect(headers['Authorization']).toBe('Bearer test-token-123');
        });

        it('sends correct payload with receive_id, msg_type, and content', async () => {
            mockTokenResponse();
            mockSendSuccess();

            await sendMessage('ou_user123', testMessage);

            const sendCall = mockFetch.mock.calls[1];
            const body = JSON.parse((sendCall?.[1] as RequestInit).body as string) as Record<string, unknown>;
            expect(body).toEqual({
                receive_id: 'ou_user123',
                msg_type: 'text',
                content: JSON.stringify({ text: 'Hello, World!' }),
            });
        });

        it('returns failure when token request fails with non-ok response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            });

            const result = await sendMessage('ou_user123', testMessage);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Token request failed');
        });

        it('returns failure when token response has non-zero code', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    code: 10003,
                    msg: 'invalid app_id',
                    tenant_access_token: '',
                    expire: 0,
                }),
            });

            const result = await sendMessage('ou_user123', testMessage);

            expect(result.success).toBe(false);
            expect(result.error).toContain('invalid app_id');
        });

        it('returns failure when send message response is not ok', async () => {
            mockTokenResponse();
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                statusText: 'Forbidden',
            });

            const result = await sendMessage('ou_user123', testMessage);

            expect(result).toEqual({
                success: false,
                error: 'Lark IM API error: 403 Forbidden',
            });
        });

        it('returns failure when Lark IM API returns non-zero code', async () => {
            mockTokenResponse();
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    code: 230001,
                    msg: 'bot has no permission',
                    data: null,
                }),
            });

            const result = await sendMessage('ou_user123', testMessage);

            expect(result).toEqual({
                success: false,
                error: 'Lark IM API returned error code 230001: bot has no permission',
            });
        });

        it('returns failure when network error occurs (non-blocking)', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error: Failed to fetch'));

            const result = await sendMessage('ou_user123', testMessage);

            expect(result).toEqual({
                success: false,
                error: 'Network error: Failed to fetch',
            });
        });

        it('returns failure with generic message for non-Error exceptions', async () => {
            mockFetch.mockRejectedValueOnce('string error');

            const result = await sendMessage('ou_user123', testMessage);

            expect(result).toEqual({
                success: false,
                error: 'Unknown error sending message',
            });
        });

        it('never throws an exception (non-blocking guarantee)', async () => {
            mockFetch.mockRejectedValueOnce(new Error('catastrophic failure'));

            // Should not throw, should return SendResult
            const result = await sendMessage('ou_user123', testMessage);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('reuses cached token on subsequent calls', async () => {
            mockTokenResponse();
            mockSendSuccess('msg_1');
            mockSendSuccess('msg_2');

            await sendMessage('ou_user1', testMessage);
            await sendMessage('ou_user2', testMessage);

            // Token should be fetched only once (first call),
            // then the second sendMessage only makes the send call
            expect(mockFetch).toHaveBeenCalledTimes(3); // 1 token + 2 sends
        });

        it('supports interactive message type', async () => {
            mockTokenResponse();
            mockSendSuccess();

            const interactiveMessage: LarkMessage = {
                msg_type: 'interactive',
                content: JSON.stringify({ elements: [] }),
            };

            const result = await sendMessage('ou_user123', interactiveMessage);
            expect(result.success).toBe(true);

            const sendCall = mockFetch.mock.calls[1];
            const body = JSON.parse((sendCall?.[1] as RequestInit).body as string) as Record<string, unknown>;
            expect(body['msg_type']).toBe('interactive');
        });
    });
});
