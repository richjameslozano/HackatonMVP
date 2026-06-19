# Implementation Plan: SP Madrid Gamified Tracker

## Overview

This plan implements a frontend-only React SPA that gamifies onboarding and daily work using Lark Base as the database and Lark Bot for notifications. The implementation proceeds bottom-up: types and utilities first, then services, state management, UI components, and finally wiring everything together with routing and integration tests.

## Tasks

- [x] 1. Set up project structure, types, and utility functions
  - [x] 1.1 Initialize Vite + React + TypeScript project and configure TailwindCSS, React Router, Zustand, and Vitest + fast-check
    - Create Vite project with React-TS template
    - Install dependencies: react-router-dom, zustand, tailwindcss, postcss, autoprefixer, vitest, fast-check, axios
    - Configure `tailwind.config.ts`, `postcss.config.ts`, `vite.config.ts` (with vitest config), and `tsconfig.json` (strict mode)
    - Set up `src/index.css` with Tailwind directives
    - Create directory structure: `src/services/__tests__/`, `src/store/`, `src/pages/`, `src/components/{layout,quest,badge,leaderboard,shared}/`, `src/types/`, `src/utils/__tests__/`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 1.2 Define all domain types and interfaces in `src/types/index.ts`
    - Implement `Member`, `Quest`, `QuestCompletion`, `Badge`, `BadgeEarned` interfaces
    - Implement `CategorizedQuests`, `BadgeCollectionView`, `LeaderboardEntry` interfaces
    - Implement `LarkFilter`, `FilterCondition`, `LarkSort`, `LarkRecord`, `SendResult` API types
    - Define role literal type: `'agent' | 'developer'`
    - Define quest category type: `'onboarding' | 'daily' | 'milestone' | 'sprint'`
    - Define quest status type: `'active' | 'pending' | 'rejected'`
    - _Requirements: 1.1, 2.1, 5.1, 6.1, 7.1_

  - [x] 1.3 Implement validation utility functions in `src/utils/validation.ts`
    - `validateTaskTitle(title: string): { valid: boolean; error?: string }` — required, 1–100 chars, not whitespace-only
    - `validateTaskDescription(description: string): { valid: boolean; error?: string }` — optional, max 500 chars
    - `validateRejectionReason(reason: string): { valid: boolean; error?: string }` — required, 1–250 chars
    - _Requirements: 2.2, 3.3, 3.7_

  - [ ]* 1.4 Write property tests for validation utilities
    - **Property 2: Task proposal title validation**
    - **Validates: Requirements 2.2**
    - Test that empty, whitespace-only, and >100 char strings are rejected
    - Test that 1–100 char non-whitespace-only strings are accepted
    - Use fast-check arbitraries to generate edge-case strings

  - [x] 1.5 Implement permission utility functions in `src/utils/permissions.ts`
    - `canCompleteQuest(quest: Quest): boolean` — returns true only if quest.status === 'active'
    - `canApproveReject(viewerId: string, quest: Quest, viewerIsScrumMaster: boolean): boolean` — true if quest.status === 'pending' AND viewerIsScrumMaster AND viewerId !== quest.proposerId
    - `canModifyPendingTask(quest: Quest): boolean` — returns false for pending quests
    - `shouldShowRoleSwitcher(member: Member): boolean` — true if member.roles.length > 1
    - _Requirements: 2.4, 3.1, 3.5, 4.3, 10.1, 10.2_

  - [ ]* 1.6 Write property tests for permission utilities
    - **Property 4: Pending/rejected quest completion prevention**
    - **Property 5: Pending task modification lockdown**
    - **Property 7: Approval/rejection button visibility**
    - **Property 19: Role switcher visibility**
    - **Validates: Requirements 2.4, 3.1, 3.5, 4.3, 10.1, 10.2**

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement Lark API service layer
  - [x] 3.1 Implement `src/services/lark-api.service.ts` — generic Lark Base API wrapper
    - Implement `listRecords(tableId, filter?, sort?)` using Lark Bitable API endpoint
    - Implement `getRecord(tableId, recordId)`
    - Implement `createRecord(tableId, fields)`
    - Implement `updateRecord(tableId, recordId, fields)`
    - Implement retry logic: up to 3 attempts, 10-second timeout per attempt, linear retry
    - Handle token management: fetch `tenant_access_token` using app_id + app_secret
    - Store table IDs as configuration constants
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x] 3.2 Implement `src/services/lark-bot.service.ts` — Lark Bot messaging wrapper
    - Implement `sendMessage(recipientOpenId, message)` using Lark IM v1 API
    - Ensure non-blocking: failures do not prevent triggering action from completing
    - Return `SendResult` with success/failure status and error details
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 3.3 Write integration tests for Lark API and Bot services
    - Mock fetch/axios to test correct endpoint construction, headers, and payloads
    - Test retry behavior: verify 3 retries on failure
    - Test timeout behavior: verify 10-second timeout per attempt
    - Test error handling: verify graceful degradation on API failures
    - Test bot message delivery and SendResult shape
    - _Requirements: 8.6, 8.7, 9.4_

