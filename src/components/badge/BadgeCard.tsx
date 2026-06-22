import type { Badge } from '../../types';

interface BadgeCardProps {
  badge: Badge;
  earned: boolean;
  earnedAt?: Date;
}

export function BadgeCard({ badge, earned, earnedAt }: BadgeCardProps) {
  // Pick a Material Symbol icon based on badge name keywords
  const iconName = getIconForBadge(badge.name);

  return (
    <div
      className={`glass-panel glow-border flex flex-col items-center gap-3 p-5 text-center transition-all duration-300 ${earned
          ? 'hover:-translate-y-1 hover:scale-[1.02]'
          : 'opacity-60 grayscale'
        }`}
      style={
        !earned
          ? { borderStyle: 'dashed', borderColor: 'rgba(0, 212, 255, 0.15)' }
          : undefined
      }
      aria-label={`Badge: ${badge.name}, ${earned ? 'Earned' : 'Locked'}`}
    >
      {/* Badge icon container */}
      <div className="relative">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{
            background: 'rgba(42, 42, 44, 0.7)',
            backdropFilter: 'blur(8px)',
            border: earned
              ? '2px solid #00d4ff'
              : '2px solid rgba(60, 73, 78, 0.6)',
          }}
        >
          {earned ? (
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '36px',
                color: '#00d4ff',
                fontVariationSettings: "'FILL' 1",
              }}
            >
              {iconName}
            </span>
          ) : (
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '36px', color: '#859398' }}
            >
              lock
            </span>
          )}
        </div>

        {/* Green checkmark for earned */}
        {earned && (
          <div
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full"
            style={{ background: '#22c55e', border: '2px solid #131315' }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '14px', color: '#fff' }}
            >
              check
            </span>
          </div>
        )}
      </div>

      {/* Badge name */}
      <h3
        className="text-sm font-bold leading-tight"
        style={{ color: earned ? '#e5e1e4' : '#859398' }}
      >
        {badge.name}
      </h3>

      {/* Description */}
      <p
        className="text-xs leading-relaxed line-clamp-2"
        style={{ color: '#859398' }}
      >
        {badge.description}
      </p>

      {/* Bottom: earned date or locked label */}
      {earned ? (
        earnedAt && (
          <span className="label-mono mt-auto" style={{ color: '#3cd7ff' }}>
            Earned {earnedAt.toLocaleDateString()}
          </span>
        )
      ) : (
        <span className="label-mono mt-auto" style={{ color: '#859398' }}>
          Locked
        </span>
      )}
    </div>
  );
}

// ─── Icon Helper ────────────────────────────────────────────────────────────

function getIconForBadge(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('speed') || lower.includes('fast')) return 'speed';
  if (lower.includes('security') || lower.includes('shield')) return 'shield';
  if (lower.includes('architect') || lower.includes('design')) return 'architecture';
  if (lower.includes('terminal') || lower.includes('code')) return 'terminal';
  if (lower.includes('star') || lower.includes('premium')) return 'workspace_premium';
  if (lower.includes('first') || lower.includes('beginner')) return 'military_tech';
  return 'military_tech';
}
