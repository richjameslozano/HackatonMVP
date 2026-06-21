import { useState, useCallback, useEffect, useRef } from 'react';
import type { LeaderboardEntry, Badge } from '../../types';
import { getMemberBadgeBreakdown } from '../../services/leaderboard.service';
import { BadgeBreakdownPopover } from './BadgeBreakdownPopover';
import { RankChangeIndicator } from './RankChangeIndicator';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  previousRank: number | null;
}

export function LeaderboardRow({ entry, isCurrentUser, previousRank }: LeaderboardRowProps) {
  const [showBadges, setShowBadges] = useState(false);
  const [badgeData, setBadgeData] = useState<Array<{ badge: Badge; earnedAt: Date }> | null>(null);
  const [badgeLoading, setBadgeLoading] = useState(false);
  const [rankChangeHighlight, setRankChangeHighlight] = useState(false);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect rank changes and trigger highlight for current user
  const hasRankChanged = previousRank !== null && previousRank !== entry.rank;

  useEffect(() => {
    if (isCurrentUser && hasRankChanged) {
      setRankChangeHighlight(true);

      // Clear any existing timer
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }

      // Remove highlight after 3 seconds
      highlightTimerRef.current = setTimeout(() => {
        setRankChangeHighlight(false);
        highlightTimerRef.current = null;
      }, 3000);
    }

    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, [isCurrentUser, hasRankChanged, entry.rank]);

  const loadBadgeBreakdown = useCallback(async () => {
    if (badgeData !== null) return;
    setBadgeLoading(true);
    try {
      const breakdown = await getMemberBadgeBreakdown(entry.member.memberId);
      setBadgeData(breakdown.badges);
    } catch {
      setBadgeData([]);
    } finally {
      setBadgeLoading(false);
    }
  }, [entry.member.memberId, badgeData]);

  const handleMouseEnter = () => {
    setShowBadges(true);
    void loadBadgeBreakdown();
  };

  const handleMouseLeave = () => {
    setShowBadges(false);
  };

  const handleClick = () => {
    const next = !showBadges;
    setShowBadges(next);
    if (next) {
      void loadBadgeBreakdown();
    }
  };

  return (
    <tr
      className={`relative cursor-pointer transition-all duration-300 ${rankChangeHighlight
          ? 'bg-madrid-100'
          : isCurrentUser
            ? 'bg-madrid-50 hover:bg-madrid-100'
            : 'hover:bg-surface-50'
        }`}
      aria-label={
        isCurrentUser
          ? `Your rank: ${entry.rank}, ${entry.member.displayName}, ${entry.badgeCount} badges`
          : undefined
      }
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <td className="px-5 py-3.5 text-sm font-semibold text-surface-900">
        <span className="inline-flex items-center gap-1.5">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${entry.rank === 1 ? 'bg-madrid-100 text-madrid-700' :
              entry.rank === 2 ? 'bg-surface-100 text-surface-700' :
                entry.rank === 3 ? 'bg-amber-100 text-amber-700' :
                  'text-surface-500'
            }`}>
            #{entry.rank.toString().padStart(2, '0')}
          </span>
          <RankChangeIndicator currentRank={entry.rank} previousRank={previousRank} />
        </span>
      </td>
      <td className="relative px-5 py-3.5 text-sm text-surface-700">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${isCurrentUser
              ? 'bg-madrid-200 text-madrid-800'
              : 'bg-surface-200 text-surface-600'
            }`}>
            {entry.member.displayName.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium">{entry.member.displayName}</span>
          {isCurrentUser && (
            <span className="badge-pill bg-madrid-100 text-madrid-700">(You)</span>
          )}
        </div>
        {showBadges && (
          <BadgeBreakdownPopover
            badges={badgeData ?? []}
            isLoading={badgeLoading}
          />
        )}
      </td>
      <td className="px-5 py-3.5 text-right">
        <span className="text-sm font-semibold text-madrid-600">{entry.badgeCount}</span>
      </td>
    </tr>
  );
}
