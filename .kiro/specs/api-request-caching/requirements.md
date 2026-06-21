# Requirements Document

## Introduction

The SP Madrid gamified tracker currently makes all Lark Base API calls directly from the React frontend, causing the 10,000-request quota to be exhausted rapidly. This feature introduces a backend caching and request-batching layer in the existing FastAPI server. The backend becomes the single gateway for all Lark Base data operations: reads are served from an in-memory cache (with read-through fallback), writes are collected into a queue and flushed to Lark Base in batches at a configurable interval. The frontend is migrated to call backend REST endpoints instead of the Lark API directly.

## Glossary

- **Cache_Layer**: The in-memory data store on the FastAPI backend that holds copies of Lark Base table records, keyed by table name and record ID.
- **Write_Queue**: A per-table ordered collection of pending write operations (create or update) that have not yet been flushed to Lark Base.
- **Batch_Flush_Scheduler**: The background process that periodically drains the Write_Queue and sends accumulated write operations to Lark Base in as few API calls as possible.
- **Backend_API**: The set of FastAPI REST endpoints that the frontend calls instead of calling the Lark Base API directly.
- **Cache_TTL**: The maximum age (in seconds) after which a cached record is considered stale and must be refreshed from Lark Base on the next read.
- **Lark_Base_API**: The external Lark Bitable REST API with a 10,000-request quota.
- **Webhook_Invalidator**: The logic that invalidates or updates specific cache entries when a Lark webhook event indicates an external change to the underlying data.
- **Frontend_Client**: The React SPA that consumes the Backend_API.

## Requirements

### Requirement 1: Backend Cache Storage

**User Story:** As a developer, I want the backend to maintain an in-memory cache of Lark Base records, so that repeated reads do not consume API quota.

#### Acceptance Criteria

1. THE Cache_Layer SHALL store records indexed by table name and record ID.
2. WHEN the Backend_API starts, THE Cache_Layer SHALL be initialized as empty for all configured tables.
3. THE Cache_Layer SHALL support configurable Cache_TTL per table, accepting values between 1 and 86400 seconds, with a default of 300 seconds.
4. WHILE a cached record age (measured as elapsed time since the record was last inserted or refreshed) is less than the Cache_TTL, THE Cache_Layer SHALL serve that record without contacting the Lark_Base_API.
5. WHEN a cached record age exceeds the Cache_TTL and a read is requested for that record, THE Cache_Layer SHALL fetch the current version from the Lark_Base_API and replace the cached entry with the refreshed data, resetting the record age to zero.
6. IF a refresh from the Lark_Base_API fails due to network error or non-success response, THEN THE Cache_Layer SHALL serve the stale cached record and retry the refresh on the next read request for that record.
7. THE Cache_Layer SHALL hold a maximum of 10000 records per table; WHEN inserting a record would exceed this limit, THE Cache_Layer SHALL evict the record with the oldest age first.

### Requirement 2: Read-Through Caching

**User Story:** As a frontend developer, I want reads to go to the cache first and fall back to Lark Base on a cache miss, so that the user experience remains fast while quota usage decreases.

#### Acceptance Criteria

1. WHEN the Frontend_Client requests a record that exists in the Cache_Layer and is not stale, THE Backend_API SHALL return the cached record without calling the Lark_Base_API.
2. WHEN the Frontend_Client requests a record that does not exist in the Cache_Layer, THE Backend_API SHALL fetch the record from the Lark_Base_API within a 10 000 ms timeout, store it in the Cache_Layer, and return it to the Frontend_Client.
3. WHEN the Frontend_Client requests a list of records for a table, THE Backend_API SHALL return all cached records for that table if a prior full-table fetch has completed and no cached record for that table is stale.
4. WHEN the Frontend_Client requests a list of records for a table that has not had a prior full-table fetch or contains at least one stale record, THE Backend_API SHALL fetch all records from the Lark_Base_API within a 10 000 ms timeout, replace the table's entries in the Cache_Layer, and return the results.
5. IF the Lark_Base_API does not respond within 10 000 ms or returns a network error during a cache miss, THEN THE Backend_API SHALL return an HTTP 502 error with a message indicating the upstream service is unavailable.
6. IF the Lark_Base_API responds with a not-found status for a requested record, THEN THE Backend_API SHALL return an HTTP 404 error with a message indicating the record does not exist.
7. WHEN the Frontend_Client requests a record that exists in the Cache_Layer but is stale, THE Backend_API SHALL immediately return the stale cached record and trigger an asynchronous refresh from the Lark_Base_API to update the Cache_Layer.

