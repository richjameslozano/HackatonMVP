import type {
  Quest,
  QuestCompletion,
  QuestEditHistoryEntry,
  CategorizedQuests,
  Role,
  TargetRole,
  AssignmentType,
  CompletionMode,
  LarkFilter,
  LarkRecord,
} from '../types';
import { listRecords, getRecord, createRecord, updateRecord, extractTextValue } from './lark-api.service';
import { TABLE_IDS } from './config';
import { validateTaskTitle, validateTaskDescription, validateRejectionReason } from '../utils/validation';
import { canCompleteQuest } from '../utils/permissions';

// ─── Record Mapping ─────────────────────────────────────────────────────────

/**
 * Extracts a value from a Lark field that could be a text field, a link/lookup field
 * (array of objects with record_id), or a plain string.
 * Handles: string, [{text: "val"}], [{record_id: "recXXX"}], ["recXXX"]
 */
function extractLinkOrTextValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (typeof first === 'string') return first;
    if (typeof first === 'object' && first !== null) {
      // Link field format: {record_id: "recXXX", ...}
      if ('record_id' in first) return (first as { record_id: string }).record_id;
      // Alternative link format
      if ('id' in first) return (first as { id: string }).id;
      // Text field format: {text: "value", type: "text"}
      if ('text' in first) return (first as { text: string }).text;
    }
  }
  return '';
}

/**
 * Maps a raw Lark record to a Quest domain object.
 */
function mapRecordToQuest(record: LarkRecord): Quest {
  const fields = record.fields;

  // Parse edit history from JSON string
  let editHistory: QuestEditHistoryEntry[] | undefined;
  const rawEditHistory = extractTextValue(fields.edit_history);
  if (rawEditHistory) {
    try {
      const parsed = JSON.parse(rawEditHistory);
      if (Array.isArray(parsed)) {
        editHistory = parsed.map((entry: { title: string; description: string; editedAt: string }) => ({
          title: entry.title,
          description: entry.description,
          editedAt: new Date(entry.editedAt),
        }));
      }
    } catch {
      // Ignore invalid JSON
    }
  }

  // Parse withdrawn boolean
  const rawWithdrawn = fields.withdrawn;
  const withdrawn = rawWithdrawn === true || extractTextValue(rawWithdrawn) === 'true';

  return {
    questId: record.record_id,
    title: extractTextValue(fields.title),
    description: extractTextValue(fields.description),
    category: parseCategory(extractTextValue(fields.category) || fields.category),
    targetRole: parseTargetRole(extractTextValue(fields.target_role) || fields.target_role),
    status: parseStatus(extractTextValue(fields.status) || fields.status),
    assignmentType: parseAssignmentType(extractTextValue(fields.assignment_type) || fields.assignment_type),
    assigneeId: extractLinkOrTextValue(fields.assignee_id) || null,
    completionMode: parseCompletionMode(extractTextValue(fields.completion_mode) || fields.completion_mode),
    proposerId: extractLinkOrTextValue(fields.proposer_id) || null,
    createdAt: fields.created_at ? new Date(fields.created_at as string | number) : new Date(),
    rejectionReason: extractTextValue(fields.rejection_reason) || undefined,
    originalQuestId: extractTextValue(fields.original_quest_id) || null,
    editHistory,
    withdrawn,
  };
}

function parseCategory(value: unknown): Quest['category'] {
  const valid = ['onboarding', 'daily', 'milestone', 'sprint'];
  if (typeof value === 'string' && valid.includes(value.toLowerCase())) {
    return value.toLowerCase() as Quest['category'];
  }
  return 'daily';
}

function parseTargetRole(value: unknown): TargetRole {
  if (value === 'agent' || value === 'developer' || value === 'all') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'agent') return 'agent';
    if (lower === 'developer') return 'developer';
    if (lower === 'all') return 'all';
  }
  return 'agent';
}

function parseAssignmentType(value: unknown): AssignmentType {
  if (value === 'all' || value === 'assigned' || value === 'open') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'all') return 'all';
    if (lower === 'assigned') return 'assigned';
    if (lower === 'open') return 'open';
  }
  return 'all';
}

