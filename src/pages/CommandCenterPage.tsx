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
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<TeamStats | null>(null);
    const [distribution, setDistribution] = useState<TaskDistribution | null>(null);
    const [overview, setOverview] = useState<TeamOverview | null>(null);
    const [recentActivity, setRecentActivity] = useState<RecentActivityEntry[]>([]);
    const [pendingTasks, setPendingTasks] = useState<Array<{ questId: string; title: string; proposerName: string; createdAt: Date }>>([]);

    // Developer detail modal state
    const [detailDeveloperId, setDetailDeveloperId] = useState<string | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    const loadData = useCallback(async () => {
        if (!currentMember) return; // still waiting for member to load
        if (!isScrumMaster) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
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

            // Fetch pending tasks for the PendingReviews widget — only from managed developers
            const managedDevIds = new Set(overviewData.developers.map((d) => d.member.memberId));
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

            // Only include pending tasks from developers managed by this SM
            const pendingItems = pendingRecords
                .filter((r) => {
                    const proposerId = extractTextValue(r.fields.proposer_id);
                    return managedDevIds.has(proposerId);
                })
                .map((r) => {
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
            setError(err instanceof Error ? err.message : 'Failed to load Scrum Master Dashboard data');
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

    // Wait for current member to be loaded before making access decisions
    if (!currentMember) {
        return <LoadingIndicator size="lg" message="Loading Scrum Master Dashboard..." />;
    }

    // Access control
    if (!isScrumMaster) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="material-symbols-outlined text-6xl text-[#859398]">lock</span>
                <h2 className="mt-4 text-lg font-semibold text-[#e5e1e4]">Access Restricted</h2>
                <p className="mt-2 text-sm text-[#859398]">
                    The Scrum Master Dashboard is only available to Scrum Masters.
                </p>
            </div>
        );
    }

    if (loading) {
        return <LoadingIndicator size="lg" message="Loading Scrum Master Dashboard..." />;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-red-400 mb-4 font-mono">{error}</p>
                <button
                    onClick={() => void loadData()}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-[#00d4ff] border border-[#00d4ff]/40 hover:bg-[#00d4ff]/10 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    const completionPct = stats?.completionPercentage ?? 0;
    const gaugeRadius = 90;
    const gaugeCircumference = 2 * Math.PI * gaugeRadius;
    const gaugeOffset = gaugeCircumference - (completionPct / 100) * gaugeCircumference;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <p className="label-mono text-[#859398] tracking-widest">
                    MADRID_HQ // SCRUM_MASTER
                </p>
                <h1 className="mt-1 text-[48px] font-bold text-gradient leading-tight font-headline">
                    Mission Control
                </h1>
                <p className="mt-1 text-sm text-[#bbc9cf] font-mono">
                    Monitor team progress, review blockers, and manage developer workflows.
                </p>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="Active Developers"
                    value={stats?.totalDevelopers ?? 0}
                    icon="groups"
                    color="#00d4ff"
                    progress={(stats?.totalDevelopers ?? 0) > 0 ? 100 : 0}
                />
                <StatCard
                    label="Total Quests"
                    value={stats?.totalTasks ?? 0}
                    icon="terminal"
                    color="#00d4ff"
                    progress={stats ? Math.min((stats.totalTasks / Math.max(stats.totalTasks, 1)) * 100, 100) : 0}
                />
                <StatCard
                    label="In Progress"
                    value={stats?.activeTasks ?? 0}
                    icon="bolt"
                    color="#d1bcff"
                    progress={stats ? (stats.activeTasks / Math.max(stats.totalTasks, 1)) * 100 : 0}
                />
                <StatCard
                    label="Pending Intel"
                    value={stats?.pendingTasks ?? 0}
                    icon="hourglass_top"
                    color="#c6c4df"
                    progress={stats ? (stats.pendingTasks / Math.max(stats.totalTasks, 1)) * 100 : 0}
                />
            </div>

            {/* Main Content: Team Progress + Pending Reviews */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Team Progress Section (Left 2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Large Circular Gauge */}
                    <div className="glass-panel p-6 relative overflow-hidden scanline">
                        <h2 className="label-mono text-[#859398] text-center mb-4 tracking-widest">
                            OVERALL TEAM PROGRESS
                        </h2>
                        <div className="flex justify-center">
                            <div className="relative">
                                <svg width="220" height="220" className="transform -rotate-90">
                                    {/* Background track */}
                                    <circle
                                        cx="110"
                                        cy="110"
                                        r={gaugeRadius}
                                        fill="none"
                                        stroke="#2a2a2c"
                                        strokeWidth="12"
                                    />
                                    {/* Progress arc */}
                                    <circle
                                        cx="110"
                                        cy="110"
                                        r={gaugeRadius}
                                        fill="none"
                                        stroke="url(#gaugeGradient)"
                                        strokeWidth="12"
                                        strokeLinecap="round"
                                        strokeDasharray={gaugeCircumference}
                                        strokeDashoffset={gaugeOffset}
                                        style={{
                                            filter: 'drop-shadow(0 0 8px rgba(0, 212, 255, 0.6))',
                                            transition: 'stroke-dashoffset 1s ease-out',
                                        }}
                                    />
                                    <defs>
                                        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#00d4ff" />
                                            <stop offset="100%" stopColor="#d1bcff" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                {/* Center text */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-bold text-[#e5e1e4] font-mono">
                                        {completionPct}%
                                    </span>
                                    <span className="text-xs text-[#859398] font-mono mt-1">
                                        COMPLETE
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 3 column stats below gauge */}
                        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-[#3c494e]/50">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-[#00d4ff] font-mono">{stats?.completedTasks ?? 0}</p>
                                <p className="label-mono text-[#859398] mt-1">Completed</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-[#d1bcff] font-mono">{stats?.activeTasks ?? 0}</p>
                                <p className="label-mono text-[#859398] mt-1">In Progress</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-[#c6c4df] font-mono">{stats?.totalTasks ?? 0}</p>
                                <p className="label-mono text-[#859398] mt-1">Total Tasks</p>
                            </div>
                        </div>
                    </div>

                    {/* Developer Progress Table */}
                    {overview && (
                        <div className="glass-panel p-5">
                            <DeveloperProgressTable
                                developers={overview.developers}
                                onViewDetails={handleViewDetails}
                            />
                        </div>
                    )}
                </div>

                {/* Sidebar (Right 1/3) */}
                <div className="space-y-6">
                    {/* Pending Reviews */}
                    <div className="glass-panel p-5">
                        <PendingReviews
                            pendingTasks={pendingTasks}
                            onTaskClick={handlePendingTaskClick}
                            onViewAll={handleViewAllReviews}
                        />
                    </div>

                    {/* Task Distribution */}
                    {distribution && (
                        <div className="glass-panel p-5">
                            <TaskDistributionChart distribution={distribution} />
                        </div>
                    )}

                    {/* Blockers & Risks */}
                    {overview && (
                        <div className="glass-panel p-5">
                            <BlockersPanel
                                developers={overview.developers}
                                recentActivity={recentActivity}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom: Recent Activity Feed */}
            <div className="glass-panel p-5 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-[#00d4ff]">schedule</span>
                    <h3 className="label-mono text-[#bbc9cf] tracking-wider">Recent Activity</h3>
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
    progress?: number;
}

function StatCard({ label, value, icon, color = '#00d4ff', progress = 0 }: StatCardProps) {
    return (
        <div
            className="relative overflow-hidden rounded-xl p-4 scanline"
            style={{
                background: 'rgba(25, 25, 35, 0.7)',
                backdropFilter: 'blur(12px)',
                borderTop: '1px solid rgba(0, 212, 255, 0.2)',
                borderLeft: '1px solid rgba(0, 212, 255, 0.2)',
                borderRight: '1px solid transparent',
                borderBottom: '1px solid transparent',
            }}
        >
            <div className="flex flex-col gap-2">
                <span
                    className="material-symbols-outlined text-3xl"
                    style={{ color }}
                >
                    {icon}
                </span>
                <span className="label-mono text-[#859398]">{label}</span>
                <span className="text-3xl font-bold font-mono text-[#e5e1e4]">{value}</span>
            </div>
            {/* Gradient progress bar at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2a2a2c]">
                <div
                    className="h-full transition-all duration-700 rounded-r"
                    style={{
                        width: `${Math.min(progress, 100)}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}88)`,
                        boxShadow: `0 0 8px ${color}66`,
                    }}
                />
            </div>
        </div>
    );
}
