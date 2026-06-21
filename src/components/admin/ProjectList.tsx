import { useEffect, useState, useCallback } from 'react';
import type { Project } from '../../types';
import { listProjects, getProjectQuestCount, createProject } from '../../services/project.service';
import { truncateDescription } from '../../utils/formatting';
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

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const projectList = await listProjects();

      // Fetch quest counts in parallel, non-blocking per project
      const projectsWithCounts: ProjectWithCount[] = await Promise.all(
        projectList.map(async (project) => {
          let questCount: number | null = null;
          try {
            questCount = await getProjectQuestCount(project.projectId);
          } catch {
            // Non-blocking: show "—" if count fetch fails
            questCount = null;
          }
          return { ...project, questCount };
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
  }, []);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

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
        <h2 className="text-lg font-semibold text-surface-900">Projects</h2>
        <button
          type="button"
          onClick={() => { setShowForm(!showForm); setFormError(null); }}
          className="rounded-lg bg-madrid-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-madrid-700 focus:outline-none focus:ring-2 focus:ring-madrid-500 focus:ring-offset-2"
        >
          {showForm ? 'Cancel' : 'Add Project'}
        </button>
      </div>

      {/* Create Project Form */}
      {showForm && (
        <form onSubmit={handleCreateProject} className="rounded-xl border border-surface-200 bg-surface-50 p-4 space-y-3">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {formError}
            </div>
          )}
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="project-name"
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              maxLength={100}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-madrid-500 focus:border-madrid-500"
              placeholder="Project name"
            />
          </div>
          <div>
            <label htmlFor="project-description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="project-description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
              maxLength={500}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-madrid-500 focus:border-madrid-500"
              placeholder="Optional description"
            />
          </div>
          <button
            type="submit"
            disabled={formLoading}
            className="rounded-lg bg-madrid-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-madrid-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {formLoading ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      )}

      {/* Empty State */}
      {projects.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-surface-500 text-sm">No projects found. Add one to get started.</p>
        </div>
      )}

      {/* Project List */}
      {projects.length > 0 && (
        <div className="space-y-3">
          {projects.map((project) => (
            <button
              key={project.projectId}
              type="button"
              onClick={() => onSelectProject?.(project.projectId)}
              className="w-full rounded-xl border border-surface-200 bg-white px-4 py-3 text-left transition hover:border-madrid-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-madrid-500 focus:ring-offset-1"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-surface-900 truncate">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="mt-1 text-sm text-surface-500 leading-relaxed">
                      {truncateDescription(project.description, 200)}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-madrid-50 px-2.5 py-0.5 text-xs font-medium text-madrid-700">
                  {project.questCount !== null ? project.questCount : '—'}{' '}
                  {project.questCount === 1 ? 'quest' : 'quests'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
