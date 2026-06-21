# Implementation Plan: Coin Store System

## Overview

This plan introduces a coin-based reward layer on top of the existing badge system. Implementation proceeds from data model extensions and service layer, through state management, to UI components and routing. Each task builds incrementally so the system is testable at every stage.

## Tasks

- [x] 1. Extend types, config, and utility foundations
  - [x] 1.1 Add new types and extend existing interfaces in `src/types/index.ts`
    - Add `Difficulty` type (`'easy' | 'medium' | 'hard'`)
    - Add `CoinConfig` interface with `easy_coins`, `medium_coins`, `hard_coins` (number fields)
    - Add `Project` interface with `projectId`, `name`, `description`
    - Extend `Quest` interface with `difficulty: Difficulty | null` and `projectIds: string[]`
    - Extend `QuestCompletion` interface with `coinsAwarded: number`
    - _Requirements: 1.1, 8.1, 8.2, 8.3, 8.4_

  - [x] 1.2 Extend `src/services/config.ts` with new table IDs
    - Add `coinConfig` and `projects` entries to `TABLE_IDS`
    - _Requirements: 8.1, 8.2_

  - [x] 1.3 Add validation functions to `src/utils/validation.ts`
    - Implement `validateCoinValue(value)` — positive integer in [1, 10000]
    - Implement `validateDifficulty(value)` — exactly `'easy'`, `'medium'`, or `'hard'`
    - Implement `validateAdminTaskTitle(title)` — 1–100 chars, not whitespace-only
    - Implement `validateAdminTaskDescription(description)` — 1–500 chars, not empty
    - Implement `validateProjectSelection(projectIds)` — at least one project selected
    - _Requirements: 1.1, 1.4, 3.3, 3.5, 5.1, 5.5, 5.7_

  - [x] 1.4 Add formatting utilities in `src/utils/formatting.ts`
    - Implement `truncateDescription(text, maxLength=200)` — truncates with ellipsis
    - Implement `formatCoinBalance(balance)` — locale-aware thousands separators
    - _Requirements: 4.2, 7.3_

  - [x] 1.5 Add admin permission check in `src/utils/permissions.ts`
    - Implement `isAdmin(member)` — returns true if member has admin role
    - _Requirements: 4.4, 4.5_

  - [x] 1.6 Add project ID serialization helpers in `src/utils/project-ids.ts`
    - Implement `serializeProjectIds(ids: string[]): string` — joins with commas
    - Implement `deserializeProjectIds(raw: string): string[]` — splits on commas, trims
    - _Requirements: 5.6, 8.3_

  - [x] 1.7 Write property tests for validation functions
    - **Property 1: Difficulty validation accepts only valid values**
    - **Property 5: Coin value validation range**
    - **Property 11: Admin task form field validation**
    - **Validates: Requirements 1.1, 1.4, 3.3, 3.5, 5.5, 5.7**

  - [x] 1.8 Write property tests for formatting utilities
    - **Property 7: Description truncation at 200 characters**
    - **Property 12: Coin balance formatting**
    - **Validates: Requirements 4.2, 7.3**

  - [x] 1.9 Write property tests for permissions and project-id helpers
    - **Property 8: Admin role access control**
    - **Property 10: Project IDs serialization round-trip**
    - **Validates: Requirements 4.4, 4.5, 5.6**

- [x] 2. Implement coin and project services
  - [x] 2.1 Create `src/services/coin.service.ts`
    - Implement `getCoinConfig()` — fetches from Coin_Config table, falls back to defaults (1, 3, 5)
    - Implement `updateCoinConfig(config)` — persists to Lark Base, throws on failure
    - Implement `calculateCoinsForDifficulty(difficulty)` — reads config, maps difficulty to coin value, null/empty treated as easy
    - Implement `getCoinBalance(memberId)` — sums `coins_awarded` across completions for member
    - Implement `awardCoinsForCompletion(questId, difficulty)` — calculates and returns coin amount
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 3.1, 3.4, 3.7_

  - [x] 2.2 Create `src/services/project.service.ts`
    - Implement `listProjects()` — fetches from Projects table, sorts alphabetically by name
    - Implement `getProject(projectId)` — fetches single project by record ID
    - Implement `createProject(name, description)` — creates record in Lark Base
    - Implement `getProjectQuestCount(projectId)` — counts quests with matching project_ids
    - _Requirements: 4.1, 4.2, 4.6, 4.7_

  - [x] 2.3 Extend `src/services/quest.service.ts` for coin integration
    - Update `completeQuest` to fetch quest difficulty, call `awardCoinsForCompletion`, and persist `coins_awarded` in the completion record
    - If `coins_awarded` persistence fails, do NOT mark quest as completed — throw error
    - Add optional `difficulty` parameter to `proposeTask` for developer proposals
    - Add admin task creation function `createAdminTask(title, description, difficulty, targetRole, projectIds)`
    - _Requirements: 2.1, 2.3, 2.6, 5.4, 6.2_

  - [x] 2.4 Write property tests for coin service
    - **Property 2: Coin calculation with config fallback**
    - **Property 3: Coin balance is non-negative sum of coins_awarded**
    - **Validates: Requirements 1.2, 2.1, 2.2, 2.4, 3.4, 3.7, 8.4**

  - [x] 2.5 Write property test for completion record coins
    - **Property 4: Completion record includes correct coins_awarded**
    - **Validates: Requirements 2.3**

  - [x] 2.6 Write property tests for project service
    - **Property 6: Project list sorted alphabetically**
    - **Property 9: "All projects" resolves to complete set**
    - **Validates: Requirements 4.1, 5.3**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement coin store and extend app store
  - [x] 4.1 Create `src/store/coin.store.ts`
    - Implement Zustand store with `balance`, `isLoading`, `error`, `lastFetchedAt` state
    - Implement `fetchBalance(memberId)` action calling `getCoinBalance`
    - Implement `refreshBalance(memberId)` action for post-completion updates
    - Implement `setBalance(balance)` for direct updates
    - _Requirements: 7.1, 7.2, 7.4, 7.5_

  - [x] 4.2 Extend `src/store/app.store.ts` to trigger coin balance refresh
    - After successful `completeQuest`, call `useCoinStore.getState().refreshBalance(memberId)`
    - _Requirements: 7.2_

