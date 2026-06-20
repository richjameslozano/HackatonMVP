import type { TaskDistribution } from '../../services/team-progress.service';

interface TaskDistributionChartProps {
    distribution: TaskDistribution;
}

const STATUS_CONFIG = [
    { key: 'completed' as const, label: 'Completed', color: 'bg-green-500' },
    { key: 'inProgress' as const, label: 'In Progress', color: 'bg-blue-500' },
    { key: 'forReview' as const, label: 'For Review', color: 'bg-yellow-500' },
    { key: 'blocked' as const, label: 'Blocked', color: 'bg-red-500' },
];

export function TaskDistributionChart({ distribution }: TaskDistributionChartProps) {
    const hasData = STATUS_CONFIG.some((s) => distribution[s.key] > 0);

    if (!hasData) {
        return (
            <div className="rounded-lg border border-surface-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-surface-700 mb-3">Task Distribution</h3>
                <p className="text-xs text-surface-400 text-center py-4">No tasks tracked yet</p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-surface-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-surface-700 mb-3">Task Distribution</h3>

            {/* Stacked horizontal bar */}
            <div
                className="flex h-5 w-full overflow-hidden rounded-full"
                role="img"
                aria-label="Task distribution chart"
            >
                {STATUS_CONFIG.map(({ key, label, color }) => {
                    const value = distribution[key];
                    if (value === 0) return null;
                    return (
                        <div
                            key={key}
                            className={`${color} flex items-center justify-center transition-all duration-300`}
                            style={{ width: `${value}%` }}
                            title={`${label}: ${value}%`}
                        >
                            {value >= 10 && (
                                <span className="text-[10px] font-semibold text-white">{value}%</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {STATUS_CONFIG.map(({ key, label, color }) => (
                    <div key={key} className="flex items-center gap-1.5">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
                        <span className="text-xs text-surface-600">
                            {label} <span className="font-semibold">{distribution[key]}%</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
