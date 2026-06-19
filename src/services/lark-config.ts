/**
 * Lark Base API configuration constants.
 *
 * Environment variables are read from Vite's import.meta.env at runtime.
 * Fallback defaults are provided for development convenience.
 */

// ─── App Credentials ────────────────────────────────────────────────────────

export const LARK_APP_ID =
    (import.meta.env.VITE_LARK_APP_ID as string | undefined) ?? 'cli_a91865699678de19';
export const LARK_APP_SECRET =
    (import.meta.env.VITE_LARK_APP_SECRET as string | undefined) ?? 'uXHJs2ELAT7QhXGwHW0RFet6CahLnl2k';

// ─── Base API Configuration ─────────────────────────────────────────────────

export const LARK_BASE_URL = 'https://open.larksuite.com/open-apis';
export const LARK_APP_TOKEN =
    (import.meta.env.VITE_LARK_APP_TOKEN as string | undefined) ?? 'PyPSbWKVpakTg5s0uEujZ24fpaf';

// ─── Table IDs ──────────────────────────────────────────────────────────────

export const TABLE_IDS = {
    Members: (import.meta.env.VITE_LARK_TABLE_MEMBERS as string | undefined) ?? 'tblMembers',
    Quests: (import.meta.env.VITE_LARK_TABLE_QUESTS as string | undefined) ?? 'tblQuests',
    Quest_Completions: (import.meta.env.VITE_LARK_TABLE_QUEST_COMPLETIONS as string | undefined) ?? 'tblQuestCompletions',
    Badges: (import.meta.env.VITE_LARK_TABLE_BADGES as string | undefined) ?? 'tblBadges',
    Badge_Earned: (import.meta.env.VITE_LARK_TABLE_BADGE_EARNED as string | undefined) ?? 'tblBadgeEarned',
} as const;

// ─── Retry Configuration ────────────────────────────────────────────────────

/** Maximum number of retry attempts per API call */
export const MAX_RETRIES = 3;

/** Timeout per request attempt in milliseconds */
export const REQUEST_TIMEOUT_MS = 10_000;

// ─── API Endpoints ──────────────────────────────────────────────────────────

export const ENDPOINTS = {
    tenantAccessToken: `${LARK_BASE_URL}/auth/v3/tenant_access_token/internal`,
    listRecords: (appToken: string, tableId: string) =>
        `${LARK_BASE_URL}/bitable/v1/apps/${appToken}/tables/${tableId}/records/search`,
    getRecord: (appToken: string, tableId: string, recordId: string) =>
        `${LARK_BASE_URL}/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
    createRecord: (appToken: string, tableId: string) =>
        `${LARK_BASE_URL}/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
    updateRecord: (appToken: string, tableId: string, recordId: string) =>
        `${LARK_BASE_URL}/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
} as const;
