# Feature: api-request-caching, Property 13: Webhook invalidates cached records
# Feature: api-request-caching, Property 14: Webhook create inserts into cache
"""Property-based tests for WebhookInvalidator cache invalidation.

**Validates: Requirements 4.1, 4.2, 4.3**

Property 13: For any record_id present in the cache, when a webhook event with
action_type "record_changed" or "record_deleted" arrives for that record_id,
the record SHALL be removed from the cache such that subsequent reads trigger
a fresh fetch.

Property 14: For any webhook event with action_type "record_created" where the
Lark Base API returns valid record data, the record SHALL be inserted into the
cache within 5 seconds of event receipt.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from app.models import EventMessage, WriteOperation
from app.services.cache import CacheStore
from app.services.webhook_invalidator import WebhookInvalidator
from app.services.write_queue import WriteQueue


# ─── Strategies ─────────────────────────────────────────────────────────────

# Generate non-empty alphanumeric table and record IDs
table_id_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N"), whitelist_characters="_-"),
    min_size=1,
    max_size=30,
)

record_id_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N"), whitelist_characters="_-"),
    min_size=1,
    max_size=30,
)

# Random field dictionaries (simple string values)
fields_strategy = st.dictionaries(
    keys=st.text(min_size=1, max_size=20),
    values=st.text(min_size=0, max_size=50),
    min_size=1,
    max_size=5,
)

# Action types that should cause cache removal
invalidation_action_strategy = st.sampled_from(["record_changed", "record_deleted"])


# ─── Fixtures ───────────────────────────────────────────────────────────────


def _make_mock_ws_manager() -> MagicMock:
    """Create a mock ConnectionManager with async broadcast and active_connections."""
    ws_manager = MagicMock()
    ws_manager.active_connections = {}
    ws_manager.broadcast = AsyncMock()
    return ws_manager


def _make_mock_lark_client() -> MagicMock:
    """Create a mock LarkClient with async methods."""
    lark_client = MagicMock()
    lark_client.get_record = AsyncMock(return_value=None)
    return lark_client


# ─── Property Test ──────────────────────────────────────────────────────────


@settings(max_examples=100)
@given(
    table_id=table_id_strategy,
    record_id=record_id_strategy,
    fields=fields_strategy,
    action_type=invalidation_action_strategy,
)
@pytest.mark.asyncio
async def test_webhook_invalidates_cached_records(
    table_id: str,
    record_id: str,
    fields: dict,
    action_type: str,
) -> None:
    """Property 13: Webhook invalidates cached records.

    For any record_id present in the cache, when a webhook event with
    action_type "record_changed" or "record_deleted" arrives for that
    record_id, the record SHALL be removed from the cache such that
    subsequent reads trigger a fresh fetch.

    **Validates: Requirements 4.1, 4.3**
    """
    # Setup
    cache = CacheStore(ttl_seconds=300, max_records=10_000)
    queue = WriteQueue(max_size=1000)
    lark_client = _make_mock_lark_client()
    ws_manager = _make_mock_ws_manager()

    invalidator = WebhookInvalidator(
        cache=cache,
        queue=queue,
        lark_client=lark_client,
        ws_manager=ws_manager,
    )

    # Insert a record into the cache
    cache.set(table_id, record_id, fields)

    # Verify it's in the cache before the event
    assert cache.get(table_id, record_id) is not None

    # Dispatch the webhook event
    await invalidator.handle_event(table_id, action_type, record_id)

    # After handling a "record_changed" or "record_deleted" event,
    # the record must be removed from the cache
    assert cache.get(table_id, record_id) is None, (
        f"Expected record '{record_id}' to be removed from cache after "
        f"'{action_type}' event, but it was still present."
    )


# ─── Property 15 ────────────────────────────────────────────────────────────

# Feature: api-request-caching, Property 15: Webhook broadcast on cache update


@settings(max_examples=100)
@given(
    table_id=table_id_strategy,
    record_id=record_id_strategy,
    fields=fields_strategy,
    action_type=invalidation_action_strategy,
)
@pytest.mark.asyncio
async def test_webhook_broadcast_on_cache_update(
    table_id: str,
    record_id: str,
    fields: dict,
    action_type: str,
) -> None:
    """Property 15: Webhook broadcast on cache update.

    For any cache modification triggered by a webhook event, the system SHALL
    broadcast a WebSocket event containing the table_name, record_id, and action
    to all connected clients.

    **Validates: Requirements 4.5**
    """
    # Setup
    cache = CacheStore(ttl_seconds=300, max_records=10_000)
    queue = WriteQueue(max_size=1000)
    lark_client = _make_mock_lark_client()
    ws_manager = _make_mock_ws_manager()

    invalidator = WebhookInvalidator(
        cache=cache,
        queue=queue,
        lark_client=lark_client,
        ws_manager=ws_manager,
    )

    # Insert a record into the cache so the event triggers a modification
    cache.set(table_id, record_id, fields)

    # Dispatch the webhook event
    await invalidator.handle_event(table_id, action_type, record_id)

    # Verify ws_manager.broadcast was called
    ws_manager.broadcast.assert_called_once()

    # Get the broadcast message
    broadcast_call_args = ws_manager.broadcast.call_args
    message = broadcast_call_args[0][0]  # First positional argument

    # Verify the message is an EventMessage with type "cache_updated"
    assert message.type == "cache_updated"

    # Verify the payload contains the correct table_name, record_id, and action
    payload = message.payload
    assert payload["table_name"] == table_id, (
        f"Expected table_name '{table_id}' in broadcast payload, got '{payload.get('table_name')}'"
    )
    assert payload["record_id"] == record_id, (
        f"Expected record_id '{record_id}' in broadcast payload, got '{payload.get('record_id')}'"
    )

    # Determine the expected action based on action_type
    expected_action = "updated" if action_type == "record_changed" else "deleted"
    assert payload["action"] == expected_action, (
        f"Expected action '{expected_action}' in broadcast payload for "
        f"action_type '{action_type}', got '{payload.get('action')}'"
    )



# ─── Property 14: Webhook create inserts into cache ─────────────────────────
# Feature: api-request-caching, Property 14: Webhook create inserts into cache


@settings(max_examples=100)
@given(
    table_id=table_id_strategy,
    record_id=record_id_strategy,
    fields=fields_strategy,
)
@pytest.mark.asyncio
async def test_webhook_create_inserts_into_cache(
    table_id: str,
    record_id: str,
    fields: dict,
) -> None:
    """Property 14: Webhook create inserts into cache.

    For any webhook event with action_type "record_created" where the Lark Base
    API returns valid record data, the record SHALL be inserted into the cache
    within 5 seconds of event receipt.

    **Validates: Requirements 4.2**
    """
    # Setup
    cache = CacheStore(ttl_seconds=300, max_records=10_000)
    queue = WriteQueue(max_size=1000)
    lark_client = _make_mock_lark_client()
    ws_manager = _make_mock_ws_manager()

    # Mock lark_client.get_record to return valid record data
    lark_client.get_record = AsyncMock(
        return_value={"record_id": record_id, "fields": fields}
    )

    invalidator = WebhookInvalidator(
        cache=cache,
        queue=queue,
        lark_client=lark_client,
        ws_manager=ws_manager,
    )

    # Verify the record is NOT in the cache before the event
    assert cache.get(table_id, record_id) is None

    # Dispatch the "record_created" webhook event
    await invalidator.handle_event(table_id, "record_created", record_id)

    # After handling a "record_created" event with valid data from Lark,
    # the record must be inserted into the cache
    cached_entry = cache.get(table_id, record_id)
    assert cached_entry is not None, (
        f"Expected record '{record_id}' to be inserted into cache after "
        f"'record_created' event, but it was not found."
    )
    assert cached_entry.fields == fields, (
        f"Expected cached fields to match the data returned by Lark API. "
        f"Got {cached_entry.fields!r}, expected {fields!r}."
    )



# Feature: api-request-caching, Property 16: Webhook discarded for pending writes
# ─── Property 16 ────────────────────────────────────────────────────────────

# All webhook action types that might trigger a cache modification
all_action_types_strategy = st.sampled_from(
    ["record_changed", "record_created", "record_deleted"]
)


@settings(max_examples=100)
@given(
    table_id=table_id_strategy,
    record_id=record_id_strategy,
    fields=fields_strategy,
    action_type=all_action_types_strategy,
)
@pytest.mark.asyncio
async def test_webhook_discarded_for_pending_writes(
    table_id: str,
    record_id: str,
    fields: dict,
    action_type: str,
) -> None:
    """Property 16: Webhook discarded for pending writes.

    For any webhook event targeting a record_id that has a pending operation
    in the write queue, the webhook-triggered cache update SHALL be discarded
    (cache entry remains unchanged).

    **Validates: Requirements 4.6**
    """
    # Setup
    cache = CacheStore(ttl_seconds=300, max_records=10_000)
    queue = WriteQueue(max_size=1000)
    lark_client = _make_mock_lark_client()
    ws_manager = _make_mock_ws_manager()

    invalidator = WebhookInvalidator(
        cache=cache,
        queue=queue,
        lark_client=lark_client,
        ws_manager=ws_manager,
    )

    # Insert a record into the cache
    cache.set(table_id, record_id, fields)

    # Verify record is in cache
    original_entry = cache.get(table_id, record_id)
    assert original_entry is not None

    # Enqueue a pending write operation for the same record_id
    write_op = WriteOperation(
        op_type="update",
        table_id=table_id,
        record_id=record_id,
        fields={"pending_field": "pending_value"},
        submitted_at=1000.0,
        fail_count=0,
    )
    queue.enqueue(write_op)

    # Confirm the queue reports a pending operation for this record
    assert queue.has_pending(record_id)

    # Dispatch the webhook event
    await invalidator.handle_event(table_id, action_type, record_id)

    # After handling, cache entry must remain unchanged (webhook was discarded)
    entry_after = cache.get(table_id, record_id)
    assert entry_after is not None, (
        f"Expected record '{record_id}' to remain in cache after webhook "
        f"'{action_type}' was discarded due to pending write, but it was removed."
    )
    assert entry_after.fields == fields, (
        f"Expected cached fields to remain {fields} after webhook "
        f"'{action_type}' was discarded, but got {entry_after.fields}."
    )
