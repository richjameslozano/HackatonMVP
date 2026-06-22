# Implementation Plan: Project Task Management

## Overview

This plan implements project-scoped task management by extending the existing `project.service.ts`, creating a new `project.store.ts`, extending validation and permission utilities, and building UI components for project selection, renaming, and Scrum Master assignment. Each task builds incrementally on the previous, ending with full integration.

## Tasks

- [x] 1. Extend core interfaces, config, and validation utilities
  - [x] 1.1 Add `scrum_master_id` field to Quest type and extend project service interfaces
    - Add `scrumMasterId` field to the `Quest` interface in `src/types/index.ts` (already exists as `string | null`)
    - Verify the `Project` interface already has `projectId`, `name`, `description`
    - Add `ValidationResult` re-export from `src/utils/validation.ts` if not already accessible
    - _Requirements: 3.1, 4.7_

  - [x] 1.2 Implement project name validation functions in `src/utils/validation.ts`
    - Add `validateProjectName(name: string): ValidationResult` — trims input, rejects empty/whitespace-only, rejects >100 chars after trim
    - Add `validateProjectNameUniqueness(name: string, existingNames: string[], currentProjectId?: string): ValidationResult` — case-insensitive comparison after trim
    - Add `validateSmTaskCreation(title: string, assigneeId: string, projectId: string): ValidationResult` — title 1–200 chars (not whitespace-only), assignee required, project required
    - _Requirements: 2.4, 2.5, 2.7, 3.8_

  - [ ]* 1.3 Write property tests for project name validation (Property 4)
    - **Property 4: Project name validation rejects invalid inputs**
    - **Validates: Requirements 2.4, 2.5**
    - Test file: `src/utils/__tests__/validation.test.ts`
    - Use `fast-check` with `{ numRuns: 100 }` to generate strings that are empty after trim or exceed 100 chars

  - [ ]* 1.4 Write property tests for duplicate name detection (Property 5)
    - **Property 5: Duplicate project names rejected case-insensitively**
    - **Validates: Requirements 2.7**
    - Test file: `src/utils/__tests__/validation.test.ts`
    - Use `fast-check` to generate name pairs that match case-insensitively

  - [ ]* 1.5 Write property tests for SM task creation validation (Property 12)
    - **Property 12: SM task creation validation enforces required fields**
    - **Validates: Requirements 3.8**
    - Test file: `src/utils/__tests__/validation.test.ts`
    - Use `fast-check` to generate invalid title/assignee/project combinations

  - [x] 1.6 Extend permission functions in `src/utils/permissions.ts`
    - Add `canRenameProject(member: Member): boolean` — returns true only if member has admin role
    - Add `canAssignScrumMaster(member: Member): boolean` — returns true only if member has admin role
    - Add `isScrumMasterAssignedToProject(scrumMasterId: string, projectTaskMap: Map<string, string[]>): boolean` — checks if SM ID appears in the project's SM list
    - _Requirements: 2.2, 3.2, 4.3_

  - [ ]* 1.7 Write property tests for non-admin denial (Property 7)
    - **Property 7: Non-admin users are denied admin-only operations**
    - **Validates: Requirements 2.2, 4.3**
    - Test file: `src/utils/__tests__/permissions.test.ts`
    - Use `fast-check` to generate members without admin role, assert `canRenameProject` and `canAssignScrumMaster` return false

