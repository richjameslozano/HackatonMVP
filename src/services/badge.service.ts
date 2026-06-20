import type {
  Badge,
  BadgeEarned,
  BadgeCollectionView,
  Role,
  LarkFilter,
  LarkRecord,
  Quest,
} from '../types';
import { listRecords, createRecord, extractTextValue, extractNumberValue } from './lark-api.service';
import { TABLE_IDS } from './config';

// ─── Record Mapping ─────────────────────────────────────────────────────────

/**
 * Maps a raw Lark record to a Badge domain object.
 */
function mapRecordToBadge(record: LarkRecord): Badge {
  const fields = record.fields;
  return {
    badgeId: record.record_id,
    name: extractTextValue(fields.name),
    iconUrl: extractTextValue(fields.icon_url),
    targetRole: parseRole(fields.target_role),
    requiredCompletions: extractNumberValue(fields.required_completions),
    description: extractTextValue(fields.description),
  };
}

/**
 * Maps a raw Lark record to a BadgeEarned domain object.
 */
function mapRecordToBadgeEarned(record: LarkRecord): BadgeEarned {
  const fields = record.fields;
  return {
    earnedId: record.record_id,
    memberId: extractTextValue(fields.member_id),
    badgeId: extractTextValue(fields.badge_id),
    earnedAt: fields.earned_at ? new Date(fields.earned_at as string | number) : new Date(),
  };
}

/**
 * Maps a raw Lark record to a partial Quest (only fields needed for filtering).
 */
function mapRecordToQuestPartial(record: LarkRecord): Pick<Quest, 'questId' | 'status'> {
  const fields = record.fields;
  return {
    questId: record.record_id,
    status: parseStatus(fields.status),
  };
}

