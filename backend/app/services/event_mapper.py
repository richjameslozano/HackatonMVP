"""Event mapper service for Lark webhook events.

Maps Lark Base table IDs to logical table names, and logical table names
to typed EventMessage instances for WebSocket broadcast.
"""

from datetime import datetime, timezone

from app.models import EventMessage, EventType

# Maps Lark Base table_id → logical table name
TABLE_ID_MAP: dict[str, str] = {
    "tblC8k1INWUFfXYm": "quest_completions",
    "tblzEYdc7tHCTmNE": "quests",
    "tblnVFbK2EzKTsV6": "badge_earned",
}

# Maps logical table name → EventMessage type
TABLE_EVENT_MAP: dict[str, EventType] = {
    "quest_completions": "leaderboard_update",
    "quests": "quest_update",
    "badge_earned": "badge_update",
}


def map_webhook_to_event(table_name: str, event_data: dict) -> EventMessage | None:
    """Map a Lark webhook event to a typed EventMessage.

    Args:
        table_name: The logical table name (e.g. "quest_completions", "quests",
            "badge_earned"). Use TABLE_ID_MAP to resolve from table_id first.
        event_data: The raw event data dict to include as the message payload.

    Returns:
        An EventMessage with the appropriate type, payload, and UTC timestamp,
        or None if the table_name is not recognized.
    """
    event_type = TABLE_EVENT_MAP.get(table_name)
    if event_type is None:
        return None

    return EventMessage(
        type=event_type,
        payload=event_data,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
