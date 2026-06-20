import type { LeaderboardEntry } from '../../types';
import { LeaderboardRow } from './LeaderboardRow';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentMemberId: string;
  previousRankings: Record<string, number> | null;
}

export function LeaderboardTable({ entries, currentMemberId, previousRankings }: LeaderboardTableProps) {
  return (
    <div className="card overflow-hidden !p-0">
      <table className="w-full" role="table" aria-label="Leaderboard rankings">
        <thead>
          <tr className="border-b border-surface-100 bg-surface-50">
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">
              Rank
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">
              {entries[0]?.member ? 'Name' : 'Member'}
            </th>
            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-500">
              Badges
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100">
          {entries.map((entry) => (
            <LeaderboardRow
              key={entry.member.memberId}
              entry={entry}
              isCurrentUser={entry.member.memberId === currentMemberId}
              previousRank={previousRankings?.[entry.member.memberId] ?? null}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
