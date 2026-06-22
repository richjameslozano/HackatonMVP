import { useEffect, useState, useCallback } from 'react';
import type { Project, Member } from '../../types';
import { listProjects, getProjectQuestCount, createProject } from '../../services/project.service';
import { useProjectStore } from '../../store/project.store';
import { truncateDescription } from '../../utils/formatting';
import { ProjectRenameForm } from '../project/ProjectRenameForm';
import { LoadingIndicator } from '../shared/LoadingIndicator';
import { ErrorBanner } from '../shared/ErrorBanner';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProjectWithCount extends Project {
  questCount: number | null;
}

interface ProjectListProps {
  onSelectProject?: (projectId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ProjectList({ onSelectProject }: ProjectListProps) {
  const [projects, setProjects] = useState<ProjectWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Connect to project store for rename functionality
  const renameProject = useProjectStore((s) => s.renameProject);
  const renameError = useProjectStore((s) => s.renameError);
  const storeProjects = useProjectStore((s) => s.projects);
  const fetchStoreProjects = useProjectStore((s) => s.fetchProjects);
  const scrumMasters = useProjectStore((s) => s.scrumMasters);
  const fetchScrumMasters = useProjectStore((s) => s.fetchScrumMasters);
  const assignScrumMasterToProject = useProjectStore((s) => s.assignScrumMasterToProject);
  const assignError = useProjectStore((s) => s.assignError);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch projects from both the store and local state (for quest counts)
      await fetchStoreProjects();
      await fetchScrumMasters();
      const projectList = await listProjects();

      // Fetch quest counts in parallel, non-blocking per project
      const projectsWithCounts: ProjectWithCount[] = await Promise.all(
        projectList.map(async (project) => {
          try {
            const questCount = await getProjectQuestCount(project.projectId);
            return { ...project, questCount };
          } catch {
            // Non-blocking: show "—" if count fetch fails
            return { ...project, questCount: null };
          }
        })
      );

      setProjects(projectsWithCounts);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load projects.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [fetchStoreProjects, fetchScrumMasters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchProjects();
  }, [fetchProjects]);

  // Derive displayed projects: merge local quest counts with store project names
  // (reflects optimistic rename updates or rollbacks from useProjectStore)
  const displayedProjects = projects.map((p) => {
    const storeProject = storeProjects.find((sp) => sp.projectId === p.projectId);
    if (storeProject && storeProject.name !== p.name) {
      return { ...p, name: storeProject.name };
    }
    return p;
  });

  // ─── Rename Handler ───────────────────────────────────────────────────────

  async function handleRename(projectId: string, newName: string): Promise<void> {
    await renameProject(projectId, newName);
  }

  async function handleAssignSm(projectId: string, scrumMasterId: string): Promise<void> {
    await assignScrumMasterToProject(projectId, scrumMasterId, 'admin');
  }

  // ─── Create Project Handler ─────────────────────────────────────────────

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError('Project name is required');
      return;
    }

