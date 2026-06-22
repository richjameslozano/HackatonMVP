import type { Project } from '../../types';
import { ProjectRenameForm } from './ProjectRenameForm';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProjectListProps {
  projects: Project[];
  questCounts: Map<string, number>;
  onRename: (projectId: string, newName: string) => Promise<void>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ProjectList({ projects, questCounts, onRename }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-surface-200 bg-white p-8 text-center">
        <p className="text-sm text-surface-500">No projects found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => {
        const taskCount = questCounts.get(project.projectId) ?? 0;
        const existingNames = projects
          .filter((p) => p.projectId !== project.projectId)
          .map((p) => p.name);

        return (
          <div
            key={project.projectId}
            className="flex items-center justify-between gap-4 rounded-xl border border-surface-200 bg-white p-4 transition-shadow hover:shadow-card-hover"
          >
            {/* Project info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-surface-900 truncate">
                {project.name}
              </h4>
              <p className="mt-0.5 text-xs text-surface-500">
                {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
              </p>
            </div>

            {/* Rename action */}
            <div className="flex-shrink-0">
              <ProjectRenameForm
                projectId={project.projectId}
                currentName={project.name}
                existingNames={existingNames}
                onRename={onRename}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
