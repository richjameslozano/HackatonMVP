import { useState } from 'react';
import type { Quest } from '../../types';
import { canApproveReject } from '../../utils/permissions';
import { validateRejectionReason } from '../../utils/validation';
import { ValidationError } from '../shared';

interface PendingTaskCardProps {
  quest: Quest;
  currentMemberId: string;
  isScrumMaster: boolean;
  onApprove: (questId: string) => void;
  onReject: (questId: string, reason: string) => void;
}

export function PendingTaskCard({
  quest,
  currentMemberId,
  isScrumMaster,
  onApprove,
  onReject,
}: PendingTaskCardProps) {
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonTouched, setReasonTouched] = useState(false);

  const showActions = canApproveReject(currentMemberId, quest, isScrumMaster);
  const reasonValidation = validateRejectionReason(reason);

  function handleApprove() {
    onApprove(quest.questId);
  }

  function handleRejectClick() {
    setShowRejectPrompt(true);
  }

  function handleRejectConfirm() {
    setReasonTouched(true);
    if (!reasonValidation.valid) return;
    onReject(quest.questId, reason.trim());
    setShowRejectPrompt(false);
    setReason('');
    setReasonTouched(false);
  }

  function handleRejectCancel() {
    setShowRejectPrompt(false);
    setReason('');
    setReasonTouched(false);
  }

  return (
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
            <p className="mt-1 text-xs text-surface-500">{quest.description}</p>
          )}
        </div>
        {showActions && !showRejectPrompt && (
          <button
            type="button"
            onClick={handleApprove}
            className="flex-shrink-0 rounded-full p-1.5 text-madrid-600 hover:bg-madrid-50 transition-colors"
            aria-label="Approve task"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
      </div>

      {showActions && !showRejectPrompt && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleApprove}
            className="inline-flex items-center rounded-lg bg-madrid-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-madrid-700 focus:outline-none focus:ring-2 focus:ring-madrid-500 focus:ring-offset-2"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={handleRejectClick}
            className="inline-flex items-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Reject
          </button>
        </div>
      )}

      {showRejectPrompt && (
        <div className="mt-3 space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <label htmlFor={`reject-reason-${quest.questId}`} className="block text-xs font-medium text-surface-700">
            Reason for rejection <span className="text-red-500">*</span>
          </label>
          <textarea
            id={`reject-reason-${quest.questId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setReasonTouched(true)}
            maxLength={250}
            rows={2}
            placeholder="Explain why this task is being rejected"
            className="block w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            aria-describedby={`reject-error-${quest.questId}`}
            aria-invalid={reasonTouched && !reasonValidation.valid}
          />
          <div id={`reject-error-${quest.questId}`}>
            {reasonTouched && <ValidationError message={reasonValidation.error} />}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRejectConfirm}
              disabled={!reasonValidation.valid}
              className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirm Rejection
            </button>
            <button
              type="button"
              onClick={handleRejectCancel}
              className="inline-flex items-center rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-xs font-medium text-surface-700 transition-colors hover:bg-surface-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
