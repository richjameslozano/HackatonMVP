import type { PurchaseRecord } from '../../types';

// ─── Props ──────────────────────────────────────────────────────────────────

interface PurchaseHistoryProps {
  purchases: PurchaseRecord[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PurchaseHistory({ purchases, isLoading, error, onRetry }: PurchaseHistoryProps) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-surface-900 mb-4">Purchase History</h2>

      {isLoading && (
        <div className="flex items-center justify-center py-8" role="status">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-surface-200 border-t-madrid-600" />
          <span className="sr-only">Loading purchase history...</span>
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center" role="alert">
          <p className="text-sm text-red-700 mb-3">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && purchases.length === 0 && (
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-6 text-center">
          <p className="text-sm text-surface-500">
            No purchases yet. Browse the store to spend your coins!
          </p>
        </div>
      )}

      {!isLoading && !error && purchases.length > 0 && (
        <ul className="divide-y divide-surface-200 rounded-lg border border-surface-200 overflow-hidden">
          {purchases.map((purchase) => (
            <li key={purchase.purchaseId} className="flex items-center justify-between px-4 py-3 bg-white">
              <div>
                <p className="text-sm font-medium text-surface-900">{purchase.rewardItemTitle}</p>
                <p className="text-xs text-surface-500">
                  {new Date(purchase.purchasedAt).toLocaleDateString()}
                </p>
              </div>
              <span className="text-sm font-semibold text-madrid-600">
                -{purchase.coinsSpent} coins
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
