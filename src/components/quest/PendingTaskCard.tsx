import { useState } from 'react';
import type { Quest } from '../../types';
import { canApproveReject, canEditPendingTask } from '../../utils/permissions';
import { validateRejectionReason } from '../../utils/validation';
import { ValidationError } from '../shared';
import { EditTaskModal } from './EditTaskModal';

interface PendingTaskCardProps {
  quest: Quest;
  currentMemberId: string;
  isScrumMaster: boolean;
  proposerName?: string;
  onApprove: (questId: string) => void;
  onReject: (questId: string, reason: string) => void;
  onEdit?: (questId: string, title: string, description: string) => Promise<void>;
  onWithdraw?: (questId: string) => Promise<void>;
}

export function PendingTaskCard({
  quest,
  currentMemberId,
  isScrumMaster,
  proposerName,
  onApprove,
  onReject,
  onEdit,
  onWithdraw,
}: PendingTaskCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonTouched, setReasonTouched] = useState(false);
  const [mode, setMode] = useState<'review' | 'reject'>('review');
  const [withdrawing, setWithdrawing] = useState(false);

  const canReview = canApproveReject(currentMemberId, quest, isScrumMaster);
  const canEdit = canEditPendingTask(quest, currentMemberId);
  const reasonValidation = validateRejectionReason(reason);

  function handleOpenModal() {
    setMode('review');
    setShowModal(true);
  }

  function handleApprove() {
    onApprove(quest.questId);
    setShowModal(false);
  }

  function handleRejectClick() {
    setMode('reject');
  }

  function handleRejectConfirm() {
    setReasonTouched(true);
    if (!reasonValidation.valid) return;
    onReject(quest.questId, reason.trim());
    setShowModal(false);
    setReason('');
    setReasonTouched(false);
    setMode('review');
  }

  function handleClose() {
    setShowModal(false);
    setReason('');
    setReasonTouched(false);
    setMode('review');
  }

  async function handleWithdraw() {
    if (!onWithdraw || withdrawing) return;
    setWithdrawing(true);
    try {
      await onWithdraw(quest.questId);
      setShowWithdrawConfirm(false);
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <>
      {/* Card */}
      <div className="rounded-xl border border-surface-200 bg-white p-4 transition-shadow hover:shadow-card-hover">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="badge-pill bg-surface-100 text-surface-500 text-[10px] uppercase tracking-wide font-semibold">
                Proposal
              </span>
            </div>
            <h4 className="mt-1.5 text-sm font-semibold text-surface-900">{quest.title}</h4>
            {quest.description && (
              <p className="mt-1 text-xs text-surface-500 line-clamp-2">{quest.description}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-shrink-0 gap-1.5">
            {/* Edit/Withdraw buttons — visible to the proposer */}
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="rounded-lg border border-surface-200 bg-white px-2.5 py-1.5 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-50"
                aria-label={`Edit task: ${quest.title}`}
              >
                Edit
              </button>
            )}
            {canEdit && onWithdraw && (
              <button
                type="button"
                onClick={() => setShowWithdrawConfirm(true)}
                className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                aria-label={`Withdraw task: ${quest.title}`}
              >
                Withdraw
              </button>
            )}
            {/* Review button — visible to scrum master (who is not the proposer) */}
            {canReview && !canEdit && (
              <button
                type="button"
                onClick={handleOpenModal}
                className="rounded-lg border border-madrid-200 bg-madrid-50 px-3 py-1.5 text-xs font-medium text-madrid-700 transition-colors hover:bg-madrid-100"
                aria-label={`Review task: ${quest.title}`}
              >
                Review
              </button>
            )}
            {/* If user is both SM and proposer, show Review alongside Edit/Withdraw */}
            {canReview && canEdit && (
              <button
                type="button"
                onClick={handleOpenModal}
                className="rounded-lg border border-madrid-200 bg-madrid-50 px-3 py-1.5 text-xs font-medium text-madrid-700 transition-colors hover:bg-madrid-100"
                aria-label={`Review task: ${quest.title}`}
              >
                Review
              </button>
            )}
          </div>
        </div>

        {/* Status for non-action users */}
        {!canReview && !canEdit && (
          <p className="mt-2 text-xs text-surface-400 italic">Awaiting Scrum Master approval</p>
        )}
      </div>

      {/* Approval/Rejection Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`modal-title-${quest.questId}`}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Modal content */}
          <div className="relative w-full max-w-md rounded-2xl border border-surface-200 bg-white p-6 shadow-elevated animate-fade-slide-up">
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
              <h3 id={`modal-title-${quest.questId}`} className="text-lg font-semibold text-surface-900">
                Review Task Proposal
              </h3>
              <p className="mt-1 text-sm text-surface-500">
                Approve or reject this proposed task.
              </p>
            </div>

            {/* Task details */}
            <div className="mb-5 rounded-xl border border-surface-100 bg-surface-50 p-4">
              <h4 className="text-sm font-semibold text-surface-900">{quest.title}</h4>
              {quest.description && (
                <p className="mt-1.5 text-sm text-surface-600">{quest.description}</p>
              )}
              <p className="mt-2 text-xs text-surface-400">
                Proposed by: {proposerName ?? quest.proposerId ?? 'Unknown'}
              </p>
            </div>

            {/* Actions */}
            {mode === 'review' && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleApprove}
                  className="flex-1 rounded-lg bg-madrid-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-madrid-700 focus:outline-none focus:ring-2 focus:ring-madrid-500 focus:ring-offset-2"
                >
                  ✓ Approve
                </button>
                <button
                  type="button"
                  onClick={handleRejectClick}
                  className="flex-1 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  ✕ Reject
                </button>
              </div>
            )}

            {/* Rejection reason form */}
            {mode === 'reject' && (
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor={`modal-reject-reason-${quest.questId}`}
                    className="block text-sm font-medium text-surface-700"
                  >
                    Reason for rejection <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id={`modal-reject-reason-${quest.questId}`}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    onBlur={() => setReasonTouched(true)}
                    maxLength={250}
                    rows={3}
                    placeholder="Explain why this task is being rejected..."
                    className="mt-1.5 block w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-sm text-surface-900 placeholder-surface-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    aria-describedby={`modal-reject-error-${quest.questId}`}
                    aria-invalid={reasonTouched && !reasonValidation.valid}
                    autoFocus
                  />
                  <div className="mt-1.5 flex items-center justify-between">
                    <div id={`modal-reject-error-${quest.questId}`}>
                      {reasonTouched && <ValidationError message={reasonValidation.error} />}
                    </div>
                    <span className="text-xs text-surface-400">{reason.length}/250</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleRejectConfirm}
                    disabled={!reasonValidation.valid}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Confirm Rejection
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('review')}
                    className="flex-1 rounded-lg border border-surface-200 bg-white px-4 py-2.5 text-sm font-medium text-surface-700 transition-colors hover:bg-surface-50"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && onEdit && (
        <EditTaskModal
          quest={quest}
          onSubmit={onEdit}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Withdraw Confirmation Dialog */}
      {showWithdrawConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`withdraw-title-${quest.questId}`}
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowWithdrawConfirm(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-surface-200 bg-white p-6 shadow-elevated animate-fade-slide-up">
            <h3 id={`withdraw-title-${quest.questId}`} className="text-lg font-semibold text-surface-900">
              Withdraw Task?
            </h3>
            <p className="mt-2 text-sm text-surface-600">
              Are you sure you want to withdraw "{quest.title}"? This will remove it from the pending list.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {withdrawing ? 'Withdrawing…' : 'Withdraw'}
              </button>
              <button
                type="button"
                onClick={() => setShowWithdrawConfirm(false)}
                className="flex-1 rounded-lg border border-surface-200 bg-white px-4 py-2.5 text-sm font-medium text-surface-700 transition-colors hover:bg-surface-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
