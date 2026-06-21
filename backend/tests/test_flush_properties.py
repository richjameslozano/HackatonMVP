"""Property-based tests for the flush scheduler batch operations."""

import math
import time
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from app.config import Settings
from app.models import WriteOperation
from app.services.cache import CacheStore
from app.services.flush_scheduler import FlushScheduler
from app.services.lark_client import LarkClient
from app.services.write_queue import WriteQueue


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _make_settings(table_id: str) -> Settings:
    """Create a Settings instance with the given table configured."""
    return Settings(
        configured_tables=table_id,
        batch_flush_interval_seconds=10,
        cache_ttl_seconds=300,
        lark_app_id="test",
        lark_app_secret="test",
        lark_base_app_token="test",
    )


def _make_write_op(op_type: str, table_id: str, record_id: str, fields: dict) -> WriteOperation:
    """Create a WriteOperation with the given parameters."""
    return WriteOperation(
        op_type=op_type,
        table_id=table_id,
        record_id=record_id,
        fields=fields,
        submitted_at=time.time(),
        fail_count=0,
    )


# ─── Strategies ──────────────────────────────────────────────────────────────


# Generate a reasonable number of creates and updates (1 to 1200 to test splitting at 500)
n_creates_strategy = st.integers(min_value=0, max_value=1200)
n_updates_strategy = st.integers(min_value=0, max_value=1200)

# Ensure at least one operation exists
mixed_ops_strategy = st.tuples(n_creates_strategy, n_updates_strategy).filter(
    lambda t: t[0] + t[1] > 0
)


# ─── Property 20: Batch flush sends at most one create and one update call per table ─


# Feature: api-request-caching, Property 20: Batch flush sends at most one create and one update call per table
@pytest.mark.asyncio
@given(data=mixed_ops_strategy)
@settings(max_examples=100)
async def test_batch_flush_one_create_one_update_call_per_table(data: tuple[int, int]) -> None:
    """
    **Validates: Requirements 8.2**

    For any flush cycle containing mixed create and update operations for a single table,
    the scheduler SHALL produce exactly ⌈N_creates/500⌉ batch_create calls and
    ⌈N_updates/500⌉ batch_update calls.
    """
    n_creates, n_updates = data
    table_id = "tbl_test"

    # Set up components
    settings_obj = _make_settings(table_id)
    queue = WriteQueue(max_size=5000)
    cache = CacheStore(ttl_seconds=300, max_records=10_000)

    # Mock the lark_client
    mock_lark_client = AsyncMock(spec=LarkClient)

    # batch_create returns records with permanent IDs
    async def mock_batch_create(tid: str, records: list[dict]) -> list[dict]:
        return [
            {"record_id": f"rec_{i}", "fields": rec}
            for i, rec in enumerate(records)
        ]

    # batch_update returns records with updated fields
    async def mock_batch_update(tid: str, records: list[dict]) -> list[dict]:
        return [
            {"record_id": rec["record_id"], "fields": rec["fields"]}
            for rec in records
        ]

    mock_lark_client.batch_create = AsyncMock(side_effect=mock_batch_create)
    mock_lark_client.batch_update = AsyncMock(side_effect=mock_batch_update)

    scheduler = FlushScheduler(
        queue=queue,
        cache=cache,
        lark_client=mock_lark_client,
        settings=settings_obj,
        ws_manager=None,
    )

    # Enqueue create operations
    for i in range(n_creates):
        op = _make_write_op("create", table_id, f"temp_{i}", {"field": f"val_{i}"})
        queue.enqueue(op)

    # Enqueue update operations (with distinct record_ids to avoid merging)
    for i in range(n_updates):
        op = _make_write_op("update", table_id, f"rec_upd_{i}", {"field": f"updated_{i}"})
        queue.enqueue(op)

    # Flush once
    await scheduler.flush_once()

    # Verify call counts
    expected_create_calls = math.ceil(n_creates / 500) if n_creates > 0 else 0
    expected_update_calls = math.ceil(n_updates / 500) if n_updates > 0 else 0

    actual_create_calls = mock_lark_client.batch_create.call_count
    actual_update_calls = mock_lark_client.batch_update.call_count

    assert actual_create_calls == expected_create_calls, (
        f"Expected {expected_create_calls} batch_create calls for {n_creates} creates, "
        f"got {actual_create_calls}"
    )
    assert actual_update_calls == expected_update_calls, (
        f"Expected {expected_update_calls} batch_update calls for {n_updates} updates, "
        f"got {actual_update_calls}"
    )


# ─── Property 12: Dead-letter after three consecutive failures ───────────────


