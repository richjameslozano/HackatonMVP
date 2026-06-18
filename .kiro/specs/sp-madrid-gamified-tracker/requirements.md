# Requirements Document

## Introduction

SP Madrid Gamified Tracker is a gamified task and onboarding tracking system for SP Madrid & Associates, a BPO company with AI-driven tech solutions. The system is built on top of Lark Base and turns onboarding steps, daily tasks, and sprint work into quests. Employees earn badges upon completing quests, and progress is surfaced via role-separated leaderboards. The system uses no XP or points — badges tied to quest completions are the sole reward mechanism. Developer tasks require Scrum Master approval before counting toward progress, preventing self-farming of achievements.

The MVP is a frontend web application connected to Lark Base via the Lark Base API, with a Lark bot handling notifications. No separate backend server is required.

## Glossary

- **Tracker**: The SP Madrid Gamified Tracker frontend web application
- **Agent**: A BPO operations staff member who completes onboarding quests, daily tasks, and milestone quests
- **Developer**: A tech team member who proposes sprint tasks, completes approved tasks, and earns developer-specific badges
- **Scrum_Master**: A team lead who reviews, approves, or rejects developer-proposed tasks
- **Admin**: A user who manages Lark Base tables directly without a separate admin UI
- **Quest**: A trackable unit of work — either an onboarding step, a daily task, a milestone, or a sprint task
- **Badge**: A visual reward earned by completing a defined set of quests
- **Leaderboard**: A ranked list of employees ordered by badge count, separated by role track
- **Lark_Base**: The Lark workspace database layer consisting of five tables — Members, Quests, Quest_Completions, Badges, and Badge_Earned
- **Lark_Bot**: The Lark messaging bot that sends notifications to Scrum Masters and Developers
- **Pending_Task**: A developer-proposed task awaiting Scrum Master approval before becoming active
- **Quest_Completion**: A record in Lark Base indicating that a specific quest has been completed by a specific member

## Requirements

### Requirement 1: Role-Based Quest Board Display

**User Story:** As an Agent or Developer, I want to see a quest board filtered to my role, so that I only see quests relevant to my responsibilities.

#### Acceptance Criteria

1. WHEN the Tracker loads, THE Tracker SHALL fetch quests from Lark_Base filtered by the active user's role as stored in the Members table and display the quest board within 3 seconds
2. WHILE the role switcher is set to Agent, THE Tracker SHALL display three quest categories: onboarding, daily tasks, and milestones
3. WHILE the role switcher is set to Developer, THE Tracker SHALL display two quest sections: approved sprint tasks and pending tasks awaiting Scrum_Master approval
4. WHEN the user toggles the role switcher, THE Tracker SHALL refresh the quest board content to reflect the selected role's categories or sections within 3 seconds without a full page reload
5. IF the Tracker loads and the active user's role has no quests in any category, THEN THE Tracker SHALL display the empty quest board with all role-appropriate category headings visible and a message indicating no quests are available
6. WHEN the Tracker loads for the first time in a session, THE Tracker SHALL default the role switcher to the user's primary role as defined in the Members table in Lark_Base

### Requirement 2: Developer Task Proposal

**User Story:** As a Developer, I want to propose sprint tasks through a form, so that my tasks can be reviewed and approved by the Scrum Master before they become active quests.

#### Acceptance Criteria

1. WHEN a Developer submits the propose task form with a task title (required, max 100 characters) and description (optional, max 500 characters), THE Tracker SHALL write a new quest record to Lark_Base with status set to pending and the proposing Developer's member identifier as the owner
2. IF a Developer submits the propose task form with an empty title or a title exceeding 100 characters, THEN THE Tracker SHALL display a validation error and prevent submission
3. WHEN a new pending task is successfully written to Lark_Base, THE Lark_Bot SHALL send a notification to the Scrum_Master assigned to the proposing Developer as defined in the Members table
4. THE Tracker SHALL prevent Developers from editing, deleting, or completing a Pending_Task by hiding edit controls and disabling the completion checkbox on pending task cards
5. WHEN the propose task form is submitted successfully, THE Tracker SHALL display a confirmation message and add the new task to the pending tasks section of the Developer quest board
6. THE Tracker SHALL assign the Scrum_Master for a proposed task based on the scrum_master_id field in the proposing Developer's Members table record

### Requirement 3: Scrum Master Approval Gate

**User Story:** As a Scrum Master, I want to approve or reject developer-proposed tasks inline, so that only verified tasks count toward progress and badges.

#### Acceptance Criteria

