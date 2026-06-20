import { useState, useEffect, useCallback, useRef } from 'react';
import { getDeveloperDetail, type DeveloperDetail, type DeveloperTaskDetail } from '../../services/team-progress.service';
import { getBadgeCollection } from '../../services/badge.service';
import type { BadgeCollectionView } from '../../types';

// ─── Props Interface ────────────────────────────────────────────────────────

export interface DeveloperDetailModalProps {
    developerId: string;
    isOpen: boolean;
    onClose: () => void;
    onApprove?: (questId: string) => void;
    onReject?: (questId: string, reason: string) => void;
}

// ─── Status Badge Helper ────────────────────────────────────────────────────

function getStatusBadgeClasses(status: DeveloperTaskDetail['status'], isCompleted: boolean): string {
    if (isCompleted) return 'bg-green-100 text-green-700';
    switch (status) {
        case 'active':
            return 'bg-green-100 text-green-700';
        case 'pending':
            return 'bg-yellow-100 text-yellow-700';
        case 'rejected':
            return 'bg-red-100 text-red-700';
        default:
            return 'bg-surface-100 text-surface-600';
    }
}

function getStatusLabel(status: DeveloperTaskDetail['status'], isCompleted: boolean): string {
    if (isCompleted) return 'Completed';
    switch (status) {
        case 'active':
            return 'Active';
        case 'pending':
            return 'Pending';
        case 'rejected':
            return 'Rejected';
        default:
            return status;
    }
}

