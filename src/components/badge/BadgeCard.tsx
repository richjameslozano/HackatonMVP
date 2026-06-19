import type { Badge } from '../../types';

interface BadgeCardProps {
  badge: Badge;
  earned: boolean;
  earnedAt?: Date;
}

export function BadgeCard({ badge, earned, earnedAt }: BadgeCardProps) {
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      aria-label={`Badge: ${badge.name}, ${earned ? 'Earned' : 'Locked'}`}
    >
      <img
        src={badge.iconUrl}
        alt={badge.name}
        className={`h-16 w-16 ${earned ? '' : 'grayscale opacity-40'}`}
      />
      <h3 className="text-sm font-medium text-gray-900">{badge.name}</h3>
      {earned ? (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
          Earned
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          Locked
        </span>
      )}
      {earned && earnedAt && (
        <p className="text-xs text-gray-500">
          {earnedAt.toLocaleDateString()}
        </p>
      )}
      {!earned && (
        <p className="mt-1 text-center text-xs text-gray-500">
          {badge.description}
        </p>
      )}
    </div>
  );
}