- [x] 2. Implement project service functions for developer and SM flows
  - [x] 2.1 Implement `getProjectsForDeveloper` in `src/services/project.service.ts`
    - Query Members table to get the developer's `projectId`, then filter project list to matching projects
    - Sort results alphabetically by name (case-insensitive)
    - Cap results at 50 entries
    - _Requirements: 1.1, 1.5_

  - [ ]* 2.2 Write property test for developer project list filtering (Property 1)
    - **Property 1: Developer project list contains only member projects, sorted alphabetically, capped at 50**
    - **Validates: Requirements 1.1, 1.5**
    - Test file: `src/services/__tests__/project.service.test.ts`
    - Use `fast-check` to generate project sets and member records, verify filtering, sorting, and cap

  - [x] 2.3 Implement `getAssignedProjectsForScrumMaster` in `src/services/project.service.ts`
    - Query Quests table for tasks where `scrum_master_id` matches the SM's member ID
    - Extract unique `project_ids` from matching tasks
    - Resolve project details from the Projects table
    - _Requirements: 3.3, 3.7_

  - [ ]* 2.4 Write property test for SM project derivation (Property 10)
    - **Property 10: SM assigned projects derived correctly from task data**
    - **Validates: Requirements 3.3, 3.7, 4.4**
    - Test file: `src/services/__tests__/project.service.test.ts`
    - Use `fast-check` to generate task sets with varying `scrum_master_id` values, verify derived set

  - [ ]* 2.5 Write property test for last task removal revoking access (Property 11)
    - **Property 11: Last task removal revokes SM project access**
    - **Validates: Requirements 3.4**
    - Test file: `src/services/__tests__/project.service.test.ts`
    - Use `fast-check` to generate an SM with exactly one task in a project, verify removal revokes access

  - [x] 2.6 Implement `renameProject` in `src/services/project.service.ts`
    - Trim whitespace from name input
    - Validate using `validateProjectName` and `validateProjectNameUniqueness`
    - Call `updateRecord` on the Projects table with only the `name` field
    - Return updated Project object
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 2.7 Write property test for project rename trimming (Property 3)
    - **Property 3: Project rename trims whitespace and updates name**
    - **Validates: Requirements 2.1**
    - Test file: `src/services/__tests__/project.service.test.ts`
    - Use `fast-check` to generate valid names with leading/trailing whitespace, verify trim behavior

  - [x] 2.8 Implement `assignScrumMasterToTask` in `src/services/project.service.ts`
    - Validate caller has admin role (throw authorization error if not)
    - Validate target member has Scrum Master role (query members, check roles)
    - Call `updateRecord` on Quests table with `scrum_master_id` set to the SM's member ID
    - _Requirements: 4.2, 4.3, 4.7_

  - [x] 2.9 Implement `listScrumMasters` in `src/services/project.service.ts`
    - Query Members table and filter for members whose roles include Scrum Master
    - Return list sorted alphabetically by display name
    - _Requirements: 4.1, 4.8_

  - [ ]* 2.10 Write property test for SM assignment role enforcement (Property 13)
    - **Property 13: SM assignment enforces role constraint and single-assignment**
    - **Validates: Requirements 4.2, 4.7**
    - Test file: `src/services/__tests__/project.service.test.ts`
    - Use `fast-check` to generate members with/without SM role, verify assignment succeeds only for SM-role members

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement project store with optimistic updates
  - [x] 4.1 Create `src/store/project.store.ts` with Zustand
    - Define `ProjectState` interface with `projects`, `developerProjects`, `smAssignedProjects`, `scrumMasters`, `projectsLoading`
    - Implement `fetchProjects`, `fetchDeveloperProjects`, `fetchSmAssignedProjects`, `fetchScrumMasters` actions calling project service
    - _Requirements: 1.1, 3.3, 4.1_

  - [x] 4.2 Implement `renameProject` store action with optimistic rollback
    - Optimistically update project name in local state
    - Call `renameProject` service function
    - On failure: revert to previous name, set error state
    - _Requirements: 2.1, 2.8_

  - [x] 4.3 Implement `assignScrumMasterToTask` store action with optimistic rollback
    - Optimistically update SM assignment in local state
    - Call `assignScrumMasterToTask` service function
    - On failure: revert to previous SM assignment, set error state
    - _Requirements: 4.5, 4.6_

  - [ ]* 4.4 Write unit tests for project store actions
    - Test optimistic update and rollback for rename (mock service failure)
    - Test optimistic update and rollback for SM assignment (mock service failure)
    - Test fetch actions populate correct state slices
    - Test file: `src/store/__tests__/project.store.test.ts`
    - _Requirements: 2.8, 4.6_

