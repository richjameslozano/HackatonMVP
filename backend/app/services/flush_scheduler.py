"""Batch flush scheduler — periodically drains the write queue and flushes to Lark Base API."""

from __future__ import annotations

import asyncio
import logging
import math
from datetime import datetime, timezone

import httpx

from app.config import Settings
from app.models import EventMessage, FlushResult, WriteFailedPayload, WriteOperation
from app.services.cache import CacheStore
from app.services.connection_manager import ConnectionManager
from app.services.lark_client import LarkClient
from app.services.write_queue import WriteQueue

logger = logging.getLogger(__name__)

# ─── Constants ───────────────────────────────────────────────────────────────

_BATCH_SIZE_LIMIT = 500
_MAX_FAIL_COUNT = 3


# ─── FlushScheduler ─────────────────────────────────────────────────────────


class FlushScheduler:
    """Periodic batch flush of the write queue to Lark Base API."""

    def __init__(
        self,
        queue: WriteQueue,
        cache: CacheStore,
        lark_client: LarkClient,
        settings: Settings,
        ws_manager: ConnectionManager | None = None,
    ) -> None:
        self._queue = queue
        self._cache = cache
        self._lark_client = lark_client
        self._settings = settings
        self._ws_manager = ws_manager
        self._task: asyncio.Task[None] | None = None
        self._interval = settings.batch_flush_interval_seconds

    # ─── Lifecycle ───────────────────────────────────────────────────────────

    async def start(self) -> None:
        """Launch the background flush loop."""
        if self._task is not None and not self._task.done():
            logger.warning("FlushScheduler already running")
            return
        self._task = asyncio.create_task(self._run_loop(), name="flush_scheduler")
        logger.info(
            "FlushScheduler started (interval=%ds)", self._interval
        )

    async def stop(self) -> None:
        """Cancel the background flush task."""
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
            logger.info("FlushScheduler stopped")

    # ─── Main Loop ───────────────────────────────────────────────────────────

    async def _run_loop(self) -> None:
        """Repeatedly call flush_once at the configured interval."""
        while True:
            await asyncio.sleep(self._interval)
            try:
                await self.flush_once()
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Unhandled error during flush cycle")

    # ─── Flush Logic ─────────────────────────────────────────────────────────

    async def flush_once(self) -> FlushResult:
        """Drain all configured tables, merge, batch, and send to Lark Base.

        Returns an aggregated FlushResult across all tables.
        """
        tables = self._settings.configured_tables_list
        total_creates_sent = 0
        total_updates_sent = 0
        total_api_calls = 0
        total_failed = 0
        total_dead_lettered = 0
        all_id_mappings: dict[str, str] = {}

        for table_id in tables:
            result = await self._flush_table(table_id)
            total_creates_sent += result.creates_sent
            total_updates_sent += result.updates_sent
            total_api_calls += result.api_calls_made
            total_failed += result.failed_operations
            total_dead_lettered += result.dead_lettered
            all_id_mappings.update(result.id_mappings)

        return FlushResult(
            table_id=",".join(tables) if tables else "",
            creates_sent=total_creates_sent,
            updates_sent=total_updates_sent,
            api_calls_made=total_api_calls,
            failed_operations=total_failed,
            dead_lettered=total_dead_lettered,
            id_mappings=all_id_mappings,
        )

    async def _flush_table(self, table_id: str) -> FlushResult:
        """Flush pending operations for a single table."""
        # 1. Drain the queue for this table
        operations = self._queue.drain(table_id)
        if not operations:
            return FlushResult(
                table_id=table_id,
                creates_sent=0,
                updates_sent=0,
                api_calls_made=0,
                failed_operations=0,
                dead_lettered=0,
            )

        # 2. Merge updates (last-writer-wins)
        merged = self._queue.merge_updates(operations)

        # 3. Separate into creates and updates
        creates: list[WriteOperation] = []
        updates: list[WriteOperation] = []
        for op in merged:
            if op.op_type == "create":
                creates.append(op)
            else:
                updates.append(op)

        api_calls_made = 0
        failed_operations = 0
        dead_lettered = 0
        id_mappings: dict[str, str] = {}

        # 4. Process creates in batches of ≤500
        creates_sent = 0
        for batch in self._split_batches(creates):
            success, mappings, dead_count = await self._send_create_batch(
                table_id, batch
            )
            api_calls_made += 1
            if success:
                creates_sent += len(batch)
                id_mappings.update(mappings)
            else:
                failed_operations += len(batch)
                dead_lettered += dead_count

        # 5. Broadcast ID reconciliation after successful creates
        if id_mappings and self._ws_manager:
            await self._broadcast_id_reconciliation(table_id, id_mappings)

        # 6. Process updates in batches of ≤500
        updates_sent = 0
        for batch in self._split_batches(updates):
            success, dead_count = await self._send_update_batch(table_id, batch)
            api_calls_made += 1
            if success:
                updates_sent += len(batch)
            else:
                failed_operations += len(batch)
                dead_lettered += dead_count

        return FlushResult(
            table_id=table_id,
            creates_sent=creates_sent,
            updates_sent=updates_sent,
            api_calls_made=api_calls_made,
            failed_operations=failed_operations,
            dead_lettered=dead_lettered,
            id_mappings=id_mappings,
        )

    # ─── Batch Helpers ───────────────────────────────────────────────────────

    def _split_batches(
        self, operations: list[WriteOperation]
    ) -> list[list[WriteOperation]]:
        """Split operations into batches of ≤500."""
        if not operations:
            return []
        batch_count = math.ceil(len(operations) / _BATCH_SIZE_LIMIT)
        batches: list[list[WriteOperation]] = []
        for i in range(batch_count):
            start = i * _BATCH_SIZE_LIMIT
            end = start + _BATCH_SIZE_LIMIT
            batches.append(operations[start:end])
        return batches

    async def _send_create_batch(
        self, table_id: str, batch: list[WriteOperation]
    ) -> tuple[bool, dict[str, str], int]:
        """Send a batch of create operations to Lark.

        Returns (success, id_mappings, dead_letter_count).
        """
        try:
            records_payload = [op.fields for op in batch]
            created_records = await self._lark_client.batch_create(
                table_id, records_payload
            )

            # Map temp_id → permanent_id from the response
            id_mappings: dict[str, str] = {}
            for op, created in zip(batch, created_records):
                permanent_id = created.get("record_id", "")
                if permanent_id:
                    id_mappings[op.record_id] = permanent_id
                    # Update cache: remove temp entry, insert with permanent ID
                    self._cache.remove(table_id, op.record_id)
                    self._cache.set(
                        table_id, permanent_id, created.get("fields", op.fields)
                    )

            return True, id_mappings, 0

        except (httpx.HTTPStatusError, httpx.TimeoutException) as exc:
            return self._handle_batch_failure(batch, exc)

    async def _send_update_batch(
        self, table_id: str, batch: list[WriteOperation]
    ) -> tuple[bool, int]:
        """Send a batch of update operations to Lark.

        Returns (success, dead_letter_count).
        """
        try:
            records_payload = [
                {"record_id": op.record_id, "fields": op.fields} for op in batch
            ]
            updated_records = await self._lark_client.batch_update(
                table_id, records_payload
            )

            # Update cache with fresh data from response
            for updated in updated_records:
                record_id = updated.get("record_id", "")
                if record_id:
                    self._cache.set(
                        table_id, record_id, updated.get("fields", {})
                    )

            return True, 0

        except (httpx.HTTPStatusError, httpx.TimeoutException) as exc:
            success, _, dead_count = self._handle_batch_failure(batch, exc)
            return success, dead_count

    def _handle_batch_failure(
        self,
        batch: list[WriteOperation],
        exc: httpx.HTTPStatusError | httpx.TimeoutException,
    ) -> tuple[bool, dict[str, str], int]:
        """Handle a failed batch by incrementing fail_count or dead-lettering.

        Returns (success=False, empty_mappings, dead_letter_count).
        """
        error_msg = str(exc)

        # Only retry on 5xx or timeout
        if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code < 500:
            # Non-5xx error — still dead-letter after threshold, but increment
            pass

        dead_letter_count = 0
        retry_ops: list[WriteOperation] = []

        for op in batch:
            incremented = WriteOperation(
                op_type=op.op_type,
                table_id=op.table_id,
                record_id=op.record_id,
                fields=op.fields,
                submitted_at=op.submitted_at,
                fail_count=op.fail_count + 1,
            )

            if incremented.fail_count >= _MAX_FAIL_COUNT:
                # Dead-letter this operation
                self._queue.move_to_dead_letter(incremented)
                dead_letter_count += 1
                # Broadcast write_failed via WebSocket
                asyncio.create_task(
                    self._broadcast_write_failed(
                        op.table_id, op.record_id, error_msg
                    )
                )
                logger.error(
                    "Operation dead-lettered: table=%s record=%s after %d failures",
                    op.table_id,
                    op.record_id,
                    incremented.fail_count,
                )
            else:
                retry_ops.append(incremented)

        # Return failed operations to the front of the queue for retry
        if retry_ops:
            self._queue.return_failed(retry_ops)

        logger.warning(
            "Batch flush failed (%d ops, %d dead-lettered): %s",
            len(batch),
            dead_letter_count,
            error_msg,
        )

        return False, {}, dead_letter_count

    # ─── WebSocket Broadcasting ──────────────────────────────────────────────

    async def _broadcast_write_failed(
        self, table_id: str, record_id: str, error: str
    ) -> None:
        """Broadcast a write_failed event to all connected clients."""
        if self._ws_manager is None:
            return

        payload = WriteFailedPayload(
            table_name=table_id,
            record_id=record_id,
            error=error,
        )
        message = EventMessage(
            type="leaderboard_update",  # Using existing EventType; ideally extend
            payload=payload.model_dump(),
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        # Use a raw dict broadcast since write_failed isn't in EventType literal
        raw_message = {
            "type": "write_failed",
            "payload": payload.model_dump(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await self._broadcast_raw(raw_message)

    async def _broadcast_id_reconciliation(
        self, table_id: str, id_mappings: dict[str, str]
    ) -> None:
        """Broadcast temp_id → permanent_id mappings to connected clients."""
        if self._ws_manager is None:
            return

        raw_message = {
            "type": "id_reconciliation",
            "payload": {
                "table_name": table_id,
                "mappings": id_mappings,
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await self._broadcast_raw(raw_message)

    async def _broadcast_raw(self, message: dict) -> None:
        """Send a raw dict message to all connected WebSocket clients."""
        if self._ws_manager is None:
            return

        if not self._ws_manager.active_connections:
            return

        failed_connections: list[str] = []
        for conn_id, websocket in self._ws_manager.active_connections.items():
            try:
                await websocket.send_json(message)
            except Exception:
                failed_connections.append(conn_id)

        for conn_id in failed_connections:
            self._ws_manager.active_connections.pop(conn_id, None)
