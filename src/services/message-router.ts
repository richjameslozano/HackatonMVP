// ─── Message Router ─────────────────────────────────────────────────────────
// Routes incoming WebSocket event messages to appropriate store actions.

import type {
  EventMessage,
  LeaderboardUpdatePayload,
  QuestUpdatePayload,
  BadgeUpdatePayload,
  ConnectionAckPayload,
  CacheUpdatedPayload,
  WriteFailedPayload,
  IdReconciliationPayload,
} from '../types/realtime';
import type { Badge, TargetRole, Role } from '../types';
import { useAppStore } from '../store/app.store';
import { useCoinStore } from '../store/coin.store';
import { TABLE_IDS } from './config';

// ─── Module-Level State ─────────────────────────────────────────────────────

let connectionId: string | null = null;

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Routes an incoming EventMessage to the appropriate handler based on its type.
 */
export function routeMessage(message: EventMessage): void {
  switch (message.type) {
    case 'leaderboard_update':
      handleLeaderboardUpdate(message.payload as LeaderboardUpdatePayload);
      break;
    case 'quest_update':
      handleQuestUpdate(message.payload as QuestUpdatePayload);
      break;
    case 'badge_update':
      handleBadgeUpdate(message.payload as BadgeUpdatePayload);
      break;
    case 'connection_ack':
      handleConnectionAck(message.payload as ConnectionAckPayload);
      break;
    case 'cache_updated':
      handleCacheUpdated(message.payload as CacheUpdatedPayload);
      break;
    case 'write_failed':
      handleWriteFailed(message.payload as WriteFailedPayload);
      break;
    case 'id_reconciliation':
      handleIdReconciliation(message.payload as IdReconciliationPayload);
      break;
  }
}

/**
 * Returns the current stored connection_id, or null if not yet acknowledged.
 */
export function getConnectionId(): string | null {
  return connectionId;
}

// ─── Quest Routing Helpers ───────────────────────────────────────────────────

/**
 * Determines if an open quest is visible to a user based on their selected role.
 * A quest is visible if target_role equals the user's selectedRole OR target_role is "all".
 *
 * Validates: Requirements 4.4
 */
export function isQuestVisibleForRole(
  questTargetRole: TargetRole,
  userSelectedRole: Role
): boolean {
  return questTargetRole === 'all' || questTargetRole === userSelectedRole;
}

/**
 * Determines if a pending quest update should trigger the pending category update
 * for a scrum master view. Returns true regardless of other fields when status is "pending".
 *
 * Validates: Requirements 4.1
 */
export function shouldAddToPending(newStatus: string): boolean {
  return newStatus === 'pending';
}

// ─── Internal Handlers ──────────────────────────────────────────────────────

function handleLeaderboardUpdate(_payload: LeaderboardUpdatePayload): void {
  // Trigger leaderboard refetch from Lark Base API
  void useAppStore.getState().fetchLeaderboard();
}

function handleQuestUpdate(payload: QuestUpdatePayload): void {
  const store = useAppStore.getState();

  // Optimistic removal: if a "first-claim" open quest has been claimed (status changes away from open availability),
  // remove it from the open category immediately before the full refetch arrives.
  if (
    payload.completion_mode === 'first-claim' &&
    payload.assignment_type === 'open' &&
    payload.new_status === 'active'
  ) {
    const currentQuests = store.quests;
    if (currentQuests?.open) {
      const updatedOpen = currentQuests.open.filter(
        (q) => q.questId !== payload.quest_id
      );
      useAppStore.setState({
        quests: { ...currentQuests, open: updatedOpen },
      });
    }
  }

  // Primary mechanism: refetch full quest data from Lark Base API.
  // This handles all scenarios including:
  // - Unknown quest_id (Requirement 4.5): fetchQuests retrieves the full record
  // - Pending → active transitions (Requirement 4.2)
  // - Pending → rejected transitions (Requirement 4.3)
  // - New pending quests (Requirement 4.1)
  // - Open quest visibility (Requirement 4.4)
  void store.fetchQuests();
}

