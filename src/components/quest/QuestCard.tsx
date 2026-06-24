import type { Quest } from '../../types';
import { canCompleteQuest } from '../../utils/permissions';

interface QuestCardProps {
  quest: Quest;
  onComplete: (questId: string) => void;
  disabled?: boolean;
  completed?: boolean;
  projectNameMap?: Record<string, string>;
}

export function QuestCard({ quest, onComplete, disabled, completed, projectNameMap }: QuestCardProps) {
  const isCompletable = canCompleteQuest(quest) && !disabled && !completed;

  function handleAction() {
    if (isCompletable) {
      onComplete(quest.questId);
    }
  }

  // Rarity badge color mapping based on difficulty
  const getRarityStyle = () => {
    const diff = quest.difficulty ?? 'easy';
    if (diff === 'hard') {
      return 'bg-[#003642]/60 text-[#3cd7ff] border border-[rgba(0,212,255,0.4)]';
    }
    if (diff === 'medium') {
      return 'bg-[#47475d]/20 text-[#c6c4df] border border-[#c6c4df]/30';
    }
    return 'bg-[#2a2a2c] text-[#859398] border border-[#3c494e]';
  };

  const getRarityLabel = () => {
    const diff = (quest.difficulty ?? 'easy').toUpperCase();
    return diff;
  };

  const getCoinReward = () => {
    const diff = quest.difficulty ?? 'easy';
    if (diff === 'hard') return 3;
    if (diff === 'medium') return 2;
    return 1;
  };

  // Action button label
  const getActionLabel = () => {
    if (completed) return 'Done';
    if (quest.assignmentType === 'open') return 'Support';
    return 'Done';
  };

  // Progress percentage based on completion state
  const progressPercent = completed ? 100 : 0;

  return (
    <div
      className={`group relative glass-panel glow-border p-6 rounded-xl transition-all ${completed
        ? 'opacity-60 border-[rgba(0,212,255,0.05)]'
        : 'border-[rgba(0,212,255,0.1)]'
        }`}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Left side — content */}
        <div className="flex-1 min-w-0">
          {/* Rarity badge + project label row */}
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className={`label-mono inline-block rounded px-2.5 py-0.5 text-[10px] font-bold ${getRarityStyle()}`}>
              {getRarityLabel()}
            </span>
            {quest.projectIds.length > 0 && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#3cd7ff] bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)] px-2 py-0.5 rounded">
                Project: {quest.projectIds.map(id => projectNameMap?.[id] || id).join(', ')}
              </span>
            )}
          </div>

          {/* Title */}
          <h4 className={`text-base font-bold font-headline ${completed ? 'text-[#859398] line-through' : 'text-[#e5e1e4]'}`}>
            {quest.title}
          </h4>

          {/* Description */}
          {quest.description && (
            <p className="mt-1.5 text-sm text-[#bbc9cf] line-clamp-2">{quest.description}</p>
          )}

          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#2a2a2c]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#00d4ff] to-[#3cd7ff] transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  boxShadow: progressPercent > 0 ? '0 0 8px rgba(60, 215, 255, 0.5), 0 0 16px rgba(60, 215, 255, 0.2)' : 'none',
                }}
              />
            </div>
          </div>

          {/* Progress % + EXP row */}
          <div className="mt-2 flex items-center justify-between">
            <span className="label-mono text-[#859398]">
              {progressPercent}% complete
            </span>
            <span className="label-mono text-[#3cd7ff]">
              +{getCoinReward()} Coin{getCoinReward() > 1 ? 's' : ''}
            </span>
          </div>

        </div>

        {/* Right side — avatars + action */}
        <div className="flex-shrink-0 flex items-center gap-3 md:flex-col md:items-end md:gap-3">
          {/* Avatar stack */}
          <div className="flex -space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#003642] border-2 border-[#131315] text-[10px] font-bold text-[#3cd7ff]">
              <span className="material-symbols-outlined text-sm">person</span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2a2a2c] border-2 border-[#131315] text-[10px] font-bold text-[#859398]">
              <span className="material-symbols-outlined text-sm">group</span>
            </div>
          </div>

          {/* Action button or Done badge */}
          {completed ? (
            <span className="badge-pill bg-[#003642] text-[#3cd7ff] border border-[rgba(0,212,255,0.3)]">
              <span className="material-symbols-outlined text-xs mr-1">check_circle</span>
              Done
            </span>
          ) : quest.status === 'pending' ? (
            <span className="badge-pill bg-amber-900/40 text-amber-300 border border-amber-500/30">Pending</span>
          ) : quest.status === 'rejected' ? (
            <span className="badge-pill bg-red-900/40 text-red-300 border border-red-500/30">Rejected</span>
          ) : (
            <button
              type="button"
              onClick={handleAction}
              disabled={!isCompletable}
              className="rounded-lg bg-[#003642] border border-[rgba(0,212,255,0.4)] px-4 py-2 text-xs font-bold text-[#3cd7ff] uppercase tracking-wider transition-all hover:shadow-glow hover:border-[#3cd7ff] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {getActionLabel()}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
