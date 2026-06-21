import { useEffect, useState } from 'react';
import type { RewardItem } from '../types';
import { useRewardStore } from '../store/reward.store';
import { useCoinStore } from '../store/coin.store';
import { useAuthStore } from '../store/auth.store';
import { RewardItemCard } from '../components/store/RewardItemCard';
import { PurchaseConfirmDialog } from '../components/store/PurchaseConfirmDialog';
import { PurchaseHistory } from '../components/store/PurchaseHistory';

// ─── StorePage ──────────────────────────────────────────────────────────────

export function StorePage() {
  const memberId = useAuthStore((s) => s.currentMember?.memberId);
  const balance = useCoinStore((s) => s.balance);
  const fetchBalance = useCoinStore((s) => s.fetchBalance);

  const rewardItems = useRewardStore((s) => s.rewardItems);
  const itemsLoading = useRewardStore((s) => s.itemsLoading);
  const itemsError = useRewardStore((s) => s.itemsError);
  const purchaseLoading = useRewardStore((s) => s.purchaseLoading);
  const purchaseError = useRewardStore((s) => s.purchaseError);
  const lastPurchase = useRewardStore((s) => s.lastPurchase);
  const purchaseHistory = useRewardStore((s) => s.purchaseHistory);
  const historyLoading = useRewardStore((s) => s.historyLoading);
  const historyError = useRewardStore((s) => s.historyError);
  const fetchRewardItems = useRewardStore((s) => s.fetchRewardItems);
  const purchaseItem = useRewardStore((s) => s.purchaseItem);
  const fetchPurchaseHistory = useRewardStore((s) => s.fetchPurchaseHistory);
  const clearPurchaseError = useRewardStore((s) => s.clearPurchaseError);
  const clearLastPurchase = useRewardStore((s) => s.clearLastPurchase);

  const [selectedItem, setSelectedItem] = useState<RewardItem | null>(null);

  // Fetch reward items and purchase history on mount
  useEffect(() => {
    void fetchRewardItems();
    if (memberId) {
      void fetchBalance(memberId);
      void fetchPurchaseHistory(memberId);
    }
  }, [memberId, fetchRewardItems, fetchBalance, fetchPurchaseHistory]);

  // Handle successful purchase: close dialog, refresh items and history
  useEffect(() => {
    if (lastPurchase) {
      setSelectedItem(null);
      clearLastPurchase();
      void fetchRewardItems();
      if (memberId) {
        void fetchPurchaseHistory(memberId);
      }
    }
  }, [lastPurchase, memberId, fetchRewardItems, fetchPurchaseHistory, clearLastPurchase]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  function handlePurchaseClick(item: RewardItem) {
    clearPurchaseError();
    setSelectedItem(item);
  }

  function handleConfirmPurchase() {
    if (!memberId || !selectedItem) return;
    void purchaseItem(memberId, selectedItem.itemId);
  }

  function handleCancelPurchase() {
    setSelectedItem(null);
    clearPurchaseError();
  }

  function handleRetryHistory() {
    if (memberId) {
      void fetchPurchaseHistory(memberId);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Page Header with Balance */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-surface-900">Reward Store</h1>
        <div className="flex items-center gap-2 rounded-lg bg-madrid-50 px-4 py-2">
          <svg className="h-5 w-5 text-madrid-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6c.304 0 .792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1-.67 1.55H6a1 1 0 000 2h.013a9.358 9.358 0 000 1H6a1 1 0 100 2h.351c.163.55.385 1.075.67 1.55C7.721 15.216 8.768 16 10 16s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029c-.472.786-.96.979-1.264.979-.304 0-.792-.193-1.264-.979a5.389 5.389 0 01-.421-.821h2.382a1 1 0 000-2H7.653a7.642 7.642 0 010-1h3.044a1 1 0 000-2H8.315c.129-.292.278-.57.421-.821z" />
          </svg>
          <span className="text-lg font-semibold text-madrid-700">
            {balance !== null ? balance : '—'}
          </span>
          <span className="text-sm text-madrid-600">coins</span>
        </div>
      </div>

      {/* Items Loading State */}
      {itemsLoading && (
        <div className="mt-8 flex items-center justify-center py-12" role="status">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-surface-200 border-t-madrid-600" />
          <span className="sr-only">Loading reward items...</span>
        </div>
      )}

      {/* Items Error State */}
      {!itemsLoading && itemsError && (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6 text-center" role="alert">
          <p className="text-sm text-red-700 mb-3">{itemsError}</p>
          <button
            type="button"
            onClick={() => void fetchRewardItems()}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Reward Items Grid */}
      {!itemsLoading && !itemsError && (
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {rewardItems.map((item) => (
            <RewardItemCard
              key={item.itemId}
              item={item}
              balance={balance ?? 0}
              onPurchaseClick={handlePurchaseClick}
            />
          ))}
          {rewardItems.length === 0 && (
            <div className="col-span-full rounded-lg border border-surface-200 bg-surface-50 p-8 text-center">
              <p className="text-sm text-surface-500">
                No reward items available at the moment. Check back later!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Purchase Confirm Dialog */}
      <PurchaseConfirmDialog
        item={selectedItem}
        balance={balance ?? 0}
        isLoading={purchaseLoading}
        error={purchaseError}
        onConfirm={handleConfirmPurchase}
        onCancel={handleCancelPurchase}
      />

      {/* Purchase History Section */}
      <PurchaseHistory
        purchases={purchaseHistory}
        isLoading={historyLoading}
        error={historyError}
        onRetry={handleRetryHistory}
      />
    </div>
  );
}
