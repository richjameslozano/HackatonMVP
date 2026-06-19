import type {
  Quest,
  QuestCompletion,
  CategorizedQuests,
  Role,
  LarkFilter,
  LarkRecord,
} from '../types';
import { listRecords, getRecord, createRecord, updateRecord, extractTextValue } from './lark-api.service';
import { TABLE_IDS } from './config';
import { validateTaskTitle, validateTaskDescription, validateRejectionReason } from '../utils/validation';
import { canCompleteQuest } from '../utils/permissions';

// ─── Record Mapping ─────────────────────────────────────────────────────────

/**
 * Maps a raw Lark record to a Quest domain object.
 */
function mapRecordToQuest(record: LarkRecord): Quest {
  const fields = record.fields;
  return {
    questId: record.record_id,
    title: extractTextValue(fields.title),
    description: extractTextValue(fields.description),
    category: parseCategory(fields.category),
    targetRole: parseRole(fields.target_role),
    status: parseStatus(fields.status),
    proposerId: extractTextValue(fields.proposer_id) || null,
    createdAt: fields.created_at ? new Date(fields.created_at as string | number) : new Date(),
  };
}

function parseCategory(value: unknown): Quest['category'] {
  const valid = ['onboarding', 'daily', 'milestone', 'sprint'];
  if (typeof value === 'string' && valid.includes(value.toLowerCase())) {
    return value.toLowerCase() as Quest['category'];
  }
  return 'daily';
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

/**
 * Maps a raw Lark record to a QuestCompletion domain object.
 */
function mapRecordToCompletion(record: LarkRecord): QuestCompletion {
  const fields = record.fields;
  return {
    completionId: record.record_id,
    memberId: extractTextValue(fields.member_id),
    questId: extractTextValue(fields.quest_id),
    completedAt: fields.completed_at ? new Date(fields.completed_at as string | number) : new Date(),
  };
}

// ─── Categorization ─────────────────────────────────────────────────────────

/**
 * Categorizes a list of quests into the CategorizedQuests structure.
 * For developers, pending quests go into the 'pending' category.
 */
function categorizeQuests(quests: Quest[], role: Role): CategorizedQuests {
  const result: CategorizedQuests = {};

  if (role === 'agent') {
    const onboarding = quests.filter((q) => q.category === 'onboarding');
    const daily = quests.filter((q) => q.category === 'daily');
    const milestones = quests.filter((q) => q.category === 'milestone');

    if (onboarding.length > 0) result.onboarding = onboarding;
    if (daily.length > 0) result.daily = daily;
    if (milestones.length > 0) result.milestones = milestones;
  } else {
    // Developer: active sprint tasks + pending tasks
    const sprint = quests.filter((q) => q.category === 'sprint' && q.status === 'active');
    const pending = quests.filter((q) => q.status === 'pending');

    if (sprint.length > 0) result.sprint = sprint;
    if (pending.length > 0) result.pending = pending;
  }

  return result;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetches quests filtered by target_role and categorizes them into CategorizedQuests.
 */
export async function getQuestsForRole(role: Role, _memberId: string): Promise<CategorizedQuests> {
  const filter: LarkFilter = {
    conjunction: 'and',
    conditions: [
      {
        field_name: 'target_role',
        operator: 'is',
        value: [role],
      },
    ],
  };

  const records = await listRecords(TABLE_IDS.quests, filter);
  const quests = records.map(mapRecordToQuest);

  return categorizeQuests(quests, role);
}

/**
 * Proposes a new sprint task for a developer.
 * Validates inputs, creates a quest record with status='pending' and proposer_id set.
 */
export async function proposeTask(
  title: string,
  description: string,
  developerId: string
): Promise<Quest> {
  const titleValidation = validateTaskTitle(title);
  if (!titleValidation.valid) {
    throw new Error(titleValidation.error ?? 'Invalid title');
  }

  const descValidation = validateTaskDescription(description);
  if (!descValidation.valid) {
    throw new Error(descValidation.error ?? 'Invalid description');
  }

  const fields: Record<string, unknown> = {
    title: title.trim(),
    description: description.trim(),
    category: 'sprint',
    target_role: 'developer',
    status: 'pending',
    proposer_id: developerId,
    created_at: Date.now(),
  };

  const record = await createRecord(TABLE_IDS.quests, fields);
  return mapRecordToQuest(record);
}

/**
 * Approves a pending task, updating its status from 'pending' to 'active'.
 */
export async function approveTask(questId: string, _scrumMasterId: string): Promise<Quest> {
  const record = await getRecord(TABLE_IDS.quests, questId);
  const quest = mapRecordToQuest(record);

  if (quest.status !== 'pending') {
    throw new Error(`Cannot approve quest with status '${quest.status}' — must be 'pending'`);
  }

  const updatedRecord = await updateRecord(TABLE_IDS.quests, questId, {
    status: 'active',
  });

  return mapRecordToQuest(updatedRecord);
}

/**
 * Rejects a pending task, updating its status from 'pending' to 'rejected'.
 * Validates that a rejection reason is provided.
 */
export async function rejectTask(
  questId: string,
  _scrumMasterId: string,
  reason: string
): Promise<Quest> {
  const reasonValidation = validateRejectionReason(reason);
  if (!reasonValidation.valid) {
    throw new Error(reasonValidation.error ?? 'Invalid rejection reason');
  }

  const record = await getRecord(TABLE_IDS.quests, questId);
  const quest = mapRecordToQuest(record);

  if (quest.status !== 'pending') {
    throw new Error(`Cannot reject quest with status '${quest.status}' — must be 'pending'`);
  }

  const updatedRecord = await updateRecord(TABLE_IDS.quests, questId, {
    status: 'rejected',
  });

  return mapRecordToQuest(updatedRecord);
}

/**
 * Completes a quest for a member.
 * Checks that the quest is active and no duplicate completion exists,
 * then writes a Quest_Completion record.
 */
export async function completeQuest(
  questId: string,
  memberId: string
): Promise<QuestCompletion> {
  // Fetch the quest to verify status
  const record = await getRecord(TABLE_IDS.quests, questId);
  const quest = mapRecordToQuest(record);

  if (!canCompleteQuest(quest)) {
    if (quest.status === 'pending') {
      throw new Error('This task requires Scrum Master approval before completion');
    }
    if (quest.status === 'rejected') {
      throw new Error('This task has been rejected and cannot be completed');
    }
    throw new Error(`Cannot complete quest with status '${quest.status}'`);
  }

  // Check for duplicate completion
  const duplicateFilter: LarkFilter = {
    conjunction: 'and',
    conditions: [
      { field_name: 'member_id', operator: 'is', value: [memberId] },
      { field_name: 'quest_id', operator: 'is', value: [questId] },
    ],
  };

  const existingCompletions = await listRecords(TABLE_IDS.questCompletions, duplicateFilter);

  if (existingCompletions.length > 0) {
    throw new Error('This quest has already been completed');
  }

  // Write the Quest_Completion record
  const completionFields: Record<string, unknown> = {
    member_id: memberId,
    quest_id: questId,
    completed_at: new Date().toISOString(),
  };

  const completionRecord = await createRecord(TABLE_IDS.questCompletions, completionFields);
  return mapRecordToCompletion(completionRecord);
}
