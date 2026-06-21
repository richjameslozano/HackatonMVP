import { useEffect, useState, useCallback } from 'react';
import type { Quest } from '../../types';
import { LoadingIndicator } from '../shared/LoadingIndicator';
import { ErrorBanner } from '../shared/ErrorBanner';
import { getProject } from '../../services/project.service';
import type { Project } from '../../types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getProject(projectId);
      setProject(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load project details.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchProject();
  }, [fetchProject]);

  if (isLoading) {
    return <LoadingIndicator message="Loading project details..." />;
  }

  if (error) {
    return <ErrorBanner message={error} onRetry={fetchProject} />;
  }

  return (
    <div className="space-y-4">
      {/* Back Navigation */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-surface-500 hover:text-madrid-600 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Projects
      </button>

      {/* Project Header */}
      {project && (
        <div>
          <h2 className="text-lg font-semibold text-surface-900">{project.name}</h2>
          {project.description && (
            <p className="mt-1 text-sm text-surface-500">{project.description}</p>
          )}
        </div>
      )}

      {/* Quest List Placeholder — full implementation in task 7.4 */}
      <div className="rounded-xl border border-surface-200 bg-white px-4 py-8 text-center">
        <p className="text-sm text-surface-500">Quest list for this project will be displayed here.</p>
      </div>
    </div>
  );
}
