# Requirements Document

## Introduction

This feature adds real-time data updates to the SP Madrid Gamified Tracker by introducing a FastAPI backend server that receives Lark Base event webhooks and pushes changes to connected browser clients via WebSocket. The real-time system serves three equally important use cases:

1. **Live Leaderboard** — Rankings update instantly when any user completes a quest
2. **Live Quest Board** — Scrum Masters see new task proposals in real time; Developers see approval/rejection decisions instantly; open/claimable tasks appear for all eligible users as soon as they're created or approved
3. **Live Badge Updates** — Badge unlocks are visible to all team members immediately

## Glossary

- **Backend_Server**: A FastAPI Python application that receives Lark event webhooks and maintains WebSocket connections to browser clients
- **WebSocket_Service**: The frontend service responsible for establishing, maintaining, and reconnecting WebSocket connections to the Backend_Server
- **Leaderboard_Component**: The frontend UI component that displays ranked member badge counts in real time
- **Lark_Webhook**: An HTTP POST callback sent by Lark Open Platform to the Backend_Server when a record is created, updated, or deleted in Lark Base
- **Event_Message**: A JSON payload sent from the Backend_Server to connected clients over WebSocket, describing a data change
- **Connection_State**: The current status of the WebSocket connection (connecting, connected, disconnected, reconnecting, or failed)
- **Zustand_Store**: The frontend global state container that holds application data and is updated when Event_Messages arrive

## Requirements

### Requirement 1: Backend Server Webhook Reception

**User Story:** As a system operator, I want the backend server to receive and validate Lark Base event webhooks, so that data changes are captured in real time without polling.

#### Acceptance Criteria

1. WHEN a Lark_Webhook POST request is received at the `/webhook/lark` endpoint, THE Backend_Server SHALL validate the request by comparing the verification token in the request body against the configured Lark verification token and reject the request if they do not match
2. WHEN a Lark_Webhook contains a URL verification challenge (the request body includes a `challenge` field with `type` equal to `url_verification`), THE Backend_Server SHALL respond with a JSON body containing the `challenge` value within 1 second
3. IF a Lark_Webhook request has an invalid verification token, THEN THE Backend_Server SHALL reject the request with HTTP 403 status and log the rejection including the source IP address and timestamp to the server's standard output
4. WHEN a valid Lark_Webhook event is received and the event payload identifies the source table as quest_completions, THE Backend_Server SHALL broadcast a `leaderboard_update` Event_Message containing the event type and affected table name to all clients connected via WebSocket
5. WHEN a valid Lark_Webhook event is received and the event payload identifies the source table as quests, THE Backend_Server SHALL broadcast a `quest_update` Event_Message containing the event type and affected table name to all clients connected via WebSocket
6. WHEN a valid Lark_Webhook event is received and the event payload identifies the source table as badge_earned, THE Backend_Server SHALL broadcast a `badge_update` Event_Message containing the event type and affected table name to all clients connected via WebSocket
7. IF a valid Lark_Webhook event is received and the event payload identifies a source table that is not quest_completions, quests, or badge_earned, THEN THE Backend_Server SHALL acknowledge the webhook with HTTP 200 status without broadcasting any Event_Message
8. IF no WebSocket clients are connected when an Event_Message broadcast is triggered, THEN THE Backend_Server SHALL discard the message without queuing or retrying delivery
9. WHEN a Lark_Webhook POST request is received with a request body larger than 1 MB, THE Backend_Server SHALL reject the request with HTTP 413 status without processing the payload

### Requirement 2: WebSocket Connection Management

**User Story:** As a developer, I want the frontend to maintain a persistent WebSocket connection to the backend, so that real-time updates arrive without manual refresh.

#### Acceptance Criteria

