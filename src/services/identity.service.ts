import type { Member, Role } from '../types';
import { getCurrentMember, mapRecordToMember } from './member.service';
import { createRecord } from './lark-api.service';
import { TABLE_IDS } from './config';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IdentityResult {
  status: 'resolved' | 'new_user' | 'error';
  member?: Member;
  openId?: string;
  displayName?: string;
  error?: string;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Resolves a user's identity by looking up their Member record via open_id.
 * Returns 'resolved' with the member if found, 'new_user' if not found
 * (indicating onboarding is needed), or 'error' for unexpected failures.
 */
export async function resolveIdentity(openId: string): Promise<IdentityResult> {
  try {
    const member = await getCurrentMember(openId);
    return { status: 'resolved', member };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Member not found')) {
      return { status: 'new_user', openId };
    }
    return { status: 'error', error: message };
  }
}

/**
 * Creates a new Member record in the Members table during onboarding.
 * Returns the newly created Member object.
 */
export async function createMemberRecord(
  openId: string,
  displayName: string,
  role: Role
): Promise<Member> {
  const fields: Record<string, unknown> = {
    open_id: openId,
    display_name: displayName,
    primary_role: role,
    roles: [role],
    scrum_master_id: null,
  };

  const record = await createRecord(TABLE_IDS.members, fields);
  return mapRecordToMember(record);
}
