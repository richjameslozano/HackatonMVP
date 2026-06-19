interface ProgressBarProps {
  earned: number;
  total: number;
}

export function ProgressBar({ earned, total }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((earned / total) * 100) : 0;

  return (
    <div className="w-full" role="progressbar" aria-valuenow={earned} aria-valuemin={0} aria-valuemax={total} aria-label={`${earned} of ${total} badges earned`}>
      <div className="flex items-center justify-between text-sm text-gray-700">
        <span className="font-medium">Badges Earned</span>
        <span className="font-medium">{earned} / {total}</span>
      </div>
      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {total > 0 && earned === 0 && (
        <p className="mt-2 text-xs text-gray-500">
          Complete quests to start earning badges. You can do it!
        </p>
      )}
    </div>
  );
}
