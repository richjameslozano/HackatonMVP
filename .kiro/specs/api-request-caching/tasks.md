# Implementation Plan: API Request Caching

## Overview

This plan implements a backend caching and write-batching layer in the existing FastAPI server, then migrates the frontend to call backend REST endpoints. The backend becomes the single gateway for all Lark Base data operations with an in-memory read-through cache and periodic batch flush for writes.

## Tasks

- [x] 1. Extend backend configuration and data models
  - [x] 1.1 Add cache and write-queue settings to `backend/app/config.py`
    - Add `cache_ttl_seconds`, `cache_max_records_per_table`, `batch_flush_interval_seconds`, `write_queue_max_size`, `max_flush_retries`, `batch_size_limit` fields
    - Add Lark API credentials: `lark_app_id`, `lark_app_secret`, `lark_base_app_token`, `lark_base_url`
    - Add `configured_tables` (comma-separated) and `api_shared_secret`
    - Add validator for time-range fields (1–86400)
    - Add `configured_tables_list` property
    - _Requirements: 1.3, 7.1, 7.2, 7.3, 7.4_

  - [x] 1.2 Create data models in `backend/app/models.py` (extend existing)
    - Add `CacheEntry` dataclass with `record_id`, `fields`, `inserted_at`, `last_refreshed_at`, `age_seconds()`, `is_stale()`
    - Add `TableCache` dataclass with `entries`, `ttl_seconds`, `max_records`, `fully_cached`, `last_full_fetch_at`, `pending_fetches`
    - Add `WriteOperation` Pydantic model with `op_type`, `table_id`, `record_id`, `fields`, `submitted_at`, `fail_count`
    - Add `FlushResult` Pydantic model
    - Add `DeadLetterEntry` Pydantic model
    - Add `CacheUpdatedPayload` and `WriteFailedPayload` WebSocket event models
    - _Requirements: 1.1, 3.1, 3.7_

  - [x] 1.3 Write property test for configuration validation bounds
    - **Property 2: Configuration validation bounds**
    - **Validates: Requirements 1.3, 7.3**

- [x] 2. Implement the Cache Layer
  - [x] 2.1 Create `backend/app/services/cache.py` with `CacheStore` class
    - Implement `get(table_id, record_id)` returning `CacheEntry | None`
    - Implement `get_all(table_id)` returning all entries for a table
    - Implement `set(table_id, record_id, fields)` with LRU eviction at max capacity
    - Implement `set_bulk(table_id, records)` for full-table caching
    - Implement `remove(table_id, record_id)`
    - Implement `is_fresh(table_id, record_id)` checking age < TTL
    - Implement `is_table_fully_cached(table_id)` and `mark_table_fully_cached(table_id)`
    - Implement `has_pending_fetch(record_id)`, `mark_pending_fetch()`, `clear_pending_fetch()`
    - Implement eviction: when inserting exceeds `max_records`, evict oldest `last_refreshed_at`
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7_

  - [x] 2.2 Write property test for cache keyed retrieval
    - **Property 1: Cache keyed retrieval**
    - **Validates: Requirements 1.1**

  - [x] 2.3 Write property test for fresh records served without API calls
    - **Property 3: Fresh records served from cache without API calls**
    - **Validates: Requirements 1.4, 2.1, 8.1**

  - [x] 2.4 Write property test for cache eviction at capacity
    - **Property 6: Cache eviction at capacity**
    - **Validates: Requirements 1.7**

- [x] 3. Implement the Write Queue
  - [x] 3.1 Create `backend/app/services/write_queue.py` with `WriteQueue` class
    - Implement `enqueue(operation)` preserving per-table FIFO order, reject at max size
    - Implement `drain(table_id)` returning and removing all ops for a table
    - Implement `size(table_id)` for per-table and total queue size
    - Implement `has_pending(record_id)` checking if record has pending writes
    - Implement `merge_updates(operations)` with last-writer-wins per field for same record_id
    - Implement `return_failed(operations)` to put failed ops back in queue
    - Implement `move_to_dead_letter(operation)` after 3 consecutive failures
    - _Requirements: 3.1, 3.2, 3.4, 3.6, 3.7, 3.8_

  - [x] 3.2 Write property test for write queue submission order
    - **Property 8: Write queue preserves submission order**
    - **Validates: Requirements 3.2**

  - [x] 3.3 Write property test for last-writer-wins field merge
    - **Property 9: Last-writer-wins field merge**
    - **Validates: Requirements 3.4**

