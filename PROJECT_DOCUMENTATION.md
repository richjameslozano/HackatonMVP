# Project Documentation

## Project Information

**Project Title:** SP Madrid Gamified Tracker *(working title — final name TBD)*

**Selected Problem Statement:** Gamified Learning and Progress Tracking Platform

**Project Category (Optional):**
- [x] Productivity
- [x] Workforce Development
- [ ] Others: ___________

---

## Problem Statement

Onboarding and day-to-day task tracking inside a fast-moving BPO are mostly invisible work. New hires don't have a clear, motivating path through their onboarding steps, daily tasks, and sprint work, and team leads have no single place to see who is progressing, who is stuck, and what still needs review.

**Who experiences the problem?**
- New and existing employees (Agents and Developers) at SP Madrid & Associates who need a clear sense of progress and recognition for completed work.
- Scrum Masters / team leads who must track team progress, review proposed work, and unblock people.

**Why does the problem matter?**
- Disengaged onboarding leads to slower ramp-up, lower retention, and inconsistent task completion.
- Without visible recognition, routine but important work (onboarding steps, daily tasks) gets neglected.
- Leads waste time chasing status updates across scattered tools and chats instead of acting on a single view.

**What challenges currently exist?**
- Progress and completions live informally in chats and spreadsheets, with no source of truth.
- No lightweight approval flow for developer-proposed work, which makes it easy to "self-farm" credit.
- No real-time visibility — leads find out about blockers and completions late.
- Standing up a full custom backend just to track this is overkill for the team's needs.

---

## Target Users

- **Agents** — BPO operations staff who complete onboarding quests, daily tasks, and milestone quests.
- **Developers** — Tech-team members who propose sprint tasks, complete approved tasks, and earn developer-specific badges.
- **Scrum Masters / Team Leaders** — Review and approve/reject developer proposals and monitor team progress through a command center.
- **Admins** — Manage the underlying Lark Base tables directly (no separate admin UI required for data ops).
- **Project Teams** — Cross-functional squads whose collective progress is surfaced on role-separated leaderboards.

---

## Proposed Solution

A gamified task and onboarding tracker that turns onboarding steps, daily tasks, and sprint work into **quests**. Employees complete quests to earn **badges** and **coins**, climb role-separated **leaderboards**, and spend earned coins in a **reward store**.

**What does it do?**
- Presents a role-aware quest board (Agents see onboarding / daily / milestone quests; Developers see approved sprint tasks plus pending proposals).
- Lets Developers propose sprint tasks that route to their Scrum Master for approval before they count — preventing self-farming.
- Awards badges automatically when completion thresholds are met, and coins based on quest difficulty.
- Ranks employees on Agent and Developer leaderboards by achievement.
- Gives Scrum Masters a command center with team progress, pending reviews, and blockers.
- Lets members redeem coins for rewards in a configurable store.
- Pushes real-time updates to all connected clients via a WebSocket relay, and sends Lark notifications for proposals and approval/rejection decisions.

**How does it solve the problem?**
- Makes invisible work visible and rewarding, driving consistent completion of onboarding and routine tasks.
- Uses Lark Base as a single source of truth, so progress is no longer scattered.
- The Scrum Master approval gate keeps achievements credible.
- Real-time updates and notifications keep leads informed without status-chasing.

**What makes it valuable to users?**
- Frontend-first, low-infrastructure design: the React app talks directly to the Lark Base API, with only a lightweight relay backend. Fast to deploy, cheap to run.
- Built on tools the company already uses (Lark), so adoption friction is low.
- Clear role boundaries and permission enforcement keep the experience focused per user type.

---

## MVP Scope

Key features included in the submission:

- **Lark OAuth authentication** with session handling and a member onboarding flow.
- **Role-based quest board** with role switching (Agent vs Developer views) and categorized quests (onboarding, daily, milestone, sprint).
- **Developer task proposal → Scrum Master approval/rejection** workflow with rejection reasons, edit history, and resubmission.
- **Quest completion** with optimistic UI updates, completion/confetti animations.
- **Badge system** — automatic badge awards based on completion thresholds, badge collection view with progress bars.
- **Coin reward system** — coins awarded by quest difficulty (easy/medium/hard), configurable by admins.
- **Reward store** — browse reward items, purchase with coins, purchase history, stock handling, and an admin reward/coin config panel.
- **Role-separated leaderboards** with time-period filters and rank-change indicators.
- **Scrum Master command center** — developer progress table, pending reviews, blockers panel, recent activity feed, task distribution.
- **Real-time updates** via FastAPI WebSocket relay (Lark webhook events → connected clients) with connection state indicators.
- **Lark Bot notifications** for proposals and approval/rejection decisions.
- **API request caching** layer with write queue, scheduled flush, and webhook-driven invalidation on the backend.

