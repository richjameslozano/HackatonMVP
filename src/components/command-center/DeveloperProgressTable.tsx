import { useState, useMemo, useCallback } from 'react';
import type { DeveloperOverview } from '../../services/team-progress.service';

type SortField = 'name' | 'completion';
type SortDirection = 'asc' | 'desc';

interface DeveloperProgressTableProps {
    developers: DeveloperOverview[];
    onViewDetails: (developerId: string) => void;
}

function getAvatarColor(name: string): string {
    const colors = [
        'bg-[rgba(0,212,255,0.2)] text-[#3cd7ff]',
        'bg-blue-900/30 text-blue-400',
        'bg-green-900/30 text-green-400',
        'bg-purple-900/30 text-purple-400',
        'bg-amber-900/30 text-amber-400',
        'bg-rose-900/30 text-rose-400',
        'bg-teal-900/30 text-teal-400',
        'bg-indigo-900/30 text-indigo-400',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index]!;
}

function generateCsv(developers: DeveloperOverview[]): string {
    const headers = ['Developer', 'Role', 'Total Tasks', 'Completed', 'Active', 'Pending', 'Rejected', 'Blocked', 'Completion %'];
    const rows = developers.map((dev) => [
        dev.member.displayName,
        dev.member.primaryRole,
        dev.totalQuests.toString(),
        dev.completedQuests.toString(),
        dev.activeQuests.toString(),
        dev.pendingQuests.toString(),
        dev.rejectedQuests.toString(),
        dev.blockedQuests.toString(),
        `${dev.completionPercentage}%`,
    ]);

    const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
        .join('\n');

    return csvContent;
}

