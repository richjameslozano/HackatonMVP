// ─── Lark Platform Configuration ────────────────────────────────────────────
// Copy this file to `config.ts` and fill in your actual credentials.
// DO NOT commit config.ts — it is gitignored.

export const LARK_CONFIG = {
    appId: 'YOUR_LARK_APP_ID',
    appSecret: 'YOUR_LARK_APP_SECRET',
    baseAppToken: 'YOUR_LARK_BASE_APP_TOKEN',
    baseUrl: 'https://open.larksuite.com/open-apis',
} as const;

// ─── Lark Base Table IDs ────────────────────────────────────────────────────
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