function parseRole(value: unknown): Role {
  // Handle Lark's array format
  const strValue = typeof value === 'string' ? value :
    (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null && 'text' in value[0])
      ? (value[0] as { text: string }).text :
      (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') ? value[0] : '';
  if (strValue) {
    const lower = strValue.toLowerCase().trim();
    if (lower === 'agent') return 'agent';
    if (lower === 'developer') return 'developer';
  }
  return 'agent';
}

function parseStatus(value: unknown): Quest['status'] {
  const valid = ['active', 'pending', 'rejected'];
  // Handle Lark's array format for field values
  const strValue = typeof value === 'string' ? value :
    (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null && 'text' in value[0])
      ? (value[0] as { text: string }).text : '';
  if (strValue && valid.includes(strValue.toLowerCase())) {
    return strValue.toLowerCase() as Quest['status'];
  }
  return 'pending';
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Evaluates all badge unlocks for a member and awards any newly qualifying badges.
 * For developers: only completions linked to active quests count.
 * For agents: all completions count.
 * Returns the list of newly awarded Badge objects.
 */
export async function evaluateBadgeUnlocks(memberId: string, role: Role): Promise<Badge[]> {
  // 1. Fetch all quest completions for this member
  const completionsFilter: LarkFilter = {
    conjunction: 'and',
    conditions: [
      { field_name: 'member_id', operator: 'is', value: [memberId] },
    ],
  };
  const completionRecords = await listRecords(TABLE_IDS.questCompletions, completionsFilter);

  // 2. Determine qualifying completion count (deduplicated by quest_id)
  let qualifyingCount: number;

  if (role === 'developer') {
    // For developers: filter completions to only those linked to active quests
    const questIds = [
      ...new Set(completionRecords.map((r) => extractTextValue(r.fields.quest_id))),
    ].filter((id) => id !== '');

    if (questIds.length === 0) {
      qualifyingCount = 0;
    } else {
      // Fetch all quests to check their status
      const questRecords = await listRecords(TABLE_IDS.quests);
      const questMap = new Map(
        questRecords.map((r) => {
          const quest = mapRecordToQuestPartial(r);
          return [quest.questId, quest];
        })
      );

      // Count unique quests where the linked quest is active
      qualifyingCount = questIds.filter((questId) => {
        const quest = questMap.get(questId);
        return quest?.status === 'active';
      }).length;
    }
  } else {
    // For agents: count unique completed quests
    const uniqueQuestIds = new Set(completionRecords.map(r => extractTextValue(r.fields.quest_id)));
    qualifyingCount = uniqueQuestIds.size;
  }

  // 3. Fetch all badges and filter by role client-side
  // (Lark filter on single-select fields can be unreliable)
  const allBadgeRecords = await listRecords(TABLE_IDS.badges);
  const badges = allBadgeRecords.map(mapRecordToBadge).filter(b => b.targetRole === role);

  // 4. Fetch all Badge_Earned records for this member (to prevent duplicates)
  const earnedFilter: LarkFilter = {
    conjunction: 'and',
    conditions: [
      { field_name: 'member_id', operator: 'is', value: [memberId] },
    ],
  };
  const earnedRecords = await listRecords(TABLE_IDS.badgeEarned, earnedFilter);
  const earnedBadgeIds = new Set(
    earnedRecords.map((r) => extractTextValue(r.fields.badge_id))
  );

  // 5. Evaluate all badges in a single pass and award qualifying ones
  const newlyAwarded: Badge[] = [];

  for (const badge of badges) {
    if (
      qualifyingCount >= badge.requiredCompletions &&
      !earnedBadgeIds.has(badge.badgeId)
    ) {
      try {
        await createRecord(TABLE_IDS.badgeEarned, {
          member_id: memberId,
          badge_id: badge.badgeId,
          earned_at: Date.now(),
        });
        newlyAwarded.push(badge);
      } catch {
        // If a Badge_Earned write fails, skip and continue
        continue;
      }
    }
  }

  return newlyAwarded;
}

/**
 * Fetches the complete badge collection view for a member.
 * Returns all role badges with earned state and progress fraction.
 */
export async function getBadgeCollection(
  memberId: string,
  role: Role
): Promise<BadgeCollectionView> {
  // 1. Fetch all badges and filter by role client-side
  const allBadgeRecords = await listRecords(TABLE_IDS.badges);
  const badges = allBadgeRecords.map(mapRecordToBadge).filter(b => b.targetRole === role);

  // 2. Fetch all Badge_Earned records for this member
  const earnedFilter: LarkFilter = {
    conjunction: 'and',
    conditions: [
      { field_name: 'member_id', operator: 'is', value: [memberId] },
    ],
  };
  const earnedRecords = await listRecords(TABLE_IDS.badgeEarned, earnedFilter);
  const earnedMap = new Map(
    earnedRecords.map((r) => {
      const earned = mapRecordToBadgeEarned(r);
      return [earned.badgeId, earned];
    })
  );

  // 3. Fetch quest completions for this member to show progress
  const completionsFilter: LarkFilter = {
    conjunction: 'and',
    conditions: [
      { field_name: 'member_id', operator: 'is', value: [memberId] },
    ],
  };
  const completionRecords = await listRecords(TABLE_IDS.questCompletions, completionsFilter);
  // Deduplicate by quest_id (only count each quest once)
  const uniqueQuestIds = new Set(completionRecords.map(r => extractTextValue(r.fields.quest_id)));
  const qualifyingCompletions = uniqueQuestIds.size;

  // 4. Join badges with earned state
  const badgeItems = badges.map((badge) => {
    const earned = earnedMap.get(badge.badgeId);
    return {
      badge,
      earned: !!earned,
      ...(earned ? { earnedAt: earned.earnedAt } : {}),
    };
  });

  const earnedCount = badgeItems.filter((item) => item.earned).length;

  // 5. Determine next badge goal (first unearned badge sorted by requiredCompletions)
  const unearnedBadges = badges
    .filter((b) => !earnedMap.has(b.badgeId))
    .sort((a, b) => a.requiredCompletions - b.requiredCompletions);

  const nextBadge = unearnedBadges.length > 0 ? unearnedBadges[0]! : null;
  const nextBadgeRequired = nextBadge ? nextBadge.requiredCompletions : qualifyingCompletions;
  const nextBadgeProgress = Math.min(qualifyingCompletions, nextBadgeRequired);

  return {
    badges: badgeItems,
    earnedCount,
    totalCount: badges.length,
    qualifyingCompletions,
    nextBadge,
    nextBadgeProgress,
    nextBadgeRequired,
  };
}