# Feature: api-request-caching, Property 12: Dead-letter after three consecutive failures
# **Validates: Requirements 3.7**
class TestDeadLetterAfterThreeFailures:
    """Property 12: For any write operation whose fail_count reaches 3, the operation
    SHALL be moved to the dead-letter log and SHALL NOT appear in subsequent queue drains."""

    @given(
        table_id=st.text(
            alphabet=st.characters(whitelist_categories=("L", "N"), whitelist_characters="_"),
            min_size=1,
            max_size=20,
        ),
        record_id=st.text(
            alphabet=st.characters(whitelist_categories=("L", "N"), whitelist_characters="_"),
            min_size=1,
            max_size=20,
        ),
        op_type=st.sampled_from(["create", "update"]),
        fields=st.dictionaries(
            keys=st.text(
                alphabet=st.characters(whitelist_categories=("L",)),
                min_size=1,
                max_size=10,
            ),
            values=st.text(min_size=1, max_size=20),
            min_size=1,
            max_size=5,
        ),
    )
    @settings(max_examples=100)
    @pytest.mark.asyncio
    async def test_operation_with_fail_count_2_is_dead_lettered_after_one_more_failure(
        self, table_id: str, record_id: str, op_type: str, fields: dict
    ) -> None:
        """An operation with fail_count=2 that fails again SHALL be moved to dead-letter
        and SHALL NOT appear in subsequent queue drains."""
        # Arrange: real write queue and cache, mocked lark_client
        queue = WriteQueue(max_size=1000)
        cache = CacheStore(ttl_seconds=300, max_records=10_000)

        mock_lark_client = AsyncMock()
        # Make lark_client raise a 500 error on batch_create and batch_update
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.request = MagicMock()
        error = httpx.HTTPStatusError(
            "Server Error", request=mock_response.request, response=mock_response
        )
        mock_lark_client.batch_create = AsyncMock(side_effect=error)
        mock_lark_client.batch_update = AsyncMock(side_effect=error)

        mock_settings = MagicMock()
        mock_settings.batch_flush_interval_seconds = 10
        mock_settings.configured_tables_list = [table_id]

        scheduler = FlushScheduler(
            queue=queue,
            cache=cache,
            lark_client=mock_lark_client,
            settings=mock_settings,
        )

        # Enqueue an operation with fail_count=2 (one more failure → dead-letter)
        operation = WriteOperation(
            op_type=op_type,
            table_id=table_id,
            record_id=record_id,
            fields=fields,
            submitted_at=time.time(),
            fail_count=2,
        )
        queue.enqueue(operation)

        # Act: flush_once should attempt the batch and fail
        await scheduler.flush_once()

        # Assert: operation is in dead-letter log
        dead_letters = queue.dead_letter_entries
        dead_letter_record_ids = [dl.operation.record_id for dl in dead_letters]
        assert record_id in dead_letter_record_ids

        # Assert: operation is NOT in the queue anymore
        remaining_ops = queue.drain(table_id)
        remaining_record_ids = [op.record_id for op in remaining_ops]
        assert record_id not in remaining_record_ids

    @given(
        n_ops=st.integers(min_value=1, max_value=10),
    )
    @settings(max_examples=100)
    @pytest.mark.asyncio
    async def test_multiple_operations_at_fail_count_2_all_dead_lettered(
        self, n_ops: int
    ) -> None:
        """All operations in a batch with fail_count=2 SHALL be dead-lettered after failure."""
        table_id = "tbl_test"
        queue = WriteQueue(max_size=1000)
        cache = CacheStore(ttl_seconds=300, max_records=10_000)

        mock_lark_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.request = MagicMock()
        error = httpx.HTTPStatusError(
            "Server Error", request=mock_response.request, response=mock_response
        )
        mock_lark_client.batch_create = AsyncMock(side_effect=error)
        mock_lark_client.batch_update = AsyncMock(side_effect=error)

        mock_settings = MagicMock()
        mock_settings.batch_flush_interval_seconds = 10
        mock_settings.configured_tables_list = [table_id]

        scheduler = FlushScheduler(
            queue=queue,
            cache=cache,
            lark_client=mock_lark_client,
            settings=mock_settings,
        )

        # Enqueue N operations all with fail_count=2
        record_ids = []
        for i in range(n_ops):
            rid = f"rec_{i}_{time.time_ns()}"
            record_ids.append(rid)
            op = WriteOperation(
                op_type="update",
                table_id=table_id,
                record_id=rid,
                fields={"field": f"value_{i}"},
                submitted_at=time.time(),
                fail_count=2,
            )
            queue.enqueue(op)

        # Act
        await scheduler.flush_once()

        # Assert: all operations are in dead-letter
        dead_letters = queue.dead_letter_entries
        dead_letter_record_ids = {dl.operation.record_id for dl in dead_letters}
        for rid in record_ids:
            assert rid in dead_letter_record_ids

        # Assert: queue is empty for this table
        remaining = queue.drain(table_id)
        assert len(remaining) == 0


# ─── Property 11: Failed flush retains operations ────────────────────────────


# Feature: api-request-caching, Property 11: Failed flush retains operations


def _make_http_500_error() -> httpx.HTTPStatusError:
    """Create a mock HTTP 500 status error."""
    request = httpx.Request("POST", "https://example.com/api")
    response = httpx.Response(status_code=500, request=request)
    return httpx.HTTPStatusError(
        message="Internal Server Error", request=request, response=response
    )


