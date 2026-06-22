import type { RecentActivityEntry } from '../../services/team-progress.service';

interface RecentActivityFeedProps {
    activities: RecentActivityEntry[];
    onLoadMore?: () => void;
    hasMore?: boolean;
    onQuickAction?: () => void;
}

/**
 * Formats a Date into a relative timestamp string (e.g., "2 hours ago", "yesterday").
 */
function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
        return 'just now';
    }
    if (diffMinutes < 60) {
        return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
    }
    if (diffHours < 24) {
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }
    if (diffDays === 1) {
        return 'yesterday';
    }
    if (diffDays < 7) {
        return `${diffDays} days ago`;
    }
    if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
}

/**
 * Returns the icon and color styling for an activity type.
 */
function getActivityIcon(type: RecentActivityEntry['type']): { bg: string; icon: JSX.Element } {
    switch (type) {
        case 'completion':
            return {
                bg: 'bg-green-900/30 text-green-400',
                icon: (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                            clipRule="evenodd"
                        />
                    </svg>
                ),
            };
        case 'proposal':
            return {
                bg: 'bg-blue-900/30 text-blue-400',
                icon: (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                ),
            };
        case 'status_change':
            return {
                bg: 'bg-orange-900/30 text-orange-400',
                icon: (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.59l-1.95-1.28a.75.75 0 10-.82 1.26l2.5 1.63a.75.75 0 001.09-.21l2.5-4a.75.75 0 00-1.28-.8l-1.54 2.46V6.75z"
                            clipRule="evenodd"
                        />
                    </svg>
                ),
            };
    }
}

/**
 * Builds the action description for an activity entry.
 */
function getActionDescription(entry: RecentActivityEntry): string {
    switch (entry.type) {
        case 'completion':
            return 'completed';
        case 'proposal':
            return 'proposed';
        case 'status_change':
            return entry.details ?? 'status changed for';
    }
}

export function RecentActivityFeed({
    activities,
    onLoadMore,
    hasMore = false,
    onQuickAction,
}: RecentActivityFeedProps) {
    if (activities.length === 0) {
        return (
            <div className="relative">
                <div className="card flex items-center justify-center py-12 text-surface-400">
                    <p className="text-sm">No recent activity</p>
                </div>
                {onQuickAction && (
                    <button
                        onClick={onQuickAction}
                        className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-madrid-600 text-white shadow-elevated transition-all hover:bg-madrid-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-madrid-500 focus:ring-offset-2"
                        aria-label="Quick action"
                    >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                        </svg>
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="card !p-0">
                <ul className="divide-y divide-[#3c494e]/50" role="list" aria-label="Recent activity feed">
                    {activities.map((entry) => {
                        const { bg, icon } = getActivityIcon(entry.type);
                        const actionDescription = getActionDescription(entry);

                        return (
                            <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
                                {/* Activity type icon */}
                                <div
                                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${bg}`}
                                    aria-hidden="true"
                                >
                                    {icon}
                                </div>

                                {/* Activity content */}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-[#bbc9cf]">
                                        <span className="font-semibold text-[#e5e1e4]">
                                            {entry.developerName}
                                        </span>{' '}
                                        {actionDescription}{' '}
                                        <span className="font-medium text-[#e5e1e4]">
                                            {entry.questTitle}
                                        </span>
                                    </p>
                                    <p className="mt-0.5 text-xs text-[#859398]">
                                        {formatRelativeTime(entry.timestamp)}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ul>

                {/* Load Older Activity button */}
                {hasMore && onLoadMore && (
                    <div className="border-t border-[#3c494e]/50 px-4 py-3">
                        <button
                            onClick={onLoadMore}
                            className="w-full rounded-lg border border-[#3c494e] px-4 py-2 text-sm font-medium text-[#bbc9cf] transition-colors hover:bg-[#2a2a2c] hover:text-[#e5e1e4] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:ring-offset-2"
                        >
                            Load Older Activity
                        </button>
                    </div>
                )}
            </div>

            {/* Floating "+" action button */}
            {onQuickAction && (
                <button
                    onClick={onQuickAction}
                    className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-madrid-600 text-white shadow-elevated transition-all hover:bg-madrid-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-madrid-500 focus:ring-offset-2"
                    aria-label="Quick action"
                >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                </button>
            )}
        </div>
    );
}
