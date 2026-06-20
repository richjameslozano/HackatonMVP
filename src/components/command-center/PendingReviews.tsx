interface PendingTask {
    questId: string;
    title: string;
    proposerName: string;
    createdAt: Date;
}

interface PendingReviewsProps {
    pendingTasks: PendingTask[];
    onTaskClick?: (questId: string) => void;
    onViewAll?: () => void;
}

/**
 * Formats a Date into a relative time string (e.g., "3h ago", "2d ago").
 */
function formatRelativeTime(date: Date): string {
    const now = Date.now();
    const diffMs = now - date.getTime();

    if (diffMs < 0) return 'just now';

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    if (weeks > 0) return `${weeks}w ago`;
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
}

const MAX_DISPLAY_ITEMS = 5;

export function PendingReviews({ pendingTasks, onTaskClick, onViewAll }: PendingReviewsProps) {
    const displayTasks = pendingTasks.slice(0, MAX_DISPLAY_ITEMS);
    const count = pendingTasks.length;

    return (
        <div className="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-surface-900">Pending Reviews</h3>
                {count > 0 && (
                    <span className="inline-flex items-center rounded-full bg-madrid-100 px-2 py-0.5 text-[11px] font-semibold text-madrid-700">
                        {count} NEW
                    </span>
                )}
            </div>

            {/* Task list or empty state */}
            {count === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                    <svg
                        className="h-8 w-8 text-green-400 mb-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-sm text-surface-500">No pending reviews</p>
                </div>
            ) : (
                <ul className="space-y-2" role="list">
                    {displayTasks.map((task) => (
                        <li key={task.questId}>
                            <button
                                type="button"
                                onClick={() => onTaskClick?.(task.questId)}
                                className="w-full rounded-lg border border-surface-100 bg-surface-50 px-3 py-2 text-left transition-colors hover:bg-surface-100 focus:outline-none focus:ring-2 focus:ring-madrid-500 focus:ring-offset-1"
                                aria-label={`Review task: ${task.title}`}
                            >
                                <p className="text-sm font-medium text-surface-900 truncate">{task.title}</p>
                                <div className="mt-0.5 flex items-center justify-between">
                                    <span className="text-xs text-surface-500 truncate">{task.proposerName}</span>
                                    <span className="text-xs text-surface-400 flex-shrink-0 ml-2">
                                        {formatRelativeTime(task.createdAt)}
                                    </span>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {/* View All link */}
            {count > 0 && (
                <button
                    type="button"
                    onClick={() => onViewAll?.()}
                    className="mt-3 w-full text-center text-xs font-medium text-madrid-600 hover:text-madrid-700 transition-colors focus:outline-none focus:underline"
                >
                    View All Reviews{count > MAX_DISPLAY_ITEMS ? ` (${count})` : ''}
                </button>
            )}
        </div>
    );
}
