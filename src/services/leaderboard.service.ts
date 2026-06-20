import type { Member, LeaderboardEntry, Badge, Role, LarkFilter, LarkRecord } from '../types';
import { listRecords, extractTextValue } from './lark-api.service';
import { TABLE_IDS } from './config';

// ─── Types ──────────────────────────────────────────────────────────────────

export type TimePeriod = 'weekly' | 'monthly' | 'all-time';

export interface MemberBadgeBreakdown {
  memberId: string;
  badges: Array<{ badge: Badge; earnedAt: Date }>;
}

// ─── Session Storage Keys ───────────────────────────────────────────────────

const PREVIOUS_RANKINGS_KEY = 'sp-tracker-previous-rankings';

// ─── Record Mapping ─────────────────────────────────────────────────────────

/**
 * Maps a raw Lark record to a Member domain object.
 */
function mapRecordToMember(record: LarkRecord): Member {
  const fields = record.fields;
  return {
    memberId: record.record_id,
    displayName: extractTextValue(fields.display_name),
    openId: extractTextValue(fields.open_id),
    roles: parseRoles(fields.roles),
    primaryRole: parseSingleRole(fields.primary_role) ?? 'agent',
    scrumMasterId: extractTextValue(fields.scrum_master_id) || null,
  };
}

function parseRoles(value: unknown): Member['roles'] {
  if (Array.isArray(value)) {
    return value.filter(
      (v): v is 'agent' | 'developer' => v === 'agent' || v === 'developer'
    );
  }
  if (typeof value === 'string') {
    const role = parseSingleRole(value);
    return role ? [role] : ['agent'];
  }
  return ['agent'];
}

function parseSingleRole(value: unknown): 'agent' | 'developer' | null {
  if (value === 'agent' || value === 'developer') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'agent') return 'agent';
    if (lower === 'developer') return 'developer';
  }
  return null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns the start date for a given time period filter.
 */
function getTimePeriodStartDate(period: TimePeriod): Date | null {
  if (period === 'all-time') return null;

  const now = new Date();
  if (period === 'weekly') {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  // monthly
  const start = new Date(now);
  start.setMonth(now.getMonth() - 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Parses an earned_at field from a Lark record into a Date.
 */
function parseEarnedAt(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') return new Date(value);
  return new Date(0);
}

/**
 * Maps a raw Lark record to a Badge domain object.
 */
function mapRecordToBadge(record: LarkRecord): Badge {
  const fields = record.fields;
  return {
    badgeId: record.record_id,
    name: extractTextValue(fields.name),
    iconUrl: extractTextValue(fields.icon_url),
    targetRole: (extractTextValue(fields.target_role) || 'agent') as Role,
    requiredCompletions: typeof fields.required_completions === 'number' ? fields.required_completions : 0,
    description: extractTextValue(fields.description),
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetches the leaderboard for a given role, optionally filtered by time period.
 *
 * - Fetches all members with the given role
 * - Fetches all Badge_Earned records
 * - Filters by earned_at based on time period
 * - Counts badges per member
 * - Sorts by badge count descending, with alphabetical display_name as tie-breaker
 * - Assigns sequential ranks starting from 1
 * - Includes all members with the role, even those with zero badges
 */
export async function getLeaderboard(role: Role, period: TimePeriod = 'all-time'): Promise<LeaderboardEntry[]> {
  // Fetch all members that have the given role
  const memberFilter: LarkFilter = {
    conjunction: 'and',
    conditions: [
      {
        field_name: 'roles',
        operator: 'contains',
        value: [role],
      },
    ],
  };

  const memberRecords = await listRecords(TABLE_IDS.members, memberFilter);
  const members = memberRecords.map(mapRecordToMember);

  // Fetch all Badge_Earned records
  const badgeEarnedRecords = await listRecords(TABLE_IDS.badgeEarned);

  // Filter by time period
  const startDate = getTimePeriodStartDate(period);

  // Count badges per member (filtered by time period)
  const badgeCountMap = new Map<string, number>();
  for (const record of badgeEarnedRecords) {
    const memberId = extractTextValue(record.fields.member_id);
    if (!memberId) continue;

    if (startDate) {
      const earnedAt = parseEarnedAt(record.fields.earned_at);
      if (earnedAt < startDate) continue;
    }

    badgeCountMap.set(memberId, (badgeCountMap.get(memberId) ?? 0) + 1);
  }

  // Build leaderboard entries with badge counts
  const entries = members.map((member) => ({
    member,
    badgeCount: badgeCountMap.get(member.memberId) ?? 0,
    rank: 0, // Will be assigned after sorting
  }));

  // Sort: badge count descending, then display_name ascending (alphabetical tie-breaker)
  entries.sort((a, b) => {
    if (b.badgeCount !== a.badgeCount) {
      return b.badgeCount - a.badgeCount;
    }
    return a.member.displayName.localeCompare(b.member.displayName);
  });

  // Assign sequential ranks starting from 1
  for (let i = 0; i < entries.length; i++) {
    entries[i]!.rank = i + 1;
  }

  return entries;
}

/**
 * Fetches badge breakdown for a specific member (which badges they've earned and when).
 */
export async function getMemberBadgeBreakdown(memberId: string): Promise<MemberBadgeBreakdown> {
  // Fetch all Badge_Earned records for this member
  const earnedFilter: LarkFilter = {
    conjunction: 'and',
    conditions: [
      { field_name: 'member_id', operator: 'is', value: [memberId] },
    ],
  };
  const earnedRecords = await listRecords(TABLE_IDS.badgeEarned, earnedFilter);

  // Fetch all badges to get their details
  const badgeRecords = await listRecords(TABLE_IDS.badges);
  const badgeMap = new Map(
    badgeRecords.map((r) => [r.record_id, mapRecordToBadge(r)])
  );

  // Build badge breakdown
  const badges: MemberBadgeBreakdown['badges'] = [];
  for (const record of earnedRecords) {
    const badgeId = extractTextValue(record.fields.badge_id);
    const badge = badgeMap.get(badgeId);
    if (badge) {
      badges.push({
        badge,
        earnedAt: parseEarnedAt(record.fields.earned_at),
      });
    }
  }

  // Sort by earned date descending (most recent first)
  badges.sort((a, b) => b.earnedAt.getTime() - a.earnedAt.getTime());

  return { memberId, badges };
}

/**
 * Saves current rankings to sessionStorage so rank changes can be detected on next visit.
 */
export function savePreviousRankings(entries: LeaderboardEntry[], role: Role): void {
  const rankings: Record<string, number> = {};
  for (const entry of entries) {
    rankings[entry.member.memberId] = entry.rank;
  }
  try {
    sessionStorage.setItem(
      `${PREVIOUS_RANKINGS_KEY}-${role}`,
      JSON.stringify(rankings)
    );
  } catch {
    // sessionStorage not available or full — silently ignore
  }
}

/**
 * Loads previously saved rankings from sessionStorage.
 * Returns a map of memberId → previous rank, or null if none saved.
 */
export function getPreviousRankings(role: Role): Record<string, number> | null {
  try {
    const stored = sessionStorage.getItem(`${PREVIOUS_RANKINGS_KEY}-${role}`);
    if (!stored) return null;
    return JSON.parse(stored) as Record<string, number>;
  } catch {
    return null;
  }
}
