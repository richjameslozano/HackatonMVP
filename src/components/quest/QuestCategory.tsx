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
    <section className="card">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {icon && <span className="text-madrid-600">{icon}</span>}
          <h3 className="text-base font-semibold text-surface-900">{title}</h3>
          {totalCount > 0 && (
            <span className="badge-pill bg-surface-100 text-surface-600">
              {totalCount} Active
            </span>
          )}
        </div>
        {showStreak && completedCount > 0 && (
          <span className="badge-pill bg-amber-100 text-amber-700">
            🔥 {completedCount} day streak
          </span>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-surface-500 mb-1.5">
            <span>{completedCount} / {totalCount} completed</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-100">
            <div
              className="h-full rounded-full bg-madrid-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Quest list */}
      {quests.length === 0 ? (
        <p className="py-4 text-center text-sm text-surface-400">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
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
