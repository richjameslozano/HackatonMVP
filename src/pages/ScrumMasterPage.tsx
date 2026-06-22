import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/app.store';
import { LoadingIndicator, ValidationError } from '../components/shared';
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
    type DeveloperOverview,
} from '../services/team-progress.service';
import { listRecords, extractTextValue } from '../services/lark-api.service';
import { TABLE_IDS } from '../services/config';
import { delegateTask } from '../services/quest.service';
import { listProjects } from '../services/project.service';
import { validateTaskTitle, validateTaskDescription } from '../utils/validation';
import { SmTaskCreationForm } from '../components/quest/SmTaskCreationForm';
import type { Difficulty, Project } from '../types';

export function ScrumMasterPage() {
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

    // Delegate task modal state
    const [showDelegateModal, setShowDelegateModal] = useState(false);
    const [delegateSubmitting, setDelegateSubmitting] = useState(false);

    // SM task creation modal state
    const [showSmTaskModal, setShowSmTaskModal] = useState(false);

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
            <div className="flex items-start justify-between">
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
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => setShowSmTaskModal(true)}
                        className="inline-flex items-center gap-1.5 border border-[#00d4ff]/40 px-4 py-2.5 text-sm font-bold text-[#00d4ff] font-mono uppercase tracking-wider transition-all hover:bg-[#00d4ff]/10 hover:shadow-[0_0_15px_rgba(0,212,255,0.2)] focus:outline-none active:scale-95"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Create Task
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowDelegateModal(true)}
                        className="inline-flex items-center gap-1.5 border border-[#d1bcff]/40 px-4 py-2.5 text-sm font-bold text-[#d1bcff] font-mono uppercase tracking-wider transition-all hover:bg-[#d1bcff]/10 hover:shadow-[0_0_15px_rgba(209,188,255,0.2)] focus:outline-none active:scale-95"
                    >
                        <span className="material-symbols-outlined text-lg">assignment_ind</span>
                        Delegate Task
                    </button>
                </div>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="Active Developers"
                    value={stats?.totalDevelopers ?? 0}
                    icon="groups"
                    color="#00d4ff"
                    progress={(stats?.totalDevelopers ?? 0) > 0 ? 75 : 0}
                />
                <StatCard
                    label="Total Quests"
                    value={stats?.totalTasks ?? 0}
                    icon="terminal"
                    color="#00d4ff"
                    progress={stats?.completionPercentage ?? 0}
                />
                <StatCard
                    label="In Progress"
                    value={stats?.activeTasks ?? 0}
                    icon="bolt"
                    color="#d1bcff"
                    progress={stats && stats.totalTasks > 0 ? Math.round((stats.activeTasks / stats.totalTasks) * 100) : 0}
                />
                <StatCard
                    label="Pending Intel"
                    value={stats?.pendingTasks ?? 0}
                    icon="hourglass_top"
                    color="#c6c4df"
                    progress={stats && stats.totalTasks > 0 ? Math.round((stats.pendingTasks / stats.totalTasks) * 100) : 0}
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

            {/* Delegate Task Modal */}
            {showDelegateModal && (
                <DelegateTaskModal
                    developers={overview?.developers ?? []}
                    onClose={() => setShowDelegateModal(false)}
                    submitting={delegateSubmitting}
                    onSubmit={async (title, description, developerId, difficulty, projectId) => {
                        setDelegateSubmitting(true);
                        try {
                            await delegateTask(title, description, developerId, difficulty, projectId ? [projectId] : []);
                            setShowDelegateModal(false);
                            void loadData();
                        } finally {
                            setDelegateSubmitting(false);
                        }
                    }}
                />
            )}

            {/* SM Task Creation Modal (project-scoped) */}
            {showSmTaskModal && (
                <SmTaskCreationForm
                    developers={overview?.developers ?? []}
                    onClose={() => setShowSmTaskModal(false)}
                    onTaskCreated={() => void loadData()}
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

// ─── Delegate Task Modal ────────────────────────────────────────────────────

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; coins: number; sublabel: string; colorClass: string }[] = [
    { value: 'easy', label: 'EASY', coins: 1, sublabel: 'Standard task', colorClass: 'text-[#bbc9cf]' },
    { value: 'medium', label: 'MEDIUM', coins: 2, sublabel: 'High priority', colorClass: 'text-[#d1bcff]' },
    { value: 'hard', label: 'HARD', coins: 3, sublabel: 'Critical mission', colorClass: 'text-[#00d4ff]' },
];

interface DelegateTaskModalProps {
    developers: DeveloperOverview[];
    onClose: () => void;
    submitting: boolean;
    onSubmit: (title: string, description: string, developerId: string, difficulty: Difficulty, projectId: string) => Promise<void>;
}

function DelegateTaskModal({ developers, onClose, submitting, onSubmit }: DelegateTaskModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [difficulty, setDifficulty] = useState<Difficulty>('easy');
    const [selectedDeveloperId, setSelectedDeveloperId] = useState('');
    const [projectId, setProjectId] = useState('');
    const [projects, setProjects] = useState<Project[]>([]);
    const [titleTouched, setTitleTouched] = useState(false);
    const [descTouched, setDescTouched] = useState(false);

    const titleValidation = validateTaskTitle(title);
    const descValidation = validateTaskDescription(description);
    const isFormValid = titleValidation.valid && descValidation.valid && selectedDeveloperId !== '';

    useEffect(() => {
        listProjects().then(setProjects).catch(() => setProjects([]));
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setTitleTouched(true);
        setDescTouched(true);

        if (!isFormValid || submitting) return;

        await onSubmit(title.trim(), description.trim(), selectedDeveloperId, difficulty, projectId);
    }

    const modal = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delegate-task-modal-title"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-md"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal container */}
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0e0e10] border border-[rgba(0,212,255,0.3)] shadow-[0_0_15px_rgba(0,212,255,0.15),inset_0_0_2px_rgba(0,212,255,0.3)] animate-fade-slide-up">
                {/* Top-right metadata */}
                <div className="absolute top-4 right-6 font-mono text-[12px] text-[rgba(60,215,255,0.4)]">
                    SYS_CMD: TASK_DELEGATE_v1.0
                </div>

                {/* Content */}
                <div className="p-6 md:p-10 space-y-8">
                    {/* Header */}
                    <div className="flex items-center gap-4 border-b border-[#3c494e]/20 pb-6">
                        <div className="flex items-center justify-center w-12 h-12 bg-[rgba(0,212,255,0.1)] border border-[rgba(60,215,255,0.3)]">
                            <span className="material-symbols-outlined text-[#3cd7ff]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                assignment_ind
                            </span>
                        </div>
                        <div>
                            <h1 id="delegate-task-modal-title" className="font-headline text-2xl font-semibold text-[#e5e1e4] tracking-tight flex items-center gap-2">
                                Delegate Task
                                <span className="material-symbols-outlined text-[#3cd7ff] text-lg">bolt</span>
                            </h1>
                            <p className="font-mono text-[12px] text-[#bbc9cf] uppercase mt-1">
                                Create &amp; assign directly to developer
                            </p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Title */}
                        <div className="space-y-2">
                            <label htmlFor="delegate-task-title" className="font-mono text-[12px] text-[#3cd7ff] uppercase flex justify-between">
                                Quest Title
                                <span className="text-[rgba(187,201,207,0.4)]">Required</span>
                            </label>
                            <input
                                id="delegate-task-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onBlur={() => setTitleTouched(true)}
                                maxLength={100}
                                placeholder="Enter task title..."
                                className="w-full bg-[#201f21] border-0 border-b border-[#3c494e] focus:border-[#00d4ff] focus:ring-0 text-[#e5e1e4] text-base py-3 px-0 transition-all placeholder:text-[rgba(187,201,207,0.3)]"
                                autoFocus
                            />
                            {titleTouched && !titleValidation.valid && (
                                <ValidationError message={titleValidation.error} />
                            )}
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label htmlFor="delegate-task-description" className="font-mono text-[12px] text-[#3cd7ff] uppercase">
                                Description
                            </label>
                            <textarea
                                id="delegate-task-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onBlur={() => setDescTouched(true)}
                                maxLength={500}
                                rows={4}
                                placeholder="Detail the parameters of the quest..."
                                className="w-full bg-[#201f21] border-0 border-b border-[#3c494e] focus:border-[#00d4ff] focus:ring-0 text-[#e5e1e4] text-base py-3 px-0 transition-all placeholder:text-[rgba(187,201,207,0.3)] resize-none"
                            />
                            {descTouched && !descValidation.valid && (
                                <ValidationError message={descValidation.error} />
                            )}
                        </div>

                        {/* Select Project */}
                        <div className="space-y-2">
                            <label htmlFor="delegate-task-project" className="font-mono text-[12px] text-[#3cd7ff] uppercase">
                                Select Project
                            </label>
                            <select
                                id="delegate-task-project"
                                value={projectId}
                                onChange={(e) => setProjectId(e.target.value)}
                                className="w-full bg-[#201f21] border-0 border-b border-[#3c494e] focus:border-[#00d4ff] focus:ring-0 text-[#e5e1e4] text-base py-3 px-0 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">No project</option>
                                {projects.map((p) => (
                                    <option key={p.projectId} value={p.projectId}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Difficulty Selection */}
                        <div className="space-y-4">
                            <label className="font-mono text-[12px] text-[#3cd7ff] uppercase">
                                Difficulty Selection
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {DIFFICULTY_OPTIONS.map((option) => {
                                    const isSelected = difficulty === option.value;
                                    return (
                                        <label key={option.value} className="cursor-pointer">
                                            <input
                                                type="radio"
                                                name="delegate-difficulty"
                                                value={option.value}
                                                checked={isSelected}
                                                onChange={() => setDifficulty(option.value)}
                                                className="hidden"
                                            />
                                            <div className={`p-4 border bg-[#1c1b1d] transition-all duration-200 flex flex-col items-center text-center gap-2 ${isSelected
                                                ? 'border-[#3cd7ff] bg-[rgba(0,212,255,0.05)] shadow-[0_0_10px_rgba(0,212,255,0.2)]'
                                                : 'border-[#3c494e]/30 hover:border-[#3c494e]'
                                                }`}>
                                                <span className={`font-mono text-[12px] uppercase ${option.colorClass}`}>
                                                    {option.label}
                                                </span>
                                                <div className="text-[#e5e1e4] font-headline text-2xl font-semibold">
                                                    {option.coins} Coin{option.coins > 1 ? 's' : ''}
                                                </div>
                                                <div className="w-full h-[1px] bg-[#3c494e]/20" />
                                                <span className="font-mono text-[12px] text-[rgba(187,201,207,0.6)]">
                                                    {option.sublabel}
                                                </span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Assign To */}
                        <div className="space-y-2">
                            <label htmlFor="delegate-task-assignee" className="font-mono text-[12px] text-[#3cd7ff] uppercase flex justify-between">
                                Assign To
                                <span className="text-[rgba(187,201,207,0.4)]">Required</span>
                            </label>
                            <select
                                id="delegate-task-assignee"
                                value={selectedDeveloperId}
                                onChange={(e) => setSelectedDeveloperId(e.target.value)}
                                className="w-full bg-[#201f21] border-0 border-b border-[#3c494e] focus:border-[#00d4ff] focus:ring-0 text-[#e5e1e4] text-base py-3 px-0 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Select a developer...</option>
                                {developers.map((dev) => (
                                    <option key={dev.member.memberId} value={dev.member.memberId}>
                                        {dev.member.displayName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Buttons */}
                        <div className="flex flex-col md:flex-row gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={!isFormValid || submitting}
                                className="flex-1 bg-[#00d4ff] text-[#003642] font-headline text-xl font-semibold py-4 shadow-[0_0_20px_rgba(0,212,255,0.4)] hover:bg-[#3cd7ff] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Delegate Task
                                        <span className="material-symbols-outlined text-lg">send</span>
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 border border-[rgba(60,215,255,0.3)] text-[#3cd7ff] font-headline text-xl font-semibold py-4 hover:bg-[rgba(0,212,255,0.1)] transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>

                {/* Bottom progress bar decoration */}
                <div className="w-full h-1 bg-[#3c494e]/10">
                    <div className="h-full w-2/3 bg-gradient-to-r from-[#00d4ff] to-[#6100e0]" />
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}
