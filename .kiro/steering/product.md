# Product Overview

SP Madrid Gamified Tracker is a gamified task and onboarding tracking system for SP Madrid & Associates, a BPO company with AI-driven tech solutions.

## Core Concept

The system turns onboarding steps, daily tasks, and sprint work into quests. Employees earn badges upon completing quests. Progress is surfaced via role-separated leaderboards. No XP or points — badges tied to quest completions are the sole reward mechanism.

## User Roles

- **Agent**: BPO operations staff who complete onboarding quests, daily tasks, and milestone quests
- **Developer**: Tech team members who propose sprint tasks, complete approved tasks, and earn developer-specific badges
- **Scrum Master**: Team lead who reviews, approves, or rejects developer-proposed tasks
- **Admin**: Manages Lark Base tables directly (no admin UI in the app)

## Key Mechanics

- Developer tasks require Scrum Master approval before counting toward progress (prevents self-farming)
- Badges are awarded automatically when quest completion thresholds are met
- Leaderboards are separated by role track (Agent vs Developer)
- Lark Bot sends notifications for task proposals and approval/rejection decisions

## Architecture Summary

Frontend-only MVP (React SPA) connected to Lark Base via the Lark Base API. No separate backend server. Lark Base is the single source of truth. A Lark Bot handles notifications.
