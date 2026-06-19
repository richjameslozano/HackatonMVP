import type { LeaderboardEntry } from '../../types';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}

export function LeaderboardRow({ entry, isCurrentUser }: LeaderboardRowProps) {
  return (
    <tr
      className={isCurrentUser ? 'bg-indigo-50' : ''}
      aria-label={
        isCurrentUser
          ? `Your rank: ${entry.rank}, ${entry.member.displayName}, ${entry.badgeCount} badges`
          : undefined
      }
    >
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {entry.rank}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">
        {entry.member.displayName}
        {isCurrentUser && (
          <span className="ml-2 text-xs font-medium text-indigo-600">(You)</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700 text-right">
        {entry.badgeCount}
      </td>
    </tr>
  );
}
