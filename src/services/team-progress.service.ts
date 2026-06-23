import type { Member, Quest, LarkFilter, LarkRecord } from '../types';
import { listRecords, extractTextValue } from './lark-api.service';
import { TABLE_IDS } from './config';
import { mapRecordToMember } from './member.service';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DeveloperOverview {
    member: Member;
    totalQuests: number;
    completedQuests: number;
    activeQuests: number;
    pendingQuests: number;
    rejectedQuests: number;
    blockedQuests: number;
    completionPercentage: number;
}

export interface TeamOverview {
    developers: DeveloperOverview[];
}

export interface DeveloperTaskDetail {
    questId: string;
    title: string;
    description: string;
    status: 'active' | 'pending' | 'rejected';
    category: string;
    completedAt: Date | null;
    createdAt: Date;
}

export interface DeveloperDetail {
    member: Member;
    tasks: DeveloperTaskDetail[];
    completionCount: number;
    totalTasks: number;
    completionPercentage: number;
}

export interface TeamStats {
    totalDevelopers: number;
    totalTasks: number;
    activeTasks: number;
    pendingTasks: number;
    rejectedTasks: number;
    blockedTasks: number;
    completedTasks: number;
    completionPercentage: number;
}

export interface TaskDistribution {
    completed: number;
    inProgress: number;
    forReview: number;
    blocked: number;
}

export interface RecentActivityEntry {
    id: string;
    type: 'completion' | 'proposal' | 'status_change';
    developerName: string;
    developerId: string;
    questTitle: string;
    questId: string;
    timestamp: Date;
    details?: string;
}

// ─── Record Mapping Helpers ─────────────────────────────────────────────────

function parseQuestStatus(value: unknown): Quest['status'] {
    const strValue = typeof value === 'string'
        ? value
        : (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null && 'text' in value[0])
            ? (value[0] as { text: string }).text
            : '';
    const valid = ['active', 'pending', 'rejected'];
    if (strValue && valid.includes(strValue.toLowerCase())) {
        return strValue.toLowerCase() as Quest['status'];
    }
    return 'pending';
}

function parseDate(value: unknown): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') return new Date(value);
    return new Date();
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Fetches all developers managed by a given Scrum Master.
 */
async function getManagedDevelopers(scrumMasterId: string): Promise<Member[]> {
    const memberRecords = await listRecords(TABLE_IDS.members);
    const allMembers = memberRecords.map(mapRecordToMember);

    // A developer is managed by this SM if their scrumMasterId matches:
    // - the SM's memberId (record_id), OR
    // - the SM's openId
    const scrumMaster = allMembers.find((m) => m.memberId === scrumMasterId);
    const scrumMasterOpenId = scrumMaster?.openId ?? '';

    return allMembers.filter((m) => {
        if (!m.scrumMasterId) return false;
        return m.scrumMasterId === scrumMasterId || m.scrumMasterId === scrumMasterOpenId;
    });
}

/**
 * Fetches all quests assigned to or proposed by a specific developer.
 */
async function getQuestsForDeveloper(developerId: string): Promise<LarkRecord[]> {
    // Fetch quests where assignee_id or proposer_id matches the developer
    const assigneeFilter: LarkFilter = {
        conjunction: 'or',
        conditions: [
            { field_name: 'assignee_id', operator: 'is', value: [developerId] },
            { field_name: 'proposer_id', operator: 'is', value: [developerId] },
        ],
    };

    return listRecords(TABLE_IDS.quests, assigneeFilter);
}

/**
 * Fetches all completions for a specific member.
 */
