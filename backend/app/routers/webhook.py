"""Webhook router for receiving Lark Base event callbacks."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException

from app.config import settings
from app.models import LarkWebhookPayload
from app.services.event_mapper import map_webhook_to_event, TABLE_ID_MAP
from app.services.connection_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter()

# 1 MB content-length limit
MAX_CONTENT_LENGTH = 1_048_576


@router.post("/webhook/lark")
async def receive_webhook(request: Request) -> dict:
    """Receive and validate Lark Base webhook events.

    Validation flow:
    1. Check Content-Length <= 1 MB (HTTP 413 if exceeded)
    2. Parse JSON body into LarkWebhookPayload
    3. If type == "url_verification" -> return {"challenge": body.challenge}
    4. Compare body.token against settings.lark_verification_token (HTTP 403 if mismatch)
    5. Extract table_id from body.event, resolve to logical table name via TABLE_ID_MAP
    6. Map table_name to EventMessage via map_webhook_to_event (or discard if None)
    7. Broadcast to connected clients via manager.broadcast()
    8. Return HTTP 200
    """
    # Step 1: Validate Content-Length
    content_length = request.headers.get("content-length")
    if content_length is not None and int(content_length) > MAX_CONTENT_LENGTH:
        raise HTTPException(status_code=413, detail="Request body too large")

    # Step 2: Parse body
    raw_body = await request.body()
    if len(raw_body) > MAX_CONTENT_LENGTH:
        raise HTTPException(status_code=413, detail="Request body too large")

    body = LarkWebhookPayload.model_validate_json(raw_body)

    # Step 3: Handle URL verification challenge
    if body.type == "url_verification":
        return {"challenge": body.challenge}

    # Step 4: Validate verification token
    if body.token != settings.lark_verification_token:
        client_ip = request.client.host if request.client else "unknown"
        timestamp = datetime.now(timezone.utc).isoformat()
        logger.warning(
            "Webhook token mismatch: source_ip=%s timestamp=%s",
            client_ip,
            timestamp,
        )
        raise HTTPException(
            status_code=403, detail="Invalid verification token")

    # Step 5: Extract table_id and resolve to logical table name
    table_id = body.event.get("table_id", "")
    table_name = TABLE_ID_MAP.get(table_id)

    # Step 6: Map to EventMessage (None if unrecognized table)
    if table_name is None:
        # Acknowledge unrecognized tables with HTTP 200, no broadcast
        return {"status": "ok"}

    event_message = map_webhook_to_event(table_name, body.event)

    # Step 7: Broadcast to connected clients
    if event_message is not None:
        await manager.broadcast(event_message)

    # Step 8: Return HTTP 200
    return {"status": "ok"}
