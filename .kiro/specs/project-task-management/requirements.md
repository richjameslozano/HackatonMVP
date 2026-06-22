# Requirements Document

## Introduction

This feature introduces project-scoped task management to the SP Madrid Gamified Tracker. It adds the ability for Developers to propose tasks to specific projects they belong to, for Scrum Masters to create and manage tasks within their assigned projects, and for Admins to rename projects and assign Scrum Masters per task. The feature enforces strict role-based access: Developers only see their own projects, Scrum Masters can only operate within projects they are assigned to (derived from task-level Scrum Master assignments), and Admins control project metadata and Scrum Master assignments.

## Glossary

- **System**: The SP Madrid Gamified Tracker application (frontend SPA + Lark Base data store).
- **Developer**: A user role that can propose tasks to projects they are a member of.
- **Scrum_Master**: A user role that can create and manage tasks within project(s) they are assigned to.
- **Admin**: A user role with project management and Scrum Master assignment privileges.
- **Project**: A container for tasks; has members (Developers) and one or more assigned Scrum Masters (derived from task-level Scrum Master assignments).
- **Task**: A unit of work proposed by a Developer or created by a Scrum Master, belonging to exactly one Project; has a Scrum Master assigned by an Admin.
- **Task_Proposal_Form**: The UI form presented to a Developer for proposing a new task.
- **Project_Selection_List**: The dropdown or list component showing available projects during task creation or proposal.
- **Assigned_Project**: A project is considered "assigned" to a Scrum Master once the Scrum Master is set as the Scrum Master on at least one task in that project.
- **Lark_Sync**: The process of writing data changes to the Lark Base REST API as the single source of truth.
- **Maximum_Project_Name_Length**: 100 characters.

## Assumptions

- Project membership is pre-configured: Developers are assigned to projects via the Members table `projectId` field.
- A Scrum Master's project scope is derived from task-level assignments, not from a separate project membership record.
- A project counts as "assigned" to a Scrum Master once they are set as the Scrum Master on at least one task in that project.
- All data persistence occurs via the Lark Base REST API through `lark-api.service.ts`.
- A new "Projects" table will be created in Lark Base to store project metadata (name, description).

## Requirements

### Requirement 1: Project Selection for Task Proposals

**User Story:** As a Developer, I want to select which project I am proposing a task to, so that my proposed task is associated with the correct project.

#### Acceptance Criteria

1. WHEN a Developer opens the Task_Proposal_Form, THE System SHALL display a Project_Selection_List containing only projects where the Developer's Members record has a matching projectId, sorted alphabetically by project name.
2. IF a Developer is not a member of any Project (projectId is null or empty on their Members record), THEN THE System SHALL display a message indicating no projects are available and SHALL disable task submission.
3. WHEN a Developer selects a Project and submits a task proposal, THE System SHALL associate the new Task with the selected Project by storing the Project identifier in the quest record's project_ids field and SHALL set the Task status to "pending".
4. IF a Developer attempts to submit a task proposal without selecting a Project, THEN THE System SHALL block submission and display a validation error indicating project selection is required.
5. WHEN the Project_Selection_List is displayed, THE System SHALL exclude any Project the Developer is not a member of, ensuring the list contains at most 50 projects.
6. WHEN a task proposal is successfully submitted, THE System SHALL persist the Task record with the associated Project identifier to Lark Base via Lark_Sync within 10 seconds.
7. IF Lark_Sync fails to persist the Task record after 3 retry attempts, THEN THE System SHALL display an error message indicating the proposal could not be saved and SHALL not add the Task to the local quest list.

### Requirement 2: Project Renaming by Admin

**User Story:** As an Admin, I want to rename a project, so that project names stay accurate as organizational needs change.

#### Acceptance Criteria

