// ─── Message Validator ───────────────────────────────────────────────────────

import type { EventMessage, EventType } from '../types/realtime';

const VALID_TYPES: Set<EventType> = new Set([
  'leaderboard_update',
  'quest_update',
  'badge_update',
  'connection_ack',
]);

export function validateEventMessage(raw: unknown): EventMessage | null {
  if (typeof raw !== 'object' || raw === null) {
    console.warn('[WebSocket] Invalid message: not an object', raw);
    return null;
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.type !== 'string' || !VALID_TYPES.has(obj.type as EventType)) {
    console.warn('[WebSocket] Invalid message: missing or invalid type', raw);
    return null;
  }

  if (typeof obj.payload !== 'object' || obj.payload === null) {
    console.warn('[WebSocket] Invalid message: missing or invalid payload', raw);
    return null;
  }

  if (typeof obj.timestamp !== 'string') {
    console.warn('[WebSocket] Invalid message: missing or invalid timestamp', raw);
    return null;
  }

  return obj as unknown as EventMessage;
}