- [x] 4. Implement the Lark API Client
  - [x] 4.1 Create `backend/app/services/lark_client.py` with `LarkClient` class
    - Implement tenant token acquisition with in-memory caching (60s expiry buffer)
    - Implement `get_record(table_id, record_id)` with 10s timeout
    - Implement `list_records(table_id, filter, sort)` with pagination handling
    - Implement `batch_create(table_id, records)` calling Lark batch endpoint
    - Implement `batch_update(table_id, records)` calling Lark batch endpoint
    - Use `httpx.AsyncClient` for async HTTP calls
    - _Requirements: 2.2, 2.4, 2.5, 3.5_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement the Batch Flush Scheduler
  - [x] 6.1 Create `backend/app/services/flush_scheduler.py` with `FlushScheduler` class
    - Implement `start()` launching an asyncio background task at configured interval
    - Implement `stop()` cancelling the background task
    - Implement `flush_once()` that drains all tables, merges updates, splits into ≤500 batches, calls Lark client
    - Handle temp_id → permanent_id mapping after batch create returns
    - Update cache with permanent IDs after successful flush
    - Increment `fail_count` on 5xx/timeout, move to dead-letter after 3 failures
    - Broadcast `write_failed` WebSocket event on dead-letter
    - Broadcast ID reconciliation via WebSocket after successful creates
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 8.2_

  - [x] 6.2 Write property test for batch splitting at 500
    - **Property 10: Batch splitting at 500**
    - **Validates: Requirements 3.5**

  - [x] 6.3 Write property test for failed flush retaining operations
    - **Property 11: Failed flush retains operations**
    - **Validates: Requirements 3.6**

  - [x] 6.4 Write property test for dead-letter after three failures
    - **Property 12: Dead-letter after three consecutive failures**
    - **Validates: Requirements 3.7**

  - [x] 6.5 Write property test for one batch call per type per table
    - **Property 20: Batch flush sends at most one create and one update call per table**
    - **Validates: Requirements 8.2**

- [x] 7. Implement the Webhook Invalidator
  - [x] 7.1 Create `backend/app/services/webhook_invalidator.py` with `WebhookInvalidator` class
    - Implement `handle_event(table_id, action_type, record_id)` dispatching to create/update/delete handlers
    - On `record_changed`: remove record from cache (next read triggers fresh fetch)
    - On `record_created`: fetch from Lark and insert into cache within 5s; mark pending-fetch on failure
    - On record deleted: remove from cache
    - Skip invalidation if record has pending write in WriteQueue
    - Broadcast `cache_updated` WebSocket event after cache modification
    - Implement pending-fetch retry (within 30s or next event)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 7.2 Write property test for webhook invalidation of cached records
    - **Property 13: Webhook invalidates cached records**
    - **Validates: Requirements 4.1, 4.3**

  - [x] 7.3 Write property test for webhook create inserts into cache
    - **Property 14: Webhook create inserts into cache**
    - **Validates: Requirements 4.2**

  - [x] 7.4 Write property test for webhook broadcast on cache update
    - **Property 15: Webhook broadcast on cache update**
    - **Validates: Requirements 4.5**

  - [x] 7.5 Write property test for webhook discarded for pending writes
    - **Property 16: Webhook discarded for pending writes**
    - **Validates: Requirements 4.6**

- [x] 8. Implement the REST Router and wire backend services
  - [x] 8.1 Create `backend/app/routers/tables.py` with REST endpoints
    - `POST /api/tables/{table_id}/records/search` — filter/sort from cache, max 500 results
    - `GET /api/tables/{table_id}/records/{record_id}` — read-through cache logic
    - `POST /api/tables/{table_id}/records` — enqueue create, return temp_id optimistic response
    - `PUT /api/tables/{table_id}/records/{record_id}` — enqueue update, return merged optimistic response
    - Add auth dependency checking `Authorization` header against `api_shared_secret`
    - Validate table_id against configured tables list (404 if unknown)
    - Implement stale-while-revalidate: return stale + spawn background refresh task
    - Handle cache miss with 10s timeout, return 502 on Lark timeout/error
    - Return 404 when Lark returns not-found
    - Return 503 when write queue is full
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 8.2 Wire services into `backend/app/main.py` lifespan
    - Instantiate `CacheStore`, `WriteQueue`, `LarkClient`, `FlushScheduler`, `WebhookInvalidator`
    - Start flush scheduler in lifespan startup
    - Stop flush scheduler in lifespan shutdown
    - Make services available to routers via `app.state` or dependency injection
    - Include new `tables` router with `/api` prefix
    - Log active flush interval and cache TTL at startup (INFO)
    - _Requirements: 1.2, 7.5, 3.3_

  - [x] 8.3 Update `backend/app/routers/webhook.py` to integrate `WebhookInvalidator`
    - After existing broadcast logic, call `WebhookInvalidator.handle_event()` with table_id, action_type, record_id from the webhook payload
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 8.4 Write property test for search returns at most 500 records
    - **Property 17: Search returns at most 500 records**
    - **Validates: Requirements 5.1**

  - [x] 8.5 Write property test for create returns temp-prefixed ID
    - **Property 18: Create returns temp-prefixed ID**
    - **Validates: Requirements 5.4**

  - [x] 8.6 Write property test for update returns optimistically merged record
    - **Property 19: Update returns optimistically merged record**
    - **Validates: Requirements 5.5**

