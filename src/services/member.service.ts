import type { Member, LarkFilter, LarkRecord } from '../types';
import { listRecords, getRecord, updateRecord, extractTextValue } from './lark-api.service';
import { TABLE_IDS } from './config';
import { serializeProjectIds, deserializeProjectIds } from '../utils/project-ids';

// ─── Record Mapping ─────────────────────────────────────────────────────────

/**
 * Maps a raw Lark record to a Member domain object.
 */
export function mapRecordToMember(record: LarkRecord): Member {
  const fields = record.fields;
  const roles = parseRoles(fields.roles);
  // If primary_role can't be parsed to a valid Role (e.g. the DB stores 'scrum',
  // which isn't a UI Role), fall back to the member's first parsed role rather
  // than blindly defaulting to 'agent' — otherwise a developer/scrum master would
  // be loaded as an agent and shown the wrong quests/leaderboard/badges.
  const primaryRole = parseSingleRole(fields.primary_role) ?? roles[0] ?? 'agent';
  return {
    memberId: record.record_id,
    displayName: extractTextValue(fields.display_name),
    openId: extractTextValue(fields.open_id),
    roles,
    primaryRole,
    scrumMasterId: extractTextValue(fields.scrum_master_id) || null,
    projectIds: deserializeProjectIds(extractTextValue(fields.project_id)),
  };
}

/**
 * Checks if a raw Lark record indicates the member has a scrum master role.
 * Inspects both the roles field (for 'scrum'/'master'/'sm' values) and
 * the scrum_master_id field (self-referencing means "I am the SM").
 */
export function hasScrumRoleInRecord(record: LarkRecord): boolean {
  const fields = record.fields;
  const rolesField = fields.roles;

  // Check roles array for scrum-related values
  if (Array.isArray(rolesField)) {
    for (const role of rolesField) {
      const roleStr = typeof role === 'string'
        ? role
        : (typeof role === 'object' && role !== null && 'text' in role
            ? (role as { text: string }).text
            : '');
      const lower = roleStr.toLowerCase();
      if (lower.includes('scrum') || lower.includes('master') || lower === 'sm') {
        return true;
      }
    }
  }
  if (typeof rolesField === 'string') {
    const lower = rolesField.toLowerCase();
    if (lower.includes('scrum') || lower.includes('master') || lower === 'sm') {
      return true;
    }
  }

  // Check if scrum_master_id references self (self-referencing means "I am the SM")
  const smId = extractTextValue(fields.scrum_master_id);
  if (smId && smId === record.record_id) {
    return true;
  }

  return false;
}

function parseRoles(value: unknown): Member['roles'] {
  if (Array.isArray(value)) {
    const parsed: string[] = [];
    for (const v of value) {
      if (typeof v === 'string') {
        const role = parseSingleRole(v);
        if (role) parsed.push(role);
      } else if (typeof v === 'object' && v !== null && 'text' in v) {
        const role = parseSingleRole((v as { text: string }).text);
        if (role) parsed.push(role);
      }
    }
    return parsed.length > 0 ? (parsed as Member['roles']) : ['agent'];
  }
  if (typeof value === 'string') {
    const role = parseSingleRole(value);
    return role ? [role] : ['agent'];
  }
  return ['agent'];
}

function parseSingleRole(value: unknown): 'agent' | 'developer' | 'admin' | null {
  if (value === 'agent' || value === 'developer' || value === 'admin') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'agent') return 'agent';
    if (lower === 'developer') return 'developer';
    if (lower === 'admin') return 'admin';
  }
  return null;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Resolves the current user from the Members table using their Lark open_id.
 * For the MVP, the open_id is passed as a parameter.
 * Returns both the mapped Member and whether the raw record indicates scrum master role.
 */
export async function getCurrentMember(openId: string): Promise<Member> {
  const filter: LarkFilter = {
    conjunction: 'and',
    conditions: [
      {
        field_name: 'open_id',
        operator: 'is',
        value: [openId],
      },
    ],
  };

  const records = await listRecords(TABLE_IDS.members, filter);

  if (records.length === 0) {
    throw new Error(`Member not found for open_id: ${openId}`);
  }

  return mapRecordToMember(records[0]!);
}

