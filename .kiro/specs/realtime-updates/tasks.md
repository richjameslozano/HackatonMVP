# Implementation Plan: Real-Time Updates

## Overview

This plan implements a real-time data push architecture for the SP Madrid Gamified Tracker. It adds a FastAPI Python backend server that receives Lark Base event webhooks and broadcasts changes to connected browser clients via WebSocket, plus a frontend WebSocket service that manages connection lifecycle and routes typed event messages to the appropriate Zustand store slices.

## Tasks

- [x] 1. Set up backend project structure and configuration
  - [x] 1.1 Create the backend project skeleton with FastAPI
    - Create `backend/` directory with `app/`, `app/routers/`, `app/services/`, `tests/` subdirectories
    - Create `backend/requirements.txt` with fastapi, uvicorn, pydantic, pydantic-settings, python-dotenv, pytest, httpx, hypothesis
    - Create `backend/app/__init__.py`, `backend/app/routers/__init__.py`, `backend/app/services/__init__.py`, `backend/tests/__init__.py`
    - Create `backend/.env.example` with LARK_VERIFICATION_TOKEN, CORS_ORIGINS, MAX_CONNECTIONS placeholders
    - Create `backend/app/config.py` using pydantic-settings to load environment variables
    - _Requirements: 7.1_

  - [x] 1.2 Create Pydantic data models for events and payloads
    - Create `backend/app/models.py` with LarkWebhookPayload, EventMessage, LeaderboardUpdatePayload, QuestUpdatePayload, BadgeUpdatePayload, ConnectionAckPayload models
    - Enforce field constraints: badge_count >= 0, badge_name 1-100 chars, new_status/target_role/assignment_type/completion_mode enums
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 1.3 Create the FastAPI app entry point with lifespan and CORS
    - Create `backend/app/main.py` with FastAPI app, CORS middleware, router includes, and lifespan event for heartbeat background task
    - Configure CORS from environment variable CORS_ORIGINS
    - _Requirements: 7.2_

- [x] 2. Implement backend WebSocket connection management
  - [x] 2.1 Implement the ConnectionManager service
    - Create `backend/app/services/connection_manager.py` with ConnectionManager class
    - Implement connect() accepting WebSocket, assigning connection_id, enforcing max_connections (50), sending connection_ack
    - Implement disconnect() removing connection from active set
    - Implement broadcast() sending EventMessage to all connected clients, removing failed connections
    - Implement ping_all() sending ping frames and disconnecting unresponsive clients after 10s
    - Implement get_connection_count() returning current active connections
    - Reject new connections with 503 when limit reached
    - _Requirements: 7.2, 7.3, 7.5, 1.8_

  - [x] 2.2 Implement the WebSocket endpoint
    - Create `backend/app/routers/ws.py` with WebSocket `/ws` endpoint
    - Accept connection via ConnectionManager, handle incoming messages, detect disconnection
    - Handle pong responses from clients to keep connections alive
    - _Requirements: 7.3, 7.5_

  - [ ]* 2.3 Write unit tests for ConnectionManager
    - Test connect/disconnect lifecycle, max connections enforcement (503), broadcast to multiple clients, ping timeout removal
    - _Requirements: 7.2, 7.3_