- [x] 9. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Migrate the frontend to use backend API
  - [x] 10.1 Add backend configuration to `src/services/config.ts`
    - Add `BACKEND_CONFIG` with `baseUrl` (localhost:8000 in dev, env var in prod) and `apiSecret` from `VITE_API_SHARED_SECRET`
    - _Requirements: 6.2_

  - [x] 10.2 Refactor `src/services/lark-api.service.ts` to call backend
    - Change base URL from Lark API to `BACKEND_CONFIG.baseUrl`
    - Replace `Authorization: Bearer {tenantToken}` with `Authorization: Bearer {apiSecret}`
    - Keep function signatures identical: `listRecords`, `getRecord`, `createRecord`, `updateRecord`
    - Keep `extractTextValue`, `extractNumberValue` unchanged
    - Keep retry and timeout logic (backend may be slow on cache miss)
    - Adjust response parsing: backend returns `{record_id, fields}` directly (no nested `data.data.record` wrapper)
    - _Requirements: 6.1, 6.2, 6.5_

  - [x] 10.3 Add WebSocket cache event handling in frontend
    - Handle `cache_updated` event type: trigger re-fetch of affected record/list via store actions
    - Handle `write_failed` event type: show notification to user indicating which record failed
    - Handle ID reconciliation event: replace `temp_` prefixed IDs with permanent IDs in Zustand store
    - _Requirements: 6.3, 6.4, 6.7_

  - [x] 10.4 Add error handling for backend connectivity issues
    - On HTTP 502 or network error: show error banner, retry once after 3 seconds
    - On HTTP 503 (queue full): show transient warning, retry after flush interval
    - _Requirements: 6.6_

  - [x] 10.5 Write unit tests for migrated `lark-api.service.ts`
    - Verify calls go to backend URL (not Lark directly)
    - Verify `Authorization` header uses shared secret
    - Test error banner on 502
    - Test retry after 3 seconds on failure
    - _Requirements: 6.1, 6.2, 6.6_

  - [x] 10.6 Write unit tests for WebSocket cache event handling
    - Test `cache_updated` triggers re-fetch
    - Test `write_failed` shows notification
    - Test temp ID → permanent ID replacement in store
    - _Requirements: 6.3, 6.4, 6.7_

- [x] 11. Update environment and dependency files
  - [x] 11.1 Update `backend/requirements.txt` with new dependency `httpx`
    - Add `httpx>=0.27.0,<1.0.0` (already present — verify)
    - _Requirements: 2.2_

  - [x] 11.2 Update `backend/.env.example` with new environment variables
    - Add `LARK_APP_ID`, `LARK_APP_SECRET`, `LARK_BASE_APP_TOKEN`, `LARK_BASE_URL`
    - Add `CONFIGURED_TABLES`, `API_SHARED_SECRET`
    - Add `CACHE_TTL_SECONDS`, `BATCH_FLUSH_INTERVAL_SECONDS`
    - _Requirements: 7.1, 7.2_

  - [x] 11.3 Update frontend `.env.example` with `VITE_API_SHARED_SECRET` and `VITE_BACKEND_URL`
    - _Requirements: 6.2_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Backend uses Python (FastAPI + pytest + hypothesis), frontend uses TypeScript (Vitest + fast-check)
- The `httpx` dependency is already in `requirements.txt` — just verify it's present
- The existing WebSocket infrastructure (`ConnectionManager`, `EventMessage`) is reused for new event types

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1", "3.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.2", "3.3"] },
    { "id": 3, "tasks": ["6.1", "7.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "6.4", "6.5", "7.2", "7.3", "7.4", "7.5"] },
    { "id": 5, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 6, "tasks": ["8.4", "8.5", "8.6"] },
    { "id": 7, "tasks": ["10.1", "11.1", "11.2", "11.3"] },
    { "id": 8, "tasks": ["10.2", "10.3", "10.4"] },
    { "id": 9, "tasks": ["10.5", "10.6"] }
  ]
}
```
