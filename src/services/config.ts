// ─── Lark Platform Configuration ────────────────────────────────────────────
// These values come from the Lark Open Platform app settings.
// In production, consider loading from environment variables via Vite's import.meta.env.

export const LARK_CONFIG = {
    appId: 'cli_a91865699678de19',
    appSecret: 'uXHJs2ELAT7QhXGwHW0RFet6CahLnl2k',
    baseAppToken: 'PyPSbWKVpakTg5s0uEujZ24fpaf',
    baseUrl: 'https://open.larksuite.com/open-apis',
} as const;

// ─── Lark Base Table IDs ────────────────────────────────────────────────────
// These correspond to the five tables in the SP Madrid Gamified Tracker Bitable.
// Replace with actual table IDs from your Lark Base app.

export const TABLE_IDS = {
    members: 'tblMembers',
    quests: 'tblQuests',
    questCompletions: 'tblQuestCompletions',
    badges: 'tblBadges',
    badgeEarned: 'tblBadgeEarned',
} as const;

// ─── Retry Configuration ────────────────────────────────────────────────────

export const RETRY_CONFIG = {
    maxAttempts: 3,
    timeoutMs: 10_000,
} as const;
