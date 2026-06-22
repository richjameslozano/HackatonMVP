import type { DeveloperOverview, RecentActivityEntry } from '../../services/team-progress.service';

export interface BlockersPanelProps {
    developers: DeveloperOverview[];
    recentActivity: RecentActivityEntry[];
    inactivityThresholdDays?: number;
}

interface BlockerEntry {
    developerId: string;
    developerName: string;
    description: string;
    severity: 'high' | 'amber';
}

function getInactiveDevelopers(
    developers: DeveloperOverview[],
    recentActivity: RecentActivityEntry[],
    thresholdDays: number,
): BlockerEntry[] {
    const now = new Date();
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;

    // Build a map of developer ID -> most recent activity timestamp
    const lastActivityMap = new Map<string, Date>();
    for (const entry of recentActivity) {
        const existing = lastActivityMap.get(entry.developerId);
        if (!existing || entry.timestamp > existing) {
            lastActivityMap.set(entry.developerId, entry.timestamp);
        }
    }

    const inactive: BlockerEntry[] = [];
    for (const dev of developers) {
        const lastActivity = lastActivityMap.get(dev.member.memberId);
        if (!lastActivity) {
            // No activity at all — consider inactive
            inactive.push({
                developerId: dev.member.memberId,
                developerName: dev.member.displayName,
                description: 'No recent activity recorded',
                severity: 'amber',
            });
        } else {
            const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000));
            if (daysSinceActivity >= thresholdDays) {
                inactive.push({
                    developerId: dev.member.memberId,
                    developerName: dev.member.displayName,
                    description: `No activity for ${daysSinceActivity} days`,
                    severity: 'amber',
                });
            }
        }
    }

    return inactive;
}

function getHighPriorityBlockers(developers: DeveloperOverview[]): BlockerEntry[] {
    const blockers: BlockerEntry[] = [];

    for (const dev of developers) {
        const issues: string[] = [];
        if (dev.blockedQuests > 0) {
            issues.push(`${dev.blockedQuests} blocked task${dev.blockedQuests > 1 ? 's' : ''}`);
        }
        if (dev.rejectedQuests > 0) {
            issues.push(`${dev.rejectedQuests} rejected task${dev.rejectedQuests > 1 ? 's' : ''}`);
        }

        if (issues.length > 0) {
            blockers.push({
                developerId: dev.member.memberId,
                developerName: dev.member.displayName,
                description: issues.join(', '),
                severity: 'high',
            });
        }
    }

    return blockers;
}

export function BlockersPanel({
    developers,
    recentActivity,
    inactivityThresholdDays = 7,
}: BlockersPanelProps) {
    const highPriority = getHighPriorityBlockers(developers);
    const inactivity = getInactiveDevelopers(developers, recentActivity, inactivityThresholdDays);
    const hasIssues = highPriority.length > 0 || inactivity.length > 0;

    return (
        <div className="p-4">
            <h3 className="text-sm font-semibold text-[#e5e1e4]">Blockers & Risks</h3>

            {!hasIssues && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-[rgba(34,197,94,0.1)] px-3 py-2.5">
                    <span className="text-green-400" aria-hidden="true">✓</span>
                    <p className="text-sm text-green-400 font-medium">All clear — no blockers or risks</p>
                </div>
            )}

            {highPriority.length > 0 && (
                <div className="mt-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-red-400 mb-2">
                        High Priority
                    </h4>
                    <ul className="space-y-2" aria-label="High priority blockers">
                        {highPriority.map((entry) => (
                            <li
                                key={entry.developerId}
                                className="flex items-start gap-2 rounded-lg border border-red-800/30 bg-[rgba(239,68,68,0.1)] px-3 py-2"
                            >
                                <span
                                    className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-red-500"
                                    aria-hidden="true"
                                />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-[#e5e1e4] truncate">
                                        {entry.developerName}
                                    </p>
                                    <p className="text-xs text-red-400">{entry.description}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {inactivity.length > 0 && (
                <div className="mt-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-400 mb-2">
                        Inactivity
                    </h4>
                    <ul className="space-y-2" aria-label="Inactivity risks">
                        {inactivity.map((entry) => (
                            <li
                                key={entry.developerId}
                                className="flex items-start gap-2 rounded-lg border border-amber-800/30 bg-[rgba(245,158,11,0.1)] px-3 py-2"
                            >
                                <span
                                    className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-amber-500"
                                    aria-hidden="true"
                                />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-[#e5e1e4] truncate">
                                        {entry.developerName}
                                    </p>
                                    <p className="text-xs text-amber-400">{entry.description}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
