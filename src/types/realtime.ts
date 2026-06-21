// ─── Real-Time Event Type Definitions ───────────────────────────────────────

export type EventType = 'leaderboard_update' | 'quest_update' | 'badge_update' | 'connection_ack';

export interface EventMessage {
  type: EventType;
  payload: LeaderboardUpdatePayload | QuestUpdatePayload | BadgeUpdatePayload | ConnectionAckPayload;
  timestamp: string; // ISO 8601 UTC
}

export interface LeaderboardUpdatePayload {
  member_id: string;
  badge_count: number; // >= 0
}

export interface QuestUpdatePayload {
  quest_id: string;
  new_status: 'active' | 'pending' | 'rejected';
  affected_member_id: string;
  proposer_id: string;
  target_role: 'agent' | 'developer' | 'all';
  assignment_type: 'all' | 'assigned' | 'open';
  completion_mode: 'multiple' | 'first-claim';
  rejection_reason?: string; // present when new_status is "rejected"
}

export interface BadgeUpdatePayload {
  member_id: string;
  badge_id: string;
  badge_name: string; // 1-100 characters
}

export interface ConnectionAckPayload {
  connection_id: string;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed';
