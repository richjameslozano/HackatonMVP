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

  return (
    <div className="space-y-6">
      {/* Confetti on badge unlock */}
      <ConfettiAnimation
        visible={newBadgeUnlocked}
        onComplete={clearNewBadgeUnlocked}
      />

      {/* Header with progress ring */}
      <div className="card">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          {/* Progress circle - overall badge progress */}
          <div className="relative flex h-24 w-24 items-center justify-center flex-shrink-0">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="none" strokeWidth="8" className="stroke-surface-100" />
              <circle
                cx="48" cy="48" r="40" fill="none" strokeWidth="8"
                className="stroke-madrid-500 transition-all duration-700"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPercent / 100)}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-surface-900">{progressPercent}%</span>
              <span className="text-[10px] uppercase tracking-wide text-surface-500">Badges</span>
            </div>
          </div>

          {/* Info + next badge progress */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-xl font-bold text-surface-900">Badge Collection</h1>

            {nextBadge ? (
              <div className="mt-2">
                <p className="text-sm text-surface-600">
                  Next badge: <span className="font-semibold text-madrid-700">{nextBadge.name}</span>
                </p>
                <p className="mt-0.5 text-xs text-surface-400">
                  {nextBadge.description}
                </p>
                {/* Next badge progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-surface-500 mb-1.5">
                    <span className="font-medium uppercase tracking-wide">Progress</span>
                    <span className="font-semibold text-surface-700">
                      {qualifyingCompletions} / {nextBadgeRequired} quests
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-100">
                    <div
                      className="h-full rounded-full bg-madrid-500 transition-all duration-500"
                      style={{ width: `${nextBadgePercent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-surface-400">
                    {nextBadgeRequired - qualifyingCompletions} more quest{nextBadgeRequired - qualifyingCompletions !== 1 ? 's' : ''} to unlock
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-madrid-600 font-medium">
                🎉 All badges earned! You're a legend.
              </p>
            )}
          </div>

          {/* Stats summary */}
          <div className="flex gap-3 flex-shrink-0">
            <div className="flex flex-col items-center rounded-lg border border-surface-200 px-4 py-2">
              <span className="text-lg font-bold text-madrid-600">{qualifyingCompletions}</span>
              <span className="text-[10px] uppercase tracking-wide text-surface-500">Quests</span>
            </div>
            <div className="flex flex-col items-center rounded-lg border border-surface-200 px-4 py-2">
              <span className="text-lg font-bold text-madrid-600">{badgeCollection.earnedCount}</span>
              <span className="text-[10px] uppercase tracking-wide text-surface-500">Badges</span>
            </div>
            <div className="flex flex-col items-center rounded-lg border border-surface-200 px-4 py-2">
              <span className="text-lg font-bold text-surface-600">{badgeCollection.totalCount}</span>
              <span className="text-[10px] uppercase tracking-wide text-surface-500">Total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Badge path title */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-surface-900">
          <svg className="h-5 w-5 text-madrid-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.746 3.746 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
          </svg>
          {roleLabel} Path
        </h2>
        <span className="badge-pill bg-madrid-100 text-madrid-700">
          {badgeCollection.earnedCount} / {badgeCollection.totalCount} Badges
        </span>
      </div>

      {/* Badge grid */}
      <BadgeGrid badges={badgeCollection.badges} />
    </div>
  );
}
