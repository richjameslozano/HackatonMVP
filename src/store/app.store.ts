import { create } from 'zustand';
import type {
  Member,
  Role,
  CategorizedQuests,
  LeaderboardEntry,
  BadgeCollectionView,
  Badge,
  LarkFilter,
} from '../types';
import { getCurrentMember, getScrumMasterForDeveloper } from '../services/member.service';
import { getQuestsForRole, proposeTask, approveTask, rejectTask, completeQuest } from '../services/quest.service';
import { evaluateBadgeUnlocks, getBadgeCollection } from '../services/badge.service';
import { getLeaderboard, type TimePeriod } from '../services/leaderboard.service';
import { notifyTaskProposal, notifyApproval, notifyRejection } from '../services/notification.service';
import { listRecords, extractTextValue } from '../services/lark-api.service';
import { TABLE_IDS } from '../services/config';

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
  completionFeedback: CompletionFeedback | null;
  newBadgeUnlocked: boolean;

  // Actions
  initializeApp: (openId: string) => Promise<void>;
  setRole: (role: Role) => void;
  setLeaderboardTimePeriod: (period: TimePeriod) => void;
  fetchQuests: () => Promise<void>;
  completeQuest: (questId: string) => Promise<void>;
  proposeTask: (title: string, description: string) => Promise<void>;
  approveTask: (questId: string) => Promise<void>;
  rejectTask: (questId: string, reason: string) => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
  fetchBadgeCollection: () => Promise<void>;
  clearNotificationWarning: () => void;
  clearCompletionFeedback: () => void;
  clearNewBadgeUnlocked: () => void;
}

// ─── Store Implementation ───────────────────────────────────────────────────

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  currentMember: null,
  selectedRole: null,
  isScrumMaster: false,
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
  completionFeedback: null,
  newBadgeUnlocked: false,

  // ─── Actions ────────────────────────────────────────────────────────────

  initializeApp: async (openId: string) => {
    const member = await getCurrentMember(openId);

    // Check if this user is a scrum master by fetching all members and checking
    // if any member's scrum_master_id matches this user's memberId or openId
    let isScrumMaster = false;
    try {
      const allMembers = await listRecords(TABLE_IDS.members);
      for (const rec of allMembers) {
        const rawSmField = rec.fields.scrum_master_id;
        const smIdText = extractTextValue(rawSmField);
        if (smIdText && (smIdText === member.memberId || smIdText === member.openId)) {
          isScrumMaster = true;
        }
        if (Array.isArray(rawSmField)) {
          for (const item of rawSmField) {
            if (typeof item === 'object' && item !== null) {
              const linkedId = (item as Record<string, unknown>).record_id ?? (item as Record<string, unknown>).id ?? '';
              if (linkedId === member.memberId) {
                isScrumMaster = true;
              }
            }
            if (typeof item === 'string' && (item === member.memberId || item === member.openId)) {
              isScrumMaster = true;
            }
          }
        }
        if (typeof rawSmField === 'string' && (rawSmField === member.memberId || rawSmField === member.openId)) {
          isScrumMaster = true;
        }
        if (isScrumMaster) break;
      }
    } catch {
      isScrumMaster = false;
    }

    // Restore role from sessionStorage or use primary role
    const storedRole = sessionStorage.getItem(ROLE_STORAGE_KEY) as Role | null;
    const validStoredRole =
      storedRole && member.roles.includes(storedRole) ? storedRole : null;
    const selectedRole = validStoredRole ?? member.primaryRole;

    set({ currentMember: member, selectedRole, isScrumMaster });
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
    const { currentMember, selectedRole } = get();
    if (!currentMember || !selectedRole) return;

    set({ questsLoading: true });
    try {
      const quests = await getQuestsForRole(selectedRole, currentMember.memberId);

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
    const { currentMember, selectedRole } = get();
    if (!currentMember || !selectedRole) return;

    try {
      await completeQuest(questId, currentMember.memberId);
    } catch (err) {
      console.error('[completeQuest] Failed:', err);
      throw err;
    }

    // Mark as completed locally
    const updatedIds = new Set(get().completedQuestIds);
    updatedIds.add(questId);
    set({ completedQuestIds: updatedIds });

    // Evaluate badge unlocks
    const unlockedBadges = await evaluateBadgeUnlocks(currentMember.memberId, selectedRole);

    // Set completion feedback for UI animation
    set({
      completionFeedback: {
        success: true,
        unlockedBadges,
      },
      newBadgeUnlocked: unlockedBadges.length > 0,
    });

    // Refresh quests and leaderboard in parallel
    const state = get();
    void state.fetchQuests();
    void state.fetchLeaderboard();
    void state.fetchBadgeCollection();
  },

  proposeTask: async (title: string, description: string) => {
    const { currentMember } = get();
    if (!currentMember) return;

    let quest;
    try {
      quest = await proposeTask(title, description, currentMember.memberId);
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

  clearCompletionFeedback: () => {
    set({ completionFeedback: null });
  },

  clearNewBadgeUnlocked: () => {
    set({ newBadgeUnlocked: false });
  },
}));
