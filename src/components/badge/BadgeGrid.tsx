import type { BadgeCollectionView } from '../../types';
import { BadgeCard } from './BadgeCard';

interface BadgeGridProps {
  badges: BadgeCollectionView['badges'];
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  if (badges.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        No badges available for this role yet.
      </p>
    );
  }

  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
      role="list"
      aria-label="Badge collection"
    >
      {badges.map(({ badge, earned, earnedAt }) => (
        <div key={badge.badgeId} role="listitem">
          <BadgeCard badge={badge} earned={earned} earnedAt={earnedAt} />
        </div>
      ))}
    </div>
  );
}
