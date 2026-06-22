import { useEffect } from 'react';
import { useAppStore } from '../store/app.store';
import { BadgeGrid } from '../components/badge';
import { LoadingIndicator, ConfettiAnimation } from '../components/shared';

export function BadgeCollectionPage() {
  const selectedRole = useAppStore((s) => s.selectedRole);
  const badgeCollection = useAppStore((s) => s.badgeCollection);
  const badgesLoading = useAppStore((s) => s.badgesLoading);
  const fetchBadgeCollection = useAppStore((s) => s.fetchBadgeCollection);
  const newBadgeUnlocked = useAppStore((s) => s.newBadgeUnlocked);
  const clearNewBadgeUnlocked = useAppStore((s) => s.clearNewBadgeUnlocked);

  useEffect(() => {
    fetchBadgeCollection();
  }, [fetchBadgeCollection, selectedRole]);

  if (badgesLoading) {
    return <LoadingIndicator size="lg" message="Loading badges..." />;
  }

  if (!badgeCollection) {
    return null;
  }

  const roleLabel = selectedRole === 'agent' ? 'Strategic Agent' : 'Execution Dev';
  const progressPercent = badgeCollection.totalCount > 0
    ? Math.round((badgeCollection.earnedCount / badgeCollection.totalCount) * 100)
    : 0;

  // Next badge progress
  const { nextBadge, nextBadgeProgress, nextBadgeRequired, qualifyingCompletions } = badgeCollection;
  const nextBadgePercent = nextBadgeRequired > 0
    ? Math.round((nextBadgeProgress / nextBadgeRequired) * 100)
    : 100;

  // SVG progress ring calculations
  const ringRadius = 80;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progressPercent / 100);

  return (
    <div className="space-y-8">
      {/* Confetti on badge unlock */}
      <ConfettiAnimation
        visible={newBadgeUnlocked}
        onComplete={clearNewBadgeUnlocked}
      />

      {/* ─── Header Section ─── */}
      <div className="flex flex-col items-center justify-between gap-8 sm:flex-row sm:items-start">
        {/* Left: Title + subtitle */}
        <div className="flex-1">
          <h1
            className="text-5xl font-bold tracking-tight"
            style={{ color: '#00d4ff', fontSize: '48px' }}
          >
            Badge Collection
          </h1>
          <p className="mt-2 text-base" style={{ color: '#859398' }}>
            {roleLabel} path — {badgeCollection.earnedCount} of {badgeCollection.totalCount} badges unlocked
          </p>

          {/* Next badge info */}
          {nextBadge ? (
            <div className="mt-4">
              <p className="text-sm" style={{ color: '#bbc9cf' }}>
                Next badge: <span className="font-semibold" style={{ color: '#00d4ff' }}>{nextBadge.name}</span>
              </p>
              <p className="mt-0.5 text-xs" style={{ color: '#859398' }}>
                {nextBadge.description}
              </p>
              {/* Next badge progress bar */}
              <div className="mt-3 max-w-sm">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="label-mono" style={{ color: '#859398' }}>Progress</span>
                  <span className="font-semibold" style={{ color: '#bbc9cf' }}>
                    {qualifyingCompletions} / {nextBadgeRequired} quests
                  </span>
                </div>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${nextBadgePercent}%` }}
                  />
                </div>
                <p className="mt-1 text-xs" style={{ color: '#859398' }}>
                  {nextBadgeRequired - qualifyingCompletions} more quest{nextBadgeRequired - qualifyingCompletions !== 1 ? 's' : ''} to unlock
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm font-medium" style={{ color: '#3cd7ff' }}>
              🎉 All badges earned! You're a legend.
            </p>
          )}
        </div>

        {/* Right: Circular progress gauge */}
        <div
          className="glass-panel flex-shrink-0 flex items-center justify-center"
          style={{ width: '200px', height: '200px', borderRadius: '50%' }}
        >
          <svg
            className="-rotate-90"
            width="180"
            height="180"
            viewBox="0 0 180 180"
          >
            {/* Track */}
            <circle
              cx="90"
              cy="90"
              r={ringRadius}
              fill="none"
              strokeWidth="10"
              stroke="#2a2a2c"
            />
            {/* Progress */}
            <circle
              cx="90"
              cy="90"
              r={ringRadius}
              fill="none"
              strokeWidth="10"
              stroke="#00d4ff"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              style={{
                transition: 'stroke-dashoffset 0.7s ease',
                filter: 'drop-shadow(0 0 6px rgba(0, 212, 255, 0.5))',
              }}
            />
          </svg>
          {/* Center text */}
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" style={{ color: '#e5e1e4' }}>
              {progressPercent}%
            </span>
            <span className="label-mono mt-1" style={{ color: '#859398' }}>
              Collected
            </span>
          </div>
        </div>
      </div>

      {/* ─── Dev Path Section ─── */}
      <div>
        {/* Section header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined"
              style={{ color: '#00d4ff', fontSize: '20px' }}
            >
              bolt
            </span>
            <h2
              className="text-lg font-semibold"
              style={{ color: '#e5e1e4' }}
            >
              {roleLabel} Path
            </h2>
          </div>
          <span className="label-mono" style={{ color: '#3cd7ff' }}>
            {badgeCollection.earnedCount} / {badgeCollection.totalCount} Unlocked
          </span>
        </div>
        {/* Divider */}
        <div
          className="mt-2 mb-5 h-px w-full"
          style={{ background: 'linear-gradient(to right, rgba(0,212,255,0.4), transparent)' }}
        />

        {/* Badge grid */}
        <BadgeGrid badges={badgeCollection.badges} />
      </div>
    </div>
  );
}
