"""Tests for the webhook POST /webhook/lark endpoint."""

import json
from unittest.mock import patch, AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.event_mapper import TABLE_ID_MAP


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def valid_token():
    """Return the configured verification token."""
    from app.config import settings
    return settings.lark_verification_token


class TestURLVerification:
    """Tests for URL verification challenge handling."""

    def test_url_verification_returns_challenge(self, client):
        """When type is url_verification, return the challenge value."""
        payload = {
            "token": "some_token",
            "type": "url_verification",
            "challenge": "test_challenge_string",
        }
        response = client.post("/webhook/lark", json=payload)
        assert response.status_code == 200
        assert response.json() == {"challenge": "test_challenge_string"}

    def test_url_verification_with_empty_challenge(self, client):
        """URL verification with empty challenge still returns it."""
        payload = {
            "token": "some_token",
            "type": "url_verification",
            "challenge": "",
        }
        response = client.post("/webhook/lark", json=payload)
        assert response.status_code == 200
        assert response.json() == {"challenge": ""}


class TestTokenValidation:
    """Tests for verification token validation."""

    def test_invalid_token_returns_403(self, client):
        """A request with an invalid token should return HTTP 403."""
        payload = {
            "token": "wrong_token_value",
            "type": "event_callback",
            "event": {"table_id": "tblC8k1INWUFfXYm"},
        }
        response = client.post("/webhook/lark", json=payload)
        assert response.status_code == 403

    def test_valid_token_accepted(self, client, valid_token):
        """A request with the correct token should be accepted."""
        payload = {
            "token": valid_token,
            "type": "event_callback",
            "event": {"table_id": "tblC8k1INWUFfXYm"},
        }
        response = client.post("/webhook/lark", json=payload)
        assert response.status_code == 200


class TestContentLengthValidation:
    """Tests for Content-Length validation (1 MB limit)."""

    def test_large_body_returns_413(self, client):
        """A request body exceeding 1 MB should return HTTP 413."""
        # Create a payload larger than 1 MB
        large_data = "x" * (1_048_577)
        response = client.post(
            "/webhook/lark",
            content=large_data,
            headers={
                "content-length": str(len(large_data)), "content-type": "application/json"},
        )
        assert response.status_code == 413

    def test_body_within_limit_accepted(self, client, valid_token):
        """A request body within 1 MB should be processed normally."""
        payload = {
            "token": valid_token,
            "type": "event_callback",
            "event": {"table_id": "tblC8k1INWUFfXYm"},
        }
        response = client.post("/webhook/lark", json=payload)
        assert response.status_code == 200


class TestEventBroadcast:
    """Tests for event mapping and broadcasting."""

    def test_quest_completions_broadcasts_leaderboard_update(self, client, valid_token):
        """quest_completions table triggers leaderboard_update broadcast."""
        payload = {
            "token": valid_token,
            "type": "event_callback",
            "event": {"table_id": "tblC8k1INWUFfXYm", "record": {"fields": {}}},
        }
        with patch("app.routers.webhook.manager.broadcast", new_callable=AsyncMock) as mock_broadcast:
            response = client.post("/webhook/lark", json=payload)
            assert response.status_code == 200
            mock_broadcast.assert_called_once()
            event_msg = mock_broadcast.call_args[0][0]
            assert event_msg.type == "leaderboard_update"

    def test_quests_table_broadcasts_quest_update(self, client, valid_token):
        """quests table triggers quest_update broadcast."""
        payload = {
            "token": valid_token,
            "type": "event_callback",
            "event": {"table_id": "tblzEYdc7tHCTmNE", "record": {"fields": {}}},
        }
        with patch("app.routers.webhook.manager.broadcast", new_callable=AsyncMock) as mock_broadcast:
            response = client.post("/webhook/lark", json=payload)
            assert response.status_code == 200
            mock_broadcast.assert_called_once()
            event_msg = mock_broadcast.call_args[0][0]
            assert event_msg.type == "quest_update"

    def test_badge_earned_broadcasts_badge_update(self, client, valid_token):
        """badge_earned table triggers badge_update broadcast."""
        payload = {
            "token": valid_token,
            "type": "event_callback",
            "event": {"table_id": "tblnVFbK2EzKTsV6", "record": {"fields": {}}},
        }
        with patch("app.routers.webhook.manager.broadcast", new_callable=AsyncMock) as mock_broadcast:
            response = client.post("/webhook/lark", json=payload)
            assert response.status_code == 200
            mock_broadcast.assert_called_once()
            event_msg = mock_broadcast.call_args[0][0]
            assert event_msg.type == "badge_update"

    def test_unrecognized_table_returns_200_no_broadcast(self, client, valid_token):
        """Unrecognized table_id should return 200 without broadcasting."""
        payload = {
            "token": valid_token,
            "type": "event_callback",
            "event": {"table_id": "tblUNKNOWN123", "record": {"fields": {}}},
        }
        with patch("app.routers.webhook.manager.broadcast", new_callable=AsyncMock) as mock_broadcast:
            response = client.post("/webhook/lark", json=payload)
            assert response.status_code == 200
            mock_broadcast.assert_not_called()

    def test_missing_table_id_returns_200_no_broadcast(self, client, valid_token):
        """Event without table_id should return 200 without broadcasting."""
        payload = {
            "token": valid_token,
            "type": "event_callback",
            "event": {"record": {"fields": {}}},
        }
        with patch("app.routers.webhook.manager.broadcast", new_callable=AsyncMock) as mock_broadcast:
            response = client.post("/webhook/lark", json=payload)
            assert response.status_code == 200
            mock_broadcast.assert_not_called()
