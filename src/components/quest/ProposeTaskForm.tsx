import { useState } from 'react';
import { validateTaskTitle, validateTaskDescription } from '../../utils/validation';
import { ValidationError } from '../shared';

interface ProposeTaskFormProps {
  onSubmit: (title: string, description: string) => Promise<void>;
}

export function ProposeTaskForm({ onSubmit }: ProposeTaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);
  const [descTouched, setDescTouched] = useState(false);

  const titleValidation = validateTaskTitle(title);
  const descValidation = validateTaskDescription(description);

  const isFormValid = titleValidation.valid && descValidation.valid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTitleTouched(true);
    setDescTouched(true);

    if (!isFormValid || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit(title.trim(), description.trim());
      setTitle('');
      setDescription('');
      setTitleTouched(false);
      setDescTouched(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-gray-800">Propose a Task</h3>

      <div>
        <label htmlFor="task-title" className="block text-sm font-medium text-gray-700">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="task-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => setTitleTouched(true)}
          maxLength={100}
          placeholder="Enter task title"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          aria-describedby="title-error title-count"
          aria-invalid={titleTouched && !titleValidation.valid}
        />
        <div className="mt-1 flex items-center justify-between">
          <div id="title-error">
            {titleTouched && <ValidationError message={titleValidation.error} />}
          </div>
          <span id="title-count" className="text-xs text-gray-400">
            {title.length}/100
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="task-description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => setDescTouched(true)}
          maxLength={500}
          rows={3}
          placeholder="Optional description"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          aria-describedby="desc-error desc-count"
          aria-invalid={descTouched && !descValidation.valid}
        />
        <div className="mt-1 flex items-center justify-between">
          <div id="desc-error">
            {descTouched && <ValidationError message={descValidation.error} />}
          </div>
          <span id="desc-count" className="text-xs text-gray-400">
            {description.length}/500
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={!isFormValid || submitting}
        className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Propose Task'}
      </button>
    </form>
  );
}