---

## How Kiro Was Used

Kiro was central to planning and building the project. The team used a spec-driven workflow backed by steering documents.

- **Specifications** — Six formal specs (each with `requirements.md`, `design.md`, and `tasks.md`) drove development:
  - `sp-madrid-gamified-tracker` — the core quest/badge/leaderboard platform.
  - `lark-authentication` — Lark OAuth and session flow.
  - `realtime-updates` — WebSocket relay and live updates.
  - `api-request-caching` — backend caching, write queue, and webhook invalidation.
  - `coin-store-system` and `coin-spending-store` — the coin economy and reward store.
- **Steering Documents** — Three always-on steering files in `.kiro/steering/` kept generated code consistent:
  - `product.md` — product context, roles/permissions, data model, and critical business rules (e.g., the Scrum Master approval gate that prevents self-farming).
  - `tech.md` — tech stack, code-style rules (named exports, `import type`, section separators), service-layer and Zustand patterns, and testing conventions.
  - `structure.md` — directory layout, architectural boundaries, and naming conventions.
- **Code Generation** — Kiro generated the layered architecture: service layer (`src/services`), Zustand stores, route-level pages, domain-grouped components, and the FastAPI backend services (cache, write queue, flush scheduler, connection manager, webhook invalidator).
- **Agent Workflows & Prompt Iteration** — Requirements were refined acceptance-criteria by acceptance-criteria (EARS-style), then designs and task lists were iterated before implementation.
- **Property-Based Testing** — Following the testing steering rules, Kiro produced extensive `fast-check` property tests (frontend) and `pytest` property tests (backend) with high iteration counts.

---

## Screenshots / Architecture (Optional)

High-level architecture:

```
                 ┌─────────────────────────────┐
                 │   React + TypeScript SPA     │
                 │  (Vite, Tailwind, Zustand)   │
                 │                              │
                 │  pages → components          │
                 │  stores → services           │
                 └───────┬──────────────┬───────┘
                         │              │
        Lark Base REST   │              │  WebSocket (live updates)
        (CRUD, single    │              │
         source of truth)│              │
                         ▼              ▼
              ┌────────────────┐   ┌──────────────────────────┐
              │   Lark Base    │   │  FastAPI WebSocket Relay  │
              │  (Bitable)     │   │  cache · write queue ·    │
              │  + Lark Bot IM │   │  flush scheduler ·        │
              │  notifications │   │  webhook invalidator      │
              └───────▲────────┘   └────────────▲─────────────┘
                      │   Lark webhook events    │
                      └──────────────────────────┘
```

- **Frontend:** React 19 + TypeScript (strict), Vite 8, TailwindCSS 3, react-router-dom 7, Zustand 5. All data CRUD goes through `lark-api.service.ts` directly against the Lark Base REST API.
- **Backend:** Lightweight FastAPI server that relays Lark webhook events to clients over WebSocket and provides a caching / write-queue layer. It does not own business data — Lark Base is the single source of truth.

*(Insert UI screenshots, wireframes, or diagrams here for the final submission.)*

---

## Demo Information

- **Demo Link:** _TBD_
- **Source Repository:** _TBD_
- **Presentation Deck:** _TBD_

---

## Future Improvements

If given additional time, the team would:

- Add a dedicated in-app **admin UI** for managing members, quests, and badges (currently managed directly in Lark Base tables).
- Expand **analytics and reporting** — completion trends, time-to-onboard metrics, and per-team dashboards.
- Introduce **quest dependencies and learning paths** so onboarding becomes a guided sequence.
- Add **mobile-responsive / native** experiences for on-the-go completion and approvals.
- Harden the backend with **persistent storage** for the cache/queue and observability (metrics, tracing).
- Broaden **notification channels** and richer interactive Lark cards for one-tap approvals.
- Add **automated badge/coin balancing tools** and seasonal/leaderboard reset cycles.

---

## Additional Notes

- **Architecture choice:** The MVP is intentionally frontend-first. The React SPA performs all data operations against the Lark Base API; the FastAPI service exists only as a real-time relay and caching layer. This keeps infrastructure minimal while still delivering live updates.
- **Reward model evolution:** The original concept used badges as the only reward mechanic. The scope later expanded to include a coin economy and reward store (see the `coin-store-system` and `coin-spending-store` specs), so the current MVP supports both badges and coins.
- **Quality:** The codebase follows strict conventions enforced through Kiro steering (named exports, typed imports, layered boundaries) and includes property-based tests on both the frontend (`fast-check`) and backend (`pytest`).
- **Security note:** Lark credentials (`app_id`/`app_secret`) and `tenant_access_token` are handled via a gitignored config and in-memory caching, and are never logged or exposed.
