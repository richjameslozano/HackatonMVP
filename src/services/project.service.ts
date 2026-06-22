import type { Project, LarkRecord, Role, Member } from '../types';
import { listRecords, getRecord, createRecord, updateRecord, extractTextValue } from './lark-api.service';
import { TABLE_IDS } from './config';
import { validateProjectName, validateProjectNameUniqueness } from '../utils/validation';
import { mapRecordToMember } from './member.service';
import { deserializeProjectIds } from '../utils/project-ids';

// ─── Record Mapping ─────────────────────────────────────────────────────────

/**
 * Maps a raw Lark record to a Project domain object.
 */
function mapRecordToProject(record: LarkRecord): Project {
  return {
    projectId: record.record_id,
    name: extractTextValue(record.fields.name),
    description: extractTextValue(record.fields.description),
    scrumMasterId: extractTextValue(record.fields.scrum_master_id) || null,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Lists all projects sorted alphabetically by name (case-insensitive).
 */
export async function listProjects(): Promise<Project[]> {
  const records = await listRecords(TABLE_IDS.projects);
  const projects = records.map(mapRecordToProject);

  return projects.sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );
}

// ─── Single Project Retrieval ───────────────────────────────────────────────

/**
 * Fetches a single project by its record ID.
 */
export async function getProject(projectId: string): Promise<Project> {
  const record = await getRecord(TABLE_IDS.projects, projectId);
  return mapRecordToProject(record);
}

// ─── Project Creation ───────────────────────────────────────────────────────

/**
 * Creates a new project with the given name and description.
 */
export async function createProject(name: string, description: string): Promise<Project> {
  const fields: Record<string, unknown> = {
    name,
    description,
  };

  const record = await createRecord(TABLE_IDS.projects, fields);
  return mapRecordToProject(record);
}

// ─── Project Quest Count ────────────────────────────────────────────────────

/**
 * Counts the number of quests that belong to a given project.
 * Fetches all quests and filters those whose project_ids field contains the projectId.
 */
export async function getProjectQuestCount(projectId: string): Promise<number> {
  const records = await listRecords(TABLE_IDS.quests);

  const count = records.filter((record) => {
    const projectIdsValue = extractTextValue(record.fields.project_ids);
    if (!projectIdsValue) return false;
    const ids = projectIdsValue.split(',').map((id) => id.trim());
    return ids.includes(projectId);
  }).length;

  return count;
}

// ─── Developer Project Retrieval ────────────────────────────────────────────

/**
 * Returns projects where the developer is a member (projectId on Members record).
 * Results are sorted alphabetically by name (case-insensitive) and capped at 50.
 */
export async function getProjectsForDeveloper(memberId: string): Promise<Project[]> {
  const memberRecords = await listRecords(TABLE_IDS.members);

  const memberRecord = memberRecords.find(
    (record) => record.record_id === memberId
  );

  if (!memberRecord) {
    return [];
  }

  const projectIds = deserializeProjectIds(extractTextValue(memberRecord.fields.project_id));

  if (projectIds.length === 0) {
    return [];
  }

  const allProjects = await listProjects();

  const developerProjects = allProjects.filter(
    (project) => projectIds.includes(project.projectId)
  );

  return developerProjects.slice(0, 50);
}

// ─── Project Renaming ───────────────────────────────────────────────────────

/**
 * Renames a project after validating name constraints and uniqueness.
 * Trims whitespace, validates length/content, checks uniqueness (case-insensitive),
 * and persists only the name field to Lark Base.
 */
export async function renameProject(
  projectId: string,
  newName: string,
  existingProjects: Project[]
): Promise<Project> {
  const trimmedName = newName.trim();

  // Validate project name format (1–100 chars, not empty/whitespace-only)
  const nameValidation = validateProjectName(trimmedName);
  if (!nameValidation.valid) {
    throw new Error(nameValidation.error);
  }

  // Build existing names excluding the current project (allows no-op rename)
  const existingNames = existingProjects
    .filter((p) => p.projectId !== projectId)
    .map((p) => p.name);

  // Validate uniqueness (case-insensitive)
  const uniquenessValidation = validateProjectNameUniqueness(trimmedName, existingNames, projectId);
  if (!uniquenessValidation.valid) {
    throw new Error(uniquenessValidation.error);
  }

  // Persist only the name field to Lark Base
  await updateRecord(TABLE_IDS.projects, projectId, { name: trimmedName });

  // Return the updated project
  return getProject(projectId);
}

// ─── SM Assigned Projects Derivation ────────────────────────────────────────

/**
 * Extracts a value from a Lark field that could be a text field or a link/lookup field.
 * Handles: string, [{text: "val"}], [{record_id: "recXXX"}], ["recXXX"]
 */
function extractLinkOrTextValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (typeof first === 'string') return first;
    if (typeof first === 'object' && first !== null) {
      if ('record_id' in first) return (first as { record_id: string }).record_id;
      if ('id' in first) return (first as { id: string }).id;
      if ('text' in first) return (first as { text: string }).text;
    }
  }
  return '';
}

/**
 * Derives the set of projects assigned to a Scrum Master from task-level assignments.
 * Queries all quests, filters those where scrum_master_id matches the given SM,
 * extracts unique project IDs, then resolves project details.
 * Results are sorted alphabetically by name (case-insensitive).
 */
