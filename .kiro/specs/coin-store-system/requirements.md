# Requirements Document

## Introduction

The Coin Store System introduces coins as a new reward layer in the SP Madrid Gamified Tracker. Each quest/task has a difficulty rating (easy, medium, hard) that determines how many coins a member earns upon completion. Coin values per difficulty are configurable by admins. The feature also introduces an Admin View — a new protected page where admins can manage projects, create tasks scoped to one or more projects, and configure coin reward settings.

## Glossary

- **Coin_Service**: The service module responsible for calculating, awarding, and querying coin balances for members based on quest completions and difficulty ratings.
- **Admin_View**: A new protected page accessible only to users with the Admin role, providing project management, task creation, and coin configuration capabilities.
- **Difficulty_Rating**: A classification assigned to each quest indicating its complexity. Valid values: `easy`, `medium`, `hard`.
- **Coin_Config**: A persisted configuration record in Lark Base storing the coin reward values for each difficulty level.
- **Project**: A grouping entity for quests/tasks. Quests belong to one or more projects.
- **Admin**: A user role with permissions to manage projects, create tasks across projects, and configure system settings including coin values.
- **Coin_Balance**: The total accumulated coins for a member, calculated from their completed quests' difficulty ratings and the configured coin values at the time of completion.
- **Task_Proposal_Form**: The UI form used by Developers to propose new sprint tasks, extended to include a difficulty selection field.

## Requirements

### Requirement 1: Difficulty Rating on Quests

**User Story:** As an Admin, I want each quest to have a difficulty rating, so that coin rewards scale with task complexity.

#### Acceptance Criteria

1. THE Quest data model SHALL include a `difficulty` field with allowed values limited to exactly three options: `easy`, `medium`, or `hard`.
2. WHEN a quest record lacks a `difficulty` value or the `difficulty` field is empty, THE Coin_Service SHALL treat the quest as `easy` difficulty for coin calculations.
3. THE Admin_View SHALL display the difficulty rating for each quest in project task lists as a read-only label showing the current `difficulty` value (`easy`, `medium`, or `hard`).
4. IF an Admin attempts to set the `difficulty` field to a value other than `easy`, `medium`, or `hard`, THEN THE System SHALL reject the update and retain the previous valid `difficulty` value.
5. WHEN a quest is created without specifying a `difficulty` value, THE System SHALL persist the quest record successfully with the `difficulty` field stored as empty (null) rather than silently assigning a default value in the data model.

### Requirement 2: Coin Reward Calculation

**User Story:** As a Developer or Agent, I want to earn coins based on task difficulty when I complete a quest, so that harder tasks provide greater rewards.

#### Acceptance Criteria

1. WHEN a member completes an active quest, THE Coin_Service SHALL read the quest's difficulty rating, retrieve the corresponding coin value from the Coin_Config table, and award that number of coins to the member.
2. IF no Coin_Config record exists in Lark Base, THEN THE Coin_Service SHALL use default values of 1 coin for `easy`, 3 coins for `medium`, and 5 coins for `hard`.
3. WHEN a quest completion is recorded, THE Coin_Service SHALL store the awarded coin amount in the `coins_awarded` field of the Quest_Completions record before returning success to the caller.
4. THE Coin_Service SHALL calculate a member's Coin_Balance by summing the `coins_awarded` field across all Quest_Completions records for that member, yielding a value with a minimum of 0.
5. IF the Coin_Service fails to retrieve Coin_Config due to a network or service error, THEN THE Coin_Service SHALL retry up to 3 attempts and, if all attempts fail, use the default coin values (1, 3, 5) for the current operation.
6. IF the Coin_Service fails to persist the `coins_awarded` value in the Quest_Completions record, THEN THE Coin_Service SHALL not mark the quest as completed and SHALL return an error indicating the completion could not be recorded.

### Requirement 3: Configurable Coin Values

**User Story:** As an Admin, I want to configure the coin values for each difficulty level, so that I can adjust reward incentives without code changes.

#### Acceptance Criteria

1. THE Admin_View SHALL display the current coin values for each difficulty level (easy, medium, hard) in a settings section.
2. WHEN an Admin submits updated coin values, THE Admin_View SHALL persist the new values to the Coin_Config record in Lark Base and display a success confirmation within 2 seconds of a successful save.
3. THE Coin_Config record SHALL contain three numeric fields: `easy_coins`, `medium_coins`, and `hard_coins`, each storing a positive integer between 1 and 10,000 inclusive.
4. WHEN the Coin_Service retrieves coin values, THE Coin_Service SHALL read from the Coin_Config table and fall back to default values (easy: 1, medium: 3, hard: 5) if no record exists.
5. IF an Admin enters a value that is not a positive integer between 1 and 10,000 inclusive for any coin field, THEN THE Admin_View SHALL display a validation error indicating the acceptable range and prevent submission.
6. IF the Lark Base API call fails when persisting updated coin values, THEN THE Admin_View SHALL display an error message indicating the save failed, retain the Admin's entered values in the form, and not update the displayed current values.
7. IF the Lark Base API call fails when the Coin_Service retrieves coin values, THEN THE Coin_Service SHALL fall back to default values (easy: 1, medium: 3, hard: 5).

