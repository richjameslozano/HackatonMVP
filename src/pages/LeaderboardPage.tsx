import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/app.store';
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

  const roleLabel = selectedRole === 'agent' ? 'STRATEGIC AGENTS' : 'EXPERT DEVELOPERS';

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#131315' }}>
      {/* ─── Page Header ─── */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1
          className="font-headline"
          style={{
            fontSize: '48px',
            fontWeight: 900,
            color: '#e5e1e4',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: 0,
          }}
        >
          {roleLabel}
        </h1>
        <p
          className="font-mono"
          style={{
            color: '#859398',
            fontSize: '14px',
            marginTop: '0.5rem',
          }}
        >
          Compete across roles. Track your progress against the best{' '}
          {selectedRole === 'agent' ? 'Agents' : 'Developers'} in the Madrid ecosystem.
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            marginTop: '1rem',
          }}
        >
          <span
            className="label-mono"
            style={{ color: '#bbc9cf', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
          >
            GLOBAL RANKINGS
          </span>
          <span
            className="badge-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(0, 212, 255, 0.1)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              color: '#00d4ff',
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: '999px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#00ff88',
                animation: 'pulse 2s infinite',
              }}
            />
            Live Feed
          </span>
        </div>
      </div>

      {/* ─── Filters ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <TimePeriodFilter selected={leaderboardTimePeriod} onChange={setLeaderboardTimePeriod} />
        {leaderboardLastUpdated && (
          <p className="font-mono" style={{ fontSize: '11px', color: '#859398' }}>
            Last updated: {formatLastUpdated(leaderboardLastUpdated)}
          </p>
        )}
      </div>

      {leaderboardLoading ? (
        <LoadingIndicator size="md" message="Loading leaderboard..." />
      ) : leaderboard.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '3rem',
            textAlign: 'center',
            border: '1px solid #3c494e',
            borderRadius: '16px',
            background: 'rgba(32, 31, 33, 0.6)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#3c494e' }}>
            emoji_events
          </span>
          <p style={{ marginTop: '1rem', color: '#859398', fontSize: '14px' }}>
            No entries yet. Complete quests and earn badges to appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* ─── Podium Section (Top 3) ─── */}
          {leaderboard.length >= 3 && (
            <div
              className="glass-panel"
              style={{
                borderRadius: '16px',
                border: '1px solid #3c494e',
                background: 'linear-gradient(180deg, rgba(0, 212, 255, 0.05) 0%, rgba(32, 31, 33, 0.8) 100%)',
                padding: '2rem',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  alignItems: 'flex-end',
                  gap: '1rem',
                  paddingTop: '1rem',
                }}
              >
                {/* 2nd Place - Left */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      border: '3px solid #c6c4df',
                      background: '#201f21',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: 700,
                      color: '#c6c4df',
                    }}
                  >
                    {leaderboard[1]?.member.displayName.charAt(0).toUpperCase()}
                  </div>
                  <p style={{ marginTop: '0.5rem', fontSize: '13px', fontWeight: 600, color: '#c6c4df' }}>
                    {leaderboard[1]?.member.displayName}
                  </p>
                  <p className="font-mono" style={{ fontSize: '11px', color: '#859398', marginTop: '2px' }}>
                    {leaderboard[1]?.badgeCount} Badges
                  </p>
                  {/* Pedestal */}
                  <div
                    style={{
                      marginTop: '0.75rem',
                      width: '80px',
                      height: '48px',
                      background: 'linear-gradient(180deg, #c6c4df 0%, #3c494e 100%)',
                      borderRadius: '8px 8px 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: '18px', fontWeight: 900, color: '#131315' }}>2nd</span>
                  </div>
                </div>

                {/* 1st Place - Center (larger, scaled up) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'scale(1.1)' }}>
                  <span style={{ fontSize: '28px', marginBottom: '4px' }}>👑</span>
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      border: '3px solid #00d4ff',
                      background: '#201f21',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '30px',
                      fontWeight: 700,
                      color: '#00d4ff',
                      boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)',
                    }}
                  >
                    {leaderboard[0]?.member.displayName.charAt(0).toUpperCase()}
                  </div>
                  <p style={{ marginTop: '0.5rem', fontSize: '15px', fontWeight: 700, color: '#00d4ff' }}>
                    {leaderboard[0]?.member.displayName}
                  </p>
                  <p className="font-mono" style={{ fontSize: '11px', color: '#3cd7ff', marginTop: '2px' }}>
                    {leaderboard[0]?.badgeCount} Badges
                  </p>
                  {/* Pedestal */}
                  <div
                    style={{
                      marginTop: '0.75rem',
                      width: '90px',
                      height: '72px',
                      background: 'linear-gradient(180deg, #00d4ff 0%, #3c494e 100%)',
                      borderRadius: '8px 8px 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: '20px', fontWeight: 900, color: '#131315' }}>1st</span>
                  </div>
                </div>

                {/* 3rd Place - Right */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      border: '3px solid #d1bcff',
                      background: '#201f21',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: 700,
                      color: '#d1bcff',
                    }}
                  >
                    {leaderboard[2]?.member.displayName.charAt(0).toUpperCase()}
                  </div>
                  <p style={{ marginTop: '0.5rem', fontSize: '13px', fontWeight: 600, color: '#d1bcff' }}>
                    {leaderboard[2]?.member.displayName}
                  </p>
                  <p className="font-mono" style={{ fontSize: '11px', color: '#859398', marginTop: '2px' }}>
                    {leaderboard[2]?.badgeCount} Badges
                  </p>
                  {/* Pedestal */}
                  <div
                    style={{
                      marginTop: '0.75rem',
                      width: '80px',
                      height: '36px',
                      background: 'linear-gradient(180deg, #d1bcff 0%, #3c494e 100%)',
                      borderRadius: '8px 8px 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: '18px', fontWeight: 900, color: '#131315' }}>3rd</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Rankings Table ─── */}
          <div
            className="glass-panel"
            style={{
              borderRadius: '16px',
              border: '1px solid #3c494e',
              background: 'rgba(32, 31, 33, 0.6)',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }} role="table" aria-label="Leaderboard rankings">
              <thead>
                <tr style={{ borderBottom: '1px solid #3c494e' }}>
                  <th
                    className="label-mono"
                    style={{
                      padding: '14px 20px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: '#859398',
                    }}
                  >
                    Rank
                  </th>
                  <th
                    className="label-mono"
                    style={{
                      padding: '14px 20px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: '#859398',
                    }}
                  >
                    Name
                  </th>
                  <th
                    className="label-mono"
                    style={{
                      padding: '14px 20px',
                      textAlign: 'center',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: '#859398',
                    }}
                  >
                    Level
                  </th>
                  <th
                    className="label-mono"
                    style={{
                      padding: '14px 20px',
                      textAlign: 'right',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: '#859398',
                    }}
                  >
                    Badges
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => {
                  const isCurrentUser = entry.member.memberId === currentMember?.memberId;
                  const rankColor =
                    entry.rank === 1
                      ? '#00d4ff'
                      : entry.rank === 2
                        ? '#c6c4df'
                        : entry.rank === 3
                          ? '#d1bcff'
                          : '#e5e1e4';

                  const rowBg = isCurrentUser
                    ? 'rgba(0, 212, 255, 0.08)'
                    : index % 2 === 0
                      ? 'rgba(42, 42, 44, 0.3)'
                      : 'transparent';

                  const rowBorder = isCurrentUser ? '1px solid rgba(0, 212, 255, 0.3)' : 'none';

                  return (
                    <tr
                      key={entry.member.memberId}
                      style={{
                        background: rowBg,
                        borderLeft: rowBorder,
                        borderRight: rowBorder,
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrentUser) {
                          e.currentTarget.style.background = 'rgba(42, 42, 44, 0.6)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrentUser) {
                          e.currentTarget.style.background = rowBg;
                        }
                      }}
                    >
                      {/* Rank */}
                      <td style={{ padding: '12px 20px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: entry.rank <= 3 ? '#131315' : '#e5e1e4',
                            background: entry.rank <= 3 ? rankColor : 'transparent',
                            border: entry.rank > 3 ? '1px solid #3c494e' : 'none',
                          }}
                        >
                          {entry.rank}
                        </span>
                      </td>

                      {/* Name */}
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#2a2a2c',
                              border: `2px solid ${entry.rank <= 3 ? rankColor : '#3c494e'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 700,
                              color: entry.rank <= 3 ? rankColor : '#bbc9cf',
                            }}
                          >
                            {entry.member.displayName.charAt(0).toUpperCase()}
                          </div>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: isCurrentUser ? 700 : 500,
                              color: entry.rank <= 3 ? rankColor : '#e5e1e4',
                            }}
                          >
                            {entry.member.displayName}
                          </span>
                          {isCurrentUser && (
                            <span
                              className="badge-pill"
                              style={{
                                background: 'rgba(0, 212, 255, 0.15)',
                                color: '#3cd7ff',
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '999px',
                                border: '1px solid rgba(0, 212, 255, 0.3)',
                              }}
                            >
                              That&apos;s You
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Level (badge count) */}
                      <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                        <span
                          className="font-mono"
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: entry.rank <= 3 ? rankColor : '#bbc9cf',
                          }}
                        >
                          Lv.{entry.badgeCount}
                        </span>
                      </td>

                      {/* Badges */}
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: entry.rank <= 3 ? rankColor : '#bbc9cf',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            military_tech
                          </span>
                          {entry.badgeCount}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
