"""Connection manager placeholder - will be fully implemented in a later task."""

from fastapi import WebSocket


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self, max_connections: int = 50):
        self.active_connections: dict[str, WebSocket] = {}
        self.max_connections = max_connections
        self._connection_counter = 0

    async def ping_all(self) -> None:
        """Send ping frame to all connections. Placeholder for heartbeat."""
        pass

    def get_connection_count(self) -> int:
        """Return current number of active connections."""
        return len(self.active_connections)


manager = ConnectionManager()
