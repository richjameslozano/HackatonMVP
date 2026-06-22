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
        <div
            className="inline-flex gap-0 rounded-lg bg-[#201f21] border border-[#3c494e] p-1"
            role="group"
            aria-label="Filter by time period"
        >
            {periods.map(({ value, label }) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => onChange(value)}
                    className={`rounded-md px-4 py-2 font-mono text-sm font-medium transition-all ${selected === value
                            ? 'bg-[#2a2a2c] text-[#3cd7ff] border border-[rgba(0,212,255,0.3)] shadow-[0_0_10px_rgba(0,212,255,0.15)]'
                            : 'text-[#859398] hover:text-[#bbc9cf] border border-transparent'
                        }`}
                    aria-pressed={selected === value}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
