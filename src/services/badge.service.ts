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
  if (value === 'agent' || value === 'developer') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'agent') return 'agent';
    if (lower === 'developer') return 'developer';
  }
  return 'agent';
}

function parseStatus(value: unknown): Quest['status'] {
  const valid = ['active', 'pending', 'rejected'];
  if (typeof value === 'string' && valid.includes(value.toLowerCase())) {
    return value.toLowerCase() as Quest['status'];
  }
  return 'active';
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

  // 2. Determine qualifying completion count
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

      // Count completions where the linked quest is active
      qualifyingCount = completionRecords.filter((cr) => {
        const questId = extractTextValue(cr.fields.quest_id);
        const quest = questMap.get(questId);
        return quest?.status === 'active';
      }).length;
    }
  } else {
    // For agents: all completions count
    qualifyingCount = completionRecords.length;
  }

  // 3. Fetch all badges for this role
  const badgesFilter: LarkFilter = {
    conjunction: 'and',
    conditions: [
      { field_name: 'target_role', operator: 'is', value: [role] },
    ],
  };
  const badgeRecords = await listRecords(TABLE_IDS.badges, badgesFilter);
  const badges = badgeRecords.map(mapRecordToBadge);

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
          earned_at: new Date().toISOString(),
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
  // 1. Fetch all badges for this role
  const badgesFilter: LarkFilter = {
    conjunction: 'and',
    conditions: [
      { field_name: 'target_role', operator: 'is', value: [role] },
    ],
  };
  const badgeRecords = await listRecords(TABLE_IDS.badges, badgesFilter);
  const badges = badgeRecords.map(mapRecordToBadge);

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

  // 3. Join badges with earned state
  const badgeItems = badges.map((badge) => {
    const earned = earnedMap.get(badge.badgeId);
    return {
      badge,
      earned: !!earned,
      ...(earned ? { earnedAt: earned.earnedAt } : {}),
    };
  });

  const earnedCount = badgeItems.filter((item) => item.earned).length;

  return {
    badges: badgeItems,
    earnedCount,
    totalCount: badges.length,
  };
}
