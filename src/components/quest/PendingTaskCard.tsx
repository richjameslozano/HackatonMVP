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
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{quest.title}</h4>
          {quest.description && (
            <p className="mt-0.5 text-xs text-gray-500">{quest.description}</p>
          )}
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
          Pending approval
        </span>
      </div>

      {showActions && !showRejectPrompt && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleApprove}
            className="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={handleRejectClick}
            className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Reject
          </button>
        </div>
      )}

      {showRejectPrompt && (
        <div className="mt-3 space-y-2 rounded-md border border-red-200 bg-red-50 p-3">
          <label htmlFor={`reject-reason-${quest.questId}`} className="block text-xs font-medium text-gray-700">
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
            className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
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
              className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirm Rejection
            </button>
            <button
              type="button"
              onClick={handleRejectCancel}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