1. WHILE the role switcher is set to Developer view and the logged-in user is the assigned Scrum_Master, THE Tracker SHALL display approve and reject buttons on each Pending_Task card
2. WHEN the Scrum_Master clicks approve on a Pending_Task, THE Tracker SHALL update the quest status in Lark_Base from pending to active and remove the task from the pending section within 2 seconds
3. WHEN the Scrum_Master clicks reject on a Pending_Task, THE Tracker SHALL prompt the Scrum_Master to enter a rejection reason (required, max 250 characters) and update the quest status in Lark_Base from pending to rejected
4. WHEN a Scrum_Master approves or rejects a Pending_Task, THE Lark_Bot SHALL send a notification to the Developer who proposed the task indicating the decision and including the rejection reason if rejected
5. THE Tracker SHALL prevent a Developer from approving their own proposed tasks by hiding approve and reject buttons when the logged-in user's member identifier matches the task proposer's member identifier
6. WHEN the Scrum_Master successfully approves or rejects a Pending_Task, THE Tracker SHALL display a confirmation toast indicating the action taken and the task title
7. IF the Scrum_Master clicks reject and dismisses the rejection reason prompt without entering text, THEN THE Tracker SHALL cancel the rejection action and retain the task in pending state

### Requirement 4: Quest Completion Tracking

**User Story:** As an Agent or Developer, I want to mark quests as complete, so that my progress is recorded and I can earn badges.

#### Acceptance Criteria

1. WHEN an Agent checks off a quest, THE Tracker SHALL write a Quest_Completion record to Lark_Base with the member identifier, quest identifier, and a completion timestamp
2. WHEN a Developer checks off an approved sprint task, THE Tracker SHALL write a Quest_Completion record to Lark_Base with the member identifier, quest identifier, and a completion timestamp
3. THE Tracker SHALL prevent completion of quests that have a pending or rejected status by disabling the completion checkbox and displaying a tooltip explaining the restriction
4. WHEN a Quest_Completion record is written, THE Tracker SHALL evaluate badge unlock conditions for the completing member
5. IF a Quest_Completion record already exists for the same member and quest combination, THEN THE Tracker SHALL prevent duplicate submission and display a message indicating the quest has already been completed
6. WHEN a quest is successfully marked as complete, THE Tracker SHALL display a visual confirmation animation and update the quest card to show a completed state

### Requirement 5: Automatic Badge Awarding

**User Story:** As an Agent or Developer, I want to automatically receive badges when I meet unlock conditions, so that I am rewarded without manual intervention.

#### Acceptance Criteria

1. WHEN a Quest_Completion is recorded and the member's total qualifying Quest_Completions meets or exceeds a badge's required threshold as defined in the Badges table, THE Tracker SHALL write a record to the Badge_Earned table in Lark_Base linking the member to the earned badge
2. THE Tracker SHALL support six Agent-specific badges tied to Agent quest completions
3. THE Tracker SHALL support five Developer-specific badges tied to approved Developer quest completions
4. THE Tracker SHALL count only Quest_Completions for quests with active status when evaluating Developer badge unlock conditions
5. IF a badge has already been earned by a member, THEN THE Tracker SHALL not create a duplicate Badge_Earned record
6. IF a single Quest_Completion satisfies unlock conditions for multiple badges simultaneously, THEN THE Tracker SHALL award all qualifying badges in a single evaluation pass
7. IF the Badge_Earned write to Lark_Base fails, THEN THE Tracker SHALL retain the Quest_Completion as valid, display a warning to the user that the badge could not be awarded, and re-evaluate the badge condition on the next Quest_Completion event

### Requirement 6: Role-Separated Leaderboards

**User Story:** As an employee, I want to see a leaderboard for my role track, so that I can compare my badge progress against peers in the same role.

#### Acceptance Criteria

1. THE Tracker SHALL display two separate leaderboards: one for Agents and one for Developers, showing each member's display name, rank position, and total badge count
2. THE Tracker SHALL rank members on each leaderboard by total badge count in descending order, using alphabetical order of member display name as the tie-breaker when badge counts are equal
3. THE Tracker SHALL never display Agents and Developers on the same leaderboard
4. WHEN a new Badge_Earned record is created, THE Tracker SHALL update the relevant leaderboard to reflect the new ranking within 5 seconds of the record creation
5. THE Tracker SHALL include all members of the relevant role on the leaderboard, including members with zero earned badges
6. THE Tracker SHALL visually highlight the current user's own row on the leaderboard

### Requirement 7: Badge Collection Display

**User Story:** As an Agent or Developer, I want to see my badge collection with earned and locked states, so that I understand what I have achieved and what I can still unlock.

#### Acceptance Criteria

1. THE Tracker SHALL display a grid of all role-specific badges for the active user, showing the badge name and badge icon for each badge
2. THE Tracker SHALL visually distinguish earned badges with full color and an earned label from locked badges displayed in grayscale with a locked label
3. THE Tracker SHALL display a progress bar indicating the fraction of total role badges earned, including a numeric label showing earned count out of total count (e.g., "3 / 6")
4. WHILE viewing the badge collection, THE Tracker SHALL show badge unlock conditions as descriptive text below each locked badge indicating the required quest completion threshold
5. IF the user has earned zero badges, THEN THE Tracker SHALL display all badges in the locked state with a progress bar at zero and a message encouraging the user to start completing quests

