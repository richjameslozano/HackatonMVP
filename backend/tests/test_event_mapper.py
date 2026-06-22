"""Unit tests for the event mapper service."""

from app.services.event_mapper import (
    TABLE_ID_MAP,
    TABLE_EVENT_MAP,
    map_webhook_to_event,
)


class TestTableMappings:
    """Tests for TABLE_ID_MAP and TABLE_EVENT_MAP constants."""

    def test_table_id_map_contains_quest_completions(self):
        assert "tblLGu2kUdrvsE4A" in TABLE_ID_MAP
        assert TABLE_ID_MAP["tblLGu2kUdrvsE4A"] == "quest_completions"

    def test_table_id_map_contains_quests(self):
        assert "tblpAwQiuFod3Lls" in TABLE_ID_MAP
        assert TABLE_ID_MAP["tblpAwQiuFod3Lls"] == "quests"

    def test_table_id_map_contains_badge_earned(self):
        assert "tblxLZpbqSdEVeae" in TABLE_ID_MAP
        assert TABLE_ID_MAP["tblxLZpbqSdEVeae"] == "badge_earned"

    def test_table_event_map_quest_completions(self):
        assert TABLE_EVENT_MAP["quest_completions"] == "leaderboard_update"

    def test_table_event_map_quests(self):
        assert TABLE_EVENT_MAP["quests"] == "quest_update"

    def test_table_event_map_badge_earned(self):
        assert TABLE_EVENT_MAP["badge_earned"] == "badge_update"


class TestMapWebhookToEvent:
    """Tests for the map_webhook_to_event function."""

    def test_quest_completions_returns_leaderboard_update(self):
        event_data = {"record_id": "recABC", "fields": {"member_id": "m1"}}
        result = map_webhook_to_event("quest_completions", event_data)

        assert result is not None
        assert result.type == "leaderboard_update"
        assert result.payload == event_data
        assert result.timestamp  # non-empty ISO 8601 string

    def test_quests_returns_quest_update(self):
        event_data = {"record_id": "recDEF", "fields": {"quest_id": "q1"}}
        result = map_webhook_to_event("quests", event_data)

        assert result is not None
        assert result.type == "quest_update"
        assert result.payload == event_data

    def test_badge_earned_returns_badge_update(self):
        event_data = {"record_id": "recGHI", "fields": {"badge_id": "b1"}}
        result = map_webhook_to_event("badge_earned", event_data)

        assert result is not None
        assert result.type == "badge_update"
        assert result.payload == event_data

    def test_unrecognized_table_returns_none(self):
        result = map_webhook_to_event("unknown_table", {"some": "data"})
        assert result is None

    def test_empty_string_table_returns_none(self):
        result = map_webhook_to_event("", {})
        assert result is None

    def test_timestamp_is_utc_iso_format(self):
        result = map_webhook_to_event("quests", {})
        assert result is not None
        # Should contain timezone info ('+00:00' or 'Z')
        assert "+00:00" in result.timestamp or "Z" in result.timestamp

    def test_event_data_passed_as_payload(self):
        event_data = {"key": "value", "nested": {"a": 1}}
        result = map_webhook_to_event("quest_completions", event_data)
        assert result is not None
        assert result.payload == event_data