### Requirement 3: Write Queue and Batching

**User Story:** As a developer, I want write operations collected and sent in batches, so that multiple rapid changes consume only one or two API calls instead of one per change.

#### Acceptance Criteria

1. WHEN the Frontend_Client submits a create or update operation, THE Backend_API SHALL enqueue the operation in the Write_Queue and return a success response with optimistic data within 200 milliseconds.
2. THE Write_Queue SHALL preserve the submission order of operations per table and SHALL reject new operations with an HTTP 503 response when the queue contains 1000 or more pending operations.
3. THE Batch_Flush_Scheduler SHALL flush the Write_Queue at a configurable interval with a default of 10 seconds.
4. WHEN the Batch_Flush_Scheduler flushes, THE Batch_Flush_Scheduler SHALL combine multiple updates to the same record into a single merged update using last-writer-wins semantics per field, where the field value from the most recently submitted operation takes precedence.
5. WHEN the Batch_Flush_Scheduler flushes, THE Batch_Flush_Scheduler SHALL use the Lark Base batch create and batch update endpoints to send pending operations for a table, splitting into multiple API calls if the number of operations exceeds 500 records per call.
6. IF a batch flush receives an HTTP 5xx response or a network timeout from the Lark_Base_API, THEN THE Batch_Flush_Scheduler SHALL retain the failed operations in the Write_Queue and retry on the next flush cycle.
7. IF a batch flush fails for the same operation on three consecutive cycles, THEN THE Batch_Flush_Scheduler SHALL move that operation to a dead-letter log and notify connected Frontend_Clients via WebSocket with a message indicating the affected table and record identifier.
8. WHILE the Batch_Flush_Scheduler is executing a flush, THE Write_Queue SHALL continue accepting new operations for the next flush cycle without blocking submissions.

### Requirement 4: Cache Invalidation via Webhooks

**User Story:** As a developer, I want the cache to stay fresh when external systems modify Lark Base data, so that users always see up-to-date information.

#### Acceptance Criteria

1. WHEN the existing webhook endpoint receives a Lark event where the event payload contains an action_type of "record_changed", THE Webhook_Invalidator SHALL remove the affected record (identified by the record_id in the event payload) from the Cache_Layer so the next read triggers a fresh fetch from the Lark_Base_API.
2. WHEN the existing webhook endpoint receives a Lark event where the event payload contains an action_type of "record_created", THE Webhook_Invalidator SHALL fetch the new record from the Lark_Base_API using the record_id in the event payload and insert it into the Cache_Layer within 5 seconds of receiving the event.
3. WHEN the existing webhook endpoint receives a record-deleted event, THE Webhook_Invalidator SHALL remove the record from the Cache_Layer.
4. IF the Lark_Base_API is unreachable when the Webhook_Invalidator attempts to fetch a newly created record, THEN THE Webhook_Invalidator SHALL mark the record_id as pending-fetch and retry on the next webhook event or within 30 seconds, whichever comes first.
5. WHEN the Webhook_Invalidator updates the Cache_Layer, THE Backend_API SHALL broadcast a cache-updated WebSocket event to all connected Frontend_Clients, including the table_name, record_id, and action (created, updated, or deleted) in the event payload.
6. IF the Webhook_Invalidator receives an event for a record_id that has a pending operation in the Write_Queue, THEN THE Webhook_Invalidator SHALL discard the webhook-triggered cache update for that record until the Write_Queue operation for that record is flushed.

### Requirement 5: Backend REST API Endpoints

**User Story:** As a frontend developer, I want a set of backend endpoints that mirror the current Lark API operations, so that migrating the frontend is straightforward.

#### Acceptance Criteria