function formatDate(date: Date | null): string {
    if (!date) return '—';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date instanceof Date ? date : new Date(date));
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DeveloperDetailModal({
    developerId,
    isOpen,
    onClose,
    onApprove,
    onReject,
}: DeveloperDetailModalProps) {
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState<DeveloperDetail | null>(null);
    const [badgeData, setBadgeData] = useState<BadgeCollectionView | null>(null);
    const [rejectingQuestId, setRejectingQuestId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const modalRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // Fetch developer detail and badge data
    useEffect(() => {
        if (!isOpen || !developerId) return;

        async function loadDetail() {
            setLoading(true);
            try {
                const [devDetail, badges] = await Promise.all([
                    getDeveloperDetail(developerId),
                    getBadgeCollection(developerId, 'developer'),
                ]);
                setDetail(devDetail);
                setBadgeData(badges);
            } catch (err) {
                console.error('[DeveloperDetailModal] Failed to load detail:', err);
            } finally {
                setLoading(false);
            }
        }

        void loadDetail();
    }, [isOpen, developerId]);

    // Focus trap: focus the close button when modal opens
    useEffect(() => {
        if (isOpen && closeButtonRef.current) {
            closeButtonRef.current.focus();
        }
    }, [isOpen, loading]);

    // Escape key to close
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        },
        [onClose]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, handleKeyDown]);

    // Handlers
    function handleApprove(questId: string) {
        onApprove?.(questId);
    }

    function handleRejectStart(questId: string) {
        setRejectingQuestId(questId);
        setRejectReason('');
    }

    function handleRejectConfirm() {
        if (!rejectingQuestId || !rejectReason.trim()) return;
        onReject?.(rejectingQuestId, rejectReason.trim());
        setRejectingQuestId(null);
        setRejectReason('');
    }

    function handleRejectCancel() {
        setRejectingQuestId(null);
        setRejectReason('');
    }

    if (!isOpen) return null;

    // Derived data
    const completedTasks = detail?.tasks.filter((t) => t.completedAt !== null) ?? [];
    const completionHistory = [...completedTasks].sort(
        (a, b) => (b.completedAt!.getTime() - a.completedAt!.getTime())
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="developer-detail-title"
        >
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal content */}
            <div
                ref={modalRef}
                className="relative my-8 w-full max-w-3xl rounded-2xl border border-surface-200 bg-white shadow-elevated animate-fade-slide-up"
            >
                {/* Close button */}
                <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 z-10 rounded-md p-1.5 text-surface-400 hover:text-surface-600 focus:outline-none focus:ring-2 focus:ring-madrid-500"
                    aria-label="Close modal"
                >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                </button>

                {/* Loading state */}
                {loading && (
                    <div className="flex items-center justify-center py-16">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-madrid-200 border-t-madrid-600" />
                            <p className="text-sm text-surface-500">Loading developer details...</p>
                        </div>
                    </div>
                )}

                {/* Content */}
                {!loading && detail && (
                    <div className="p-6">
                        {/* Header: Developer name, role, overall progress */}
                        <header className="mb-6 border-b border-surface-100 pb-5">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-madrid-100 text-lg font-bold text-madrid-700">
                                    {detail.member.displayName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 id="developer-detail-title" className="text-lg font-semibold text-surface-900 truncate">
                                        {detail.member.displayName}
                                    </h2>
                                    <p className="text-sm capitalize text-surface-500">{detail.member.primaryRole}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-bold text-madrid-600">{detail.completionPercentage}%</span>
                                    <p className="text-xs text-surface-500">complete</p>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-4">
                                <div className="flex items-center justify-between text-xs text-surface-500 mb-1.5">
                                    <span>{detail.completionCount} / {detail.totalTasks} tasks completed</span>
                                </div>
                                <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-100">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-madrid-500 to-madrid-600 transition-all duration-300"
                                        style={{ width: `${detail.completionPercentage}%` }}
                                        role="progressbar"
                                        aria-valuenow={detail.completionPercentage}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-label={`${detail.completionPercentage}% tasks complete`}
                                    />
                                </div>
                            </div>
                        </header>

                        {/* Task List Section */}
                        <section className="mb-6">
                            <h3 className="mb-3 text-sm font-semibold text-surface-900">All Tasks</h3>
                            {detail.tasks.length === 0 ? (
                                <p className="text-sm text-surface-400 italic">No tasks assigned</p>
                            ) : (
                                <div className="max-h-64 overflow-y-auto rounded-xl border border-surface-100">
                                    <table className="w-full text-sm" role="table" aria-label="Developer task list">
                                        <thead>
                                            <tr className="border-b border-surface-100 bg-surface-50">
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Task</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Status</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Category</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Date</th>
                                                {(onApprove || onReject) && (
                                                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-surface-500">Actions</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-surface-100">
                                            {detail.tasks.map((task) => {
                                                const isCompleted = task.completedAt !== null;
                                                const isPending = task.status === 'pending' && !isCompleted;
                                                const isRejectingThis = rejectingQuestId === task.questId;

                                                return (
                                                    <tr key={task.questId} className="transition-colors hover:bg-surface-50">
                                                        <td className="px-4 py-3">
                                                            <span className="font-medium text-surface-900">{task.title}</span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClasses(task.status, isCompleted)}`}>
                                                                {getStatusLabel(task.status, isCompleted)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="capitalize text-surface-600">{task.category}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-surface-500">
                                                            {isCompleted
                                                                ? formatDate(task.completedAt)
                                                                : formatDate(task.createdAt)}
                                                        </td>
                                                        {(onApprove || onReject) && (
                                                            <td className="px-4 py-3 text-right">
                                                                {isPending && !isRejectingThis && (
                                                                    <div className="flex items-center justify-end gap-1.5">
                                                                        {onApprove && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleApprove(task.questId)}
                                                                                className="rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                                                                                aria-label={`Approve task: ${task.title}`}
                                                                            >
                                                                                Approve
                                                                            </button>
                                                                        )}
                                                                        {onReject && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRejectStart(task.questId)}
                                                                                className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                                                                                aria-label={`Reject task: ${task.title}`}
                                                                            >
                                                                                Reject
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {isPending && isRejectingThis && (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <input
                                                                            type="text"
                                                                            value={rejectReason}
                                                                            onChange={(e) => setRejectReason(e.target.value)}
                                                                            placeholder="Reason..."
                                                                            maxLength={250}
                                                                            className="w-28 rounded-md border border-surface-200 px-2 py-1 text-xs text-surface-900 placeholder-surface-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                                                                            aria-label="Rejection reason"
                                                                            autoFocus
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') handleRejectConfirm();
                                                                                if (e.key === 'Escape') handleRejectCancel();
                                                                            }}
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={handleRejectConfirm}
                                                                            disabled={!rejectReason.trim()}
                                                                            className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            aria-label="Confirm rejection"
                                                                        >
                                                                            ✓
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={handleRejectCancel}
                                                                            className="rounded-md bg-surface-100 px-2 py-1 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-200"
                                                                            aria-label="Cancel rejection"
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        {/* Completion History */}
                        <section className="mb-6">
                            <h3 className="mb-3 text-sm font-semibold text-surface-900">Completion History</h3>
                            {completionHistory.length === 0 ? (
                                <p className="text-sm text-surface-400 italic">No completed tasks yet</p>
                            ) : (
                                <div className="max-h-48 overflow-y-auto space-y-2">
                                    {completionHistory.map((task) => (
                                        <div
                                            key={`history-${task.questId}`}
                                            className="flex items-center justify-between rounded-lg border border-surface-100 bg-surface-50 px-4 py-2.5"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                    </svg>
                                                </span>
                                                <span className="text-sm font-medium text-surface-800">{task.title}</span>
                                            </div>
                                            <span className="text-xs text-surface-500">{formatDate(task.completedAt)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Badge Progress */}
                        <section>
                            <h3 className="mb-3 text-sm font-semibold text-surface-900">Badge Progress</h3>
                            {badgeData ? (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-surface-600">
                                            {badgeData.earnedCount} / {badgeData.totalCount} badges earned
                                        </span>
                                        <span className="text-sm font-medium text-madrid-600">
                                            {badgeData.totalCount > 0
                                                ? Math.round((badgeData.earnedCount / badgeData.totalCount) * 100)
                                                : 0}%
                                        </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-100">
                                        <div
                                            className="h-full rounded-full bg-madrid-500 transition-all duration-300"
                                            style={{
                                                width: `${badgeData.totalCount > 0 ? (badgeData.earnedCount / badgeData.totalCount) * 100 : 0}%`,
                                            }}
                                            role="progressbar"
                                            aria-valuenow={badgeData.earnedCount}
                                            aria-valuemin={0}
                                            aria-valuemax={badgeData.totalCount}
                                            aria-label={`${badgeData.earnedCount} of ${badgeData.totalCount} badges earned`}
                                        />
                                    </div>
                                    {/* Badge list */}
                                    {badgeData.badges.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {badgeData.badges.map(({ badge, earned }) => (
                                                <span
                                                    key={badge.badgeId}
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${earned
                                                            ? 'bg-madrid-100 text-madrid-700'
                                                            : 'bg-surface-100 text-surface-400'
                                                        }`}
                                                    title={earned ? `Earned: ${badge.name}` : `Locked: ${badge.description}`}
                                                >
                                                    {earned ? '🏆' : '🔒'}
                                                    {badge.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-surface-400 italic">Badge data unavailable</p>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
