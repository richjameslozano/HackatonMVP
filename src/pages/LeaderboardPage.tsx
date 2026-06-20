import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/app.store';
import { LeaderboardTable } from '../components/leaderboard';
import { TimePeriodFilter } from '../components/leaderboard/TimePeriodFilter';
import { LoadingIndicator } from '../components/shared';
import { savePreviousRankings, getPreviousRankings } from '../services/leaderboard.service';

function formatLastUpdated(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function LeaderboardPage() {
  const currentMember = useAppStore((s) => s.currentMember);
  const selectedRole = useAppStore((s) => s.selectedRole);
  const leaderboard = useAppStore((s) => s.leaderboard);
  const leaderboardLoading = useAppStore((s) => s.leaderboardLoading);
  const leaderboardLastUpdated = useAppStore((s) => s.leaderboardLastUpdated);
  const leaderboardTimePeriod = useAppStore((s) => s.leaderboardTimePeriod);
  const fetchLeaderboard = useAppStore((s) => s.fetchLeaderboard);
  const setLeaderboardTimePeriod = useAppStore((s) => s.setLeaderboardTimePeriod);

  const previousRankingsRef = useRef<Record<string, number> | null>(null);
  const hasLoadedPrevious = useRef(false);

  useEffect(() => {
    void fetchLeaderboard();
  }, [fetchLeaderboard, selectedRole]);

  useEffect(() => {
    if (!selectedRole) return;

    if (!hasLoadedPrevious.current) {
      previousRankingsRef.current = getPreviousRankings(selectedRole);
      hasLoadedPrevious.current = true;
    }

    if (leaderboard.length > 0) {
      savePreviousRankings(leaderboard, selectedRole);
    }
  }, [leaderboard, selectedRole]);

  const roleLabel = selectedRole === 'agent' ? 'Strategic Agents' : 'Expert Developers';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Global Rankings</h1>
        <p className="mt-1 text-sm text-surface-500">
          Compete across roles. Track your progress against the best {selectedRole === 'agent' ? 'Agents' : 'Developers'} in the Madrid ecosystem.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <TimePeriodFilter selected={leaderboardTimePeriod} onChange={setLeaderboardTimePeriod} />
        {leaderboardLastUpdated && (
          <p className="text-xs text-surface-400">Last updated: {formatLastUpdated(leaderboardLastUpdated)}</p>
        )}
      </div>

      {leaderboardLoading ? (
        <LoadingIndicator size="md" message="Loading leaderboard..." />
      ) : leaderboard.length === 0 ? (
        <div className="card py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-surface-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.996.178-1.768.65-2.08 1.283" />
          </svg>
          <p className="mt-4 text-sm text-surface-500">No entries yet. Complete quests and earn badges to appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Podium section - Top 3 */}
          {leaderboard.length >= 3 && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-surface-900">
                  <span className="text-madrid-600">🏆</span>
                  {roleLabel}
                </h2>
                <span className="badge-pill bg-madrid-100 text-madrid-700">LIVE FEED</span>
              </div>

              <div className="flex items-end justify-center gap-4 py-6">
                {/* 2nd place */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-200 text-lg font-bold text-surface-600 ring-2 ring-surface-300">
                      {leaderboard[1]?.member.displayName.charAt(0)}
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-surface-400 text-[10px] font-bold text-white">2</span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-surface-700 truncate max-w-[80px]">{leaderboard[1]?.member.displayName}</p>
                  <p className="text-xs text-surface-500">{leaderboard[1]?.badgeCount} Badges</p>
                </div>

                {/* 1st place - larger */}
                <div className="flex flex-col items-center -mt-4">
                  <div className="relative">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-madrid-100 text-xl font-bold text-madrid-700 ring-3 ring-madrid-300">
                      {leaderboard[0]?.member.displayName.charAt(0)}
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-madrid-600 text-xs font-bold text-white">1</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-surface-900 truncate max-w-[100px]">{leaderboard[0]?.member.displayName}</p>
                  <p className="text-xs font-medium text-madrid-600">{leaderboard[0]?.badgeCount} Badges</p>
                </div>

                {/* 3rd place */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-200 text-lg font-bold text-surface-600 ring-2 ring-surface-300">
                      {leaderboard[2]?.member.displayName.charAt(0)}
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">3</span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-surface-700 truncate max-w-[80px]">{leaderboard[2]?.member.displayName}</p>
                  <p className="text-xs text-surface-500">{leaderboard[2]?.badgeCount} Badges</p>
                </div>
              </div>
            </div>
          )}

          {/* Full rankings table */}
          <LeaderboardTable
            entries={leaderboard}
            currentMemberId={currentMember?.memberId ?? ''}
            previousRankings={previousRankingsRef.current}
          />
        </div>
      )}
    </div>
  );
}
