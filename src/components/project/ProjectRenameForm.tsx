import { useState } from 'react';
import { validateProjectName, validateProjectNameUniqueness } from '../../utils/validation';
import { useProjectStore } from '../../store/project.store';

// ─── Props Interface ────────────────────────────────────────────────────────

interface ProjectRenameFormProps {
  projectId: string;
  currentName: string;
  existingNames: string[];
  onRename: (projectId: string, newName: string) => Promise<void>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ProjectRenameForm({
  projectId,
  currentName,
  existingNames,
  onRename,
}: ProjectRenameFormProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const renameError = useProjectStore((s) => s.renameError);

  function handleStartEditing() {
    setName(currentName);
    setValidationError(null);
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
    setName(currentName);
    setValidationError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    const trimmedName = name.trim();

    // Skip if name hasn't changed
    if (trimmedName === currentName) {
      setEditing(false);
      return;
    }

    // Validate project name format (empty, length)
    const nameResult = validateProjectName(trimmedName);
    if (!nameResult.valid) {
      setValidationError(nameResult.error ?? 'Invalid project name');
      return;
    }

    // Validate project name uniqueness (case-insensitive)
    const uniqueResult = validateProjectNameUniqueness(trimmedName, existingNames, projectId);
    if (!uniqueResult.valid) {
      setValidationError(uniqueResult.error ?? 'Project name already exists');
      return;
    }

    // Submit the rename
    setIsSubmitting(true);
    try {
      await onRename(projectId, trimmedName);
      setEditing(false);
    } catch {
      setValidationError('Failed to rename project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={handleStartEditing}
        className="rounded-md px-2 py-1 text-xs font-medium text-madrid-600 transition-colors hover:bg-madrid-50 hover:text-madrid-700"
        aria-label={`Rename project: ${currentName}`}
      >
        Rename
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {renameError && (
        <div
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2"
          role="alert"
        >
          <svg
            className="h-4 w-4 shrink-0 text-red-500"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-red-700">{renameError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="flex flex-col">
          <label htmlFor={`rename-input-${projectId}`} className="sr-only">
            New project name
          </label>
          <input
            id={`rename-input-${projectId}`}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setValidationError(null);
            }}
            maxLength={100}
            className="rounded-md border border-surface-200 bg-surface-50 px-2 py-1 text-sm text-surface-900 focus:border-madrid-500 focus:outline-none focus:ring-1 focus:ring-madrid-500"
            aria-invalid={!!validationError}
            aria-describedby={validationError ? `rename-error-${projectId}` : undefined}
            autoFocus
            disabled={isSubmitting}
          />
          {validationError && (
            <p
              id={`rename-error-${projectId}`}
              className="mt-1 text-xs text-red-600"
              role="alert"
            >
              {validationError}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-madrid-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-madrid-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSubmitting}
          className="rounded-md border border-surface-200 bg-white px-2.5 py-1 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
