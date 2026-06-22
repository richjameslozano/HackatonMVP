import type { BadgeCollectionView } from '../../types';
import { BadgeCard } from './BadgeCard';

interface BadgeGridProps {
  badges: BadgeCollectionView['badges'];
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  if (badges.length === 0) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center py-16 text-center">
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '48px', color: '#3c494e' }}
        >
          military_tech
        </span>
        <p className="mt-4 text-sm" style={{ color: '#859398' }}>
          No badges available for this role yet.
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
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
