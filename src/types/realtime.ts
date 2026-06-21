// ─── Real-Time Event Type Definitions ───────────────────────────────────────

export type EventType =
  | 'leaderboard_update'
  | 'quest_update'
  | 'badge_update'
  | 'connection_ack'
  | 'cache_updated'
  | 'write_failed'
  | 'id_reconciliation';

export interface EventMessage {
  type: EventType;
  payload:
    | LeaderboardUpdatePayload
    | QuestUpdatePayload
    | BadgeUpdatePayload
    | ConnectionAckPayload
    | CacheUpdatedPayload
    | WriteFailedPayload
    | IdReconciliationPayload;
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

// ─── Cache Event Payloads ────────────────────────────────────────────────────

export interface CacheUpdatedPayload {
  table_name: string;
  record_id: string;
  action: 'created' | 'updated' | 'deleted';
}

export interface WriteFailedPayload {
  table_name: string;
  record_id: string;
  error: string;
}

export interface IdReconciliationPayload {
  table_name: string;
  mappings: Record<string, string>; // temp_id → permanent_id
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed';
