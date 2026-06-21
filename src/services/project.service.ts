import type { Project, LarkRecord } from '../types';
import { listRecords, getRecord, createRecord, extractTextValue } from './lark-api.service';
import { TABLE_IDS } from './config';

// ─── Record Mapping ─────────────────────────────────────────────────────────

/**
 * Maps a raw Lark record to a Project domain object.
 */
function mapRecordToProject(record: LarkRecord): Project {
  return {
    projectId: record.record_id,
    name: extractTextValue(record.fields.name),
    description: extractTextValue(record.fields.description),
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