function downloadCsv(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function DeveloperProgressTable({ developers, onViewDetails }: DeveloperProgressTableProps) {
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const sortedDevelopers = useMemo(() => {
        const sorted = [...developers];
        sorted.sort((a, b) => {
            if (sortField === 'name') {
                const cmp = a.member.displayName.localeCompare(b.member.displayName);
                return sortDirection === 'asc' ? cmp : -cmp;
            }
            // completion
            const cmp = a.completionPercentage - b.completionPercentage;
            return sortDirection === 'asc' ? cmp : -cmp;
        });
        return sorted;
    }, [developers, sortField, sortDirection]);

    const handleSort = useCallback((field: SortField) => {
        if (sortField === field) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection(field === 'name' ? 'asc' : 'desc');
        }
    }, [sortField]);

    const handleExportCsv = useCallback(() => {
        const csv = generateCsv(developers);
        const date = new Date().toISOString().split('T')[0];
        downloadCsv(csv, `developer-progress-${date}.csv`);
    }, [developers]);

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return '↕';
        return sortDirection === 'asc' ? '↑' : '↓';
    };

    return (
        <div className="overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#3c494e] px-5 py-4">
                <h3 className="text-sm font-semibold text-[#e5e1e4]">Developer Progress</h3>
                <button
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#2a2a2c] px-3 py-1.5 text-xs font-medium text-[#bbc9cf] transition-colors hover:bg-[#353437]"
                    aria-label="Download CSV export"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download CSV
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full" role="table" aria-label="Developer progress overview">
                    <thead>
                        <tr className="border-b border-[#3c494e]/50 bg-[#1c1b1d]">
                            <th
                                className="cursor-pointer px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#859398] hover:text-[#bbc9cf]"
                                onClick={() => handleSort('name')}
                                aria-sort={sortField === 'name' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                                <span className="inline-flex items-center gap-1">
                                    Developer
                                    <span className="text-[#859398]">{getSortIcon('name')}</span>
                                </span>
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#859398]">
                                Tasks
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#859398]">
                                Status
                            </th>
                            <th
                                className="cursor-pointer px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#859398] hover:text-[#bbc9cf]"
                                onClick={() => handleSort('completion')}
                                aria-sort={sortField === 'completion' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                                <span className="inline-flex items-center gap-1">
                                    Progress
                                    <span className="text-[#859398]">{getSortIcon('completion')}</span>
                                </span>
                            </th>
                            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#859398]">
                                Action
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3c494e]/50">
                        {sortedDevelopers.map((dev) => (
                            <DeveloperRow
                                key={dev.member.memberId}
                                developer={dev}
                                onViewDetails={onViewDetails}
                            />
                        ))}
                        {sortedDevelopers.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-5 py-8 text-center text-sm text-[#859398]">
                                    No developers found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

interface DeveloperRowProps {
    developer: DeveloperOverview;
    onViewDetails: (developerId: string) => void;
}

function DeveloperRow({ developer, onViewDetails }: DeveloperRowProps) {
    const { member, totalQuests, blockedQuests, activeQuests, pendingQuests, rejectedQuests, completedQuests, completionPercentage } = developer;

    return (
        <tr className="transition-colors hover:bg-[#201f21]">
            {/* Developer (avatar + name + role) */}
            <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                    <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${getAvatarColor(member.displayName)}`}
                        aria-hidden="true"
                    >
                        {member.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#e5e1e4]">{member.displayName}</p>
                        <p className="text-xs capitalize text-[#859398]">{member.primaryRole}</p>
                    </div>
                </div>
            </td>

            {/* Tasks (count + blocked indicator) */}
            <td className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#e5e1e4]">{totalQuests}</span>
                    {blockedQuests > 0 && (
                        <span
                            className="badge-pill bg-red-900/30 text-red-400"
                            title={`${blockedQuests} blocked`}
                        >
                            {blockedQuests} blocked
                        </span>
                    )}
                </div>
            </td>

            {/* Status Summary (colored dots) */}
            <td className="px-5 py-3.5">
                <div className="flex items-center gap-1.5">
                    {completedQuests > 0 && (
                        <StatusDot color="green" count={completedQuests} label="completed" />
                    )}
                    {activeQuests > 0 && (
                        <StatusDot color="green" count={activeQuests} label="active" />
                    )}
                    {pendingQuests > 0 && (
                        <StatusDot color="yellow" count={pendingQuests} label="pending" />
                    )}
                    {rejectedQuests > 0 && (
                        <StatusDot color="red" count={rejectedQuests} label="rejected" />
                    )}
                    {blockedQuests > 0 && (
                        <StatusDot color="gray" count={blockedQuests} label="blocked" />
                    )}
                    {totalQuests === 0 && (
                        <span className="text-xs text-[#859398]">—</span>
                    )}
                </div>
            </td>

            {/* Progress (bar + percentage) */}
            <td className="px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-[#2a2a2c]">
                        <div
                            className="h-full rounded-full bg-[#00d4ff] transition-all duration-300"
                            style={{ width: `${completionPercentage}%` }}
                            role="progressbar"
                            aria-valuenow={completionPercentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${completionPercentage}% complete`}
                        />
                    </div>
                    <span className="text-xs font-medium text-[#bbc9cf]">{completionPercentage}%</span>
                </div>
            </td>

            {/* Action (View Details button) */}
            <td className="px-5 py-3.5 text-right">
                <button
                    onClick={() => onViewDetails(member.memberId)}
                    className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-[#3cd7ff] transition-colors hover:bg-[rgba(0,212,255,0.1)] hover:text-[#00d4ff]"
                    aria-label={`View details for ${member.displayName}`}
                >
                    View Details
                </button>
            </td>
        </tr>
    );
}

interface StatusDotProps {
    color: 'green' | 'yellow' | 'red' | 'gray';
    count: number;
    label: string;
}

function StatusDot({ color, count, label }: StatusDotProps) {
    const colorClasses: Record<string, string> = {
        green: 'bg-green-500',
        yellow: 'bg-yellow-500',
        red: 'bg-red-500',
        gray: 'bg-[#859398]',
    };

    return (
        <span
            className="inline-flex items-center gap-0.5"
            title={`${count} ${label}`}
            aria-label={`${count} ${label}`}
        >
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${colorClasses[color]}`} />
            <span className="text-xs text-[#859398]">{count}</span>
        </span>
    );
}