1. WHEN the application initializes, IF the user is authenticated, THEN THE WebSocket_Service SHALL establish a WebSocket connection to the Backend_Server within 5 seconds
2. WHILE the WebSocket connection is in the connected state, THE WebSocket_Service SHALL send a heartbeat ping every 30 seconds to keep the connection alive
3. IF the WebSocket_Service does not receive a heartbeat pong response within 5 seconds of sending a ping, THEN THE WebSocket_Service SHALL treat the connection as dropped and initiate the reconnection procedure
4. IF the WebSocket connection drops unexpectedly, THEN THE WebSocket_Service SHALL attempt reconnection using exponential backoff starting at 1 second with a maximum interval of 30 seconds, up to a maximum of 10 attempts
5. IF the WebSocket_Service exhausts all 10 reconnection attempts without success, THEN THE WebSocket_Service SHALL set the Connection_State to "failed" and stop further automatic reconnection attempts
6. WHILE the WebSocket_Service is reconnecting, THE Leaderboard_Component SHALL display a Connection_State indicator showing the disconnected status
7. WHEN the user navigates away from the application or logs out, THE WebSocket_Service SHALL close the WebSocket connection cleanly with a normal closure code (1000)
8. THE WebSocket_Service SHALL expose the current Connection_State to the Zustand_Store as one of the following values: "connecting", "connected", "disconnected", "reconnecting", or "failed"

### Requirement 3: Live Leaderboard Updates

**User Story:** As a team member, I want the leaderboard to update automatically when anyone completes a quest, so that I can see ranking changes in real time without refreshing.

#### Acceptance Criteria

1. WHEN a leaderboard_update Event_Message is received via WebSocket, THE Zustand_Store SHALL update the leaderboard data and trigger a re-render of the Leaderboard_Component
2. WHEN a leaderboard_update Event_Message is received, THE Leaderboard_Component SHALL animate rank changes with a visual transition lasting 300 milliseconds
3. WHILE the WebSocket connection is in the disconnected state, THE Leaderboard_Component SHALL display a visible "Refresh" button that triggers a manual leaderboard fetch when activated
4. WHEN a leaderboard_update results in a rank change for the current user, THE Leaderboard_Component SHALL apply a distinct background color to the current user row for 3 seconds
5. WHILE the WebSocket connection is in the connected state, THE Leaderboard_Component SHALL display a "Live" indicator
6. IF a received WebSocket message fails to conform to the expected leaderboard_update Event_Message structure, THEN THE Zustand_Store SHALL discard the message and retain the current leaderboard data without error

### Requirement 4: Real-Time Quest Board Updates

**User Story:** As a Scrum Master, I want to see new task proposals appear on my quest board immediately, so I can review and act on them without manually refreshing. As a Developer, I want to see approval/rejection decisions in real time, so I know when my tasks are ready to work on. As any team member, I want new open/claimable tasks to appear instantly, so I can claim them before someone else.

#### Acceptance Criteria

1. WHEN a quest_update Event_Message indicates a new quest with status "pending" is created, THE Zustand_Store SHALL add the quest to the pending category for Scrum Master views that manage the proposing developer, within the same render cycle
2. WHEN a quest_update Event_Message indicates a status change from "pending" to "active", THE Zustand_Store SHALL move the affected quest from the pending category to the active/sprint category for the proposing Developer's view, and to the available category for all eligible users based on target_role and assignment_type
3. WHEN a quest_update Event_Message indicates a status change from "pending" to "rejected", THE Zustand_Store SHALL move the affected quest from the pending category to the rejected category for the proposing Developer's view, including the rejection reason from the payload
4. WHEN a quest_update Event_Message indicates a new or newly-active quest with assignment_type "open", THE Zustand_Store SHALL add the quest to the open/claimable category for all connected users whose selectedRole matches the quest's target_role
5. IF a quest_update Event_Message references a quest_id that does not match any quest in the current Zustand_Store state, THEN THE Zustand_Store SHALL fetch the full quest record from the API and add it to the appropriate category based on its status and assignment_type
6. WHEN a quest_update Event_Message is received for a quest with completion_mode "first-claim" that has already been claimed, THE Zustand_Store SHALL remove the quest from the open category for all other connected users