- [x] 3. Implement backend webhook processing
  - [x] 3.1 Implement the Event Mapper service
    - Create `backend/app/services/event_mapper.py` with TABLE_ID_MAP and map_webhook_to_event function
    - Map quest_completions → leaderboard_update, quests → quest_update, badge_earned → badge_update
    - Return None for unrecognized tables
    - _Requirements: 1.4, 1.5, 1.6, 1.7_

  - [x] 3.2 Implement the Webhook Router endpoint
    - Create `backend/app/routers/webhook.py` with POST `/webhook/lark` endpoint
    - Validate Content-Length ≤ 1 MB (HTTP 413 if exceeded)
    - Handle URL verification challenge (return `{"challenge": body.challenge}`)
    - Validate verification token against configured LARK_VERIFICATION_TOKEN (HTTP 403 + log on mismatch)
    - Map event to EventMessage via event_mapper and broadcast via ConnectionManager
    - Acknowledge unrecognized tables with HTTP 200 (no broadcast)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [x] 3.3 Implement the Health endpoint
    - Create `backend/app/routers/health.py` with GET `/health` returning connection count and uptime in seconds
    - _Requirements: 7.1_

  - [ ]* 3.4 Write property tests for webhook token validation (Property 1)
    - **Property 1: Token Validation Correctness**
    - For any pair of strings (configured_token, request_token), validation accepts iff they are equal, rejects with 403 otherwise
    - Use hypothesis with minimum 100 iterations
    - **Validates: Requirements 1.1, 1.3**

  - [ ]* 3.5 Write property tests for challenge echo (Property 2)
    - **Property 2: Challenge Echo Round-Trip**
    - For any non-empty string challenge, the endpoint returns that exact string in the challenge field
    - Use hypothesis with minimum 100 iterations
    - **Validates: Requirements 1.2**

  - [ ]* 3.6 Write property tests for unrecognized table handling (Property 3)
    - **Property 3: Unrecognized Table Produces No Event**
    - For any string not in {"quest_completions", "quests", "badge_earned"}, event mapper returns None
    - Use hypothesis with minimum 100 iterations
    - **Validates: Requirements 1.7**

  - [ ]* 3.7 Write property tests for EventMessage serialization (Property 10 - backend)
    - **Property 10: EventMessage Serialization Conformance**
    - For any valid EventMessage, JSON serialization contains all required fields, total size ≤ 64 KB, payload conforms to type-specific schema
    - Use hypothesis with minimum 100 iterations
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [x] 4. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement frontend TypeScript types and message validation
  - [x] 5.1 Create real-time event type definitions
    - Create `src/types/realtime.ts` with EventType, EventMessage, LeaderboardUpdatePayload, QuestUpdatePayload, BadgeUpdatePayload, ConnectionAckPayload interfaces
    - Export ConnectionState type: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed'
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 5.2 Implement the message validator
    - Create `src/services/message-validator.ts` with validateEventMessage function
    - Validate required top-level fields (type, payload, timestamp), valid type enum, payload is object
    - Return null for invalid messages, log warning to console
    - _Requirements: 6.6, 3.6_

  - [ ]* 5.3 Write property tests for invalid message rejection (Property 6)
    - **Property 6: Invalid Message Rejection**
    - For any value that is not a valid JSON object, missing required fields, or has invalid type, validator returns null
    - Use fast-check with minimum 100 iterations
    - Create `src/services/__tests__/message-validator.test.ts`
    - **Validates: Requirements 3.6, 6.6**

- [ ] 6. Implement frontend WebSocket service
  - [ ] 6.1 Implement the WebSocket service singleton
    - Create `src/services/websocket.service.ts` with WebSocketService class
    - Implement connect() establishing WebSocket connection with configurable URL from VITE_WS_URL
    - Implement disconnect() closing connection with code 1000
    - Implement heartbeat ping every 30s with 5s pong timeout
    - Implement exponential backoff reconnection: delay = min(1000 * 2^attempt, 30000), max 10 attempts
    - Implement state machine: disconnected → connecting → connected → disconnected → reconnecting → failed
    - Expose onMessage() and onStateChange() subscription methods with unsubscribe return
    - Export singleton instance
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8_

  - [ ]* 6.2 Write property tests for exponential backoff formula (Property 4)
    - **Property 4: Exponential Backoff Formula**
    - For any attempt n (0 ≤ n < 10), computed delay equals min(1000 × 2^n, 30000) ms
    - Use fast-check with minimum 100 iterations
    - Create `src/services/__tests__/websocket.service.test.ts`
    - **Validates: Requirements 2.4**

  - [ ]* 6.3 Write property tests for connection state invariant (Property 5)
    - **Property 5: Connection State Invariant**
    - For any sequence of WebSocket lifecycle events, resulting state is always one of the 5 valid states
    - Use fast-check with minimum 100 iterations
    - Add to `src/services/__tests__/websocket.service.test.ts`
    - **Validates: Requirements 2.8**