export async function getAssignedProjectsForScrumMaster(scrumMasterId: string): Promise<Project[]> {
  // Fetch all quest records
  const questRecords = await listRecords(TABLE_IDS.quests);

  // Filter quests where scrum_master_id matches the given SM
  const matchingQuests = questRecords.filter((record) => {
    const smId = extractLinkOrTextValue(record.fields.scrum_master_id);
    return smId === scrumMasterId;
  });

  // Extract unique project IDs from matching quests
  const projectIdSet = new Set<string>();
  for (const record of matchingQuests) {
    const projectIdsValue = extractTextValue(record.fields.project_ids);
    if (!projectIdsValue) continue;
    const ids = projectIdsValue.split(',').map((id) => id.trim()).filter(Boolean);
    for (const id of ids) {
      projectIdSet.add(id);
    }
  }

  // If no projects found, return empty array
  if (projectIdSet.size === 0) {
    return [];
  }

  // Resolve project details from the Projects table
  const allProjects = await listProjects();

  // Filter to only projects whose ID is in the derived set
  const assignedProjects = allProjects.filter((project) => projectIdSet.has(project.projectId));

  // Sort alphabetically by name (case-insensitive) — listProjects already does this,
  // but we ensure it here after filtering
  return assignedProjects.sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );
}

// ─── Scrum Master Assignment to Task ────────────────────────────────────────

/**
 * Checks if a raw Lark roles field contains the Scrum Master role.
 * The roles field may be an array of strings/objects or a plain string.
 */
function hasRawScrumMasterRole(rolesField: unknown): boolean {
  if (Array.isArray(rolesField)) {
    for (const role of rolesField) {
      const roleStr =
        typeof role === 'string'
          ? role
          : typeof role === 'object' && role !== null && 'text' in role
            ? (role as { text: string }).text
            : '';
      if (
        roleStr.toLowerCase().includes('scrum') ||
        roleStr.toLowerCase().includes('master') ||
        roleStr.toLowerCase() === 'sm'
      ) {
        return true;
      }
    }
  }
  if (typeof rolesField === 'string') {
    const lower = rolesField.toLowerCase();
    if (lower.includes('scrum') || lower.includes('master') || lower === 'sm') {
      return true;
    }
  }
  return false;
}

/**
 * Assigns a Scrum Master to a task. Only admins can perform this action.
 * Validates that the caller has admin role and the target member holds the Scrum Master role.
 * Stores the SM's member record ID on the task's scrum_master_id field.
 *
 * Validates: Requirements 4.2, 4.3, 4.7
 */
export async function assignScrumMasterToTask(
  taskId: string,
  scrumMasterId: string,
  callerRole: Role
): Promise<void> {
  // Validate caller has admin role
  if (callerRole !== 'admin') {
    throw new Error('Insufficient permissions: only admins can assign Scrum Masters');
  }

  // Query all members to find the target member
  const memberRecords = await listRecords(TABLE_IDS.members);

  const targetRecord = memberRecords.find(
    (record) => record.record_id === scrumMasterId
  );

  if (!targetRecord) {
    throw new Error('Target member not found');
  }

  // Validate target member has the Scrum Master role (check raw roles field)
  if (!hasRawScrumMasterRole(targetRecord.fields.roles)) {
    throw new Error('Target member does not have the Scrum Master role');
  }

  // Persist the SM assignment on the task record
  await updateRecord(TABLE_IDS.quests, taskId, { scrum_master_id: scrumMasterId });
}


// ─── List Scrum Masters ─────────────────────────────────────────────────────

/**
 * Lists all members with the Scrum Master role, sorted alphabetically by display name.
 * Queries the Members table and filters for members whose roles include Scrum Master.
 *
 * Validates: Requirements 4.1, 4.8
 */
export async function listScrumMasters(): Promise<Member[]> {
  const records = await listRecords(TABLE_IDS.members);

  // Filter to members whose raw roles field indicates Scrum Master
  const scrumMasterRecords = records.filter((record) =>
    hasRawScrumMasterRole(record.fields.roles)
  );

  // Map to Member domain objects
  const scrumMasters = scrumMasterRecords.map(mapRecordToMember);

  // Sort alphabetically by display name (case-insensitive)
  return scrumMasters.sort((a, b) =>
    a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase())
  );
}


// ─── Scrum Master Assignment to Project ─────────────────────────────────────

/**
 * Assigns a Scrum Master to a project. Only admins can perform this action.
 * Stores the SM's member record ID on the Project's scrum_master_id field.
 */
export async function assignScrumMasterToProject(
  projectId: string,
  scrumMasterId: string,
  callerRole: Role
): Promise<Project> {
  if (callerRole !== 'admin') {
    throw new Error('Insufficient permissions: only admins can assign Scrum Masters');
  }

  // Validate target is a Scrum Master
  const memberRecords = await listRecords(TABLE_IDS.members);
  const targetRecord = memberRecords.find((r) => r.record_id === scrumMasterId);

  if (!targetRecord) {
    throw new Error('Target member not found');
  }

  if (!hasRawScrumMasterRole(targetRecord.fields.roles)) {
    throw new Error('Target member does not have the Scrum Master role');
  }

  await updateRecord(TABLE_IDS.projects, projectId, { scrum_master_id: scrumMasterId });
  return getProject(projectId);
}
