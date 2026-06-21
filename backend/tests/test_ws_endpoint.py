"""Tests for the WebSocket /ws endpoint."""

import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from app.main import app


class TestWebSocketEndpoint:
    """Tests for the /ws WebSocket route."""

    def test_websocket_connect_and_receive_ack(self):
        """A client connecting to /ws should receive a connection_ack message."""
        client = TestClient(app)
        with client.websocket_connect("/ws") as ws:
            # Should receive a connection_ack message
            data = ws.receive_json()
            assert data["type"] == "connection_ack"
            assert "payload" in data
            assert "connection_id" in data["payload"]
            assert "timestamp" in data

    def test_websocket_pong_response_handled(self):
        """Client sending 'pong' text should not cause an error."""
        client = TestClient(app)
        with client.websocket_connect("/ws") as ws:
            # Receive the connection_ack
            ws.receive_json()
            # Send a pong response (simulating heartbeat response)
            ws.send_text("pong")

    def test_websocket_disconnect_removes_connection(self):
        """Disconnecting should remove the client from active connections."""
        from app.services.connection_manager import manager

        client = TestClient(app)
        initial_count = manager.get_connection_count()

        with client.websocket_connect("/ws") as ws:
            ws.receive_json()
            assert manager.get_connection_count() == initial_count + 1

        # After context manager exits (disconnect), count should return
        assert manager.get_connection_count() == initial_count

    def test_websocket_rejected_at_capacity(self):
        """When max_connections is reached, new connections should be rejected."""
        from app.services.connection_manager import manager

        original_max = manager.max_connections
        manager.max_connections = 0  # Set to 0 to reject all

        client = TestClient(app)
        try:
            with pytest.raises(Exception):
                with client.websocket_connect("/ws") as ws:
                    pass
        finally:
            manager.max_connections = original_max