1. THE Backend_API SHALL expose a `POST /api/tables/{table_id}/records/search` endpoint that accepts filter and sort parameters and returns at most 500 matching records per request from the Cache_Layer.
2. THE Backend_API SHALL expose a `GET /api/tables/{table_id}/records/{record_id}` endpoint that returns a single record from the Cache_Layer.
3. IF the Frontend_Client requests a record via `GET /api/tables/{table_id}/records/{record_id}` that does not exist in the Cache_Layer or the Lark_Base_API, THEN THE Backend_API SHALL return HTTP 404 with an error message indicating the record was not found.
4. THE Backend_API SHALL expose a `POST /api/tables/{table_id}/records` endpoint that enqueues a create operation in the Write_Queue and returns optimistic record data with a generated temporary ID prefixed with `temp_` to distinguish it from permanent Lark record IDs.
5. THE Backend_API SHALL expose a `PUT /api/tables/{table_id}/records/{record_id}` endpoint that enqueues an update operation in the Write_Queue and returns the optimistically merged record.
6. THE Backend_API SHALL authenticate requests using a shared secret token in the `Authorization` header.
7. IF the Frontend_Client provides an invalid or missing authentication token, THEN THE Backend_API SHALL return HTTP 401 with an error message indicating authentication failure.
8. IF the Frontend_Client sends a request to a table_id not present in the configured table list, THEN THE Backend_API SHALL return HTTP 404 with an error message indicating the table is not recognized.

### Requirement 6: Frontend Migration

**User Story:** As a frontend developer, I want to replace direct Lark API calls with backend API calls, so that all traffic is routed through the caching layer.

#### Acceptance Criteria

1. THE Frontend_Client SHALL send all data read and write requests to the Backend_API instead of the Lark_Base_API.
2. THE Frontend_Client SHALL include the shared secret token in the `Authorization` header of every request to the Backend_API.
3. WHEN the Frontend_Client receives an optimistic response from a write operation, THE Frontend_Client SHALL update the local Zustand store immediately with the optimistic data, including the temporary record ID for create operations.
4. WHEN the Frontend_Client receives a cache-updated WebSocket event, THE Frontend_Client SHALL use the table_name and record_id from the event payload to re-fetch the affected record or record list from the Backend_API.
5. THE Frontend_Client SHALL retain the existing `lark-api.service.ts` interface signatures so that service consumers (quest.service.ts, coin.service.ts, store.service.ts, member.service.ts) require minimal changes.
6. IF the Backend_API returns HTTP 502 or is unreachable, THEN THE Frontend_Client SHALL display an error banner to the user indicating a temporary connectivity issue and retry the failed request once after 3 seconds.
7. WHEN the Frontend_Client receives a WebSocket event indicating a record was created with a permanent ID that replaces a local temporary ID (prefixed with `temp_`), THE Frontend_Client SHALL replace the temporary ID with the permanent ID in the Zustand store.

### Requirement 7: Flush Interval Configuration

**User Story:** As an operator, I want to configure the batch flush interval and cache TTL via environment variables, so that I can tune performance without code changes.

#### Acceptance Criteria

1. THE Backend_API SHALL read the flush interval from the `BATCH_FLUSH_INTERVAL_SECONDS` environment variable with a default of 10 seconds.
2. THE Backend_API SHALL read the default cache TTL from the `CACHE_TTL_SECONDS` environment variable with a default of 300 seconds.
3. IF the flush interval or cache TTL environment variable value is less than 1 or greater than 86400, THEN THE Backend_API SHALL reject startup with a configuration error message indicating the valid range is 1 to 86400 seconds.
4. IF the flush interval or cache TTL environment variable contains a non-numeric value, THEN THE Backend_API SHALL reject startup with a configuration error message indicating the value must be an integer.
5. THE Backend_API SHALL log the active flush interval and cache TTL values at INFO level at startup.

### Requirement 8: Quota Usage Reduction

**User Story:** As a product owner, I want the total number of Lark Base API requests to stay well under the 10,000-request quota during normal usage, so that the application does not experience service disruptions.

#### Acceptance Criteria

1. WHILE the Cache_Layer contains fresh data for a table, THE Backend_API SHALL serve read requests from cache with zero Lark_Base_API calls.
2. THE Batch_Flush_Scheduler SHALL send at most one batch-create call and one batch-update call per table per flush cycle, regardless of the number of queued individual operations.
3. WHEN all tables are fully cached and no writes are pending, THE Backend_API SHALL make zero Lark_Base_API calls until a cache entry expires or a new write is submitted.
4. WHILE operating under normal usage of up to 20 concurrent users performing up to 200 read requests and 50 write requests per hour total, THE Backend_API SHALL consume no more than 500 Lark_Base_API requests per hour.