- [x] 5. Implement UI components
  - [x] 5.1 Create `src/components/shared/DifficultySelector.tsx`
    - Three radio options: easy, medium, hard
    - Fetch and display coin preview next to each option from CoinConfig
    - Fall back to default values (1, 3, 5) if config fetch fails
    - _Requirements: 6.1, 6.4, 6.5_

  - [x] 5.2 Create `src/components/layout/CoinBalance.tsx`
    - Renders coin icon + formatted balance using `formatCoinBalance`
    - Shows "--" placeholder on fetch failure
    - Subscribes to `useCoinStore` for balance state
    - _Requirements: 7.1, 7.3, 7.4_

  - [x] 5.3 Integrate `CoinBalance` into the navigation/top bar area
    - Add `CoinBalance` component to existing `NavigationBar` or `TopBar` in layout components
    - Trigger `fetchBalance` on mount with current member ID
    - _Requirements: 7.1, 7.5_

  - [x] 5.4 Extend `ProposeTaskForm` with difficulty selection
    - Add `DifficultySelector` component to the existing propose task form
    - Include selected difficulty in the quest proposal payload
    - Default to `'easy'` when no selection is made
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 5.5 Write unit tests for DifficultySelector and CoinBalance components
    - Test DifficultySelector renders all options with coin previews
    - Test CoinBalance shows "--" on error, formatted value on success
    - _Requirements: 6.1, 6.4, 7.3, 7.4_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Admin View page and components
  - [x] 7.1 Create `src/components/auth/AdminGuard.tsx`
    - Check if current member has admin role using `isAdmin(member)`
    - Redirect non-admins to `/quests`
    - Fail-closed: redirect on role check failure
    - _Requirements: 4.4, 4.5_

  - [x] 7.2 Create `src/components/admin/CoinConfigPanel.tsx`
    - Display current coin values for easy/medium/hard in editable number inputs
    - Validate each field using `validateCoinValue`
    - Show success toast on save, error banner on failure
    - Retain form values on save failure
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_

  - [x] 7.3 Create `src/components/admin/ProjectList.tsx`
    - Fetch and display all projects sorted alphabetically
    - Show name, truncated description (200 chars), quest count per project
    - Show empty-state message when no projects exist
    - Show error + retry button on fetch failure
    - _Requirements: 4.1, 4.2, 4.6, 4.7_

  - [x] 7.4 Create `src/components/admin/ProjectDetail.tsx`
    - List all quests for the selected project
    - Show title, status badge, assignment type, difficulty label, creation date
    - Back navigation to project list
    - _Requirements: 4.3_

  - [x] 7.5 Create `src/components/admin/AdminTaskForm.tsx`
    - Fields: title, description, difficulty (via DifficultySelector), target role (agent/developer), project assignment (multi-select or "all")
    - Validate all fields using validation functions before submission
    - Create quest via `createAdminTask` with status `active` and selected difficulty
    - Show success/error feedback, preserve form data on failure
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 5.8_

  - [x] 7.6 Create `src/pages/AdminPage.tsx`
    - Tab layout: Projects | Create Task | Coin Settings
    - Compose `ProjectList`, `ProjectDetail`, `AdminTaskForm`, `CoinConfigPanel`
    - _Requirements: 3.1, 4.1, 5.1_

  - [x] 7.7 Register admin route in `src/App.tsx`
    - Add `/admin` route wrapped with `AdminGuard` inside the protected route group
    - Import and render `AdminPage`
    - _Requirements: 4.4, 4.5_

  - [x] 7.8 Write unit tests for Admin View components
    - Test CoinConfigPanel save success/failure flows
    - Test ProjectList empty state and error state
    - Test AdminTaskForm validation and submission
    - Test AdminGuard redirects non-admins
    - _Requirements: 3.2, 3.6, 4.5, 4.6, 4.7, 5.5, 5.8_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all implementations follow existing project patterns (Zustand stores, named exports, `lark-api.service.ts` for CRUD)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5", "1.6"] },
    { "id": 2, "tasks": ["1.7", "1.8", "1.9", "2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3", "2.4", "2.5", "2.6"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["4.2", "5.1", "5.2"] },
    { "id": 6, "tasks": ["5.3", "5.4", "5.5"] },
    { "id": 7, "tasks": ["7.1", "7.2", "7.3"] },
    { "id": 8, "tasks": ["7.4", "7.5", "7.6"] },
    { "id": 9, "tasks": ["7.7", "7.8"] }
  ]
}
```
