import type { LarkMessage, SendResult } from '../types';
import { LARK_CONFIG, RETRY_CONFIG } from './config';

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

async function fetchTenantToken(): Promise<string> {
    const now = Date.now();

    if (tokenCache && tokenCache.expiresAt > now) {
        return tokenCache.token;
    }

    const response = await fetch(
        `${LARK_CONFIG.baseUrl}/auth/v3/tenant_access_token/internal`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: LARK_CONFIG.appId,
                app_secret: LARK_CONFIG.appSecret,
            }),
            signal: AbortSignal.timeout(RETRY_CONFIG.timeoutMs),
        }
    );

    if (!response.ok) {
        throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
        code: number;
        msg: string;
        tenant_access_token: string;
        expire: number;
    };

    if (data.code !== 0) {
        throw new Error(`Token error: ${data.msg}`);
    }

    tokenCache = {
        token: data.tenant_access_token,
        expiresAt: now + (data.expire - 60) * 1000,
    };

    return data.tenant_access_token;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Sends a message to a user via the Lark IM v1 API.
 *
 * This function is non-blocking by design: it never throws.
 * Failures are returned as a SendResult with success=false,
 * allowing the triggering action to complete successfully.
 */
export async function sendMessage(
    recipientOpenId: string,
    message: LarkMessage
): Promise<SendResult> {
    try {
        const token = await fetchTenantToken();

        const response = await fetch(
            `${LARK_CONFIG.baseUrl}/im/v1/messages?receive_id_type=open_id`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    receive_id: recipientOpenId,
                    msg_type: message.msg_type,
                    content: message.content,
                }),
                signal: AbortSignal.timeout(RETRY_CONFIG.timeoutMs),
            }
        );

        if (!response.ok) {
            return {
                success: false,
                error: `Lark IM API error: ${response.status} ${response.statusText}`,
            };
        }

        const data = (await response.json()) as {
            code: number;
            msg: string;
            data: { message_id: string } | null;
        };

        if (data.code !== 0) {
            return {
                success: false,
                error: `Lark IM API returned error code ${data.code}: ${data.msg}`,
            };
        }

        return {
            success: true,
            messageId: data.data?.message_id,
        };
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error sending message';

        return {
            success: false,
            error: errorMessage,
        };
    }
}
