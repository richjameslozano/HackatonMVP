import { create } from 'zustand';
import type {
  Member,
  Quest,
  Role,
  Difficulty,
  CategorizedQuests,
  LeaderboardEntry,
  BadgeCollectionView,
  Badge,
  LarkFilter,
} from '../types';
import type { ConnectionState } from '../types/realtime';
import { getCurrentMemberWithScrumCheck, getScrumMasterForDeveloper } from '../services/member.service';
import { getQuestsForRole, proposeTask, approveTask, rejectTask, completeQuest, editPendingTask, withdrawPendingTask, resubmitTask } from '../services/quest.service';
import { evaluateBadgeUnlocks, getBadgeCollection } from '../services/badge.service';
import { getLeaderboard, type TimePeriod } from '../services/leaderboard.service';
import { notifyTaskProposal, notifyApproval, notifyRejection, notifyTaskEdit, notifyTaskWithdrawal } from '../services/notification.service';
import { listRecords, extractTextValue } from '../services/lark-api.service';
import { TABLE_IDS } from '../services/config';
import { useCoinStore } from './coin.store';

// ─── Session Storage Key ────────────────────────────────────────────────────

const ROLE_STORAGE_KEY = 'sp-tracker-selected-role';

// ─── Completion Feedback ────────────────────────────────────────────────────

export interface CompletionFeedback {
  success: boolean;
  unlockedBadges: Badge[];
}

// ─── Store State Interface ──────────────────────────────────────────────────

export interface AppState {
  // Data
  currentMember: Member | null;
  selectedRole: Role | null;
  isScrumMaster: boolean;
  managedDeveloperIds: string[];
  quests: CategorizedQuests | null;
  leaderboard: LeaderboardEntry[];
  previousLeaderboard: LeaderboardEntry[];
  leaderboardLastUpdated: Date | null;
  leaderboardTimePeriod: TimePeriod;
  badgeCollection: BadgeCollectionView | null;

  // Loading states (per section)
  questsLoading: boolean;
  leaderboardLoading: boolean;
  badgesLoading: boolean;

  // Completed quest tracking
  completedQuestIds: Set<string>;

  // Feedback states
  notificationWarning: string | null;
  backendError: string | null;
  backendWarning: string | null;
  completionFeedback: CompletionFeedback | null;
  newBadgeUnlocked: boolean;

  // Connection state
  connectionState: ConnectionState;

  // Actions
  initializeApp: (openId: string) => Promise<void>;
  setRole: (role: Role) => void;
  setLeaderboardTimePeriod: (period: TimePeriod) => void;
  fetchQuests: () => Promise<void>;
  completeQuest: (questId: string) => Promise<void>;
  proposeTask: (title: string, description: string, difficulty?: Difficulty, projectId?: string) => Promise<void>;
  approveTask: (questId: string) => Promise<void>;
  rejectTask: (questId: string, reason: string) => Promise<void>;
  editPendingTask: (questId: string, title: string, description: string) => Promise<void>;
  withdrawTask: (questId: string) => Promise<void>;
  resubmitTask: (originalQuestId: string, title: string, description: string) => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
  fetchBadgeCollection: () => Promise<void>;
  clearNotificationWarning: () => void;
  clearBackendError: () => void;
  clearBackendWarning: () => void;
  setBackendError: (error: string | null) => void;
  setBackendWarning: (warning: string | null) => void;
  clearCompletionFeedback: () => void;
  clearNewBadgeUnlocked: () => void;
  setConnectionState: (state: ConnectionState) => void;
}

