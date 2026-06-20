interface ProgressBarProps {
  earned: number;
  total: number;
}

export function ProgressBar({ earned, total }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((earned / total) * 100) : 0;

  return (
    <div className="w-full" role="progressbar" aria-valuenow={earned} aria-valuemin={0} aria-valuemax={total} aria-label={`${earned} of ${total} badges earned`}>
      <div className="flex items-center justify-between text-xs text-surface-500 mb-1.5">
        <span className="font-medium uppercase tracking-wide">Next Badge Progress</span>
        <span className="font-semibold text-surface-700">{earned} / {total} tasks</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-100">
        <div
          className="h-full rounded-full bg-madrid-500 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