async function getCompletionsForMember(memberId: string): Promise<LarkRecord[]> {
    const filter: LarkFilter = {
        conjunction: 'and',
        conditions: [
            { field_name: 'member_id', operator: 'is', value: [memberId] },
        ],
    };

    return listRecords(TABLE_IDS.questCompletions, filter);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetches an overview of all developers managed by this Scrum Master,
 * including their quest counts, completion counts, and statuses.
 */
export async function getTeamOverview(scrumMasterId: string): Promise<TeamOverview> {
    const developers = await getManagedDevelopers(scrumMasterId);

    // Fetch all quests targeting developers
    const developerQuestFilter: LarkFilter = {
        conjunction: 'and',
        conditions: [
            { field_name: 'target_role', operator: 'is', value: ['developer'] },
        ],
    };
    const allQuestRecords = await listRecords(TABLE_IDS.quests, developerQuestFilter);

    // Fetch all completions
    const allCompletionRecords = await listRecords(TABLE_IDS.questCompletions);

    // Build completion set: memberId:questId
    const completionSet = new Set<string>();
    for (const record of allCompletionRecords) {
        const memberId = extractTextValue(record.fields.member_id);
        const questId = extractTextValue(record.fields.quest_id);
        if (memberId && questId) {
            completionSet.add(`${memberId}:${questId}`);
        }
    }

    const developerOverviews: DeveloperOverview[] = developers.map((dev) => {
        // Filter quests relevant to this developer (assigned to them or proposed by them)
        const devQuests = allQuestRecords.filter((r) => {
            const assigneeId = extractTextValue(r.fields.assignee_id);
            const proposerId = extractTextValue(r.fields.proposer_id);
            return assigneeId === dev.memberId || proposerId === dev.memberId;
        });

        let activeQuests = 0;
        let pendingQuests = 0;
        let rejectedQuests = 0;
        const blockedQuests = 0; // blocked is determined by external factors, placeholder
        let completedQuests = 0;

        for (const questRecord of devQuests) {
            const status = parseQuestStatus(questRecord.fields.status);
            switch (status) {
                case 'active':
                    if (completionSet.has(`${dev.memberId}:${questRecord.record_id}`)) {
                        completedQuests++;
                    } else {
                        activeQuests++;
                    }
                    break;
                case 'pending':
                    pendingQuests++;
                    break;
                case 'rejected':
                    rejectedQuests++;
                    break;
            }
        }

        const totalQuests = devQuests.length;
        const completionPercentage = totalQuests > 0
            ? Math.round((completedQuests / totalQuests) * 100)
            : 0;

        return {
            member: dev,
            totalQuests,
            completedQuests,
            activeQuests,
            pendingQuests,
            rejectedQuests,
            blockedQuests,
            completionPercentage,
        };
    });

    return { developers: developerOverviews };
}

/**
 * Fetches detailed task breakdown for a specific developer.
 */
export async function getDeveloperDetail(developerId: string): Promise<DeveloperDetail> {
    // Fetch the developer's member record
    const memberRecords = await listRecords(TABLE_IDS.members);
    const allMembers = memberRecords.map(mapRecordToMember);
    const member = allMembers.find((m) => m.memberId === developerId);

    if (!member) {
        throw new Error(`Developer not found: ${developerId}`);
    }

    // Fetch quests for this developer
    const questRecords = await getQuestsForDeveloper(developerId);

    // Fetch completions for this developer
    const completionRecords = await getCompletionsForMember(developerId);
    const completionMap = new Map<string, Date>();
    for (const record of completionRecords) {
        const questId = extractTextValue(record.fields.quest_id);
        const completedAt = parseDate(record.fields.completed_at);
        if (questId) {
            completionMap.set(questId, completedAt);
        }
    }

    // Build task detail list
    const tasks: DeveloperTaskDetail[] = questRecords.map((record) => {
        const questId = record.record_id;
        const completedAt = completionMap.get(questId) ?? null;

        return {
            questId,
            title: extractTextValue(record.fields.title),
            description: extractTextValue(record.fields.description),
            status: parseQuestStatus(record.fields.status),
            category: extractTextValue(record.fields.category) || 'sprint',
            completedAt,
            createdAt: parseDate(record.fields.created_at),
        };
    });

    const completionCount = tasks.filter((t) => t.completedAt !== null).length;
    const totalTasks = tasks.length;
    const completionPercentage = totalTasks > 0
        ? Math.round((completionCount / totalTasks) * 100)
        : 0;

    return {
        member,
        tasks,
        completionCount,
        totalTasks,
        completionPercentage,
    };
}

/**
 * Computes summary stats for all developers managed by a Scrum Master.
 */
export async function getTeamStats(scrumMasterId: string): Promise<TeamStats> {
    const overview = await getTeamOverview(scrumMasterId);
    const { developers } = overview;

    const totalDevelopers = developers.length;
    let totalTasks = 0;
    let activeTasks = 0;
    let pendingTasks = 0;
    let rejectedTasks = 0;
    let blockedTasks = 0;
    let completedTasks = 0;

    for (const dev of developers) {
        totalTasks += dev.totalQuests;
        activeTasks += dev.activeQuests;
        pendingTasks += dev.pendingQuests;
        rejectedTasks += dev.rejectedQuests;
        blockedTasks += dev.blockedQuests;
        completedTasks += dev.completedQuests;
    }

    const completionPercentage = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

    return {
        totalDevelopers,
        totalTasks,
        activeTasks,
        pendingTasks,
        rejectedTasks,
        blockedTasks,
        completedTasks,
        completionPercentage,
    };
}

/**
 * Computes task distribution breakdown as percentages.
 */
export async function getTaskDistribution(scrumMasterId: string): Promise<TaskDistribution> {
    const overview = await getTeamOverview(scrumMasterId);
    const { developers } = overview;

    let totalTasks = 0;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let forReviewTasks = 0;
    let blockedTasks = 0;

    for (const dev of developers) {
        totalTasks += dev.totalQuests;
        completedTasks += dev.completedQuests;
        inProgressTasks += dev.activeQuests;
        forReviewTasks += dev.pendingQuests;
        blockedTasks += dev.blockedQuests;
    }

    if (totalTasks === 0) {
        return { completed: 0, inProgress: 0, forReview: 0, blocked: 0 };
    }

    return {
        completed: Math.round((completedTasks / totalTasks) * 100),
        inProgress: Math.round((inProgressTasks / totalTasks) * 100),
        forReview: Math.round((forReviewTasks / totalTasks) * 100),
        blocked: Math.round((blockedTasks / totalTasks) * 100),
    };
}

/**
 * Fetches recent activity from managed developers: completions, proposals, and status changes.
 * Returns entries sorted by timestamp descending (most recent first).
 */
export async function getRecentActivity(
    scrumMasterId: string,
    limit: number = 20
): Promise<RecentActivityEntry[]> {
    const developers = await getManagedDevelopers(scrumMasterId);
    const developerMap = new Map(developers.map((d) => [d.memberId, d]));
    const developerIds = developers.map((d) => d.memberId);

    if (developerIds.length === 0) {
        return [];
    }

    const activities: RecentActivityEntry[] = [];

    // Fetch recent completions from managed developers
    const allCompletionRecords = await listRecords(TABLE_IDS.questCompletions);
    const devCompletions = allCompletionRecords.filter((r) => {
        const memberId = extractTextValue(r.fields.member_id);
        return developerIds.includes(memberId);
    });

    // Build a quest lookup for titles
    const questIds = new Set<string>();
    for (const record of devCompletions) {
        const questId = extractTextValue(record.fields.quest_id);
        if (questId) questIds.add(questId);
    }

    // Fetch all quests for the managed developers (for proposals and status info)
    const developerQuestFilter: LarkFilter = {
        conjunction: 'and',
        conditions: [
            { field_name: 'target_role', operator: 'is', value: ['developer'] },
        ],
    };
    const allQuestRecords = await listRecords(TABLE_IDS.quests, developerQuestFilter);

    // Build quest title map
    const questTitleMap = new Map<string, string>();
    for (const record of allQuestRecords) {
        questTitleMap.set(record.record_id, extractTextValue(record.fields.title));
    }

    // Add completions to activities
    for (const record of devCompletions) {
        const memberId = extractTextValue(record.fields.member_id);
        const questId = extractTextValue(record.fields.quest_id);
        const dev = developerMap.get(memberId);
        if (!dev || !questId) continue;

        activities.push({
            id: record.record_id,
            type: 'completion',
            developerName: dev.displayName,
            developerId: memberId,
            questTitle: questTitleMap.get(questId) ?? 'Unknown Quest',
            questId,
            timestamp: parseDate(record.fields.completed_at),
            details: 'Completed quest',
        });
    }

    // Add proposals (pending quests from managed developers)
    const devQuests = allQuestRecords.filter((r) => {
        const proposerId = extractTextValue(r.fields.proposer_id);
        return developerIds.includes(proposerId);
    });

    for (const record of devQuests) {
        const proposerId = extractTextValue(record.fields.proposer_id);
        const dev = developerMap.get(proposerId);
        if (!dev) continue;

        const status = parseQuestStatus(record.fields.status);
        const title = extractTextValue(record.fields.title);
        const createdAt = parseDate(record.fields.created_at);

        // Add proposal activity
        activities.push({
            id: `proposal-${record.record_id}`,
            type: 'proposal',
            developerName: dev.displayName,
            developerId: proposerId,
            questTitle: title,
            questId: record.record_id,
            timestamp: createdAt,
            details: 'Proposed new task',
        });

        // Add status change activity for approved/rejected quests
        if (status === 'active') {
            activities.push({
                id: `status-active-${record.record_id}`,
                type: 'status_change',
                developerName: dev.displayName,
                developerId: proposerId,
                questTitle: title,
                questId: record.record_id,
                timestamp: createdAt, // Approximation — actual approval time not stored separately
                details: 'Task approved',
            });
        } else if (status === 'rejected') {
            activities.push({
                id: `status-rejected-${record.record_id}`,
                type: 'status_change',
                developerName: dev.displayName,
                developerId: proposerId,
                questTitle: title,
                questId: record.record_id,
                timestamp: createdAt,
                details: extractTextValue(record.fields.rejection_reason) || 'Task rejected',
            });
        }
    }

    // Sort by timestamp descending (most recent first)
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Return limited results
    return activities.slice(0, limit);
}
