import { Quest } from '../../types';
import { QuestCard } from './QuestCard';

interface QuestCategoryProps {
  title: string;
  quests: Quest[];
  onComplete: (questId: string) => void;
  emptyMessage?: string;
}

export function QuestCategory({
  title,
  quests,
  onComplete,
  emptyMessage = 'No quests available',
}: QuestCategoryProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      {quests.length === 0 ? (
        <p className="py-2 text-sm text-gray-400">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {quests.map((quest) => (
            <QuestCard
              key={quest.questId}
              quest={quest}
              onComplete={onComplete}
              disabled={quest.status !== 'active'}
            />
          ))}
        </div>
      )}
    </section>
  );
}
