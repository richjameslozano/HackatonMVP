import type { Project } from '../../types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProjectSelectorProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
  error?: string | null;
  disabled?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ProjectSelector({
  projects,
  selectedProjectId,
  onSelect,
  error,
  disabled,
}: ProjectSelectorProps) {
  const isEmpty = projects.length === 0;
  const isDisabled = disabled || isEmpty;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value) {
      onSelect(value);
    }
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor="project-selector"
        className="font-mono text-[12px] text-[#3cd7ff] uppercase flex justify-between"
      >
        Project
        <span className="text-[rgba(187,201,207,0.4)]">Required</span>
      </label>

      <select
        id="project-selector"
        value={selectedProjectId ?? ''}
        onChange={handleChange}
        disabled={isDisabled}
        aria-required="true"
        aria-invalid={!!error}
        aria-describedby={error ? 'project-selector-error' : undefined}
        className={`w-full bg-[#201f21] border-0 border-b text-base py-3 px-0 transition-all appearance-none cursor-pointer focus:ring-0 ${
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-[#3c494e] focus:border-[#00d4ff]'
        } ${
          isDisabled
            ? 'opacity-50 cursor-not-allowed text-[rgba(187,201,207,0.4)]'
            : 'text-[#e5e1e4]'
        }`}
      >
        <option value="" disabled>
          Select a project...
        </option>
        {projects.map((project) => (
          <option key={project.projectId} value={project.projectId}>
            {project.name}
          </option>
        ))}
      </select>

      {isEmpty && (
        <p className="font-mono text-[12px] text-[#bbc9cf]">
          No projects available
        </p>
      )}

      {error && (
        <p
          id="project-selector-error"
          className="mt-1 text-xs text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