    setFormLoading(true);
    setFormError(null);
    try {
      await createProject(trimmedName, formDescription.trim());
      setFormName('');
      setFormDescription('');
      setShowForm(false);
      await fetchProjects();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      setFormError(message);
    } finally {
      setFormLoading(false);
    }
  }

  // ─── Loading State ──────────────────────────────────────────────────────

  if (isLoading) {
    return <LoadingIndicator message="Loading projects..." />;
  }

  // ─── Error State ────────────────────────────────────────────────────────

  if (error) {
    return <ErrorBanner message={error} onRetry={fetchProjects} />;
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#e5e1e4]">Projects</h2>
        <button
          type="button"
          onClick={() => { setShowForm(!showForm); setFormError(null); }}
          className="rounded-lg bg-[#00d4ff] px-4 py-2 text-sm font-medium text-[#003642] hover:bg-[#3cd7ff] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:ring-offset-2"
        >
          {showForm ? 'Cancel' : 'Add Project'}
        </button>
      </div>

      {/* Rename Error Banner */}
      {renameError && (
        <ErrorBanner message={renameError} />
      )}

      {/* Create Project Form */}
      {showForm && (
        <form onSubmit={handleCreateProject} className="rounded-xl border border-[#3c494e] bg-[#1c1b1d] p-4 space-y-3">
          {formError && (
            <div className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-400" role="alert">
              {formError}
            </div>
          )}
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-[#bbc9cf]">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              id="project-name"
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              maxLength={100}
              className="mt-1 block w-full rounded-lg border border-[#3c494e] bg-[#201f21] px-3 py-2 text-sm text-[#e5e1e4] placeholder-[#859398] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-[#00d4ff]"
              placeholder="Project name"
            />
          </div>
          <div>
            <label htmlFor="project-description" className="block text-sm font-medium text-[#bbc9cf]">
              Description
            </label>
            <textarea
              id="project-description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
              maxLength={500}
              className="mt-1 block w-full rounded-lg border border-[#3c494e] bg-[#201f21] px-3 py-2 text-sm text-[#e5e1e4] placeholder-[#859398] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-[#00d4ff]"
              placeholder="Optional description"
            />
          </div>
          <button
            type="submit"
            disabled={formLoading}
            className="rounded-lg bg-[#00d4ff] px-4 py-2 text-sm font-medium text-[#003642] hover:bg-[#3cd7ff] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {formLoading ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      )}

      {/* Empty State */}
      {displayedProjects.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-[#859398] text-sm">No projects found. Add one to get started.</p>
        </div>
      )}

      {/* Project List */}
      {displayedProjects.length > 0 && (
        <div className="space-y-3">
          {displayedProjects.map((project) => {
            const existingNames = displayedProjects
              .filter((p) => p.projectId !== project.projectId)
              .map((p) => p.name);

            return (
              <div
                key={project.projectId}
                className="w-full rounded-xl border border-[#3c494e] bg-[#201f21] px-4 py-3 transition hover:border-[#00d4ff]/50 hover:bg-[#2a2a2c]"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectProject?.(project.projectId)}
                    className="min-w-0 flex-1 text-left focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:ring-offset-1 rounded-lg"
                  >
                    <h3 className="text-sm font-semibold text-[#e5e1e4] truncate">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="mt-1 text-sm text-[#859398] leading-relaxed">
                        {truncateDescription(project.description, 200)}
                      </p>
                    )}
                  </button>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="rounded-full bg-[#00d4ff]/10 px-2.5 py-0.5 text-xs font-medium text-[#3cd7ff]">
                      {project.questCount !== null ? project.questCount : '—'}{' '}
                      {project.questCount === 1 ? 'quest' : 'quests'}
                    </span>
                    <ProjectRenameForm
                      projectId={project.projectId}
                      currentName={project.name}
                      existingNames={existingNames}
                      onRename={handleRename}
                    />
                  </div>
                </div>

                {/* Scrum Master Assignment */}
                <div className="mt-3 pt-3 border-t border-[#3c494e]/50">
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor={`sm-${project.projectId}`}
                      className="text-xs font-mono uppercase tracking-wider text-[#859398] shrink-0"
                    >
                      Scrum Master:
                    </label>
                    {scrumMasters.length === 0 ? (
                      <span className="text-xs text-[#859398] italic">No SMs available</span>
                    ) : (
                      <select
                        id={`sm-${project.projectId}`}
                        value={storeProjects.find((p) => p.projectId === project.projectId)?.scrumMasterId ?? ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            void handleAssignSm(project.projectId, e.target.value);
                          }
                        }}
                        className="flex-1 max-w-xs rounded-lg border border-[#3c494e] bg-[#131315] px-3 py-1.5 text-sm text-[#e5e1e4] focus:outline-none focus:ring-1 focus:ring-[#00d4ff] focus:border-[#00d4ff]"
                      >
                        <option value="">— None —</option>
                        {scrumMasters.map((sm) => (
                          <option key={sm.memberId} value={sm.memberId}>
                            {sm.displayName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
