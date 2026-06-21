import { useEffect, useState, useCallback } from 'react';
import type { Project } from '../../types';
import { listProjects, getProjectQuestCount } from '../../services/project.service';
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

  // ─── Loading State ──────────────────────────────────────────────────────

  if (isLoading) {
    return <LoadingIndicator message="Loading projects..." />;
  }

  // ─── Error State ────────────────────────────────────────────────────────

  if (error) {
    return <ErrorBanner message={error} onRetry={fetchProjects} />;
  }

  // ─── Empty State ────────────────────────────────────────────────────────

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-surface-500 text-sm">No projects found.</p>
      </div>
    );
  }

  // ─── Project List ───────────────────────────────────────────────────────

  return (
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
  );
}