function parseCompletionMode(value: unknown): CompletionMode {
  if (value === 'multiple' || value === 'first-claim') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'multiple') return 'multiple';
    if (lower === 'first-claim' || lower === 'first_claim') return 'first-claim';
  }
  return 'multiple';
}

function parseStatus(value: unknown): Quest['status'] {
  const valid = ['active', 'pending', 'rejected'];
  if (typeof value === 'string' && valid.includes(value.toLowerCase())) {
    return value.toLowerCase() as Quest['status'];
  }
  // Default to 'pending' — safer than 'active' since it won't appear in task lists
  return 'pending';
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
 * Handles assignment types: 'all' (everyone), 'assigned' (specific person), 'open' (optional/claimable).
 * Assumes quests are already filtered to be visible to this role.
 */
function categorizeQuests(quests: Quest[], role: Role, memberId: string): CategorizedQuests {
  const result: CategorizedQuests = {};

  // Only active quests go into the main task lists — pending/rejected stay in pending section
  const activeQuests = quests.filter((q) => q.status === 'active');

  // Separate by assignment type (only active quests in these buckets)
  const assignedToMe = activeQuests.filter(
    (q) => q.assignmentType === 'assigned' && q.assigneeId === memberId
  );
  const openQuests = activeQuests.filter((q) => q.assignmentType === 'open');
  const teamQuests = activeQuests.filter(
    (q) => q.assignmentType === 'all' || (q.assignmentType === 'assigned' && q.assigneeId === memberId)
  );

  if (role === 'agent') {
    const onboarding = teamQuests.filter((q) => q.category === 'onboarding');
    const daily = teamQuests.filter((q) => q.category === 'daily');
    const milestones = teamQuests.filter((q) => q.category === 'milestone');

    if (onboarding.length > 0) result.onboarding = onboarding;
    if (daily.length > 0) result.daily = daily;
    if (milestones.length > 0) result.milestones = milestones;
  } else {
    // Developer: active sprint tasks + pending tasks (from all quests, not just active)
    const sprint = teamQuests.filter((q) => q.category === 'sprint');
    const pending = quests.filter((q) => q.status === 'pending');
    // Rejected tasks (non-withdrawn) proposed by this developer
    const rejected = quests.filter(
      (q) => q.status === 'rejected' && !q.withdrawn && q.proposerId === memberId
    );

    if (sprint.length > 0) result.sprint = sprint;
    if (pending.length > 0) result.pending = pending;
    if (rejected.length > 0) result.rejected = rejected;
  }

  // Add assigned tasks that aren't already in category lists (specific to this user)
  const assignedNotInCategories = assignedToMe.filter((q) => {
    if (role === 'agent') {
      return !['onboarding', 'daily', 'milestone'].includes(q.category);
    }
    return q.category !== 'sprint';
  });
  if (assignedNotInCategories.length > 0) result.assigned = assignedNotInCategories;

  // Add open/optional tasks
  if (openQuests.length > 0) result.open = openQuests;

  return result;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetches quests filtered by target_role (role-specific + 'all') and categorizes them.
 * Fetches all quests and filters client-side to handle 'all' target_role.
 */
export async function getQuestsForRole(role: Role, memberId: string): Promise<CategorizedQuests> {
  // Fetch quests matching this role
  const roleFilter: LarkFilter = {
    conjunction: 'and',
    conditions: [
      {
        field_name: 'target_role',
        operator: 'is',
        value: [role],
      },
    ],
  };
  const roleRecords = await listRecords(TABLE_IDS.quests, roleFilter);

  // Also fetch quests targeting 'all' roles
  const allRoleFilter: LarkFilter = {
    conjunction: 'and',
    conditions: [
      {
        field_name: 'target_role',
        operator: 'is',
        value: ['all'],
      },
    ],
  };
  const allRoleRecords = await listRecords(TABLE_IDS.quests, allRoleFilter);

  // Combine and deduplicate
  const recordMap = new Map<string, LarkRecord>();
  for (const r of [...roleRecords, ...allRoleRecords]) {
    recordMap.set(r.record_id, r);
  }

  const quests = Array.from(recordMap.values()).map(mapRecordToQuest);

  return categorizeQuests(quests, role, memberId);
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
    assignment_type: 'assigned',
    assignee_id: developerId,
    completion_mode: 'multiple',
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
    rejection_reason: reason.trim(),
  });

  return mapRecordToQuest(updatedRecord);
}

