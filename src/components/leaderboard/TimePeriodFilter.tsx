import type { TimePeriod } from '../../services/leaderboard.service';

interface TimePeriodFilterProps {
    selected: TimePeriod;
    onChange: (period: TimePeriod) => void;
}

const periods: { value: TimePeriod; label: string }[] = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'all-time', label: 'All Time' },
];

export function TimePeriodFilter({ selected, onChange }: TimePeriodFilterProps) {
    return (
        <div className="flex gap-1 rounded-lg bg-surface-100 p-1" role="group" aria-label="Filter by time period">
            {periods.map(({ value, label }) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => onChange(value)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${selected === value
                            ? 'bg-white text-madrid-700 shadow-sm'
                            : 'text-surface-500 hover:text-surface-700'
                        }`}
                    aria-pressed={selected === value}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
