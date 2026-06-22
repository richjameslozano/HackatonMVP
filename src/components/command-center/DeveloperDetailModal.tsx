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
    if (isCompleted) return 'bg-green-900/30 text-green-400';
    switch (status) {
        case 'active':
            return 'bg-green-900/30 text-green-400';
        case 'pending':
            return 'bg-yellow-900/30 text-yellow-400';
        case 'rejected':
            return 'bg-red-900/30 text-red-400';
        default:
            return 'bg-[#2a2a2c] text-[#bbc9cf]';
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
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal content */}
            <div
                ref={modalRef}
                className="relative my-8 w-full max-w-3xl rounded-2xl border border-[rgba(0,212,255,0.2)] bg-[#0e0e10] shadow-[0_0_30px_rgba(0,212,255,0.1)] animate-fade-slide-up"
            >
                {/* Close button — in its own row above content to avoid overlap */}
                <div className="flex justify-end px-4 pt-4">
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1.5 text-[#859398] hover:text-[#e5e1e4] focus:outline-none focus:ring-2 focus:ring-[#00d4ff]"
                        aria-label="Close modal"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                    </button>
                </div>

                {/* Loading state */}
                {loading && (
                    <div className="flex items-center justify-center py-16">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgba(0,212,255,0.3)] border-t-[#00d4ff]" />
                            <p className="text-sm text-[#859398]">Loading developer details...</p>
                        </div>
                    </div>
                )}

                {/* Content */}
                {!loading && detail && (
                    <div className="px-6 pb-6">
                        {/* Header: Developer name, role, overall progress */}
                        <header className="mb-6 border-b border-[#3c494e]/50 pb-5">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(0,212,255,0.15)] text-lg font-bold text-[#3cd7ff]">
                                    {detail.member.displayName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 id="developer-detail-title" className="text-lg font-semibold text-[#e5e1e4] truncate">
                                        {detail.member.displayName}
                                    </h2>
                                    <p className="text-sm capitalize text-[#859398]">{detail.member.primaryRole}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-bold text-[#00d4ff]">{detail.completionPercentage}%</span>
                                    <p className="text-xs text-[#859398]">complete</p>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-4">
                                <div className="flex items-center justify-between text-xs text-[#859398] mb-1.5">
                                    <span>{detail.completionCount} / {detail.totalTasks} tasks completed</span>
                                </div>
                                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#2a2a2c]">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-[#00d4ff] to-[#00d4ff] transition-all duration-300"
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
                            <h3 className="mb-3 text-sm font-semibold text-[#e5e1e4]">All Tasks</h3>
                            {detail.tasks.length === 0 ? (
                                <p className="text-sm text-[#859398] italic">No tasks assigned</p>
                            ) : (
                                <div className="max-h-64 overflow-y-auto rounded-xl border border-[#3c494e]/50">
                                    <table className="w-full text-sm" role="table" aria-label="Developer task list">
                                        <thead>
                                            <tr className="border-b border-[#3c494e]/50 bg-[#1c1b1d]">
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[#859398]">Task</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[#859398]">Status</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[#859398]">Category</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[#859398]">Date</th>
                                                {(onApprove || onReject) && (
                                                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-[#859398]">Actions</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#3c494e]/50">
                                            {detail.tasks.map((task) => {
                                                const isCompleted = task.completedAt !== null;
                                                const isPending = task.status === 'pending' && !isCompleted;
                                                const isRejectingThis = rejectingQuestId === task.questId;

                                                return (
                                                    <tr key={task.questId} className="transition-colors hover:bg-[#201f21]">
                                                        <td className="px-4 py-3">
                                                            <span className="font-medium text-[#e5e1e4]">{task.title}</span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClasses(task.status, isCompleted)}`}>
                                                                {getStatusLabel(task.status, isCompleted)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="capitalize text-[#bbc9cf]">{task.category}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-[#859398]">
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
                                                                                className="rounded-md bg-[rgba(34,197,94,0.1)] px-2.5 py-1 text-xs font-medium text-green-400 transition-colors hover:bg-green-900/30"
                                                                                aria-label={`Approve task: ${task.title}`}
                                                                            >
                                                                                Approve
                                                                            </button>
                                                                        )}
                                                                        {onReject && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRejectStart(task.questId)}
                                                                                className="rounded-md bg-[rgba(239,68,68,0.1)] px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-900/30"
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
                                                                            className="w-28 rounded-md border border-[#3c494e] bg-[#1c1b1d] px-2 py-1 text-xs text-[#e5e1e4] placeholder-[#859398] focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
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
                                                                            className="rounded-md bg-[#2a2a2c] px-2 py-1 text-xs font-medium text-[#bbc9cf] transition-colors hover:bg-[#2a2a2c]"
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
                            <h3 className="mb-3 text-sm font-semibold text-[#e5e1e4]">Completion History</h3>
                            {completionHistory.length === 0 ? (
                                <p className="text-sm text-[#859398] italic">No completed tasks yet</p>
                            ) : (
                                <div className="max-h-48 overflow-y-auto space-y-2">
                                    {completionHistory.map((task) => (
                                        <div
                                            key={`history-${task.questId}`}
                                            className="flex items-center justify-between rounded-lg border border-[#3c494e]/50 bg-[#1c1b1d] px-4 py-2.5"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-900/30 text-green-400">
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                    </svg>
                                                </span>
                                                <span className="text-sm font-medium text-[#e5e1e4]">{task.title}</span>
                                            </div>
                                            <span className="text-xs text-[#859398]">{formatDate(task.completedAt)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Badge Progress */}
                        <section>
                            <h3 className="mb-3 text-sm font-semibold text-[#e5e1e4]">Badge Progress</h3>
                            {badgeData ? (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-[#bbc9cf]">
                                            {badgeData.earnedCount} / {badgeData.totalCount} badges earned
                                        </span>
                                        <span className="text-sm font-medium text-[#00d4ff]">
                                            {badgeData.totalCount > 0
                                                ? Math.round((badgeData.earnedCount / badgeData.totalCount) * 100)
                                                : 0}%
                                        </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#2a2a2c]">
                                        <div
                                            className="h-full rounded-full bg-[#00d4ff] transition-all duration-300"
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
                                                        ? 'bg-[rgba(0,212,255,0.15)] text-[#3cd7ff]'
                                                        : 'bg-[#2a2a2c] text-[#859398]'
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
                                <p className="text-sm text-[#859398] italic">Badge data unavailable</p>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
