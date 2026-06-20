import { useState } from 'react';
import type { Quest } from '../../types';
import { canCompleteQuest } from '../../utils/permissions';

interface QuestCardProps {
  quest: Quest;
  onComplete: (questId: string) => void;
  disabled?: boolean;
  completed?: boolean;
}

export function QuestCard({ quest, onComplete, disabled, completed }: QuestCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const isCompletable = canCompleteQuest(quest) && !disabled && !completed;

  const tooltipMessage =
    quest.status === 'pending'
      ? 'This task requires Scrum Master approval before completion'
      : quest.status === 'rejected'
        ? 'This task has been rejected and cannot be completed'
        : completed
          ? 'Quest already completed'
          : undefined;

  function handleChange() {
    if (isCompletable) {
      onComplete(quest.questId);
    }
  }

  return (
    <div
      className={`group relative flex items-start gap-3 rounded-xl border bg-white p-4 transition-all ${completed
          ? 'border-madrid-200 bg-madrid-50/50 opacity-75'
          : 'border-surface-200 hover:border-madrid-200 hover:shadow-card-hover'
        }`}
    >
      {/* Checkbox */}
      <div className="relative flex-shrink-0 pt-0.5">
        <input
          type="checkbox"
          id={`quest-${quest.questId}`}
          checked={completed}
          disabled={!isCompletable}
          onChange={handleChange}
          className="h-5 w-5 rounded border-surface-300 text-madrid-600 focus:ring-madrid-500 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Complete quest: ${quest.title}`}
          onMouseEnter={() => !isCompletable && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => !isCompletable && setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
        />
        {showTooltip && tooltipMessage && (
          <div
            role="tooltip"
            className="absolute bottom-full left-1/2 z-10 mb-2 w-52 -translate-x-1/2 rounded-lg bg-surface-900 px-3 py-2 text-xs text-white shadow-elevated"
          >
            {tooltipMessage}
            <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-surface-900" />
          </div>
        )}
      </div>

      {/* Content */}
      <label
        htmlFor={`quest-${quest.questId}`}
        className={`flex-1 min-w-0 ${!isCompletable ? 'opacity-60' : 'cursor-pointer'}`}
      >
        <h4 className={`text-sm font-medium ${completed ? 'text-surface-500 line-through' : 'text-surface-900'}`}>
          {quest.title}
        </h4>
        {quest.description && (
          <p className="mt-0.5 text-xs text-surface-500 line-clamp-2">{quest.description}</p>
        )}
      </label>

      {/* Status badges */}
      <div className="flex-shrink-0">
        {quest.status === 'pending' && (
          <span className="badge-pill bg-amber-100 text-amber-800">Pending</span>
        )}
        {quest.status === 'rejected' && (
          <span className="badge-pill bg-red-100 text-red-800">Rejected</span>
        )}
        {quest.assignmentType === 'open' && quest.status === 'active' && (
          <span className="badge-pill bg-blue-100 text-blue-800">
            {quest.completionMode === 'first-claim' ? '🏁 First Claim' : '👥 Open'}
          </span>
        )}
        {quest.assignmentType === 'assigned' && quest.status === 'active' && !completed && (
          <span className="badge-pill bg-purple-100 text-purple-800">Assigned</span>
        )}
        {completed && quest.status === 'active' && (
          <span className="badge-pill bg-madrid-100 text-madrid-800">
            <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
            Done
          </span>
        )}
      </div>
    </div>
  );
}
