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
    <div className={`relative flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${completed ? 'opacity-60 bg-gray-50' : ''}`}>
      <div className="relative pt-0.5">
        <input
          type="checkbox"
          id={`quest-${quest.questId}`}
          checked={completed}
          disabled={!isCompletable}
          onChange={handleChange}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Complete quest: ${quest.title}`}
          onMouseEnter={() => !isCompletable && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => !isCompletable && setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
        />
        {showTooltip && tooltipMessage && (
          <div
            role="tooltip"
            className="absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg"
          >
            {tooltipMessage}
            <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>
      <label
        htmlFor={`quest-${quest.questId}`}
        className={`flex-1 ${!isCompletable ? 'opacity-60' : 'cursor-pointer'}`}
      >
        <h4 className="text-sm font-medium text-gray-900">{quest.title}</h4>
        {quest.description && (
          <p className="mt-0.5 text-xs text-gray-500">{quest.description}</p>
        )}
      </label>
      {quest.status !== 'active' && (
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            quest.status === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {quest.status === 'pending' ? 'Pending' : 'Rejected'}
        </span>
      )}
      {completed && quest.status === 'active' && (
        <span className="inline-flex shrink-0 items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
          Completed
        </span>
      )}
    </div>
  );
}
