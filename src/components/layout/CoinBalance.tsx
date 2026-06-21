import { useCoinStore } from '../../store/coin.store';
import { formatCoinBalance } from '../../utils/formatting';

// ─── Coin Balance Display ───────────────────────────────────────────────────

/**
 * Displays the member's coin balance in the navigation area.
 * Shows a coin icon alongside a formatted number with locale thousands separators.
 * Displays "--" placeholder on fetch failure.
 */
export function CoinBalance() {
  const balance = useCoinStore((s) => s.balance);
  const error = useCoinStore((s) => s.error);

  const displayValue =
    error && balance === null ? '--' : balance !== null ? formatCoinBalance(balance) : '--';

  return (
    <div className="flex items-center gap-1.5 text-sm font-medium text-surface-700">
      <span className="text-base" aria-hidden="true">
        🪙
      </span>
      <span aria-label={`Coin balance: ${displayValue}`}>{displayValue}</span>
    </div>
  );
}
