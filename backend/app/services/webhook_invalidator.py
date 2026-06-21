"""Webhook-driven cache invalidation for Lark Base events.

Processes incoming webhook events to keep the cache fresh by removing stale
entries, inserting newly created records, and broadcasting updates to connected
WebSocket clients.
"""

import asyncio
import logging
from datetime import datetime, timezone

from app.models import CacheUpdatedPayload, EventMessage
from app.services.cache import CacheStore
from app.services.connection_manager import ConnectionManager
from app.services.lark_client import LarkClient
from app.services.write_queue import WriteQueue

logger = logging.getLogger(__name__)

# ─── Constants ──────────────────────────────────────────────────────────────

FETCH_TIMEOUT_SECONDS = 5
PENDING_FETCH_RETRY_SECONDS = 30


# ─── Public Interface ───────────────────────────────────────────────────────


class WebhookInvalidator:
    """Handles cache invalidation based on incoming Lark webhook events."""

    def __init__(
        self,
        cache: CacheStore,
        queue: WriteQueue,
        lark_client: LarkClient,
        ws_manager: ConnectionManager,
    ) -> None:
        self._cache = cache
        self._queue = queue
        self._lark_client = lark_client
        self._ws_manager = ws_manager
        self._pending_retry_tasks: dict[str, asyncio.Task] = {}

    async def handle_event(
        self, table_id: str, action_type: str, record_id: str
    ) -> None:
        """Dispatch a webhook event to the appropriate handler.

        Skips invalidation if the record has a pending write in the WriteQueue
        (Req 4.6).
        """
        # Skip if there's a pending write for this record
        if self._queue.has_pending(record_id):
            logger.info(
                "Skipping webhook event for record %s (pending write in queue)",
                record_id,
            )
            return

        if action_type == "record_changed":
            await self._handle_record_changed(table_id, record_id)
        elif action_type == "record_created":
            await self._handle_record_created(table_id, record_id)
        elif action_type == "record_deleted":
            await self._handle_record_deleted(table_id, record_id)
        else:
            logger.warning(
                "Unknown webhook action_type: %s for record %s",
                action_type,
                record_id,
            )

    # ─── Private Handlers ───────────────────────────────────────────────────

    async def _handle_record_changed(
        self, table_id: str, record_id: str
    ) -> None:
        """Remove changed record from cache so next read triggers fresh fetch."""
        self._cache.remove(table_id, record_id)
        logger.info(
            "Cache invalidated for changed record %s in table %s",
            record_id,
            table_id,
        )
        await self._broadcast_cache_event(table_id, record_id, "updated")

    async def _handle_record_created(
        self, table_id: str, record_id: str
    ) -> None:
        """Fetch newly created record from Lark and insert into cache.

        On failure, marks the record as pending-fetch and schedules a retry
        within 30 seconds.
        """
        # Cancel any existing retry task for this record
        self._cancel_pending_retry(record_id)

        try:
            record = await asyncio.wait_for(
                self._lark_client.get_record(table_id, record_id),
                timeout=FETCH_TIMEOUT_SECONDS,
            )

            if record is not None:
                fields = record.get("fields", {})
                self._cache.set(table_id, record_id, fields)
                self._cache.clear_pending_fetch(table_id, record_id)
                logger.info(
                    "Cached newly created record %s in table %s",
                    record_id,
                    table_id,
                )
                await self._broadcast_cache_event(table_id, record_id, "created")
            else:
                # Record not found despite create event — mark pending
                self._mark_pending_and_schedule_retry(table_id, record_id)

        except (asyncio.TimeoutError, Exception) as exc:
            logger.warning(
                "Failed to fetch newly created record %s: %s",
                record_id,
                exc,
            )
            self._mark_pending_and_schedule_retry(table_id, record_id)

    async def _handle_record_deleted(
        self, table_id: str, record_id: str
    ) -> None:
        """Remove deleted record from cache."""
        self._cache.remove(table_id, record_id)
        self._cache.clear_pending_fetch(table_id, record_id)
        self._cancel_pending_retry(record_id)
        logger.info(
            "Cache removed for deleted record %s in table %s",
            record_id,
            table_id,
        )
        await self._broadcast_cache_event(table_id, record_id, "deleted")

    # ─── Pending Fetch Retry ────────────────────────────────────────────────

    def _mark_pending_and_schedule_retry(
        self, table_id: str, record_id: str
    ) -> None:
        """Mark record as pending-fetch and schedule a retry within 30s."""
        self._cache.mark_pending_fetch(table_id, record_id)
        logger.info(
            "Marked record %s as pending-fetch, scheduling retry in %ds",
            record_id,
            PENDING_FETCH_RETRY_SECONDS,
        )

        task = asyncio.create_task(
            self._retry_pending_fetch(table_id, record_id)
        )
        self._pending_retry_tasks[record_id] = task

    async def _retry_pending_fetch(
        self, table_id: str, record_id: str
    ) -> None:
        """Retry fetching a pending record after a delay."""
        try:
            await asyncio.sleep(PENDING_FETCH_RETRY_SECONDS)

            # Re-check if the record still needs fetching
            if not self._cache.has_pending_fetch(record_id):
                return

            # Skip if there's now a pending write
            if self._queue.has_pending(record_id):
                self._cache.clear_pending_fetch(table_id, record_id)
                return

            record = await asyncio.wait_for(
                self._lark_client.get_record(table_id, record_id),
                timeout=FETCH_TIMEOUT_SECONDS,
            )

            if record is not None:
                fields = record.get("fields", {})
                self._cache.set(table_id, record_id, fields)
                self._cache.clear_pending_fetch(table_id, record_id)
                logger.info(
                    "Retry succeeded: cached record %s in table %s",
                    record_id,
                    table_id,
                )
                await self._broadcast_cache_event(table_id, record_id, "created")
            else:
                logger.warning(
                    "Retry failed: record %s not found in table %s",
                    record_id,
                    table_id,
                )
        except (asyncio.TimeoutError, Exception) as exc:
            logger.warning(
                "Retry fetch failed for record %s: %s", record_id, exc
            )
        finally:
            # Clean up the task reference
            self._pending_retry_tasks.pop(record_id, None)

    def _cancel_pending_retry(self, record_id: str) -> None:
        """Cancel an existing pending retry task for a record."""
        task = self._pending_retry_tasks.pop(record_id, None)
        if task is not None and not task.done():
            task.cancel()

    # ─── WebSocket Broadcasting ─────────────────────────────────────────────

    async def _broadcast_cache_event(
        self, table_id: str, record_id: str, action: str
    ) -> None:
        """Broadcast a cache_updated WebSocket event to all connected clients."""
        payload = CacheUpdatedPayload(
            table_name=table_id,
            record_id=record_id,
            action=action,
        )
        message = EventMessage(
            type="cache_updated",
            payload=payload.model_dump(),
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        await self._ws_manager.broadcast(message)