### Requirement 8: Lark Base Data Integration

**User Story:** As the system, I want all reads and writes to go through the Lark Base API, so that Lark Base remains the single source of truth for all tracker data.

#### Acceptance Criteria

1. THE Tracker SHALL read all quest data from the Quests table in Lark_Base via the Lark Base API
2. THE Tracker SHALL read all member data from the Members table in Lark_Base via the Lark Base API
3. THE Tracker SHALL write all Quest_Completion records to the Quest_Completions table in Lark_Base via the Lark Base API
4. THE Tracker SHALL write all Badge_Earned records to the Badge_Earned table in Lark_Base via the Lark Base API
5. THE Tracker SHALL read badge definitions from the Badges table in Lark_Base via the Lark Base API
6. IF a Lark Base API call fails after up to 3 retry attempts each with a timeout of 10 seconds, THEN THE Tracker SHALL display an error message indicating the failed operation and retain the last successfully loaded data without data loss
7. WHILE a Lark Base API read or write operation is in progress, THE Tracker SHALL display a loading indicator and disable user actions that depend on the pending operation
8. THE Tracker SHALL not cache or persist Lark_Base data locally beyond the current browser session, ensuring that each session start fetches fresh data from Lark_Base

### Requirement 9: Lark Bot Notifications

**User Story:** As a Scrum Master or Developer, I want to receive Lark bot notifications for task proposals and decisions, so that I am promptly informed of actions requiring my attention.

#### Acceptance Criteria

1. WHEN a Developer proposes a new task, THE Lark_Bot SHALL send a message to the assigned Scrum_Master within 30 seconds containing the task title and proposer name
2. WHEN a Scrum_Master approves a Pending_Task, THE Lark_Bot SHALL send an approval notification to the Developer who proposed the task within 30 seconds containing the task title and the approving Scrum_Master name
3. WHEN a Scrum_Master rejects a Pending_Task, THE Lark_Bot SHALL send a rejection notification to the Developer who proposed the task within 30 seconds containing the task title, the rejecting Scrum_Master name, and the rejection reason
4. IF the Lark_Bot fails to deliver a notification within 30 seconds or receives an error response from the Lark messaging API, THEN THE Tracker SHALL display a non-blocking warning message to the acting user indicating the notification could not be delivered, persist the failure details to the Quest_Completions or Quests table in Lark_Base, and allow the triggering action to complete successfully
5. IF the intended notification recipient cannot be resolved from the Members table in Lark_Base, THEN THE Tracker SHALL treat the notification as a delivery failure and apply the same failure handling as criterion 4

### Requirement 10: Role Switcher Navigation

**User Story:** As a user with access to multiple views, I want a role switcher in the interface, so that I can toggle between Agent view and Developer view without logging out.

#### Acceptance Criteria

1. IF the active user's member record in Lark_Base includes both Agent and Developer roles, THEN THE Tracker SHALL display a role switcher control that allows toggling between Agent view and Developer view
2. IF the active user's member record includes only one role, THEN THE Tracker SHALL hide the role switcher and display the single available role view
3. WHEN the user selects a role via the role switcher, THE Tracker SHALL update the quest board, leaderboard, and badge collection to display content for the selected role within 2 seconds
4. THE Tracker SHALL persist the selected role view for the duration of the browser session until the user changes it or closes the browser tab
5. WHEN the Tracker loads and the user has access to multiple views with no previously persisted role selection, THE Tracker SHALL default to displaying the first role listed in the user's member record

### Requirement 11: Data Integrity for Developer Tasks

**User Story:** As an organization, I want developer task completions to only count when approved by a Scrum Master, so that badge counts and leaderboard positions reflect verified work.

#### Acceptance Criteria

1. THE Tracker SHALL only count Quest_Completions for Developer quests that have an active status when calculating badge progress
2. THE Tracker SHALL only count Quest_Completions for Developer quests that have an active status when calculating leaderboard rankings
3. THE Tracker SHALL prevent writing a Quest_Completion record for any quest with a pending or rejected status
4. IF a Developer attempts to complete a Pending_Task, THEN THE Tracker SHALL display a message indicating the task requires Scrum_Master approval before completion
5. IF a Developer attempts to complete a quest with rejected status, THEN THE Tracker SHALL display a message indicating the task has been rejected and cannot be completed
6. IF a quest status changes from active to rejected after a Quest_Completion record exists, THEN THE Tracker SHALL exclude that Quest_Completion from badge progress and leaderboard calculations on the next recalculation
