import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { validateTaskTitle, validateTaskDescription } from '../../utils/validation';
import { ValidationError } from '../shared';
import { ProjectSelector } from '../project/ProjectSelector';
import { useAppStore } from '../../store/app.store';
import { useProjectStore } from '../../store/project.store';
import { createSmTask } from '../../services/quest.service';
import type { Difficulty } from '../../types';
import type { DeveloperOverview } from '../../services/team-progress.service';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SmTaskCreationFormProps {
  developers: DeveloperOverview[];
  onClose: () => void;
  onTaskCreated: () => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; coins: number; sublabel: string; colorClass: string }[] = [
  { value: 'easy', label: 'EASY', coins: 1, sublabel: 'Standard task', colorClass: 'text-[#bbc9cf]' },
  { value: 'medium', label: 'MEDIUM', coins: 2, sublabel: 'High priority', colorClass: 'text-[#d1bcff]' },
  { value: 'hard', label: 'HARD', coins: 3, sublabel: 'Critical mission', colorClass: 'text-[#00d4ff]' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function SmTaskCreationForm({ developers, onClose, onTaskCreated }: SmTaskCreationFormProps) {
  const currentMember = useAppStore((s) => s.currentMember);

  const smAssignedProjects = useProjectStore((s) => s.smAssignedProjects);
  const projectsLoading = useProjectStore((s) => s.projectsLoading);
  const fetchSmAssignedProjects = useProjectStore((s) => s.fetchSmAssignedProjects);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [selectedDeveloperId, setSelectedDeveloperId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [titleTouched, setTitleTouched] = useState(false);
  const [descTouched, setDescTouched] = useState(false);

  // Fetch SM's assigned projects on mount
  useEffect(() => {
    if (currentMember?.memberId) {
      void fetchSmAssignedProjects(currentMember.memberId);
    }
  }, [currentMember?.memberId, fetchSmAssignedProjects]);

  const titleValidation = validateTaskTitle(title);
  const descValidation = validateTaskDescription(description);
  const hasNoProjects = !projectsLoading && smAssignedProjects.length === 0;
  const isFormValid = titleValidation.valid && descValidation.valid && !!selectedProjectId && selectedDeveloperId !== '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTitleTouched(true);
    setDescTouched(true);
    setSubmitError(null);

    // Validate project selection (Req 3.3)
    if (!selectedProjectId) {
      setProjectError('Project selection is required');
      return;
    }
    setProjectError(null);

    if (!isFormValid || submitting || !currentMember) return;

    setSubmitting(true);
    try {
      await createSmTask({
        title: title.trim(),
        description: description.trim() || undefined,
        assigneeId: selectedDeveloperId,
        projectId: selectedProjectId,
        scrumMasterId: currentMember.memberId,
      });
      onTaskCreated();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      setSubmitError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sm-task-creation-modal-title"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0e0e10] border border-[rgba(0,212,255,0.3)] shadow-[0_0_15px_rgba(0,212,255,0.15),inset_0_0_2px_rgba(0,212,255,0.3)] animate-fade-slide-up">
        {/* Top-right metadata */}
        <div className="absolute top-4 right-6 font-mono text-[12px] text-[rgba(60,215,255,0.4)]">
          SYS_CMD: SM_TASK_CREATE_v1.0
        </div>

        {/* Content */}
        <div className="p-6 md:p-10 space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4 border-b border-[#3c494e]/20 pb-6">
            <div className="flex items-center justify-center w-12 h-12 bg-[rgba(0,212,255,0.1)] border border-[rgba(60,215,255,0.3)]">
              <span className="material-symbols-outlined text-[#3cd7ff]" style={{ fontVariationSettings: "'FILL' 1" }}>
                assignment_ind
              </span>
            </div>
            <div>
              <h1 id="sm-task-creation-modal-title" className="font-headline text-2xl font-semibold text-[#e5e1e4] tracking-tight flex items-center gap-2">
                Create Task
                <span className="material-symbols-outlined text-[#3cd7ff] text-lg">bolt</span>
              </h1>
              <p className="font-mono text-[12px] text-[#bbc9cf] uppercase mt-1">
                Create &amp; assign to developer within your projects
              </p>
            </div>
          </div>

          {/* No Projects Warning (Req 3.3 — block creation if no assigned projects) */}
          {hasNoProjects && (
            <div className="flex flex-col items-center gap-3 py-6 px-4 border border-[rgba(255,100,100,0.2)] bg-[rgba(255,100,100,0.03)] rounded">
              <span className="material-symbols-outlined text-[#ff6464] text-3xl">folder_off</span>
              <p className="font-mono text-[12px] text-[#ff6464] text-center uppercase">
                No assigned projects
              </p>
              <p className="text-xs text-[rgba(187,201,207,0.6)] text-center">
                You are not assigned to any projects yet. An admin must assign you as Scrum Master on a task within a project first.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 border border-[rgba(60,215,255,0.3)] text-[#3cd7ff] font-mono text-sm px-6 py-2 hover:bg-[rgba(0,212,255,0.1)] transition-all"
              >
                Close
              </button>
            </div>
          )}

          {/* Form — only rendered when SM has assigned projects */}
          {!hasNoProjects && (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Title */}
              <div className="space-y-2">
                <label htmlFor="sm-task-title" className="font-mono text-[12px] text-[#3cd7ff] uppercase flex justify-between">
                  Quest Title
                  <span className="text-[rgba(187,201,207,0.4)]">Required</span>
                </label>
                <input
                  id="sm-task-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setTitleTouched(true)}
                  maxLength={200}
                  placeholder="Enter task title..."
                  className="w-full bg-[#201f21] border-0 border-b border-[#3c494e] focus:border-[#00d4ff] focus:ring-0 text-[#e5e1e4] text-base py-3 px-0 transition-all placeholder:text-[rgba(187,201,207,0.3)]"
                  autoFocus
                />
                {titleTouched && !titleValidation.valid && (
                  <ValidationError message={titleValidation.error} />
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label htmlFor="sm-task-description" className="font-mono text-[12px] text-[#3cd7ff] uppercase">
                  Description
                </label>
                <textarea
                  id="sm-task-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => setDescTouched(true)}
                  maxLength={500}
                  rows={4}
                  placeholder="Detail the parameters of the quest..."
                  className="w-full bg-[#201f21] border-0 border-b border-[#3c494e] focus:border-[#00d4ff] focus:ring-0 text-[#e5e1e4] text-base py-3 px-0 transition-all placeholder:text-[rgba(187,201,207,0.3)] resize-none"
                />
                {descTouched && !descValidation.valid && (
                  <ValidationError message={descValidation.error} />
                )}
              </div>

              {/* Project Selector (Req 3.3 — SM's assigned projects only) */}
              <ProjectSelector
                projects={smAssignedProjects}
                selectedProjectId={selectedProjectId}
                onSelect={(id) => {
                  setSelectedProjectId(id);
                  setProjectError(null);
                }}
                error={projectError}
                disabled={projectsLoading}
              />

              {/* Difficulty Selection */}
              <div className="space-y-4">
                <label className="font-mono text-[12px] text-[#3cd7ff] uppercase">
                  Difficulty Selection
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {DIFFICULTY_OPTIONS.map((option) => {
                    const isSelected = difficulty === option.value;
                    return (
                      <label key={option.value} className="cursor-pointer">
                        <input
                          type="radio"
                          name="sm-task-difficulty"
                          value={option.value}
                          checked={isSelected}
                          onChange={() => setDifficulty(option.value)}
                          className="hidden"
                        />
                        <div className={`p-4 border bg-[#1c1b1d] transition-all duration-200 flex flex-col items-center text-center gap-2 ${isSelected
                          ? 'border-[#3cd7ff] bg-[rgba(0,212,255,0.05)] shadow-[0_0_10px_rgba(0,212,255,0.2)]'
                          : 'border-[#3c494e]/30 hover:border-[#3c494e]'
                          }`}>
                          <span className={`font-mono text-[12px] uppercase ${option.colorClass}`}>
                            {option.label}
                          </span>
                          <div className="text-[#e5e1e4] font-headline text-2xl font-semibold">
                            {option.coins} Coin{option.coins > 1 ? 's' : ''}
                          </div>
                          <div className="w-full h-[1px] bg-[#3c494e]/20" />
                          <span className="font-mono text-[12px] text-[rgba(187,201,207,0.6)]">
                            {option.sublabel}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Assign To */}
              <div className="space-y-2">
                <label htmlFor="sm-task-assignee" className="font-mono text-[12px] text-[#3cd7ff] uppercase flex justify-between">
                  Assign To
                  <span className="text-[rgba(187,201,207,0.4)]">Required</span>
                </label>
                <select
                  id="sm-task-assignee"
                  value={selectedDeveloperId}
                  onChange={(e) => setSelectedDeveloperId(e.target.value)}
                  className="w-full bg-[#201f21] border-0 border-b border-[#3c494e] focus:border-[#00d4ff] focus:ring-0 text-[#e5e1e4] text-base py-3 px-0 transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select a developer...</option>
                  {developers.map((dev) => (
                    <option key={dev.member.memberId} value={dev.member.memberId}>
                      {dev.member.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Error */}
              {submitError && (
                <div className="p-3 border border-red-500/30 bg-red-500/5 rounded">
                  <p className="text-xs text-red-400 font-mono">{submitError}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col md:flex-row gap-4 pt-4">
                <button
                  type="submit"
                  disabled={!isFormValid || submitting}
                  className="flex-1 bg-[#00d4ff] text-[#003642] font-headline text-xl font-semibold py-4 shadow-[0_0_20px_rgba(0,212,255,0.4)] hover:bg-[#3cd7ff] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                      Processing...
                    </>
                  ) : (
                    <>
                      Create Task
                      <span className="material-symbols-outlined text-lg">send</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 border border-[rgba(60,215,255,0.3)] text-[#3cd7ff] font-headline text-xl font-semibold py-4 hover:bg-[rgba(0,212,255,0.1)] transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Bottom progress bar decoration */}
        <div className="w-full h-1 bg-[#3c494e]/10">
          <div className="h-full w-2/3 bg-gradient-to-r from-[#00d4ff] to-[#6100e0]" />
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