- [ ] 7. Implement frontend message routing and store integration
  - [ ] 7.1 Implement the message router
    - Create `src/services/message-router.ts` with routeMessage function
    - Route leaderboard_update → fetchLeaderboard(), quest_update → fetchQuests(), badge_update → handleBadgeUpdate (check current user for celebration)
    - Handle connection_ack by storing connection_id
    - _Requirements: 3.1, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2_

  - [ ] 7.2 Extend Zustand store with connection state
    - Add connectionState field and setConnectionState action to AppState interface in `src/store/app.store.ts`
    - Initialize connectionState as 'disconnected'
    - _Requirements: 2.8_

  - [ ] 7.3 Implement quest routing logic for real-time updates
    - Add helper functions in message-router.ts for quest status transitions: pending → active, pending → rejected, new open quests visibility based on target_role and selectedRole
    - Handle first-claim completion_mode removal from open category
    - Handle unknown quest_id by triggering API fetch
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 7.4 Write property tests for pending quest routing (Property 7)
    - **Property 7: Pending Quest Routing**
    - For any valid quest_update with new_status "pending", the quest is added to pending category regardless of other fields
    - Use fast-check with minimum 100 iterations
    - Create `src/services/__tests__/message-router.test.ts`
    - **Validates: Requirements 4.1**

  - [ ]* 7.5 Write property tests for open quest role-based visibility (Property 8)
    - **Property 8: Open Quest Role-Based Visibility**
    - For any quest with assignment_type "open", it's visible iff quest target_role equals user's selectedRole or target_role is "all"
    - Use fast-check with minimum 100 iterations
    - Add to `src/services/__tests__/message-router.test.ts`
    - **Validates: Requirements 4.4**

  - [ ]* 7.6 Write property tests for unknown member badge update (Property 9)
    - **Property 9: Unknown Member Badge Update Ignored**
    - For any badge_update whose member_id is not in the leaderboard entries, leaderboard state remains unchanged
    - Use fast-check with minimum 100 iterations
    - Add to `src/services/__tests__/message-router.test.ts`
    - **Validates: Requirements 5.3**

  - [ ]* 7.7 Write property tests for EventMessage serialization (Property 10 - frontend)
    - **Property 10: EventMessage Serialization Conformance**
    - For any valid EventMessage, JSON serialization contains all required fields, size ≤ 64 KB, payload conforms to type-specific schema
    - Use fast-check with minimum 100 iterations
    - Create `src/services/__tests__/event-schema.test.ts`
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [ ] 8. Checkpoint - Core services complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement frontend UI components and wiring
  - [ ] 9.1 Create the ConnectionIndicator component
    - Create `src/components/shared/ConnectionIndicator.tsx`
    - Render green dot + "Live" when connected, yellow dot + "Reconnecting..." when reconnecting, red dot + "Disconnected" + Refresh button when failed
    - Accept ConnectionState prop and optional onRetry callback
    - _Requirements: 2.6, 3.3, 3.5_

  - [ ] 9.2 Wire WebSocket service initialization into App lifecycle
    - Update `src/App.tsx` to connect WebSocket after authentication, disconnect on logout/unmount
    - Subscribe to state changes and update Zustand connectionState
    - Subscribe to messages and route through message-router
    - Use VITE_WS_URL environment variable for WebSocket URL
    - _Requirements: 2.1, 2.7, 2.8_

  - [ ] 9.3 Integrate ConnectionIndicator into the layout
    - Add ConnectionIndicator to `src/components/layout/TopBar.tsx` or AppShell
    - Connect it to Zustand connectionState
    - Wire Refresh button to trigger manual reconnect
    - _Requirements: 2.6, 3.3, 3.5_

  - [ ] 9.4 Add leaderboard rank change animation
    - Update LeaderboardRow component to apply a 300ms visual transition on rank changes
    - Highlight current user's row with distinct background for 3 seconds on rank change
    - _Requirements: 3.2, 3.4_

  - [ ] 9.5 Update environment configuration
    - Add `VITE_WS_URL` to `.env.example` and frontend `.env`
    - _Requirements: 2.1_

- [ ] 10. Create backend Dockerfile and deployment config
  - [ ] 10.1 Create Dockerfile for the backend server
    - Create `backend/Dockerfile` with Python base image, install requirements, run uvicorn
    - Configure to expose port 8000 and run with appropriate worker settings
    - _Requirements: 7.2, 7.4_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The backend uses Python (FastAPI + hypothesis for PBT), the frontend uses TypeScript (React + fast-check for PBT)
- The frontend continues to fetch full data from Lark Base API on event receipt — the backend only relays lightweight notifications

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "5.1"] },
    { "id": 1, "tasks": ["1.2", "5.2"] },
    { "id": 2, "tasks": ["1.3", "5.3", "6.1"] },
    { "id": 3, "tasks": ["2.1", "3.1", "6.2", "6.3"] },
    { "id": 4, "tasks": ["2.2", "3.2", "3.3", "7.1", "7.2"] },
    { "id": 5, "tasks": ["2.3", "3.4", "3.5", "3.6", "3.7", "7.3"] },
    { "id": 6, "tasks": ["7.4", "7.5", "7.6", "7.7"] },
    { "id": 7, "tasks": ["9.1", "9.5"] },
    { "id": 8, "tasks": ["9.2", "9.4"] },
    { "id": 9, "tasks": ["9.3", "10.1"] }
  ]
}
```
