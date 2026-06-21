"""Pydantic data models for real-time event messages and payloads."""

from dataclasses import dataclass, field
import time
from pydantic import BaseModel, Field
from typing import Literal

# Type alias for event types used across the backend
EventType = Literal["leaderboard_update",
                    "quest_update", "badge_update", "connection_ack",
                    "cache_updated", "write_failed"]


class LarkWebhookPayload(BaseModel):
    """Incoming Lark Base webhook request body."""

    token: str = ""
    type: str = ""
    challenge: str = ""
    event: dict = Field(default_factory=dict)


class LeaderboardUpdatePayload(BaseModel):
    """Payload for leaderboard_update events."""

    member_id: str
    badge_count: int = Field(ge=0)


class QuestUpdatePayload(BaseModel):
    """Payload for quest_update events."""

    quest_id: str
    new_status: Literal["active", "pending", "rejected"]
    affected_member_id: str
    proposer_id: str
    target_role: Literal["agent", "developer", "all"]
    assignment_type: Literal["all", "assigned", "open"]
    completion_mode: Literal["multiple", "first-claim"]
    rejection_reason: str | None = None


class BadgeUpdatePayload(BaseModel):
    """Payload for badge_update events."""

    member_id: str
    badge_id: str
    badge_name: str = Field(min_length=1, max_length=100)


class ConnectionAckPayload(BaseModel):
    """Payload for connection_ack events sent on WebSocket connect."""

    connection_id: str


class EventMessage(BaseModel):
    """WebSocket event message broadcast to connected clients."""

    type: EventType
    payload: dict
    timestamp: str  # ISO 8601 UTC


# ─── Cache & Write Queue Models ─────────────────────────────────────────────


@dataclass
class CacheEntry:
    """A single cached record with metadata."""

    record_id: str
    fields: dict
    inserted_at: float = field(default_factory=time.time)
    last_refreshed_at: float = field(default_factory=time.time)

    def age_seconds(self) -> float:
        return time.time() - self.last_refreshed_at

    def is_stale(self, ttl_seconds: int) -> bool:
        return self.age_seconds() > ttl_seconds


@dataclass
class TableCache:
    """Cache storage for a single Lark Base table."""

    entries: dict[str, CacheEntry] = field(default_factory=dict)
    ttl_seconds: int = 300
    max_records: int = 10_000
    fully_cached: bool = False
    last_full_fetch_at: float | None = None
    pending_fetches: set[str] = field(default_factory=set)


class WriteOperation(BaseModel):
    """A pending write operation in the queue."""

    op_type: Literal["create", "update"]
    table_id: str
    record_id: str
    fields: dict
    submitted_at: float
    fail_count: int = 0


class FlushResult(BaseModel):
    """Result of a single flush cycle."""

    table_id: str
    creates_sent: int
    updates_sent: int
    api_calls_made: int
    failed_operations: int
    dead_lettered: int
    id_mappings: dict[str, str] = Field(default_factory=dict)


class DeadLetterEntry(BaseModel):
    """A write operation that has exhausted retry attempts."""

    operation: WriteOperation
    last_error: str
    dead_lettered_at: float


class CacheUpdatedPayload(BaseModel):
    """Payload for cache_updated WebSocket events."""

    table_name: str
    record_id: str
    action: Literal["created", "updated", "deleted"]


class WriteFailedPayload(BaseModel):
    """Payload for write_failed WebSocket events."""

    table_name: str
    record_id: str
    error: str
