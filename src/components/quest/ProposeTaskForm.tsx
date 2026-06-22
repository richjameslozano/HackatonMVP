import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { validateTaskTitle, validateTaskDescription } from '../../utils/validation';
import { ValidationError } from '../shared';
import { ProjectSelector } from '../project/ProjectSelector';
import type { Difficulty } from '../../types';
import { useAppStore } from '../../store/app.store';
import { useProjectStore } from '../../store/project.store';

interface ProposeTaskFormProps {
  onSubmit: (title: string, description: string, difficulty: Difficulty, projectId: string) => Promise<void>;
}

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; coins: number; sublabel: string; colorClass: string }[] = [
  { value: 'easy', label: 'EASY', coins: 1, sublabel: 'Standard task', colorClass: 'text-[#bbc9cf]' },
  { value: 'medium', label: 'MEDIUM', coins: 2, sublabel: 'High priority', colorClass: 'text-[#d1bcff]' },
  { value: 'hard', label: 'HARD', coins: 3, sublabel: 'Critical mission', colorClass: 'text-[#00d4ff]' },
];

export function ProposeTaskButton({ onSubmit }: ProposeTaskFormProps) {
  const currentMember = useAppStore((s) => s.currentMember);
  const hasProject = (currentMember?.projectIds.length ?? 0) > 0;

  const developerProjects = useProjectStore((s) => s.developerProjects);
  const projectsLoading = useProjectStore((s) => s.projectsLoading);
  const fetchDeveloperProjects = useProjectStore((s) => s.fetchDeveloperProjects);

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);
  const [descTouched, setDescTouched] = useState(false);

  // Fetch developer projects on mount when member is available
  useEffect(() => {
    if (currentMember?.memberId) {
      void fetchDeveloperProjects(currentMember.memberId);
    }
  }, [currentMember?.memberId, fetchDeveloperProjects]);

  const titleValidation = validateTaskTitle(title);
  const descValidation = validateTaskDescription(description);
  const isFormValid = titleValidation.valid && descValidation.valid && !!selectedProjectId;

  function handleOpen() {
    setShowModal(true);
  }

  function handleClose() {
    setShowModal(false);
    setTitle('');
    setDescription('');
    setDifficulty('easy');
    setSelectedProjectId(null);
    setProjectError(null);
    setTitleTouched(false);
    setDescTouched(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTitleTouched(true);
    setDescTouched(true);

    // Validate project selection (Req 1.4)
    if (!selectedProjectId) {
      setProjectError('Project selection is required');
      return;
    }
    setProjectError(null);

    if (!isFormValid || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit(title.trim(), description.trim(), difficulty, selectedProjectId);
      handleClose();
    } finally {
      setSubmitting(false);
    }
  }

  // ─── No Project Assigned State ──────────────────────────────────────────
  if (!hasProject) {
    return (
      <div className="flex flex-col items-center gap-2 py-3 px-4 border border-[rgba(60,215,255,0.15)] bg-[rgba(0,212,255,0.03)] rounded">
        <span className="material-symbols-outlined text-[#bbc9cf] text-2xl">folder_off</span>
        <p className="font-mono text-[12px] text-[#bbc9cf] text-center uppercase">
          No project yet
        </p>
        <p className="text-xs text-[rgba(187,201,207,0.6)] text-center">
          Ask an admin to assign you to a project before proposing tasks.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Propose Task Button */}
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 bg-[#00d4ff] px-4 py-2.5 text-sm font-bold text-[#003642] shadow-sm transition-all hover:bg-[#3cd7ff] hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] focus:outline-none active:scale-95"
      >
        <span className="material-symbols-outlined text-lg">add_box</span>
        Propose Task
      </button>

      {/* Modal — rendered via portal to escape parent stacking context */}
      {showModal && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="propose-task-modal-title"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {/* Backdrop click to close */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Modal container */}
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0e0e10] border border-[rgba(0,212,255,0.3)] shadow-[0_0_15px_rgba(0,212,255,0.15),inset_0_0_2px_rgba(0,212,255,0.3)] animate-fade-slide-up">
            {/* Top-right metadata */}
            <div className="absolute top-4 right-6 font-mono text-[12px] text-[rgba(60,215,255,0.4)]">
              SYS_REQ: QUEST_GEN_v4.2
            </div>

            {/* Content */}
            <div className="p-6 md:p-10 space-y-8">
              {/* Header */}
              <div className="flex items-center gap-4 border-b border-[#3c494e]/20 pb-6">
                <div className="flex items-center justify-center w-12 h-12 bg-[rgba(0,212,255,0.1)] border border-[rgba(60,215,255,0.3)]">
                  <span className="material-symbols-outlined text-[#3cd7ff]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    swords
                  </span>
                </div>
                <div>
                  <h1 id="propose-task-modal-title" className="font-headline text-2xl font-semibold text-[#e5e1e4] tracking-tight flex items-center gap-2">
                    Propose New Quest
                    <span className="material-symbols-outlined text-[#3cd7ff] text-lg">diamond</span>
                  </h1>
                  <p className="font-mono text-[12px] text-[#bbc9cf] uppercase mt-1">
                    Initialize direct action protocol
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Project Selection */}
                <ProjectSelector
                  projects={developerProjects}
                  selectedProjectId={selectedProjectId}
                  onSelect={(projectId) => {
                    setSelectedProjectId(projectId);
                    setProjectError(null);
                  }}
                  error={projectError}
                  disabled={projectsLoading}
                />

                {/* Title */}
                <div className="space-y-2 group">
                  <label htmlFor="modal-task-title" className="font-mono text-[12px] text-[#3cd7ff] uppercase flex justify-between">
                    Quest Title
                    <span className="text-[rgba(187,201,207,0.4)]">Required</span>
                  </label>
                  <input
                    id="modal-task-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => setTitleTouched(true)}
                    maxLength={100}
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
                  <label htmlFor="modal-task-description" className="font-mono text-[12px] text-[#3cd7ff] uppercase">
                    Description
                  </label>
                  <textarea
                    id="modal-task-description"
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
                            name="difficulty"
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
                        Submit Proposal
                        <span className="material-symbols-outlined text-lg">send</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 border border-[rgba(60,215,255,0.3)] text-[#3cd7ff] font-headline text-xl font-semibold py-4 hover:bg-[rgba(0,212,255,0.1)] transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>

            {/* Bottom progress bar decoration */}
            <div className="w-full h-1 bg-[#3c494e]/10">
              <div className="h-full w-2/3 bg-gradient-to-r from-[#00d4ff] to-[#6100e0]" />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Keep backward compatibility export
export const ProposeTaskForm = ProposeTaskButton;
