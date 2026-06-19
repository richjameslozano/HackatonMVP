import type { LeaderboardEntry } from '../../types';
import { LeaderboardRow } from './LeaderboardRow';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentMemberId: string;
}

export function LeaderboardTable({ entries, currentMemberId }: LeaderboardTableProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <table className="w-full" role="table" aria-label="Leaderboard rankings">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Rank
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Name
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Badges
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entries.map((entry) => (
            <LeaderboardRow
              key={entry.member.memberId}
              entry={entry}
              isCurrentUser={entry.member.memberId === currentMemberId}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
