---
inclusion: always
---

# Product Context: SP Madrid Gamified Tracker

Gamified task and onboarding tracker for SP Madrid & Associates (BPO company). Turns onboarding steps, daily tasks, and sprint work into **quests**. Employees earn **badges** upon completing quests. Progress is shown on role-separated leaderboards.

## Reward System Rules

- Badges are the **only** reward mechanism. There are no XP points or currency.
- Badges are awarded automatically when a member's quest completion count meets the badge threshold.
- Never implement XP, points, coins, or any numeric reward beyond badge thresholds.

## User Roles & Permissions

| Role | Can Do | Cannot Do |
|------|--------|-----------|
| Agent | Complete assigned/open quests, view own badges & leaderboard | Propose tasks, approve tasks |
| Developer | Propose sprint tasks, complete approved tasks, view badges & leaderboard | Approve own tasks |
| Scrum Master | Approve/reject developer proposals, view team progress | Complete quests on behalf of others |
| Admin | Manage Lark Base tables directly | No in-app admin UI exists |

When implementing features, always enforce these role boundaries. A developer must never be able to approve their own proposed task.

## Architecture Constraints

- **Frontend-only MVP**: React SPA calls Lark Base API directly. No custom backend for data operations.
- **Backend (WebSocket relay only)**: A lightweight FastAPI server exists solely to relay Lark webhook events to connected clients via WebSocket. It does NOT handle CRUD — all data reads/writes go through the Lark Base REST API from the frontend.
- **Single source of truth**: Lark Base tables. The app never persists data locally beyond the browser session.
- **Notifications**: Lark Bot IM API sends messages for task proposals and approval/rejection decisions.

## Data Model (Lark Base Tables)

| Table | Purpose |
|-------|---------|
| Members | User profiles with `role`, `open_id`, `name` |
| Quests | Task definitions with `assignment_type`, `status`, `role_track`, `category` |
| Quest_Completions | Records of who completed which quest and when |
| Badges | Badge definitions with `threshold` (number of completions required) |
| Badge_Earned | Junction table linking members to earned badges |

Always reference these table names exactly when working with the service layer.

## Quest Assignment Types

The `assignment_type` field controls visibility and completion eligibility:

- **`all`** — Every member with the matching role sees and can complete it (e.g., onboarding steps).
- **`assigned`** — Only the member in `assignee_id` sees it. Used for developer sprint tasks after Scrum Master approval.
- **`open`** — Visible to all, optional. Behavior depends on `completion_mode`:
  - `multiple` — any number of members can complete it (group quest).
  - `first-claim` — first member to complete it claims it; others are blocked.

When filtering quests for display, always apply `assignment_type` logic to determine visibility.

## Quest Statuses

- **`active`** — Available for completion.
- **`pending`** — Developer-proposed task awaiting Scrum Master approval. Must not appear in the main quest board for the proposer until approved.
- **`rejected`** — Rejected by Scrum Master or withdrawn. Should be visually distinct and non-completable.

## Developer Task Proposal Flow

1. Developer submits a proposed task (creates quest with `status: pending`, `assignment_type: assigned`).
2. Lark Bot notifies the Scrum Master.
3. Scrum Master approves → status becomes `active`. Or rejects → status becomes `rejected`.
4. Lark Bot notifies the Developer of the decision.
5. Only after approval can the developer complete the task and earn badge progress.

This flow is critical for preventing self-farming. Never skip the approval step for developer-proposed tasks.

## Leaderboard Rules

- Leaderboards are separated by role track: **Agent** and **Developer** are distinct rankings.
- Ranking is based on total badge count (not quest completion count).
- Time period filters (weekly, monthly, all-time) scope the completions window used for badge evaluation.

## Key Business Logic to Preserve

- A quest completion only counts toward badges if the quest `status` is `active` at the time of completion.
- Badge thresholds are evaluated against the Quest_Completions table, not a cached counter.
- Members can only see quests matching their `role` field (agent quests for agents, developer quests for developers).
- Scrum Masters see a command center with team progress, pending reviews, and blockers — not the regular quest board.
