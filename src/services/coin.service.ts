import type { Difficulty, CoinConfig, LarkFilter } from '../types';
import { listRecords, getRecord, createRecord, updateRecord, extractNumberValue } from './lark-api.service';
import { TABLE_IDS } from './config';
import { withRetry } from './auth.service';

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_COIN_VALUES: CoinConfig = {
  easy_coins: 1,
  medium_coins: 3,
  hard_coins: 5,
} as const;

// ─── Coin Config ────────────────────────────────────────────────────────────

/**
 * Fetches the Coin_Config record from Lark Base.
 * Returns defaults (1, 3, 5) if no record exists or on error.
 * Uses withRetry (3 attempts) before falling back to defaults.
 */
export async function getCoinConfig(): Promise<CoinConfig> {
  try {
    const records = await withRetry(async () => {
      return listRecords(TABLE_IDS.coinConfig);
    });

    if (!records || records.length === 0) {
      return { ...DEFAULT_COIN_VALUES };
    }

    const record = records[0];
    const fields = record.fields;

    const easyCoinVal = extractNumberValue(fields['easy_coins']);
    const mediumCoinVal = extractNumberValue(fields['medium_coins']);
    const hardCoinVal = extractNumberValue(fields['hard_coins']);

    return {
      easy_coins: easyCoinVal > 0 ? easyCoinVal : DEFAULT_COIN_VALUES.easy_coins,
      medium_coins: mediumCoinVal > 0 ? mediumCoinVal : DEFAULT_COIN_VALUES.medium_coins,
      hard_coins: hardCoinVal > 0 ? hardCoinVal : DEFAULT_COIN_VALUES.hard_coins,
    };
  } catch {
    return { ...DEFAULT_COIN_VALUES };
  }
}

/**
 * Persists updated coin values to Lark Base.
 * Updates the existing record if one exists, otherwise creates a new one.
 * Throws on failure.
 */
export async function updateCoinConfig(config: CoinConfig): Promise<CoinConfig> {
  const records = await listRecords(TABLE_IDS.coinConfig);

  const fields = {
    easy_coins: config.easy_coins,
    medium_coins: config.medium_coins,
    hard_coins: config.hard_coins,
  };

  if (records && records.length > 0) {
    const existingRecordId = records[0].record_id;
    await updateRecord(TABLE_IDS.coinConfig, existingRecordId, fields);
  } else {
    await createRecord(TABLE_IDS.coinConfig, fields);
  }

  return config;
}

// ─── Coin Calculation ───────────────────────────────────────────────────────

/**
 * Returns the coin reward for a given difficulty using current config.
 * Null or empty difficulty is treated as 'easy'.
 * Falls back to defaults on error.
 */
export async function calculateCoinsForDifficulty(difficulty: Difficulty | null | undefined): Promise<number> {
  const config = await getCoinConfig();
  const effectiveDifficulty: Difficulty = difficulty || 'easy';

  switch (effectiveDifficulty) {
    case 'easy':
      return config.easy_coins;
    case 'medium':
      return config.medium_coins;
    case 'hard':
      return config.hard_coins;
    default:
      return config.easy_coins;
  }
}

// ─── Coin Balance ───────────────────────────────────────────────────────────

/**
 * Computes a member's total coin balance by summing coins_awarded
 * across all their Quest_Completions records.
 * Returns 0 if no completions exist. Result is always >= 0.
 */
export async function getCoinBalance(memberId: string): Promise<number> {
  const filter: LarkFilter = {
    conjunction: 'and',
    conditions: [
      {
        field_name: 'member_id',
        operator: 'is',
        value: [memberId],
      },
    ],
  };

  const records = await listRecords(TABLE_IDS.questCompletions, filter);

  if (!records || records.length === 0) {
    return 0;
  }

  const total = records.reduce((sum, record) => {
    const coins = extractNumberValue(record.fields['coins_awarded']);
    return sum + coins;
  }, 0);

  return Math.max(total, 0);
}

// ─── Coin Award ─────────────────────────────────────────────────────────────

/**
 * Awards coins for a quest completion.
 * Reads the quest's difficulty, calculates the coin amount, and returns it.
 * Does NOT create the completion record — that is handled by quest.service.
 */
export async function awardCoinsForCompletion(questId: string, difficulty: Difficulty | null): Promise<number> {
  // If difficulty is not provided directly, fetch it from the quest record
  let effectiveDifficulty = difficulty;

  if (effectiveDifficulty === null || effectiveDifficulty === undefined) {
    try {
      const questRecord = await getRecord(TABLE_IDS.quests, questId);
      const rawDifficulty = questRecord.fields['difficulty'];
      if (typeof rawDifficulty === 'string') {
        const lower = rawDifficulty.toLowerCase().trim();
        if (lower === 'easy' || lower === 'medium' || lower === 'hard') {
          effectiveDifficulty = lower as Difficulty;
        }
      }
    } catch {
      // If we can't fetch the quest, treat as easy
    }
  }

  return calculateCoinsForDifficulty(effectiveDifficulty);
}