### Requirement 4: Admin View — Project Visibility

**User Story:** As an Admin, I want to see all projects in the system, so that I can manage tasks and configurations across the organization.

#### Acceptance Criteria

1. THE Admin_View SHALL display a list of all projects retrieved from the Projects table in Lark Base, sorted alphabetically by project name.
2. THE Admin_View SHALL show the project name, description (truncated to 200 characters), and the count of quests in any status (active, pending, or rejected) for each project.
3. WHEN an Admin selects a project, THE Admin_View SHALL display all quests belonging to that project, showing each quest's title, status, assignment type, and creation date.
4. THE Admin_View SHALL be accessible only to members with the Admin role.
5. IF a non-Admin member navigates to the Admin_View route, THEN THE application SHALL redirect the member to the quest board.
6. IF the Projects table retrieval fails, THEN THE Admin_View SHALL display an error message indicating the data could not be loaded and provide a retry option.
7. IF the Projects table contains no records, THEN THE Admin_View SHALL display an empty-state message indicating no projects exist.

### Requirement 5: Admin Task Creation with Project Scope

**User Story:** As an Admin, I want to create tasks and assign them to specific projects, so that I can organize work across teams.

#### Acceptance Criteria

1. THE Admin_View SHALL provide a task creation form with fields for title (1–100 characters), description (1–500 characters), difficulty rating (easy, medium, or hard), target role (agent or developer), and project assignment.
2. WHEN an Admin creates a task, THE Admin_View SHALL allow selecting a single project, multiple projects, or all projects as the assignment scope.
3. WHEN an Admin selects "all projects", THE Admin_View SHALL assign the created task to every existing project at the time of submission.
4. WHEN an Admin submits the task creation form with valid fields, THE Admin_View SHALL create the quest record in Lark Base with status `active` and the selected difficulty rating.
5. IF an Admin submits the task creation form with a title that is empty or exceeds 100 characters, or a description that exceeds 500 characters, THEN THE Admin_View SHALL display a validation error indicating which field is invalid and prevent submission.
6. THE created quest SHALL include a `project_ids` field containing the IDs of all assigned projects.
7. IF an Admin submits the task creation form without selecting at least one project, THEN THE Admin_View SHALL display a validation error indicating that project assignment is required and prevent submission.
8. IF the quest record fails to be created in Lark Base, THEN THE Admin_View SHALL display an error message indicating the creation failure and preserve the entered form data.

### Requirement 6: Developer Task Proposal with Difficulty Selection

**User Story:** As a Developer, I want to select a difficulty level when proposing a task, so that the expected coin reward is established upfront.

#### Acceptance Criteria

1. THE Task_Proposal_Form SHALL include a difficulty selection field with options: easy, medium, and hard.
2. WHEN a Developer submits a task proposal, THE Task_Proposal_Form SHALL include the selected difficulty in the quest record created in Lark Base.
3. WHEN a Developer does not select a difficulty, THE Task_Proposal_Form SHALL default the difficulty to `easy`.
4. THE Task_Proposal_Form SHALL display the expected coin reward next to each difficulty option based on current Coin_Config values.
5. IF the Coin_Config values cannot be fetched, THEN THE Task_Proposal_Form SHALL display the default coin values (1, 3, 5) next to the difficulty options.

### Requirement 7: Coin Balance Display

**User Story:** As a member, I want to see my accumulated coin balance, so that I can track my progress in the reward system.

#### Acceptance Criteria

1. THE application SHALL display the member's current Coin_Balance as a non-negative integer in the navigation area visible on all protected pages.
2. WHEN a member completes a quest, THE application SHALL update the displayed Coin_Balance to reflect the newly awarded coins within 3 seconds of the completion being confirmed.
3. THE Coin_Balance display SHALL show a coin icon alongside the numeric value, formatted with locale-appropriate thousands separators.
4. IF the application fails to retrieve the member's Coin_Balance, THEN THE application SHALL display a placeholder indicator (such as "--") in place of the numeric value and retain the last known balance until a successful fetch occurs.
5. WHEN a member navigates to any protected page, THE application SHALL display the Coin_Balance that is consistent with the server-side value, refreshed on each page-level navigation or within 30 seconds of the last update.

### Requirement 8: New Lark Base Tables

**User Story:** As a system operator, I want the coin system data stored in Lark Base, so that the single-source-of-truth architecture is maintained.

#### Acceptance Criteria

1. THE system SHALL use a `Coin_Config` table in Lark Base with fields: `easy_coins` (number), `medium_coins` (number), `hard_coins` (number), limited to a single configuration record.
2. THE system SHALL use a `Projects` table in Lark Base with fields: `name` (text), `description` (text).
3. THE Quests table SHALL be extended with a `difficulty` field (text: easy/medium/hard) and a `project_ids` field (text, comma-separated record IDs).
4. THE Quest_Completions table SHALL be extended with a `coins_awarded` field (number, minimum 0) recording the coins earned for each completion.
