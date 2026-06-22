import type { Quest } from '../../types';
import { QuestCard } from './QuestCard';

interface QuestCategoryProps {
  title: string;
  quests: Quest[];
  onComplete: (questId: string) => void;
  completedQuestIds?: Set<string>;
  emptyMessage?: string;
  showStreak?: boolean;
  icon?: React.ReactNode;
}

export function QuestCategory({
  title,
  quests,
  onComplete,
  completedQuestIds,
  emptyMessage = 'No quests available',
  showStreak = false,
  icon,
}: QuestCategoryProps) {
  const completedCount = quests.filter(
    (q) => completedQuestIds?.has(q.questId),
  ).length;
  const totalCount = quests.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <section className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {icon ? (
            <span className="text-[#3cd7ff]">{icon}</span>
          ) : (
            <span className="material-symbols-outlined text-[#3cd7ff] text-2xl">verified</span>
          )}
          <h3 className="font-headline text-2xl font-bold text-[#e5e1e4] tracking-tight">{title}</h3>
          {totalCount > 0 && (
            <span className="label-mono badge-pill bg-[#2a2a2c] text-[#859398] border border-[#3c494e]">
              {totalCount} Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showStreak && completedCount > 0 && (
            <span className="badge-pill bg-amber-900/40 text-amber-300 border border-amber-500/30">
              🔥 {completedCount} day streak
            </span>
          )}
          <span className="font-mono text-[12px] uppercase tracking-wider text-[#859398]">Active Sprint: Nebula-9</span>
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between label-mono text-[#859398] mb-1.5">
            <span>{completedCount} / {totalCount} completed</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Quest list — single column grid */}
      {quests.length === 0 ? (
        <p className="py-4 text-center text-sm text-[#859398]">{emptyMessage}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {quests.map((quest) => (
            <QuestCard
              key={quest.questId}
              quest={quest}
              onComplete={onComplete}
              disabled={quest.status !== 'active'}
              completed={completedQuestIds?.has(quest.questId) ?? false}
            />
          ))}
        </div>
      )}
    </section>
  );
}