def _make_timeout_error() -> httpx.TimeoutException:
    """Create a mock timeout exception."""
    return httpx.TimeoutException("Connection timed out")


# Strategy for generating write operations with fail_count 0 or 1
# (avoid fail_count=2 which would dead-letter on next failure)
_prop11_record_id_st = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N"), whitelist_characters="_-"),
    min_size=1,
    max_size=20,
)

_prop11_fields_st = st.dictionaries(
    keys=st.text(min_size=1, max_size=10, alphabet="abcdefghijklmnopqrstuvwxyz"),
    values=st.one_of(st.text(max_size=20), st.integers(-1000, 1000)),
    min_size=1,
    max_size=5,
)

_prop11_write_op_st = st.builds(
    WriteOperation,
    op_type=st.sampled_from(["create", "update"]),
    table_id=st.just("tbl_prop11"),
    record_id=_prop11_record_id_st,
    fields=_prop11_fields_st,
    submitted_at=st.floats(min_value=1_000_000_000.0, max_value=2_000_000_000.0),
    fail_count=st.integers(min_value=0, max_value=1),
)


@pytest.mark.asyncio
@given(
    ops=st.lists(_prop11_write_op_st, min_size=1, max_size=10),
    use_timeout=st.booleans(),
)
@settings(max_examples=100)
async def test_failed_flush_retains_all_operations_with_incremented_fail_count(
    ops: list[WriteOperation], use_timeout: bool
) -> None:
    """**Validates: Requirements 3.6**

    For any batch flush that receives an HTTP 5xx or network timeout,
    ALL operations in the failed batch SHALL remain in the write queue
    with their fail_count incremented by 1.
    """
    table_id = "tbl_prop11"

    # Set up real components
    settings_obj = _make_settings(table_id)
    queue = WriteQueue(max_size=1000)
    cache = CacheStore(ttl_seconds=300, max_records=10_000)

    # Mock lark_client to raise the appropriate error
    mock_lark_client = AsyncMock(spec=LarkClient)
    if use_timeout:
        mock_lark_client.batch_create.side_effect = _make_timeout_error()
        mock_lark_client.batch_update.side_effect = _make_timeout_error()
    else:
        mock_lark_client.batch_create.side_effect = _make_http_500_error()
        mock_lark_client.batch_update.side_effect = _make_http_500_error()

    scheduler = FlushScheduler(
        queue=queue,
        cache=cache,
        lark_client=mock_lark_client,
        settings=settings_obj,
        ws_manager=None,
    )

    # Record original fail_counts keyed by record_id
    # Note: multiple ops may share same record_id (merge will combine them)
    original_ops_by_id: dict[str, list[WriteOperation]] = {}
    for op in ops:
        original_ops_by_id.setdefault(op.record_id, []).append(op)

    # Enqueue all operations
    for op in ops:
        queue.enqueue(op)

    # Act: flush should fail and return ops to queue
    result = await scheduler.flush_once()

    # Drain the queue to inspect remaining operations
    remaining_ops = queue.drain(table_id)
    # Group remaining ops by record_id (multiple ops for same record can exist
    # when both creates and updates target the same record_id)
    remaining_by_id: dict[str, list[WriteOperation]] = {}
    for op in remaining_ops:
        remaining_by_id.setdefault(op.record_id, []).append(op)

    # Also check dead-letter for ops that had fail_count >= 2
    dead_letter_ids = {
        entry.operation.record_id for entry in queue.dead_letter_entries
    }

    # Assert: every original record_id must be accounted for
    # (either still in queue or dead-lettered if fail_count was already 2)
    for record_id, original_group in original_ops_by_id.items():
        max_original_fail_count = max(op.fail_count for op in original_group)

        if max_original_fail_count >= 2:
            # After increment, fail_count reaches 3 → dead-lettered
            assert record_id in dead_letter_ids or record_id in remaining_by_id, (
                f"Record {record_id} with fail_count={max_original_fail_count} "
                f"was neither dead-lettered nor retained in queue"
            )
        else:
            # fail_count < 2 → after increment it's < 3, so must remain in queue
            assert record_id in remaining_by_id, (
                f"Record {record_id} with fail_count={max_original_fail_count} "
                f"should still be in the queue after a failed flush"
            )
            # Verify that at least one remaining op for this record has its
            # fail_count incremented. Because creates and updates are handled
            # separately, each op's fail_count is incremented independently.
            remaining_group = remaining_by_id[record_id]
            max_remaining_fail_count = max(
                op.fail_count for op in remaining_group
            )
            # Each op gets incremented from its own fail_count, so after merge
            # the max remaining should be >= max_original + 1
            assert max_remaining_fail_count >= max_original_fail_count + 1, (
                f"Expected max fail_count >= {max_original_fail_count + 1} for "
                f"record {record_id}, got {max_remaining_fail_count}"
            )

    # The flush result should report failures
    assert result.failed_operations > 0