1. WHEN an Admin submits a new name for an existing Project, THE System SHALL trim leading and trailing whitespace from the submitted name, update the Project name, and enqueue the change for persistence to Lark Base via Lark_Sync.
2. IF a non-Admin user attempts to rename a Project, THEN THE System SHALL deny the action and return an authorization error.
3. WHEN a Project is renamed, THE System SHALL retain all existing Tasks, members, and history associated with that Project unchanged.
4. IF the submitted project name is empty or contains only whitespace characters after trimming, THEN THE System SHALL reject the rename and display a validation error indicating the name cannot be empty.
5. IF the submitted project name exceeds the Maximum_Project_Name_Length (100 characters) after trimming, THEN THE System SHALL reject the rename and display a validation error indicating the maximum length has been exceeded.
6. WHEN a Project rename is persisted, THE System SHALL update the Project name in the Projects table in Lark Base without modifying any other Project fields.
7. IF the submitted project name matches the name of another existing Project (case-insensitive comparison after trimming), THEN THE System SHALL reject the rename and display a validation error indicating the name is already in use.
8. IF the Lark Base sync for a Project rename fails after 3 retry attempts, THEN THE System SHALL display an error message indicating the rename could not be persisted and revert the Project name to its previous value in the local state.

### Requirement 3: Task Creation by Scrum Master Scoped to Assigned Projects

**User Story:** As a Scrum Master, I want to create and manage tasks for the project(s) I am assigned to, so that I can maintain the backlog for my project(s).

#### Acceptance Criteria

1. WHILE a Scrum_Master is assigned to a Project, THE System SHALL allow the Scrum_Master to create new Tasks within that Project with an initial status of "active" and an assignment_type of "assigned".
2. IF a Scrum_Master attempts to create a Task in a Project they are not assigned to, THEN THE System SHALL deny the action, prevent the Task from being created, and display an error message indicating the Scrum_Master is not authorized for that Project.
3. WHEN a Scrum_Master views available projects for task creation, THE System SHALL display only Assigned_Projects for that Scrum_Master in the Project_Selection_List.
4. WHEN the last Task in a Project where the Scrum_Master field matches a given Scrum_Master is deleted or reassigned to a different Scrum_Master, THE System SHALL no longer treat that Project as an Assigned_Project for that Scrum_Master.
5. WHEN a Scrum_Master creates a Task, THE System SHALL persist the Task record with the associated Project identifier to Lark Base via Lark_Sync within 10 seconds.
6. IF Lark_Sync fails to persist a Task created by a Scrum_Master after 3 retry attempts, THEN THE System SHALL display an error message indicating the Task was not saved and SHALL NOT add the Task to the Project's task list.
7. THE System SHALL derive the set of Assigned_Projects for a Scrum_Master by querying Tasks where the Scrum Master field matches that Scrum_Master's member identifier.
8. WHEN a Scrum_Master creates a Task, THE System SHALL require at minimum a Task title (between 1 and 200 characters), a target assignee, and the associated Project identifier before permitting submission.

### Requirement 4: Scrum Master Assignment per Task by Admin

**User Story:** As an Admin, I want to assign a Scrum Master to each task, so that responsibility for the task is clear and the correct Scrum Master can manage it.

#### Acceptance Criteria

1. WHEN an Admin opens a Task's details, THE System SHALL display a selection control listing all users holding the Scrum_Master role, pre-selected to the currently assigned Scrum_Master if one exists, or empty if none is assigned.
2. WHEN an Admin assigns a Scrum_Master to a Task, THE System SHALL only allow selection from users holding the Scrum_Master role, and SHALL enforce that exactly one Scrum_Master is assigned per Task at any time.
3. IF a non-Admin user attempts to assign or change a Task's Scrum_Master, THEN THE System SHALL deny the action and display an error message indicating insufficient permissions.
4. WHEN a Scrum_Master is assigned to a Task in a Project for the first time (no prior Task in that Project has been assigned to this Scrum_Master), THE System SHALL grant the Scrum_Master task-creation access to that Project as defined in Requirement 3.
5. WHEN a Task's Scrum_Master assignment changes, THE System SHALL persist the updated assignment to Lark Base via Lark_Sync within 10 seconds of the Admin confirming the change.
6. IF Lark_Sync fails to persist a Scrum_Master assignment change, THEN THE System SHALL revert the assignment to its previous state in the UI and display an error message indicating the sync failure.
7. WHEN an Admin assigns a Scrum_Master to a Task, THE System SHALL store the Scrum_Master's member record identifier on the Task record, replacing any previously assigned Scrum_Master identifier.
8. IF no users with the Scrum_Master role exist in the system, THEN THE System SHALL display the selection control in a disabled state with a message indicating no Scrum Masters are available.
