interface RankChangeIndicatorProps {
    currentRank: number;
    previousRank: number | null;
}

export function RankChangeIndicator({ currentRank, previousRank }: RankChangeIndicatorProps) {
    if (previousRank === null) {
        // No previous data — don't show anything
        return null;
    }

    const change = previousRank - currentRank;

    if (change === 0) return null;

    if (change > 0) {
        // Rank went up (number decreased)
        const label = change === 1 ? 'Moved up 1 position' : `Moved up ${change} positions`;
        return (
            <span
                className="ml-1 inline-flex items-center text-xs font-medium text-green-600"
                title={`Up ${change} from #${previousRank}`}
                aria-label={label}
            >
                ▲ {change}
            </span>
        );
    }

    // Rank went down (number increased)
    const absChange = Math.abs(change);
    const label = absChange === 1 ? 'Moved down 1 position' : `Moved down ${absChange} positions`;
    return (
        <span
            className="ml-1 inline-flex items-center text-xs font-medium text-red-500"
            title={`Down ${absChange} from #${previousRank}`}
            aria-label={label}
        >
            ▼ {absChange}
        </span>
    );
}
