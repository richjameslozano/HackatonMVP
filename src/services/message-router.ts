// ─── Message Router ─────────────────────────────────────────────────────────
// Routes incoming WebSocket event messages to appropriate store actions.

import type {
  EventMessage,
  LeaderboardUpdatePayload,
  QuestUpdatePayload,
  BadgeUpdatePayload,
  ConnectionAckPayload,
} from '../types/realtime';
import type { Badge, TargetRole, Role } from '../types';
import { useAppStore } from '../store/app.store';

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