// ─── Store Implementation ───────────────────────────────────────────────────

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  currentMember: null,
  selectedRole: null,
  isScrumMaster: false,
  managedDeveloperIds: [],
  quests: null,
  leaderboard: [],
  previousLeaderboard: [],
  leaderboardLastUpdated: null,
  leaderboardTimePeriod: 'all-time' as TimePeriod,
  badgeCollection: null,
  questsLoading: false,
  leaderboardLoading: false,
  badgesLoading: false,
  completedQuestIds: new Set<string>(),
  notificationWarning: null,
  backendError: null,
  backendWarning: null,
  completionFeedback: null,
  newBadgeUnlocked: false,
  connectionState: 'disconnected' as ConnectionState,

  // ─── Actions ────────────────────────────────────────────────────────────

  initializeApp: async (openId: string) => {
    const { member, isScrumFromRecord } = await getCurrentMemberWithScrumCheck(openId);

    // Start with SM detection from own record (roles field + self-referencing scrum_master_id)
    let isScrumMaster = isScrumFromRecord;
    const managedDeveloperIds: string[] = [];

    // Also check if other members reference this user as their scrum master,
    // which would confirm SM status and identify managed developers.
    try {
      const allMembers = await listRecords(TABLE_IDS.members);
      for (const rec of allMembers) {
        // Skip self
        if (rec.record_id === member.memberId) continue;

        const rawSmField = rec.fields.scrum_master_id;
        let isManaged = false;

        const smIdText = extractTextValue(rawSmField);
        if (smIdText && (smIdText === member.memberId || smIdText === member.openId)) {
          isManaged = true;
        }
        if (!isManaged && Array.isArray(rawSmField)) {
          for (const item of rawSmField) {
            if (typeof item === 'object' && item !== null) {
              const linkedId = (item as Record<string, unknown>).record_id ?? (item as Record<string, unknown>).id ?? '';
              if (linkedId === member.memberId) {
                isManaged = true;
              }
            }
            if (typeof item === 'string' && (item === member.memberId || item === member.openId)) {
              isManaged = true;
            }
          }
        }
        if (!isManaged && typeof rawSmField === 'string' && (rawSmField === member.memberId || rawSmField === member.openId)) {
          isManaged = true;
        }
        if (isManaged) {
          isScrumMaster = true;
          managedDeveloperIds.push(rec.record_id);
        }
      }
    } catch (err) {
      console.error('[initializeApp] Failed to check managed developers:', err);
      // isScrumMaster may still be true from own record check — that's fine.
      // managedDeveloperIds will be empty, so SM dashboard won't show managed devs.
    }

    // Restore role from sessionStorage or use primary role
    const storedRole = sessionStorage.getItem(ROLE_STORAGE_KEY) as Role | null;
    const validStoredRole =
      storedRole && member.roles.includes(storedRole) ? storedRole : null;
    const selectedRole = validStoredRole ?? member.primaryRole;

    set({ currentMember: member, selectedRole, isScrumMaster, managedDeveloperIds });
    sessionStorage.setItem(ROLE_STORAGE_KEY, selectedRole);

    // Trigger initial data fetches in parallel
    const state = get();
    void state.fetchQuests();
    void state.fetchLeaderboard();
    void state.fetchBadgeCollection();
  },

  setRole: (role: Role) => {
    set({ selectedRole: role });
    sessionStorage.setItem(ROLE_STORAGE_KEY, role);

    // Trigger data refresh for the new role
    const state = get();
    void state.fetchQuests();
    void state.fetchLeaderboard();
    void state.fetchBadgeCollection();
  },

  setLeaderboardTimePeriod: (period: TimePeriod) => {
    set({ leaderboardTimePeriod: period });
    void get().fetchLeaderboard();
  },

  fetchQuests: async () => {
    const { currentMember, selectedRole, managedDeveloperIds } = get();
    if (!currentMember || !selectedRole) return;

    set({ questsLoading: true });
    try {
      const quests = await getQuestsForRole(selectedRole, currentMember.memberId, managedDeveloperIds);

      // Fetch user's completions to track which quests are already done
      const completionsFilter: LarkFilter = {
        conjunction: 'and',
        conditions: [
          { field_name: 'member_id', operator: 'is', value: [currentMember.memberId] },
        ],
      };
      const completionRecords = await listRecords(TABLE_IDS.questCompletions, completionsFilter);
      const completedQuestIds = new Set(
        completionRecords.map((r) => extractTextValue(r.fields.quest_id))
      );

      set({ quests, completedQuestIds });
    } finally {
      set({ questsLoading: false });
    }
  },

  completeQuest: async (questId: string) => {
    const { currentMember, selectedRole, completedQuestIds } = get();
    if (!currentMember || !selectedRole) return;

    // ─── Optimistic Update ──────────────────────────────────────────────
    // Immediately mark as completed so the UI responds instantly.
    const previousCompletedIds = new Set(completedQuestIds);
    const optimisticIds = new Set(completedQuestIds);
    optimisticIds.add(questId);
    set({ completedQuestIds: optimisticIds });

    // Show success feedback immediately (badges will be updated async)
    set({
      completionFeedback: {
        success: true,
        unlockedBadges: [],
      },
    });

    // ─── Background API call + badge evaluation ─────────────────────────
    try {
      await completeQuest(questId, currentMember.memberId);
    } catch (err) {
      // ─── Rollback on failure ────────────────────────────────────────────
      console.error('[completeQuest] Failed, rolling back:', err);
      set({
        completedQuestIds: previousCompletedIds,
        completionFeedback: null,
      });
      throw err;
    }

    // Refresh coin balance (fire-and-forget)
    void useCoinStore.getState().refreshBalance(currentMember.memberId);

    // Evaluate badge unlocks (non-blocking). Skip full quest refetch —
    // the optimistic update already reflects the completion in the UI.
    // Real-time WebSocket events will reconcile any server-side state changes.
    const [unlockedBadges] = await Promise.all([
      evaluateBadgeUnlocks(currentMember.memberId, selectedRole),
      get().fetchLeaderboard(),
      get().fetchBadgeCollection(),
    ]);

    // Update feedback with actual badge info
    set({
      completionFeedback: {
        success: true,
        unlockedBadges,
      },
      newBadgeUnlocked: unlockedBadges.length > 0,
    });
  },

  proposeTask: async (title: string, description: string, difficulty?: Difficulty, projectId?: string) => {
    const { currentMember } = get();
    if (!currentMember) return;

    // Use the explicitly selected projectId, or fall back to the member's sole
    // project when they belong to exactly one (ambiguous when they have several).
    const resolvedProjectId =
      projectId ?? (currentMember.projectIds.length === 1 ? currentMember.projectIds[0] : undefined);

    // Developers must have a project selected to propose tasks
    if (!resolvedProjectId) {
      throw new Error('No project selected. Please select a project before proposing a task.');
    }

    let quest;
    try {
      quest = await proposeTask(title, description, currentMember.memberId, difficulty, [resolvedProjectId]);
    } catch (err) {
      console.error('[proposeTask] Failed:', err);
      throw err;
    }

    // Send notification to Scrum Master (non-blocking on failure)
    try {
      const scrumMaster = await getScrumMasterForDeveloper(currentMember.memberId);
      const result = await notifyTaskProposal(quest, currentMember, scrumMaster);
      if (!result.success && result.warning) {
        set({ notificationWarning: result.warning });
      }
    } catch {
      set({ notificationWarning: 'Failed to send notification to Scrum Master' });
    }

    // Refresh quests
    void get().fetchQuests();
  },

  approveTask: async (questId: string) => {
    const { currentMember } = get();
    if (!currentMember) return;

    const quest = await approveTask(questId, currentMember.memberId);

    // Send approval notification to developer (non-blocking on failure)
    if (quest.proposerId) {
      try {
        const { getMemberById } = await import('../services/member.service');
        const developer = await getMemberById(quest.proposerId);
        const result = await notifyApproval(quest, currentMember, developer);
        if (!result.success && result.warning) {
          set({ notificationWarning: result.warning });
        }
      } catch {
        set({ notificationWarning: 'Failed to send approval notification to developer' });
      }
    }

    // Refresh quests
    void get().fetchQuests();
  },

  rejectTask: async (questId: string, reason: string) => {
    const { currentMember } = get();
    if (!currentMember) return;

    const quest = await rejectTask(questId, currentMember.memberId, reason);

    // Send rejection notification to developer (non-blocking on failure)
    if (quest.proposerId) {
      try {
        const { getMemberById } = await import('../services/member.service');
        const developer = await getMemberById(quest.proposerId);
        const result = await notifyRejection(quest, currentMember, developer, reason);
        if (!result.success && result.warning) {
          set({ notificationWarning: result.warning });
        }
      } catch {
        set({ notificationWarning: 'Failed to send rejection notification to developer' });
      }
    }

    // Refresh quests
    void get().fetchQuests();
  },

  editPendingTask: async (questId: string, title: string, description: string) => {
    const { currentMember } = get();
    if (!currentMember) return;

    let quest;
    try {
      quest = await editPendingTask(questId, title, description, currentMember.memberId);
    } catch (err) {
      console.error('[editPendingTask] Failed:', err);
      throw err;
    }

    // Send notification to Scrum Master (non-blocking on failure)
    try {
      const scrumMaster = await getScrumMasterForDeveloper(currentMember.memberId);
      const result = await notifyTaskEdit(quest, currentMember, scrumMaster);
      if (!result.success && result.warning) {
        set({ notificationWarning: result.warning });
      }
    } catch {
      set({ notificationWarning: 'Failed to send edit notification to Scrum Master' });
    }

    // Refresh quests
    void get().fetchQuests();
  },

  withdrawTask: async (questId: string) => {
    const { currentMember, quests } = get();
    if (!currentMember) return;

    // Grab the quest title from current state before withdrawal
    const pendingQuest = quests?.pending?.find((q) => q.questId === questId);

    try {
      await withdrawPendingTask(questId, currentMember.memberId);
    } catch (err) {
      console.error('[withdrawTask] Failed:', err);
      throw err;
    }

    // Send notification to Scrum Master (non-blocking on failure)
    try {
      const scrumMaster = await getScrumMasterForDeveloper(currentMember.memberId);
      await notifyTaskWithdrawal(
        (pendingQuest ?? { title: `Task ${questId}` }) as Quest,
        currentMember,
        scrumMaster
      );
    } catch {
      set({ notificationWarning: 'Failed to send withdrawal notification to Scrum Master' });
    }

    // Refresh quests
    void get().fetchQuests();
  },

  resubmitTask: async (originalQuestId: string, title: string, description: string) => {
    const { currentMember } = get();
    if (!currentMember) return;

    let quest;
    try {
      quest = await resubmitTask(originalQuestId, title, description, currentMember.memberId);
    } catch (err) {
      console.error('[resubmitTask] Failed:', err);
      throw err;
    }

    // Send notification to Scrum Master (non-blocking on failure)
    try {
      const scrumMaster = await getScrumMasterForDeveloper(currentMember.memberId);
      const result = await notifyTaskProposal(quest, currentMember, scrumMaster);
      if (!result.success && result.warning) {
        set({ notificationWarning: result.warning });
      }
    } catch {
      set({ notificationWarning: 'Failed to send resubmission notification to Scrum Master' });
    }

    // Refresh quests
    void get().fetchQuests();
  },

  fetchLeaderboard: async () => {
    const { selectedRole, leaderboard: currentLeaderboard, leaderboardTimePeriod } = get();
    if (!selectedRole) return;

    set({ leaderboardLoading: true });
    try {
      const leaderboard = await getLeaderboard(selectedRole, leaderboardTimePeriod);
      set({
        previousLeaderboard: currentLeaderboard,
        leaderboard,
        leaderboardLastUpdated: new Date(),
      });
    } finally {
      set({ leaderboardLoading: false });
    }
  },

  fetchBadgeCollection: async () => {
    const { currentMember, selectedRole } = get();
    if (!currentMember || !selectedRole) return;

    set({ badgesLoading: true });
    try {
      const badgeCollection = await getBadgeCollection(currentMember.memberId, selectedRole);
      set({ badgeCollection });
    } finally {
      set({ badgesLoading: false });
    }
  },

  clearNotificationWarning: () => {
    set({ notificationWarning: null });
  },

  clearBackendError: () => {
    set({ backendError: null });
  },

  clearBackendWarning: () => {
    set({ backendWarning: null });
  },

  setBackendError: (error: string | null) => {
    set({ backendError: error });
  },

  setBackendWarning: (warning: string | null) => {
    set({ backendWarning: warning });
  },

  clearCompletionFeedback: () => {
    set({ completionFeedback: null });
  },

  clearNewBadgeUnlocked: () => {
    set({ newBadgeUnlocked: false });
  },

  setConnectionState: (connectionState: ConnectionState) => {
    set({ connectionState });
  },
}));
