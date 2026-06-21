import { useState } from 'react';
import { validateTaskTitle, validateTaskDescription } from '../../utils/validation';
import { ValidationError } from '../shared';
import { DifficultySelector } from '../shared/DifficultySelector';
import type { Difficulty } from '../../types';

interface ProposeTaskFormProps {
  onSubmit: (title: string, description: string, difficulty: Difficulty) => Promise<void>;
}

export function ProposeTaskButton({ onSubmit }: ProposeTaskFormProps) {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [submitting, setSubmitting] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);
  const [descTouched, setDescTouched] = useState(false);

  const titleValidation = validateTaskTitle(title);
  const descValidation = validateTaskDescription(description);
  const isFormValid = titleValidation.valid && descValidation.valid;

  function handleOpen() {
    setShowModal(true);
  }

  function handleClose() {
    setShowModal(false);
    setTitle('');
    setDescription('');
    setDifficulty('easy');
    setTitleTouched(false);
    setDescTouched(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTitleTouched(true);
    setDescTouched(true);

    if (!isFormValid || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit(title.trim(), description.trim(), difficulty);
      handleClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Propose Task Button */}
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-lg bg-madrid-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-madrid-700 focus:outline-none focus:ring-2 focus:ring-madrid-500 focus:ring-offset-2"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Propose Task
      </button>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="propose-task-modal-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Modal content */}
          <div className="relative w-full max-w-lg rounded-2xl border border-surface-200 bg-white p-6 shadow-elevated animate-fade-slide-up">
            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-md p-1 text-surface-400 hover:text-surface-600"
              aria-label="Close"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>

            {/* Header */}
            <div className="mb-5">
              <h3 id="propose-task-modal-title" className="text-lg font-semibold text-surface-900">
                Propose a New Task
              </h3>
              <p className="mt-1 text-sm text-surface-500">
                Submit a sprint task for Scrum Master approval.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="modal-task-title" className="block text-sm font-medium text-surface-700">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="modal-task-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setTitleTouched(true)}
                  maxLength={100}
                  placeholder="Enter task title"
                  className="mt-1.5 block w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-sm text-surface-900 placeholder-surface-400 focus:border-madrid-500 focus:outline-none focus:ring-1 focus:ring-madrid-500"
                  aria-describedby="modal-title-error modal-title-count"
                  aria-invalid={titleTouched && !titleValidation.valid}
                  autoFocus
                />
                <div className="mt-1.5 flex items-center justify-between">
                  <div id="modal-title-error">
                    {titleTouched && <ValidationError message={titleValidation.error} />}
                  </div>
                  <span id="modal-title-count" className="text-xs text-surface-400">
                    {title.length}/100
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="modal-task-description" className="block text-sm font-medium text-surface-700">
                  Description <span className="text-xs text-surface-400">(optional)</span>
                </label>
                <textarea
                  id="modal-task-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => setDescTouched(true)}
                  maxLength={500}
                  rows={3}
                  placeholder="Describe the task in detail..."
                  className="mt-1.5 block w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-sm text-surface-900 placeholder-surface-400 focus:border-madrid-500 focus:outline-none focus:ring-1 focus:ring-madrid-500"
                  aria-describedby="modal-desc-error modal-desc-count"
                  aria-invalid={descTouched && !descValidation.valid}
                />
                <div className="mt-1.5 flex items-center justify-between">
                  <div id="modal-desc-error">
                    {descTouched && <ValidationError message={descValidation.error} />}
                  </div>
                  <span id="modal-desc-count" className="text-xs text-surface-400">
                    {description.length}/500
                  </span>
                </div>
              </div>

              <DifficultySelector value={difficulty} onChange={setDifficulty} />

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!isFormValid || submitting}
                  className="flex-1 rounded-lg bg-madrid-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-madrid-700 focus:outline-none focus:ring-2 focus:ring-madrid-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit Proposal'}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-surface-200 bg-white px-4 py-2.5 text-sm font-medium text-surface-700 transition-colors hover:bg-surface-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Keep backward compatibility export
export const ProposeTaskForm = ProposeTaskButton;
