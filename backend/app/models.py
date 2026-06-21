"""Pydantic data models for real-time event messages and payloads."""

from pydantic import BaseModel, Field
from typing import Literal

# Type alias for event types used across the backend
EventType = Literal["leaderboard_update",
                    "quest_update", "badge_update", "connection_ack"]


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