/**
 * Completes a quest for a member.
 * Checks that the quest is active and no duplicate completion exists,
 * then writes a Quest_Completion record.
 * For 'first-claim' quests, checks if anyone has already claimed it.
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

  // For 'assigned' quests, verify the member is the assignee
  if (quest.assignmentType === 'assigned' && quest.assigneeId && quest.assigneeId !== memberId) {
    throw new Error('This task is assigned to another member');
  }

  // Check for duplicate completion by this member
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

  // For 'first-claim' open quests, check if anyone else already completed it
  if (quest.assignmentType === 'open' && quest.completionMode === 'first-claim') {
    const claimFilter: LarkFilter = {
      conjunction: 'and',
      conditions: [
        { field_name: 'quest_id', operator: 'is', value: [questId] },
      ],
    };

    const allCompletions = await listRecords(TABLE_IDS.questCompletions, claimFilter);
    if (allCompletions.length > 0) {
      throw new Error('This task has already been claimed by another member');
    }
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

// ─── Task Proposal Flow Enhancements ────────────────────────────────────────

/**
 * Edits a pending task's title and/or description.
 * Only the proposer can edit. Task must be in 'pending' status.
 * Stores previous values in edit_history field (JSON stringified).
 */
export async function editPendingTask(
  questId: string,
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

  const record = await getRecord(TABLE_IDS.quests, questId);
  const quest = mapRecordToQuest(record);

  if (quest.status !== 'pending') {
    throw new Error(`Cannot edit quest with status '${quest.status}' — must be 'pending'`);
  }

  if (quest.proposerId !== developerId) {
    throw new Error('Only the proposer can edit a pending task');
  }

  // Build edit history entry with previous values
  const previousEntry: QuestEditHistoryEntry = {
    title: quest.title,
    description: quest.description,
    editedAt: new Date(),
  };

  const existingHistory = quest.editHistory ?? [];
  const updatedHistory = [...existingHistory, previousEntry];

  const updatedRecord = await updateRecord(TABLE_IDS.quests, questId, {
    title: title.trim(),
    description: description.trim(),
    edit_history: JSON.stringify(updatedHistory),
  });

  return mapRecordToQuest(updatedRecord);
}

/**
 * Withdraws/deletes a pending task.
 * Only the proposer can withdraw. Task must be in 'pending' status.
 * Sets status to 'rejected' and marks as withdrawn (soft delete).
 */
export async function withdrawPendingTask(
  questId: string,
  developerId: string
): Promise<void> {
  const record = await getRecord(TABLE_IDS.quests, questId);
  const quest = mapRecordToQuest(record);

  if (quest.status !== 'pending') {
    throw new Error(`Cannot withdraw quest with status '${quest.status}' — must be 'pending'`);
  }

  if (quest.proposerId !== developerId) {
    throw new Error('Only the proposer can withdraw a pending task');
  }

  await updateRecord(TABLE_IDS.quests, questId, {
    status: 'rejected',
    withdrawn: 'true',
    rejection_reason: 'Withdrawn by proposer',
  });
}

/**
 * Resubmits a rejected task as a new proposal with a link to the original.
 * Validates the new title/description and creates a new quest record.
 */
export async function resubmitTask(
  originalQuestId: string,
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

  // Verify original quest exists and was rejected
  const originalRecord = await getRecord(TABLE_IDS.quests, originalQuestId);
  const originalQuest = mapRecordToQuest(originalRecord);

  if (originalQuest.status !== 'rejected') {
    throw new Error(`Cannot resubmit quest with status '${originalQuest.status}' — must be 'rejected'`);
  }

  if (originalQuest.proposerId !== developerId) {
    throw new Error('Only the original proposer can resubmit a rejected task');
  }

  const fields: Record<string, unknown> = {
    title: title.trim(),
    description: description.trim(),
    category: 'sprint',
    target_role: 'developer',
    status: 'pending',
    assignment_type: 'assigned',
    assignee_id: developerId,
    completion_mode: 'multiple',
    proposer_id: developerId,
    original_quest_id: originalQuestId,
    created_at: Date.now(),
  };

  const record = await createRecord(TABLE_IDS.quests, fields);
  return mapRecordToQuest(record);
}