### Requirement 5: Real-Time Badge Unlock Notifications

**User Story:** As a team member, I want to see when colleagues unlock badges in real time, so that achievements feel shared and the gamification stays engaging.

#### Acceptance Criteria

1. WHEN a badge_update Event_Message is received for another user, THE Leaderboard_Component SHALL update the displayed badge count for that user within 2 seconds of message receipt without requiring a manual page refresh
2. WHEN a badge_update Event_Message is received for the current user, THE Zustand_Store SHALL set completionFeedback with the unlockedBadges array from the message payload and set newBadgeUnlocked to true
3. WHEN a badge_update Event_Message is received and the message payload contains a user identifier not present in the current leaderboard entries, THE Leaderboard_Component SHALL ignore the message and not add a new row
4. IF the real-time event channel becomes unavailable, THEN THE System SHALL fall back to retrieving updated badge counts on the next user-initiated action (page navigation or manual refresh) and SHALL not display an error to the user

### Requirement 6: Event Message Schema

**User Story:** As a developer, I want a well-defined message schema for WebSocket events, so that the frontend can reliably parse and route incoming updates.

#### Acceptance Criteria

1. THE Backend_Server SHALL send Event_Messages as JSON objects containing a `type` field (one of: "leaderboard_update", "quest_update", "badge_update", "connection_ack"), a `payload` field (a JSON object whose structure is defined per event type), and a `timestamp` field as a string in ISO 8601 UTC format (e.g., "2024-01-15T10:30:00Z"), with a maximum total message size of 64 KB
2. WHEN the Backend_Server sends a leaderboard_update Event_Message, THE payload SHALL contain the `member_id` (string) of the user who triggered the change and the updated `badge_count` (integer, minimum 0) for that member
3. WHEN the Backend_Server sends a quest_update Event_Message, THE payload SHALL contain the `quest_id` (string), the `new_status` (one of: "active", "pending", "rejected"), the `affected_member_id` (string), the `proposer_id` (string), the `target_role` (one of: "agent", "developer", "all"), the `assignment_type` (one of: "all", "assigned", "open"), the `completion_mode` (one of: "multiple", "first-claim"), and optionally `rejection_reason` (string) when new_status is "rejected"
4. WHEN the Backend_Server sends a badge_update Event_Message, THE payload SHALL contain the `member_id` (string), the `badge_id` (string), and the `badge_name` (string, 1 to 100 characters) of the newly earned badge
5. WHEN the Backend_Server sends a connection_ack Event_Message, THE payload SHALL contain a `connection_id` (string) uniquely identifying the WebSocket session
6. IF the WebSocket_Service receives a message that is not valid JSON, is missing any of the required top-level fields (`type`, `payload`, `timestamp`), or contains a `type` value not in the defined set, THEN THE WebSocket_Service SHALL log the raw message content to the browser console at the "warn" level and discard it without processing or crashing

### Requirement 7: Backend Server Health and Scalability

**User Story:** As a system operator, I want the backend server to handle multiple concurrent WebSocket connections reliably, so that all connected team members receive updates simultaneously.

#### Acceptance Criteria

1. THE Backend_Server SHALL expose a `/health` endpoint that returns HTTP 200 with a JSON body containing the current WebSocket connection count and server uptime in seconds
2. THE Backend_Server SHALL support at least 50 concurrent WebSocket connections while maintaining broadcast latency under 500 milliseconds per message
3. WHEN a connected client does not respond to a server-initiated ping within 10 seconds, THE Backend_Server SHALL terminate that client's WebSocket connection and remove it from the broadcast list
4. THE Backend_Server SHALL process incoming Lark_Webhook events and broadcast the resulting Event_Message to all connected clients within 500 milliseconds of receipt
5. THE Backend_Server SHALL send a WebSocket ping frame to each connected client every 30 seconds to detect unresponsive connections