- [x] 5. Implement task proposal and SM task creation flows
  - [x] 5.1 Extend `src/services/quest.service.ts` for project-scoped task proposal
    - Ensure `proposeTask` sets `project_ids` to the selected project ID and `status` to "pending"
    - Add validation: block submission if no project selected
    - Handle Lark sync failure: do not add task to local list, show error
    - _Requirements: 1.3, 1.4, 1.6, 1.7_

  - [ ]* 5.2 Write property test for task proposal output shape (Property 2)
    - **Property 2: Task proposal associates correct project and sets pending status**
    - **Validates: Requirements 1.3**
    - Test file: `src/services/__tests__/quest.service.test.ts`
    - Use `fast-check` to generate valid project IDs, verify output has correct `project_ids` and `status: "pending"`

  - [x] 5.3 Implement SM task creation with authorization check in `src/services/quest.service.ts`
    - Add `createSmTask` function that verifies SM is assigned to the target project
    - Set task `status` to "active" and `assignment_type` to "assigned"
    - Validate required fields using `validateSmTaskCreation`
    - Handle Lark sync failure: do not add task, show error
    - _Requirements: 3.1, 3.2, 3.5, 3.6, 3.8_

  - [ ]* 5.4 Write property tests for SM task creation output (Property 8) and denial (Property 9)
    - **Property 8: SM task creation in assigned project produces correct output**
    - **Property 9: SM denied task creation in unassigned project**
    - **Validates: Requirements 3.1, 3.2**
    - Test file: `src/services/__tests__/quest.service.test.ts`
    - Use `fast-check` to generate SM-project combinations, verify authorization and output shape

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Build UI components
  - [x] 7.1 Create `ProjectSelector` component at `src/components/project/ProjectSelector.tsx`
    - Dropdown showing filtered project list (developer: member projects; SM: assigned projects)
    - Alphabetically sorted, max 50 entries for developer view
    - Show "No projects available" message and disable submission when list is empty
    - Show validation error when no project selected on submit attempt
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 3.3_

  - [x] 7.2 Create `ProjectRenameForm` component at `src/components/project/ProjectRenameForm.tsx`
    - Inline rename form visible only to admins
    - Validate project name on submit (empty, length, uniqueness)
    - Show inline validation errors below input
    - Trigger store `renameProject` action on valid submission
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 2.7_

  - [x] 7.3 Create `ScrumMasterAssigner` component at `src/components/project/ScrumMasterAssigner.tsx`
    - Selection control listing all SM-role users, pre-selected to current SM
    - Disabled with message when no SM-role users exist
    - Only rendered for admin users (permission check)
    - Triggers store `assignScrumMasterToTask` on selection change
    - _Requirements: 4.1, 4.2, 4.3, 4.8_

  - [x] 7.4 Create `ProjectList` component at `src/components/project/ProjectList.tsx`
    - Admin view listing all projects with rename capability
    - Integrates `ProjectRenameForm` for each project row
    - Shows project name and task count
    - _Requirements: 2.1, 2.3_

  - [ ]* 7.5 Write unit tests for UI components
    - Test `ProjectSelector` renders only member projects for developer
    - Test `ProjectSelector` shows empty state message when no projects
    - Test `ProjectRenameForm` displays validation errors for invalid names
    - Test `ScrumMasterAssigner` is disabled when no SMs available
    - Test file: `src/components/project/__tests__/ProjectSelector.test.tsx`
    - _Requirements: 1.2, 2.4, 4.8_

- [x] 8. Wire components into pages and integrate flows
  - [x] 8.1 Integrate `ProjectSelector` into the task proposal form
    - Add `ProjectSelector` to the existing `ProposeTaskForm` component
    - Connect to `useProjectStore` for developer project list
    - Block form submission if no project selected
    - _Requirements: 1.1, 1.3, 1.4_

  - [x] 8.2 Integrate `ProjectSelector` into SM task creation flow
    - Add project selection to the SM task creation UI
    - Filter to SM's assigned projects only
    - Block creation if SM has no assigned projects
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 8.3 Integrate `ScrumMasterAssigner` into task detail view
    - Add SM assignment control to task details (visible to admins only)
    - Pre-select current SM if assigned
    - Connect to store action for assignment changes
    - _Requirements: 4.1, 4.2, 4.5_

  - [x] 8.4 Integrate `ProjectList` with `ProjectRenameForm` into admin view
    - Add project management section to the admin page
    - Connect to `useProjectStore` for project data and rename action
    - Ensure rename errors trigger rollback and show error banner
    - _Requirements: 2.1, 2.6, 2.8_

  - [ ]* 8.5 Write integration tests for end-to-end flows
    - Test developer task proposal flow with project selection and Lark sync mock
    - Test admin rename flow with optimistic rollback on failure
    - Test SM assignment flow with Lark sync failure rollback
    - Test SM task creation authorization flow
    - Test file: `src/services/__tests__/project.service.test.ts`
    - _Requirements: 1.3, 1.7, 2.8, 3.6, 4.6_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `project.service.ts` already has `listProjects`, `getProject`, `createProject`, and `getProjectQuestCount` — new functions extend this file
- The `Project` interface and `projects` table ID already exist in the codebase
- All Lark Base calls route through `lark-api.service.ts` — never call endpoints directly

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.6"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5", "1.7", "2.1", "2.3", "2.6", "2.8", "2.9"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.5", "2.7", "2.10"] },
    { "id": 3, "tasks": ["4.1", "5.1", "5.3"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4", "5.2", "5.4"] },
    { "id": 5, "tasks": ["7.1", "7.2", "7.3", "7.4"] },
    { "id": 6, "tasks": ["7.5", "8.1", "8.2", "8.3", "8.4"] },
    { "id": 7, "tasks": ["8.5"] }
  ]
}
```
