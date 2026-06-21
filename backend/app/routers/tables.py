"""REST endpoints for table record operations with caching and write queuing."""

import asyncio
import logging
import time
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.config import settings
from app.models import WriteOperation
from app.services.cache import CacheStore
from app.services.lark_client import LarkClient
from app.services.write_queue import WriteQueue

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tables", tags=["tables"])


# ─── Request/Response Models ────────────────────────────────────────────────


class SearchRequest(BaseModel):
    """Request body for the search endpoint."""

    filter: dict | None = None
    sort: list[dict] | None = None


class CreateRecordRequest(BaseModel):
    """Request body for creating a record."""

    fields: dict


class UpdateRecordRequest(BaseModel):
    """Request body for updating a record."""

    fields: dict


class RecordResponse(BaseModel):
    """Standard record response."""

    record_id: str
    fields: dict


class SearchResponse(BaseModel):
    """Response for the search endpoint."""

    records: list[RecordResponse]
    total: int


class ErrorResponse(BaseModel):
    """Standard error response."""

    detail: str


# ─── Dependencies ───────────────────────────────────────────────────────────


def _verify_auth(request: Request) -> None:
    """Check Authorization header against configured shared secret. Raises 401."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")

    token = auth_header[len("Bearer "):]
    if token != settings.api_shared_secret:
        raise HTTPException(status_code=401, detail="Authentication required")


def _validate_table(table_id: str) -> None:
    """Validate table_id against configured tables list. Raises 404."""
    if table_id not in settings.configured_tables_list:
        raise HTTPException(status_code=404, detail="Table not recognized")


def _get_cache(request: Request) -> CacheStore:
    """Retrieve CacheStore from app state."""
    return request.app.state.cache


def _get_write_queue(request: Request) -> WriteQueue:
    """Retrieve WriteQueue from app state."""
    return request.app.state.write_queue


def _get_lark_client(request: Request) -> LarkClient:
    """Retrieve LarkClient from app state."""
    return request.app.state.lark_client


# ─── Endpoints ──────────────────────────────────────────────────────────────


@router.post(
    "/{table_id}/records/search",
    response_model=SearchResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def search_records(
    table_id: str,
    body: SearchRequest,
    request: Request,
) -> SearchResponse:
    """Filter/sort records from cache, returning at most 500 results."""
    _verify_auth(request)
    _validate_table(table_id)

    cache = _get_cache(request)
    lark_client = _get_lark_client(request)

    # If table is not fully cached, fetch from Lark first (read-through)
    if not cache.is_table_fully_cached(table_id):
        try:
            # Always fetch ALL records for the table (no filter/sort)
            # so the cache has the complete dataset. Filters are applied locally.
            lark_records = await asyncio.wait_for(
                lark_client.list_records(table_id),
                timeout=10.0,
            )
            # Cache all fetched records and mark table as fully cached
            bulk_data = [
                {"record_id": r.get("record_id", ""), "fields": r.get("fields", {})}
                for r in lark_records
                if r.get("record_id")
            ]
            if bulk_data:
                cache.set_bulk(table_id, bulk_data)
            cache.mark_table_fully_cached(table_id)
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=502, detail="Upstream service unavailable"
            )
        except Exception as exc:
            logger.warning("Failed to fetch table %s from Lark: %s", table_id, exc)
            raise HTTPException(
                status_code=502, detail="Upstream service unavailable"
            )

    entries = cache.get_all(table_id)

    if entries is None:
        entries = []

    # Convert cache entries to record response objects
    records: list[RecordResponse] = [
        RecordResponse(record_id=entry.record_id, fields=entry.fields)
        for entry in entries
    ]

    # Apply filter if provided
    if body.filter:
        records = _apply_filter(records, body.filter)

    # Apply sort if provided
    if body.sort:
        records = _apply_sort(records, body.sort)

    # Limit to 500 results
    total = len(records)
    records = records[:500]

    return SearchResponse(records=records, total=total)


@router.get(
    "/{table_id}/records/{record_id}",
    response_model=RecordResponse,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        502: {"model": ErrorResponse},
    },
)
async def get_record(
    table_id: str,
    record_id: str,
    request: Request,
) -> RecordResponse:
    """Read-through cache logic for a single record.

    - Fresh cache hit: return immediately
    - Stale cache hit: return stale + spawn background refresh
    - Cache miss: fetch from Lark (10s timeout), 502 on timeout, 404 if not found
    """
    _verify_auth(request)
    _validate_table(table_id)

    cache = _get_cache(request)
    lark_client = _get_lark_client(request)

    # Check cache
    entry = cache.get(table_id, record_id)

    if entry is not None:
        if cache.is_fresh(table_id, record_id):
            # Fresh — return immediately
            return RecordResponse(record_id=entry.record_id, fields=entry.fields)
        else:
            # Stale — return stale data, spawn background refresh
            asyncio.create_task(
                _background_refresh(cache, lark_client, table_id, record_id)
            )
            return RecordResponse(record_id=entry.record_id, fields=entry.fields)

    # Cache miss — fetch from Lark with 10s timeout
    try:
        record = await asyncio.wait_for(
            lark_client.get_record(table_id, record_id),
            timeout=10.0,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=502, detail="Upstream service unavailable"
        )
    except Exception:
        raise HTTPException(
            status_code=502, detail="Upstream service unavailable"
        )

    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")

    # Store in cache and return
    fields = record.get("fields", {})
    cache.set(table_id, record_id, fields)
    return RecordResponse(record_id=record_id, fields=fields)


@router.post(
    "/{table_id}/records",
    response_model=RecordResponse,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
async def create_record(
    table_id: str,
    body: CreateRecordRequest,
    request: Request,
    sync: bool = False,
) -> RecordResponse:
    """Create a record. If sync=true, creates directly in Lark and returns permanent ID.
    Otherwise enqueues for batch flush and returns a temp_id optimistic response."""
    _verify_auth(request)
    _validate_table(table_id)

    cache = _get_cache(request)

    # Synchronous mode: bypass write queue, create directly in Lark
    if sync:
        lark_client = _get_lark_client(request)
        try:
            created_records = await asyncio.wait_for(
                lark_client.batch_create(table_id, [body.fields]),
                timeout=10.0,
            )
            if created_records and len(created_records) > 0:
                created = created_records[0]
                record_id = created.get("record_id", "")
                fields = created.get("fields", body.fields)
                cache.set(table_id, record_id, fields)
                return RecordResponse(record_id=record_id, fields=fields)
            else:
                raise HTTPException(status_code=502, detail="Create returned no records")
        except asyncio.TimeoutError:
            raise HTTPException(status_code=502, detail="Upstream service unavailable")
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Sync create failed: %s", exc)
            raise HTTPException(status_code=502, detail="Upstream service unavailable")

    # Async mode: enqueue for batch flush with temp ID
    write_queue = _get_write_queue(request)

    # Generate temporary ID
    temp_id = f"temp_{uuid.uuid4().hex[:12]}"

    # Create write operation
    operation = WriteOperation(
        op_type="create",
        table_id=table_id,
        record_id=temp_id,
        fields=body.fields,
        submitted_at=time.time(),
    )

    # Enqueue — return 503 if queue full
    success = write_queue.enqueue(operation)
    if not success:
        raise HTTPException(
            status_code=503, detail="Write queue full, try again later"
        )

    # Optimistically set in cache
    cache.set(table_id, temp_id, body.fields)

    return RecordResponse(record_id=temp_id, fields=body.fields)


@router.put(
    "/{table_id}/records/{record_id}",
    response_model=RecordResponse,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
async def update_record(
    table_id: str,
    record_id: str,
    body: UpdateRecordRequest,
    request: Request,
) -> RecordResponse:
    """Enqueue an update operation, return merged optimistic response."""
    _verify_auth(request)
    _validate_table(table_id)

    write_queue = _get_write_queue(request)
    cache = _get_cache(request)

    # Create write operation
    operation = WriteOperation(
        op_type="update",
        table_id=table_id,
        record_id=record_id,
        fields=body.fields,
        submitted_at=time.time(),
    )

    # Enqueue — return 503 if queue full
    success = write_queue.enqueue(operation)
    if not success:
        raise HTTPException(
            status_code=503, detail="Write queue full, try again later"
        )

    # Merge optimistically with cached record
    existing_entry = cache.get(table_id, record_id)
    if existing_entry is not None:
        merged_fields = {**existing_entry.fields, **body.fields}
    else:
        merged_fields = body.fields

    # Update cache with merged fields
    cache.set(table_id, record_id, merged_fields)

    return RecordResponse(record_id=record_id, fields=merged_fields)


# ─── Background Tasks ───────────────────────────────────────────────────────


async def _background_refresh(
    cache: CacheStore,
    lark_client: LarkClient,
    table_id: str,
    record_id: str,
) -> None:
    """Fire-and-forget background refresh of a stale cache entry."""
    try:
        record = await asyncio.wait_for(
            lark_client.get_record(table_id, record_id),
            timeout=10.0,
        )
        if record is not None:
            fields = record.get("fields", {})
            cache.set(table_id, record_id, fields)
            logger.info(
                "Background refresh succeeded for record %s in table %s",
                record_id,
                table_id,
            )
        else:
            logger.warning(
                "Background refresh: record %s not found in table %s",
                record_id,
                table_id,
            )
    except (asyncio.TimeoutError, Exception) as exc:
        logger.warning(
            "Background refresh failed for record %s in table %s: %s",
            record_id,
            table_id,
            exc,
        )


# ─── Filter/Sort Helpers ────────────────────────────────────────────────────


def _apply_filter(
    records: list[RecordResponse], filter_spec: dict
) -> list[RecordResponse]:
    """Apply basic filter matching to records.

    Supports field equality matching via conditions list with
    field_name, operator, and value entries.
    """
    conditions = filter_spec.get("conditions", [])
    if not conditions:
        return records

    filtered: list[RecordResponse] = []
    for record in records:
        if _record_matches(record, conditions):
            filtered.append(record)
    return filtered


def _record_matches(record: RecordResponse, conditions: list[dict]) -> bool:
    """Check if a record matches all filter conditions."""
    for condition in conditions:
        field_name = condition.get("field_name", "")
        operator = condition.get("operator", "is")
        value = condition.get("value")

        record_value = record.fields.get(field_name)

        if operator == "is":
            if not _is_match(record_value, value):
                return False
        elif operator == "isNot":
            if _is_match(record_value, value):
                return False
        elif operator == "contains":
            if value is None or record_value is None:
                return False
            if str(value) not in str(record_value):
                return False
        elif operator == "isGreater":
            if record_value is None or value is None:
                return False
            try:
                if float(record_value) <= float(value):
                    return False
            except (TypeError, ValueError):
                return False
        elif operator == "isLess":
            if record_value is None or value is None:
                return False
            try:
                if float(record_value) >= float(value):
                    return False
            except (TypeError, ValueError):
                return False

    return True


def _extract_text_value(field_value: Any) -> str:
    """Extract plain text from a Lark field value.

    Lark text fields are stored as arrays: [{"text": "value", "type": "text"}]
    This normalizes them to plain strings for comparison.
    """
    if isinstance(field_value, str):
        return field_value
    if isinstance(field_value, list) and len(field_value) > 0:
        first = field_value[0]
        if isinstance(first, dict) and "text" in first:
            return str(first["text"])
        if isinstance(first, str):
            return first
    return ""


def _is_match(record_value: Any, filter_value: Any) -> bool:
    """Check if a record field value matches a filter value.

    Handles Lark's text field format (arrays of {text, type} objects)
    and filter values that may be arrays (Lark filter convention).
    """
    # Direct equality check first
    if record_value == filter_value:
        return True

    # Extract text from record value (handles Lark [{text: "x"}] format)
    record_text = _extract_text_value(record_value)

    # Filter value might be a single value or an array
    if isinstance(filter_value, list):
        # Check if any element in the filter array matches
        for fv in filter_value:
            fv_str = str(fv) if fv is not None else ""
            if record_text == fv_str:
                return True
            # Also check if record_value itself equals the filter element
            if record_value == fv:
                return True
        return False

    # Scalar filter value comparison
    if filter_value is None:
        return record_value is None

    # Compare as strings after extraction
    return record_text == str(filter_value)


def _apply_sort(
    records: list[RecordResponse], sort_spec: list[dict]
) -> list[RecordResponse]:
    """Apply sort ordering to records.

    Each sort entry has 'field_name' and optional 'order' ('asc' or 'desc').
    """
    if not sort_spec:
        return records

    # Apply sorts in reverse order for stable multi-key sorting
    sorted_records = list(records)
    for sort_entry in reversed(sort_spec):
        field_name = sort_entry.get("field_name", "")
        order = sort_entry.get("order", "asc")
        reverse = order == "desc"

        sorted_records.sort(
            key=lambda r, fn=field_name: _sort_key(r.fields.get(fn)),
            reverse=reverse,
        )

    return sorted_records


def _sort_key(value: Any) -> tuple[int, Any]:
    """Generate a sort key that handles None and mixed types gracefully."""
    if value is None:
        return (1, "")  # Nones sort last
    if isinstance(value, (int, float)):
        return (0, value)
    return (0, str(value))
