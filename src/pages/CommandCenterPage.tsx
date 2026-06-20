import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/app.store';
import { LoadingIndicator } from '../components/shared';
import {
    DeveloperProgressTable,
    BlockersPanel,
    DeveloperDetailModal,
    PendingReviews,
    RecentActivityFeed,
    TaskDistributionChart,
} from '../components/command-center';
import {
    getTeamStats,
    getTaskDistribution,
    getTeamOverview,
    getRecentActivity,
    type TeamStats,
    type TaskDistribution,
    type TeamOverview,
    type RecentActivityEntry,
} from '../services/team-progress.service';
import { listRecords, extractTextValue } from '../services/lark-api.service';
import { TABLE_IDS } from '../services/config';

export function CommandCenterPage() {
    const currentMember = useAppStore((s) => s.currentMember);
    const isScrumMaster = useAppStore((s) => s.isScrumMaster);
    const approveTask = useAppStore((s) => s.approveTask);
    const rejectTask = useAppStore((s) => s.rejectTask);
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<TeamStats | null>(null);
    const [distribution, setDistribution] = useState<TaskDistribution | null>(null);
    const [overview, setOverview] = useState<TeamOverview | null>(null);
    const [recentActivity, setRecentActivity] = useState<RecentActivityEntry[]>([]);
    const [pendingTasks, setPendingTasks] = useState<Array<{ questId: string; title: string; proposerName: string; createdAt: Date }>>([]);

    // Developer detail modal state
    const [detailDeveloperId, setDetailDeveloperId] = useState<string | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    const loadData = useCallback(async () => {
        if (!currentMember || !isScrumMaster) return;

        setLoading(true);
        try {
            const [statsData, distData, overviewData, activityData] = await Promise.all([
                getTeamStats(currentMember.memberId),
                getTaskDistribution(currentMember.memberId),
                getTeamOverview(currentMember.memberId),
                getRecentActivity(currentMember.memberId),
            ]);
            setStats(statsData);
            setDistribution(distData);
            setOverview(overviewData);
            setRecentActivity(activityData);

            // Fetch pending tasks for the PendingReviews widget
            const pendingFilter = {
                conjunction: 'and' as const,
                conditions: [
                    { field_name: 'status', operator: 'is' as const, value: ['pending'] },
                    { field_name: 'target_role', operator: 'is' as const, value: ['developer'] },
                ],
            };
            const pendingRecords = await listRecords(TABLE_IDS.quests, pendingFilter);

            // Build a map of member IDs to display names from the overview
            const memberNameMap = new Map<string, string>();
            for (const dev of overviewData.developers) {
                memberNameMap.set(dev.member.memberId, dev.member.displayName);
            }

            const pendingItems = pendingRecords.map((r) => {
                const proposerId = extractTextValue(r.fields.proposer_id);
                return {
                    questId: r.record_id,
                    title: extractTextValue(r.fields.title) || 'Untitled Task',
                    proposerName: memberNameMap.get(proposerId) || proposerId || 'Unknown',
                    createdAt: r.fields.created_at ? new Date(r.fields.created_at as string | number) : new Date(),
                };
            });
            setPendingTasks(pendingItems);
        } catch (err) {
            console.error('[CommandCenter] Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    }, [currentMember, isScrumMaster]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    // Handlers
    const handleViewDetails = useCallback((developerId: string) => {
        setDetailDeveloperId(developerId);
        setDetailModalOpen(true);
    }, []);

    const handleCloseDetail = useCallback(() => {
        setDetailModalOpen(false);
        setDetailDeveloperId(null);
    }, []);

    const handleApprove = useCallback(async (questId: string) => {
        await approveTask(questId);
        void loadData(); // Refresh all data
    }, [approveTask, loadData]);

    const handleReject = useCallback(async (questId: string, reason: string) => {
        await rejectTask(questId, reason);
        void loadData(); // Refresh all data
    }, [rejectTask, loadData]);

    const handlePendingTaskClick = useCallback((questId: string) => {
        // Navigate to quest board where they can review it
        navigate('/quests');
    }, [navigate]);

    const handleViewAllReviews = useCallback(() => {
        navigate('/quests');
    }, [navigate]);

    // Access control
    if (!isScrumMaster) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <svg className="mx-auto h-16 w-16 text-surface-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <h2 className="mt-4 text-lg font-semibold text-surface-900">Access Restricted</h2>
                <p className="mt-2 text-sm text-surface-500">
                    The Command Center is only available to Scrum Masters.
                </p>
            </div>
        );
    }

    if (loading) {
        return <LoadingIndicator size="lg" message="Loading Command Center..." />;
    }

    const backlogRemaining = stats ? stats.totalTasks - stats.completedTasks : 0;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-madrid-600">
                    MADRID_HQ // COMMAND_CENTER
                </p>
                <h1 className="mt-1 text-2xl font-bold text-surface-900">Command Center</h1>
                <p className="mt-1 text-sm text-surface-500">
                    Monitor team progress, review blockers, and manage developer workflows.
                </p>
            </div>

            {/* Summary Stats Bar */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                <StatCard label="Devs" value={stats?.totalDevelopers ?? 0} icon="👥" />
                <StatCard label="Total Tasks" value={stats?.totalTasks ?? 0} icon="📋" />
                <StatCard label="Active" value={stats?.activeTasks ?? 0} icon="🟢" color="text-green-600" />
                <StatCard label="Pending" value={stats?.pendingTasks ?? 0} icon="🟡" color="text-amber-600" />
                <StatCard label="Rejected" value={stats?.rejectedTasks ?? 0} icon="🔴" color="text-red-600" />
                <StatCard label="Blocked" value={stats?.blockedTasks ?? 0} icon="⛔" color="text-red-700" />
                <StatCard
                    label="Completion"
                    value={`${stats?.completionPercentage ?? 0}%`}
                    icon="📊"
                    color="text-madrid-600"
                />
            </div>

            {/* Main Content Layout: 2/3 left + 1/3 right */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Content (Left 2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Overall Team Progress */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-surface-900">Overall Team Progress</h2>
                            <span className="text-sm text-surface-500">
                                {stats?.completedTasks ?? 0} / {stats?.totalTasks ?? 0} tasks completed
                            </span>
                        </div>

                        {/* Large Progress Bar */}
                        <div className="relative h-6 w-full overflow-hidden rounded-full bg-surface-100">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-madrid-500 to-madrid-600 transition-all duration-500"
                                style={{ width: `${stats?.completionPercentage ?? 0}%` }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-surface-700">
                                {stats?.completionPercentage ?? 0}%
                            </span>
                        </div>

                        {/* Backlog Info */}
                        <div className="mt-4 flex items-center justify-between text-sm">
                            <span className="text-surface-500">
                                Backlog remaining: <span className="font-medium text-surface-700">{backlogRemaining} tasks</span>
                            </span>
                            <span className="text-surface-500">
                                Goal: <span className="font-medium text-surface-700">{stats?.totalTasks ?? 0} tasks</span>
                            </span>
                        </div>
                    </div>

                    {/* Developer Progress Table */}
                    {overview && (
                        <DeveloperProgressTable
                            developers={overview.developers}
                            onViewDetails={handleViewDetails}
                        />
                    )}
                </div>

                {/* Sidebar (Right 1/3) */}
                <div className="space-y-6">
                    {/* Pending Reviews */}
                    <PendingReviews
                        pendingTasks={pendingTasks}
                        onTaskClick={handlePendingTaskClick}
                        onViewAll={handleViewAllReviews}
                    />

                    {/* Task Distribution */}
                    {distribution && (
                        <TaskDistributionChart distribution={distribution} />
                    )}

                    {/* Blockers & Risks */}
                    {overview && (
                        <BlockersPanel
                            developers={overview.developers}
                            recentActivity={recentActivity}
                        />
                    )}
                </div>
            </div>

            {/* Bottom: Recent Activity Feed */}
            <div className="card">
                <div className="flex items-center gap-2 mb-4">
                    <svg className="h-5 w-5 text-madrid-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-base font-semibold text-surface-900">Recent Activity</h3>
                </div>
                <RecentActivityFeed
                    activities={recentActivity}
                    hasMore={false}
                />
            </div>

            {/* Developer Detail Modal */}
            {detailDeveloperId && (
                <DeveloperDetailModal
                    developerId={detailDeveloperId}
                    isOpen={detailModalOpen}
                    onClose={handleCloseDetail}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            )}
        </div>
    );
}

// ─── Helper Components ──────────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: number | string;
    icon: string;
    color?: string;
}

function StatCard({ label, value, icon, color = 'text-surface-900' }: StatCardProps) {
    return (
        <div className="card flex flex-col items-center gap-1 p-3 text-center">
            <span className="text-lg">{icon}</span>
            <span className={`text-xl font-bold ${color}`}>{value}</span>
            <span className="text-xs text-surface-500">{label}</span>
        </div>
    );
}
