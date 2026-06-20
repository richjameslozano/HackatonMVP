import type { Badge } from '../../types';

interface BadgeCardProps {
  badge: Badge;
  earned: boolean;
  earnedAt?: Date;
}

export function BadgeCard({ badge, earned, earnedAt }: BadgeCardProps) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-xl border p-5 text-center transition-all ${earned
          ? 'border-madrid-200 bg-white shadow-card hover:shadow-card-hover'
          : 'border-surface-200 bg-surface-50 opacity-70'
        }`}
      aria-label={`Badge: ${badge.name}, ${earned ? 'Earned' : 'Locked'}`}
    >
      {/* Badge icon */}
      <div className={`relative flex h-16 w-16 items-center justify-center rounded-full ${earned ? 'bg-madrid-100' : 'bg-surface-200'
        }`}>
        {badge.iconUrl ? (
          <img
            src={badge.iconUrl}
            alt={badge.name}
            className={`h-10 w-10 ${earned ? '' : 'grayscale opacity-50'}`}
          />
        ) : (
          <svg className={`h-8 w-8 ${earned ? 'text-madrid-600' : 'text-surface-400'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.746 3.746 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
          </svg>
        )}
      </div>

      {/* Badge name */}
      <h3 className={`text-sm font-semibold ${earned ? 'text-surface-900' : 'text-surface-500'}`}>
        {badge.name}
      </h3>

      {/* Description for locked / date for earned */}
      {earned ? (
        earnedAt && (
          <p className="text-xs text-surface-400">
            Earned {earnedAt.toLocaleDateString()}
          </p>
        )
      ) : (
        <p className="text-xs text-surface-400 line-clamp-2">
          {badge.description}
        </p>
      )}
    </div>
  );
}
