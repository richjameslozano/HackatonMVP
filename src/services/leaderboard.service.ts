import type { Member, LeaderboardEntry, Role, LarkFilter, LarkRecord } from '../types';
import { listRecords, extractTextValue } from './lark-api.service';
import { TABLE_IDS } from './config';

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

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetches the leaderboard for a given role.
 *
 * - Fetches all members with the given role
 * - Fetches all Badge_Earned records
 * - Counts badges per member
 * - Sorts by badge count descending, with alphabetical display_name as tie-breaker
 * - Assigns sequential ranks starting from 1
 * - Includes all members with the role, even those with zero badges
 */
export async function getLeaderboard(role: Role): Promise<LeaderboardEntry[]> {
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

  // Count badges per member
  const badgeCountMap = new Map<string, number>();
  for (const record of badgeEarnedRecords) {
    const memberId = extractTextValue(record.fields.member_id);
    if (memberId) {
      badgeCountMap.set(memberId, (badgeCountMap.get(memberId) ?? 0) + 1);
    }
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
