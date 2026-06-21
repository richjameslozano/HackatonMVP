"""WebSocket endpoint for real-time client connections."""

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.connection_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """Accept WebSocket connections, handle ping/pong lifecycle.

    Removes connection on disconnect or pong timeout.
    Validates: Requirements 7.3, 7.5
    """
    connection_id = await manager.connect(websocket)

    # If connect returned None, the connection was rejected (at capacity)
    if connection_id is None:
        return

    try:
        while True:
            # Wait for incoming messages from the client.
            # Primary use: receiving pong responses to keep-alive pings.
            # The receive loop also detects client disconnection.
            data = await websocket.receive_text()

            # Client sends "pong" in response to server ping frames.
            # This keeps the connection alive and confirms client liveness.
            if data == "pong":
                logger.debug("Received pong from %s", connection_id)

    except WebSocketDisconnect:
        # Client disconnected normally (e.g., closed tab, navigated away)
        manager.disconnect(connection_id)
    except Exception:
        # Any unexpected error — disconnect cleanly
        logger.exception("Unexpected error on connection %s", connection_id)
        manager.disconnect(connection_id)
