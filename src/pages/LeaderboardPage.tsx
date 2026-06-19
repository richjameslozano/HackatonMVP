import { useEffect } from 'react';
import { useAppStore } from '../store/app.store';
import { LeaderboardTable } from '../components/leaderboard';
import { LoadingIndicator } from '../components/shared';

export function LeaderboardPage() {
  const currentMember = useAppStore((s) => s.currentMember);
  const selectedRole = useAppStore((s) => s.selectedRole);
  const leaderboard = useAppStore((s) => s.leaderboard);
  const leaderboardLoading = useAppStore((s) => s.leaderboardLoading);
  const fetchLeaderboard = useAppStore((s) => s.fetchLeaderboard);

  useEffect(() => {
    void fetchLeaderboard();
  }, [fetchLeaderboard, selectedRole]);

  const roleLabel = selectedRole === 'agent' ? 'Agent' : 'Developer';

  if (leaderboardLoading) {
    return (
      <div className="space-y-4 p-4">
        <h2 className="text-xl font-semibold text-gray-800">{roleLabel} Leaderboard</h2>
        <LoadingIndicator size="md" message="Loading leaderboard..." />
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <h2 className="text-xl font-semibold text-gray-800">{roleLabel} Leaderboard</h2>
        <p className="text-sm text-gray-500">No entries yet. Complete quests and earn badges to appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-semibold text-gray-800">{roleLabel} Leaderboard</h2>
      <LeaderboardTable
        entries={leaderboard}
        currentMemberId={currentMember?.memberId ?? ''}
      />
    </div>
  );
}
