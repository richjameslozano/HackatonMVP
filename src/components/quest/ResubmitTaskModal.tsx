import { useState } from 'react';
import type { Quest } from '../../types';
import { validateTaskTitle, validateTaskDescription } from '../../utils/validation';
import { ValidationError } from '../shared';

interface ResubmitTaskModalProps {
    quest: Quest;
    onSubmit: (originalQuestId: string, title: string, description: string) => Promise<void>;
    onClose: () => void;
}

export function ResubmitTaskModal({ quest, onSubmit, onClose }: ResubmitTaskModalProps) {
    const [title, setTitle] = useState(quest.title);
    const [description, setDescription] = useState(quest.description);
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
            await onSubmit(quest.questId, title.trim(), description.trim());
            onClose();
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resubmit-task-modal-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal content */}
            <div className="relative w-full max-w-lg rounded-2xl border border-surface-200 bg-white p-6 shadow-elevated animate-fade-slide-up">
                {/* Close button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-md p-1 text-surface-400 hover:text-surface-600"
                    aria-label="Close"
                >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                </button>

                {/* Header */}
                <div className="mb-5">
                    <h3 id="resubmit-task-modal-title" className="text-lg font-semibold text-surface-900">
                        Resubmit Task Proposal
                    </h3>
                    <p className="mt-1 text-sm text-surface-500">
                        Revise and resubmit your rejected task for another review.
                    </p>
                </div>

                {/* Rejection Reason */}
                {quest.rejectionReason && (
                    <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-3">
                        <p className="text-xs font-medium text-red-700 mb-1">Previous Rejection Reason</p>
                        <p className="text-sm text-red-600">{quest.rejectionReason}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="resubmit-task-title" className="block text-sm font-medium text-surface-700">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="resubmit-task-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={() => setTitleTouched(true)}
                            maxLength={100}
                            placeholder="Enter task title"
                            className="mt-1.5 block w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-sm text-surface-900 placeholder-surface-400 focus:border-madrid-500 focus:outline-none focus:ring-1 focus:ring-madrid-500"
                            aria-describedby="resubmit-title-error resubmit-title-count"
                            aria-invalid={titleTouched && !titleValidation.valid}
                            autoFocus
                        />
                        <div className="mt-1.5 flex items-center justify-between">
                            <div id="resubmit-title-error">
                                {titleTouched && <ValidationError message={titleValidation.error} />}
                            </div>
                            <span id="resubmit-title-count" className="text-xs text-surface-400">
                                {title.length}/100
                            </span>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="resubmit-task-description" className="block text-sm font-medium text-surface-700">
                            Description <span className="text-xs text-surface-400">(optional)</span>
                        </label>
                        <textarea
                            id="resubmit-task-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onBlur={() => setDescTouched(true)}
                            maxLength={500}
                            rows={3}
                            placeholder="Describe the task in detail..."
                            className="mt-1.5 block w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-sm text-surface-900 placeholder-surface-400 focus:border-madrid-500 focus:outline-none focus:ring-1 focus:ring-madrid-500"
                            aria-describedby="resubmit-desc-error resubmit-desc-count"
                            aria-invalid={descTouched && !descValidation.valid}
                        />
                        <div className="mt-1.5 flex items-center justify-between">
                            <div id="resubmit-desc-error">
                                {descTouched && <ValidationError message={descValidation.error} />}
                            </div>
                            <span id="resubmit-desc-count" className="text-xs text-surface-400">
                                {description.length}/500
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={!isFormValid || submitting}
                            className="flex-1 rounded-lg bg-madrid-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-madrid-700 focus:outline-none focus:ring-2 focus:ring-madrid-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {submitting ? 'Resubmitting…' : 'Resubmit Proposal'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-surface-200 bg-white px-4 py-2.5 text-sm font-medium text-surface-700 transition-colors hover:bg-surface-50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