- [x] 4. Implement domain services — Member and Quest
  - [x] 4.1 Implement `src/services/member.service.ts`
    - `getCurrentMember(openId)` — resolve current user from Members table using Lark open_id
    - `getMemberById(memberId)` — fetch a specific member record
    - `getScrumMasterForDeveloper(developerId)` — resolve assigned Scrum Master from scrum_master_id field
    - Map raw Lark records to `Member` domain objects with proper role parsing
    - _Requirements: 1.1, 2.6, 8.2_

  - [x] 4.2 Implement `src/services/quest.service.ts`
    - `getQuestsForRole(role, memberId)` — fetch quests filtered by target_role, categorize into CategorizedQuests (onboarding/daily/milestones for agents; sprint/pending for developers)
    - `proposeTask(title, description, developerId)` — validate inputs, create quest with status='pending' and proposer_id set
    - `approveTask(questId, scrumMasterId)` — update quest status from 'pending' to 'active'
    - `rejectTask(questId, scrumMasterId, reason)` — validate rejection reason, update quest status from 'pending' to 'rejected'
    - `completeQuest(questId, memberId)` — check status is 'active', check no duplicate completion exists, write Quest_Completion record
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.4, 3.2, 3.3, 4.1, 4.2, 4.3, 4.5, 11.3_

  - [ ]* 4.3 Write property tests for quest service logic
    - **Property 1: Role-based quest filtering**
    - **Property 3: Task proposal record integrity**
    - **Property 8: Approve state transition**
    - **Property 9: Reject state transition**
    - **Property 10: Duplicate completion prevention**
    - **Validates: Requirements 1.1, 2.1, 3.2, 3.3, 4.5**
    - Mock lark-api.service for isolated property testing

  - [ ]* 4.4 Write unit tests for quest service edge cases
    - Test completing a quest with pending status returns error: "This task requires Scrum Master approval before completion"
    - Test completing a quest with rejected status returns error: "This task has been rejected and cannot be completed"
    - Test propose task with empty title is rejected
    - Test propose task with title at exactly 100 chars is accepted
    - Test propose task with title at 101 chars is rejected
    - _Requirements: 4.3, 11.3, 11.4, 11.5_

- [x] 5. Implement domain services — Badge and Leaderboard
  - [x] 5.1 Implement `src/services/badge.service.ts`
    - `evaluateBadgeUnlocks(memberId, role)` — count qualifying completions (active-only for developers), compare against badge thresholds, award all qualifying badges, prevent duplicates
    - `getBadgeCollection(memberId, role)` — fetch all role badges, join with Badge_Earned for earned state, compute progress fraction
    - Filter out completions linked to non-active quests for developer calculations
    - Handle multi-badge simultaneous unlock in a single evaluation pass
    - Return list of newly awarded badges for UI feedback
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 7.1, 7.2, 7.3_

  - [x] 5.2 Implement `src/services/leaderboard.service.ts`
    - `getLeaderboard(role)` — fetch all members with given role, count their earned badges (active-only completions for developers), sort by badge count descending with alphabetical display_name tie-breaker, assign ranks
    - Include all members with the role even if they have zero badges
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 11.1, 11.2_

  - [ ]* 5.3 Write property tests for badge service
    - **Property 11: Badge threshold evaluation**
    - **Property 12: Active-only completions for developer calculations**
    - **Property 13: Duplicate badge prevention**
    - **Property 14: Multi-badge simultaneous unlock**
    - **Property 20: Retroactive status change exclusion**
    - **Validates: Requirements 5.1, 5.4, 5.5, 5.6, 11.1, 11.2, 11.6**

  - [ ]* 5.4 Write property tests for leaderboard service
    - **Property 15: Leaderboard ranking order**
    - **Property 16: Leaderboard role separation**
    - **Property 17: Leaderboard completeness**
    - **Validates: Requirements 6.2, 6.3, 6.5**

  - [ ]* 5.5 Write property test for badge collection correctness
    - **Property 18: Badge collection correctness**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 6. Implement notification service
  - [x] 6.1 Implement `src/services/notification.service.ts`
    - `notifyTaskProposal(quest, developer, scrumMaster)` — send bot message to Scrum Master with task title and proposer name
    - `notifyApproval(quest, scrumMaster, developer)` — send approval notification to Developer with task title and SM name
    - `notifyRejection(quest, scrumMaster, developer, reason)` — send rejection notification with task title, SM name, and reason
    - Handle delivery failures gracefully: return warning, do not block triggering action
    - Handle unresolvable recipients: treat as delivery failure
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 6.2 Write property test for Scrum Master assignment resolution
    - **Property 6: Scrum Master assignment resolution**
    - **Validates: Requirements 2.6**
    - Test that notification target resolution always returns the correct scrum_master_id

