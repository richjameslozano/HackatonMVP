import { useState, useEffect } from 'react';
import { DifficultySelector } from '../shared/DifficultySelector';
import { listProjects } from '../../services/project.service';
import { validateAdminTaskTitle, validateAdminTaskDescription, validateProjectSelection } from '../../utils/validation';
import type { Difficulty, Project } from '../../types';
import { LoadingIndicator } from '../shared/LoadingIndicator';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  description: string;
  difficulty: Difficulty;
  targetRole: 'agent' | 'developer';
  selectedProjectIds: string[];
  allProjects: boolean;
}

interface FieldErrors {
  title?: string;
  description?: string;
  projects?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AdminTaskForm() {
  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    difficulty: 'easy',
    targetRole: 'developer',
    selectedProjectIds: [],
    allProjects: false,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ─── Fetch Projects on Mount ──────────────────────────────────────────

  useEffect(() => {
    async function fetchProjects() {
      try {
        const data = await listProjects();
        setProjects(data);
      } catch {
        setErrorMessage('Failed to load projects.');
      } finally {
        setIsLoadingProjects(false);
      }
    }
    void fetchProjects();
  }, []);

  // ─── Auto-dismiss success toast ─────────────────────────────────────────

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  // ─── Validation ─────────────────────────────────────────────────────────

  function validateAll(): boolean {
    const errors: FieldErrors = {};

    const titleResult = validateAdminTaskTitle(form.title);
    if (!titleResult.valid) errors.title = titleResult.error;

    const descResult = validateAdminTaskDescription(form.description);
    if (!descResult.valid) errors.description = descResult.error;

    const projectIds = form.allProjects
      ? projects.map((p) => p.projectId)
      : form.selectedProjectIds;
    const projectResult = validateProjectSelection(projectIds);
    if (!projectResult.valid) errors.projects = projectResult.error;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ─── Handlers ───────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateAll()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { createAdminTask } = await import('../../services/quest.service');
      const projectIds = form.allProjects
        ? projects.map((p) => p.projectId)
        : form.selectedProjectIds;

      await createAdminTask(form.title, form.description, form.difficulty, form.targetRole, projectIds);
      setSuccessMessage('Task created successfully.');
      // Reset form on success
      setForm({
        title: '',
        description: '',
        difficulty: 'easy',
        targetRole: 'developer',
        selectedProjectIds: [],
        allProjects: false,
      });
    } catch {
      setErrorMessage('Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleProjectToggle(projectId: string) {
    setForm((prev) => {
      const ids = prev.selectedProjectIds.includes(projectId)
        ? prev.selectedProjectIds.filter((id) => id !== projectId)
        : [...prev.selectedProjectIds, projectId];
      return { ...prev, selectedProjectIds: ids, allProjects: false };
    });
    if (fieldErrors.projects) {
      setFieldErrors((prev) => ({ ...prev, projects: undefined }));
    }
  }

  function handleAllProjectsToggle() {
    setForm((prev) => ({ ...prev, allProjects: !prev.allProjects, selectedProjectIds: [] }));
    if (fieldErrors.projects) {
      setFieldErrors((prev) => ({ ...prev, projects: undefined }));
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="text-lg font-semibold text-[#e5e1e4]">Create Task</h2>
      <p className="mt-1 text-sm text-[#859398]">
        Create a new task and assign it to one or more projects.
      </p>

      {/* Success Toast */}
      {successMessage && (
        <div
          className="mt-4 flex items-center gap-2 rounded-xl border border-green-800 bg-green-900/30 px-4 py-3"
          role="status"
          aria-live="polite"
        >
          <svg className="h-5 w-5 shrink-0 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-medium text-green-400">{successMessage}</p>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-800 bg-red-900/30 px-4 py-3" role="alert">
          <svg className="h-5 w-5 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-400">{errorMessage}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Title */}
        <div>
          <label htmlFor="task-title" className="block text-sm font-medium text-[#bbc9cf]">
            Title
          </label>
          <input
            id="task-title"
            type="text"
            maxLength={100}
            value={form.title}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, title: e.target.value }));
              if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: undefined }));
            }}
            className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-[#e5e1e4] placeholder-[#859398] bg-[#201f21] focus:outline-none focus:ring-2 focus:border-[#00d4ff] focus:ring-[#00d4ff] ${fieldErrors.title ? 'border-red-500 focus:ring-red-500' : 'border-[#3c494e]'
              }`}
            aria-invalid={!!fieldErrors.title}
            aria-describedby={fieldErrors.title ? 'task-title-error' : undefined}
          />
          {fieldErrors.title && (
            <p id="task-title-error" className="mt-1 text-xs text-red-400" role="alert">
              {fieldErrors.title}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="task-description" className="block text-sm font-medium text-[#bbc9cf]">
            Description
          </label>
          <textarea
            id="task-description"
            maxLength={500}
            rows={3}
            value={form.description}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, description: e.target.value }));
              if (fieldErrors.description) setFieldErrors((prev) => ({ ...prev, description: undefined }));
            }}
            className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-[#e5e1e4] placeholder-[#859398] bg-[#201f21] focus:outline-none focus:ring-2 focus:border-[#00d4ff] focus:ring-[#00d4ff] ${fieldErrors.description ? 'border-red-500 focus:ring-red-500' : 'border-[#3c494e]'
              }`}
            aria-invalid={!!fieldErrors.description}
            aria-describedby={fieldErrors.description ? 'task-description-error' : undefined}
          />
          {fieldErrors.description && (
            <p id="task-description-error" className="mt-1 text-xs text-red-400" role="alert">
              {fieldErrors.description}
            </p>
          )}
        </div>

        {/* Difficulty */}
        <div>
          <DifficultySelector
            value={form.difficulty}
            onChange={(d) => setForm((prev) => ({ ...prev, difficulty: d }))}
          />
        </div>

        {/* Target Role */}
        <div>
          <label className="block text-sm font-medium text-[#bbc9cf] mb-2">Target Role</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-[#e5e1e4]">
              <input
                type="radio"
                name="targetRole"
                value="developer"
                checked={form.targetRole === 'developer'}
                onChange={() => setForm((prev) => ({ ...prev, targetRole: 'developer' }))}
                className="text-[#00d4ff] focus:ring-[#00d4ff]"
              />
              Developer
            </label>
            <label className="flex items-center gap-2 text-sm text-[#e5e1e4]">
              <input
                type="radio"
                name="targetRole"
                value="agent"
                checked={form.targetRole === 'agent'}
                onChange={() => setForm((prev) => ({ ...prev, targetRole: 'agent' }))}
                className="text-[#00d4ff] focus:ring-[#00d4ff]"
              />
              Agent
            </label>
          </div>
        </div>

        {/* Project Assignment */}
        <div>
          <label className="block text-sm font-medium text-[#bbc9cf] mb-2">Project Assignment</label>

          {isLoadingProjects ? (
            <LoadingIndicator message="Loading projects..." />
          ) : (
            <div className="space-y-2">
              {/* All Projects Toggle */}
              <label className="flex items-center gap-2 text-sm font-medium text-[#3cd7ff]">
                <input
                  type="checkbox"
                  checked={form.allProjects}
                  onChange={handleAllProjectsToggle}
                  className="rounded text-[#00d4ff] focus:ring-[#00d4ff]"
                />
                All Projects
              </label>

              {/* Individual Project Checkboxes */}
              {!form.allProjects && (
                <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-[#3c494e] bg-[#201f21] p-3">
                  {projects.length === 0 ? (
                    <p className="text-sm text-[#859398]">No projects available.</p>
                  ) : (
                    projects.map((project) => (
                      <label key={project.projectId} className="flex items-center gap-2 text-sm text-[#e5e1e4]">
                        <input
                          type="checkbox"
                          checked={form.selectedProjectIds.includes(project.projectId)}
                          onChange={() => handleProjectToggle(project.projectId)}
                          className="rounded text-[#00d4ff] focus:ring-[#00d4ff]"
                        />
                        {project.name}
                      </label>
                    ))
                  )}
                </div>
              )}

              {fieldErrors.projects && (
                <p className="mt-1 text-xs text-red-400" role="alert">
                  {fieldErrors.projects}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-[#00d4ff] px-4 py-2.5 text-sm font-medium text-[#003642] hover:bg-[#3cd7ff] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Task'}
        </button>
      </form>
    </div>
  );
}
