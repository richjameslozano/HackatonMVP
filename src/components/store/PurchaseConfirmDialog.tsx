import type { RewardItem } from '../../types';

// ─── Props ──────────────────────────────────────────────────────────────────

interface PurchaseConfirmDialogProps {
  item: RewardItem | null;
  balance: number;
  isLoading: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PurchaseConfirmDialog({
  item,
  balance,
  isLoading,
  error,
  onConfirm,
  onCancel,
}: PurchaseConfirmDialogProps) {
  if (!item) return null;

  const balanceAfterPurchase = balance - item.cost;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-dialog-title"
    >
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated">
        {/* Title */}
        <h2
          id="purchase-dialog-title"
          className="text-lg font-semibold text-surface-900"
        >
          Confirm Purchase
        </h2>

        {/* Item details */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-surface-500">Item</span>
            <span className="text-sm font-medium text-surface-900">
              {item.title}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-surface-500">Cost</span>
            <span className="text-sm font-medium text-madrid-600">
              {item.cost} coins
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-surface-500">Current Balance</span>
            <span className="text-sm font-medium text-surface-900">
              {balance} coins
            </span>
          </div>

          <div className="border-t border-surface-100 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-surface-500">
                Balance After Purchase
              </span>
              <span
                className={`text-sm font-semibold ${
                  balanceAfterPurchase >= 0
                    ? 'text-surface-900'
                    : 'text-red-600'
                }`}
              >
                {balanceAfterPurchase} coins
              </span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Loading spinner */}
        {isLoading && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-surface-200 border-t-madrid-600" />
            <span className="text-sm text-surface-500">
              Processing purchase...
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-surface-200 px-4 py-2 text-sm font-medium text-surface-700 transition-colors hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 rounded-lg bg-madrid-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-madrid-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirm Purchase
          </button>
        </div>
      </div>
    </div>
  );
}