- [x] 7. Checkpoint - Ensure all service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Zustand store
  - [x] 8.1 Implement `src/store/app.store.ts` — global application state and actions
    - Define state: `currentMember`, `selectedRole`, `quests`, `questsLoading`, `leaderboard`, `leaderboardLoading`, `badgeCollection`, `badgesLoading`
    - Implement `initializeApp(openId)` — fetch current member, set default role from primary_role, trigger initial data fetch
    - Implement `setRole(role)` — update selectedRole, persist to sessionStorage, trigger data refresh for quests + leaderboard + badges
    - Implement `fetchQuests()` — call quest.service.getQuestsForRole, update state
    - Implement `completeQuest(questId)` — call quest.service.completeQuest, then badge.service.evaluateBadgeUnlocks, refresh quests and leaderboard, show completion animation feedback
    - Implement `proposeTask(title, description)` — call quest.service.proposeTask, then notification.service.notifyTaskProposal via getScrumMasterForDeveloper, refresh quests
    - Implement `approveTask(questId)` — call quest.service.approveTask, then notification.service.notifyApproval, refresh quests
    - Implement `rejectTask(questId, reason)` — call quest.service.rejectTask, then notification.service.notifyRejection, refresh quests
    - Implement `fetchLeaderboard()` — call leaderboard.service.getLeaderboard with selectedRole
    - Implement `fetchBadgeCollection()` — call badge.service.getBadgeCollection with selectedRole
    - Handle loading states per section independently
    - On notification failure: display non-blocking warning toast but allow action to succeed
    - _Requirements: 1.1, 1.4, 1.6, 2.3, 2.5, 3.4, 3.6, 4.4, 4.6, 6.4, 10.3, 10.4, 10.5_

- [x] 9. Implement shared and layout UI components
  - [x] 9.1 Implement shared components in `src/components/shared/`
    - `LoadingIndicator` — spinner shown during API operations, used per-section
    - `ErrorBanner` — error display shown on API failure after retries, retains last successful data context
    - `ConfirmationToast` — success/warning messages for completed actions (quest completion, task approval, rejection, proposal)
    - `ValidationError` — inline form validation feedback for title/description/reason fields
    - `CompletionAnimation` — visual feedback animation on quest completion
    - _Requirements: 8.6, 8.7, 4.6, 2.5, 3.6_

  - [x] 9.2 Implement layout components in `src/components/layout/`
    - `AppShell` — top-level layout with NavigationBar and RoleSwitcher, wraps page content
    - `NavigationBar` — links to quest board (`/quests`), leaderboard (`/leaderboard`), badge collection (`/badges`)
    - `RoleSwitcher` — toggle between Agent/Developer views; hidden if user has single role; persists selection in sessionStorage; triggers store `setRole()` on change
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 10. Implement Quest Board UI
  - [ ] 10.1 Implement quest board components in `src/components/quest/`
    - `QuestCard` — individual quest with completion checkbox; disabled for pending/rejected quests with tooltip explaining restriction
    - `QuestCategory` — category container with heading (onboarding, daily, milestone, sprint, pending)
    - `ProposeTaskForm` — developer task proposal form with title (required, max 100 chars) and description (optional, max 500 chars) fields with real-time validation
    - `PendingTaskCard` — task card with approve/reject buttons visible only to assigned Scrum Master, hidden from proposer; reject triggers reason prompt modal
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.4, 3.1, 3.5, 4.3, 11.4, 11.5_

  - [ ] 10.2 Implement `src/pages/QuestBoardPage.tsx`
    - Connect to Zustand store for quests data, loading state, and current member
    - Render categorized quests based on selected role
    - Agent view: onboarding, daily, milestones categories
    - Developer view: approved sprint tasks, pending tasks section with ProposeTaskForm
    - Show empty state with category headings and "no quests available" message when applicable
    - Handle quest completion: dispatch store action, show CompletionAnimation
    - Handle task proposal: dispatch store action, show ConfirmationToast on success
    - Handle approval: dispatch store action, show ConfirmationToast
    - Handle rejection: show reason prompt modal, cancel if dismissed without text, dispatch store action with reason, show ConfirmationToast
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.7, 4.6_