function handleBadgeUpdate(payload: BadgeUpdatePayload): void {
  const store = useAppStore.getState();
  const currentMember = store.currentMember;

  if (payload.member_id === currentMember?.memberId) {
    // Current user earned a badge — show celebration
    void store.fetchBadgeCollection();

    // Set badge unlock notification state
    const badge: Badge = {
      badgeId: payload.badge_id,
      name: payload.badge_name,
      description: '',
      iconUrl: '',
      targetRole: store.selectedRole ?? 'agent',
      requiredCompletions: 0,
    };

    useAppStore.setState({
      completionFeedback: {
        success: true,
        unlockedBadges: [badge],
      },
      newBadgeUnlocked: true,
    });
  } else {
    // Another user earned a badge — refresh leaderboard
    void store.fetchLeaderboard();
  }
}

function handleConnectionAck(payload: ConnectionAckPayload): void {
  connectionId = payload.connection_id;
}

// ─── Cache Event Handlers ───────────────────────────────────────────────────

/**
 * Resolves a table_id (Lark table ID) to a logical table name used
 * for determining which store actions to trigger on cache_updated events.
 */
function resolveTableName(tableId: string): string | null {
  for (const [name, id] of Object.entries(TABLE_IDS)) {
    if (id === tableId) return name;
  }
  return null;
}

function handleCacheUpdated(payload: CacheUpdatedPayload): void {
  const store = useAppStore.getState();
  const tableName = resolveTableName(payload.table_name);

  if (!tableName) {
    // If it's already a logical table name (e.g. backend sends "quests" directly)
    // try matching directly
    if (payload.table_name in TABLE_IDS) {
      triggerRefetchForTable(payload.table_name, store);
    }
    return;
  }

  triggerRefetchForTable(tableName, store);
}

function triggerRefetchForTable(tableName: string, store: ReturnType<typeof useAppStore.getState>): void {
  switch (tableName) {
    case 'quests':
    case 'questCompletions':
      void store.fetchQuests();
      // Quest completions affect coin balance
      if (tableName === 'questCompletions' && store.currentMember) {
        void useCoinStore.getState().refreshBalance(store.currentMember.memberId);
      }
      break;
    case 'members':
      // Members change could affect leaderboard and quests
      void store.fetchLeaderboard();
      break;
    case 'badges':
    case 'badgeEarned':
      void store.fetchBadgeCollection();
      void store.fetchLeaderboard();
      break;
    case 'coinConfig':
      // Coin config change affects displayed balance
      if (store.currentMember) {
        void useCoinStore.getState().refreshBalance(store.currentMember.memberId);
      }
      break;
    case 'purchases':
      // Purchase affects coin balance
      if (store.currentMember) {
        void useCoinStore.getState().refreshBalance(store.currentMember.memberId);
      }
      break;
    default:
      // For other tables (projects, rewardItems),
      // no generic refetch needed at this layer
      break;
  }
}

function handleWriteFailed(payload: WriteFailedPayload): void {
  const tableName = resolveTableName(payload.table_name) ?? payload.table_name;
  const warning = `Write failed for record ${payload.record_id} in ${tableName}: ${payload.error}`;
  useAppStore.setState({ notificationWarning: warning });
}

function handleIdReconciliation(payload: IdReconciliationPayload): void {
  const store = useAppStore.getState();
  const { mappings } = payload;

  if (!mappings || Object.keys(mappings).length === 0) return;

  // Replace temp IDs with permanent IDs in quests
  const quests = store.quests;
  if (quests) {
    let updated = false;
    const updatedQuests = { ...quests };

    for (const category of Object.keys(updatedQuests) as Array<keyof typeof updatedQuests>) {
      const questList = updatedQuests[category];
      if (!questList) continue;

      updatedQuests[category] = questList.map((quest) => {
        const permanentId = mappings[quest.questId];
        if (permanentId) {
          updated = true;
          return { ...quest, questId: permanentId };
        }
        return quest;
      });
    }

    if (updated) {
      useAppStore.setState({ quests: updatedQuests });
    }
  }

  // Replace temp IDs in completedQuestIds set
  const completedQuestIds = store.completedQuestIds;
  if (completedQuestIds.size > 0) {
    let setUpdated = false;
    const newCompletedIds = new Set(completedQuestIds);

    for (const [tempId, permanentId] of Object.entries(mappings)) {
      if (newCompletedIds.has(tempId)) {
        newCompletedIds.delete(tempId);
        newCompletedIds.add(permanentId);
        setUpdated = true;
      }
    }

    if (setUpdated) {
      useAppStore.setState({ completedQuestIds: newCompletedIds });
    }
  }
}