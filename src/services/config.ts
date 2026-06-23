// ─── Lark Platform Configuration ────────────────────────────────────────────
// Secrets are sourced from environment variables (VITE_*). Never hardcode
// credentials in this file. Set values in your local .env or deployment env.

export const LARK_CONFIG = {
    appId: import.meta.env.VITE_LARK_APP_ID ?? '',
    appSecret: import.meta.env.VITE_LARK_APP_SECRET ?? '',
    baseAppToken: import.meta.env.VITE_LARK_APP_TOKEN ?? '',
    // Dev: Vite proxy (/lark-api). Prod: backend reverse-proxy to avoid browser CORS.
    baseUrl: import.meta.env.DEV
        ? '/lark-api'
        : `${import.meta.env.VITE_BACKEND_URL ?? ''}/lark-api`,
} as const;

// ─── Lark Base Table IDs ────────────────────────────────────────────────────
// Replace with actual table IDs from your Lark Base app.

export const TABLE_IDS = {
    members: 'tblhp4slmpRxNyVk',
    quests: 'tblpAwQiuFod3Lls',
    questCompletions: 'tblLGu2kUdrvsE4A',
    badges: 'tblRqhbn5rj0oAOG',
    badgeEarned: 'tblxLZpbqSdEVeae',
    coinConfig: 'tblIlRVhCilqxALl',
    projects: 'tblLaLZgqcV9vCcP',
    rewardItems: 'tblZ1vZb7Q2wA16J',
    purchases: 'tblD2v2VjST80GUt',
} as const;

// ─── Backend API Configuration ──────────────────────────────────────────────

export const BACKEND_CONFIG = {
    baseUrl: import.meta.env.DEV ? 'http://localhost:8000' : import.meta.env.VITE_BACKEND_URL,
    apiSecret: import.meta.env.VITE_API_SHARED_SECRET ?? '',
} as const;

// ─── Retry Configuration ────────────────────────────────────────────────────

export const RETRY_CONFIG = {
    maxAttempts: 3,
    timeoutMs: 10_000,
} as const;