- [ ] 11. Implement Leaderboard and Badge Collection UI
  - [ ] 11.1 Implement leaderboard components in `src/components/leaderboard/`
    - `LeaderboardTable` — ranked table with display name, rank position, and badge count columns
    - `LeaderboardRow` — single member row with visual highlight if current user
    - _Requirements: 6.1, 6.6_

  - [ ] 11.2 Implement `src/pages/LeaderboardPage.tsx`
    - Connect to Zustand store for leaderboard data, loading state, and selected role
    - Display role-separated leaderboard (Agent or Developer based on selected role)
    - Highlight current user's row distinctly
    - Show LoadingIndicator during fetch
    - Trigger `fetchLeaderboard()` on mount and on role change
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ] 11.3 Implement badge components in `src/components/badge/`
    - `BadgeGrid` — grid layout of all role-specific badges
    - `BadgeCard` — earned badges in full color with earned label; locked badges in grayscale with locked label; unlock condition text below locked badges
    - `ProgressBar` — fraction of badges earned with numeric label (e.g., "3 / 6")
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 11.4 Implement `src/pages/BadgeCollectionPage.tsx`
    - Connect to Zustand store for badge collection data, loading state, and selected role
    - Display BadgeGrid with earned/locked states
    - Show ProgressBar with earned count / total count
    - Show encouragement message when zero badges earned
    - Show LoadingIndicator during fetch
    - Trigger `fetchBadgeCollection()` on mount and on role change
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 12. Wire routing and app initialization
  - [ ] 12.1 Implement `src/App.tsx` with React Router configuration
    - Define routes: `/quests` (QuestBoardPage), `/leaderboard` (LeaderboardPage), `/badges` (BadgeCollectionPage)
    - Default route redirects to `/quests`
    - Wrap routes in AppShell layout component
    - Call `initializeApp()` store action on mount
    - Show full-page LoadingIndicator while member is resolving
    - _Requirements: 1.1, 1.6, 10.3_

  - [ ] 12.2 Update `src/main.tsx` entry point
    - Mount React app with BrowserRouter
    - Import global styles from `src/index.css`
    - _Requirements: 1.1_

- [ ] 13. Checkpoint - Ensure application builds and all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 14. Write integration tests for notification and end-to-end flows
  - [ ]* 14.1 Write integration tests for notification service with mocked bot
    - Test correct message construction for task proposal notification (includes task title and proposer name)
    - Test correct message construction for approval notification (includes task title and SM name)
    - Test correct message construction for rejection notification (includes task title, SM name, and reason)
    - Test failure handling: warning toast shown, action completes successfully
    - Test unresolvable recipient: treated as delivery failure
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 14.2 Write integration tests for complete quest-to-badge flow
    - Test quest completion triggers badge evaluation
    - Test badge awarded when threshold met
    - Test leaderboard updates after badge award
    - Test failed badge write retains quest completion as valid and shows warning
    - Test re-evaluation on next completion event after badge write failure
    - _Requirements: 4.4, 5.1, 5.7, 6.4_

- [ ] 15. Final checkpoint - Ensure all tests pass and application builds cleanly
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (20 properties total)
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all implementations use TypeScript with strict mode
- All API calls go through the service layer; components never call APIs directly
- Zustand store bridges services and UI; components dispatch store actions
- No local data persistence beyond browser session (sessionStorage for role selection only)
- Tasks 1-3 are already implemented: project structure, types, validation utils, permission utils, Lark API service, and Lark Bot service are complete

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.4", "1.6", "3.3"] },
    { "id": 1, "tasks": ["4.1"] },
    { "id": 2, "tasks": ["4.2"] },
    { "id": 3, "tasks": ["4.3", "4.4", "5.1", "5.2", "6.1"] },
    { "id": 4, "tasks": ["5.3", "5.4", "5.5", "6.2"] },
    { "id": 5, "tasks": ["8.1"] },
    { "id": 6, "tasks": ["9.1", "9.2"] },
    { "id": 7, "tasks": ["10.1", "11.1", "11.3"] },
    { "id": 8, "tasks": ["10.2", "11.2", "11.4"] },
    { "id": 9, "tasks": ["12.1", "12.2"] },
    { "id": 10, "tasks": ["14.1", "14.2"] }
  ]
}
```