/**
 * Same as getCurrentMember but also returns the scrum role indicator from the raw record.
 */
export async function getCurrentMemberWithScrumCheck(openId: string): Promise<{ member: Member; isScrumFromRecord: boolean }> {
  const filter: LarkFilter = {
    conjunction: 'and',
    conditions: [
      {
        field_name: 'open_id',
        operator: 'is',
        value: [openId],
      },
    ],
  };

  const records = await listRecords(TABLE_IDS.members, filter);

  if (records.length === 0) {
    throw new Error(`Member not found for open_id: ${openId}`);
  }

  const record = records[0]!;
  return {
    member: mapRecordToMember(record),
    isScrumFromRecord: hasScrumRoleInRecord(record),
  };
}

/**
 * Fetches a specific member record by its record ID.
 */
export async function getMemberById(memberId: string): Promise<Member> {
  const record = await getRecord(TABLE_IDS.members, memberId);
  return mapRecordToMember(record);
}

/**
 * Resolves the assigned Scrum Master for a given developer.
 * The scrum_master_id field may contain either a record_id or an open_id.
 * Tries record lookup first; if not found, searches by open_id.
 */
export async function getScrumMasterForDeveloper(developerId: string): Promise<Member> {
  const developer = await getMemberById(developerId);

  if (!developer.scrumMasterId) {
    throw new Error(`Developer ${developerId} has no assigned Scrum Master`);
  }

  // Try lookup by open_id (the field often stores open_id values)
  const filter: LarkFilter = {
    conjunction: 'and',
    conditions: [
      {
        field_name: 'open_id',
        operator: 'is',
        value: [developer.scrumMasterId],
      },
    ],
  };

  const records = await listRecords(TABLE_IDS.members, filter);
  if (records.length > 0) {
    return mapRecordToMember(records[0]!);
  }

  // Fallback: try as record_id
  return getMemberById(developer.scrumMasterId);
}

// ─── Project Member Management (Admin) ──────────────────────────────────────

/**
 * Lists all members in the system.
 */
export async function listAllMembers(): Promise<Member[]> {
  const records = await listRecords(TABLE_IDS.members);
  return records.map(mapRecordToMember);
}

/**
 * Lists members that are assigned to a specific project.
 * A member's `project_id` field holds a comma-separated list of project IDs,
 * so membership is matched client-side (the backend `is` filter only does
 * exact matches and would miss members with multiple projects).
 */
export async function getMembersForProject(projectId: string): Promise<Member[]> {
  const records = await listRecords(TABLE_IDS.members);
  return records
    .map(mapRecordToMember)
    .filter((member) => member.projectIds.includes(projectId));
}

/**
 * Assigns a member to a project by appending the project ID to their
 * `project_id` list. No-op if the member is already in the project.
 */
export async function assignMemberToProject(memberId: string, projectId: string): Promise<Member> {
  const existing = await getMemberById(memberId);

  if (existing.projectIds.includes(projectId)) {
    return existing;
  }

  const updatedIds = [...existing.projectIds, projectId];
  const record = await updateRecord(TABLE_IDS.members, memberId, {
    project_id: serializeProjectIds(updatedIds),
  });
  return mapRecordToMember(record);
}

/**
 * Removes a member from a project. When `projectId` is provided, only that
 * project is removed from the member's list; otherwise all projects are cleared.
 */
export async function removeMemberFromProject(memberId: string, projectId?: string): Promise<Member> {
  const existing = await getMemberById(memberId);

  const updatedIds = projectId
    ? existing.projectIds.filter((id) => id !== projectId)
    : [];

  const record = await updateRecord(TABLE_IDS.members, memberId, {
    project_id: serializeProjectIds(updatedIds),
  });
  return mapRecordToMember(record);
}
