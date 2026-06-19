import type { Member, LarkFilter, LarkRecord } from '../types';
import { listRecords, getRecord, extractTextValue } from './lark-api.service';
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
 * Resolves the current user from the Members table using their Lark open_id.
 * For the MVP, the open_id is passed as a parameter.
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
