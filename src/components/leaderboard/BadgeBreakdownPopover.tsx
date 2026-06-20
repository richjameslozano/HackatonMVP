import type { Badge } from '../../types';

interface BadgeBreakdownPopoverProps {
    badges: Array<{ badge: Badge; earnedAt: Date }>;
    isLoading: boolean;
}

export function BadgeBreakdownPopover({ badges, isLoading }: BadgeBreakdownPopoverProps) {
    if (isLoading) {
        return (
            <div className="absolute left-0 top-full z-10 mt-2 w-64 rounded-xl border border-surface-200 bg-white p-4 shadow-elevated animate-fade-in">
                <p className="text-xs text-surface-500">Loading badges...</p>
            </div>
        );
    }

    if (badges.length === 0) {
        return (
            <div className="absolute left-0 top-full z-10 mt-2 w-64 rounded-xl border border-surface-200 bg-white p-4 shadow-elevated animate-fade-in">
                <p className="text-xs text-surface-500">No badges earned yet</p>
            </div>
        );
    }

    return (
        <div className="absolute left-0 top-full z-10 mt-2 w-72 rounded-xl border border-surface-200 bg-white p-4 shadow-elevated animate-fade-in">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-surface-500">
                Badges Earned ({badges.length})
            </p>
            <ul className="max-h-48 space-y-2 overflow-y-auto">
                {badges.map(({ badge, earnedAt }) => (
                    <li key={badge.badgeId} className="flex items-center gap-2.5 text-sm">
                        {badge.iconUrl ? (
                            <img src={badge.iconUrl} alt="" className="h-6 w-6 rounded-full" />
                        ) : (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-madrid-100 text-xs">
                                🏆
                            </span>
                        )}
                        <span className="flex-1 truncate text-surface-700 font-medium">{badge.name}</span>
                        <span className="text-xs text-surface-400">
                            {earnedAt.toLocaleDateString()}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
