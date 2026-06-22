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
    <div className="space-y-8">
      {/* Hero Section with Balance */}
      <div className="relative glass-panel p-8 overflow-hidden border border-[rgba(0,212,255,0.2)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="label-mono text-[#859398]">SYSTEM_UPDATE: ARSENAL_V2.0</p>
            <h1 className="font-headline text-[48px] font-bold text-[#e5e1e4] mt-2">
              Equip Your <span className="text-[#00d4ff]">Workflow.</span>
            </h1>
            <p className="text-[#bbc9cf] mt-2">Redeem your hard-earned tokens for exclusive rewards.</p>
          </div>
          {/* Balance Widget */}
          <div className="glass-panel p-6 rounded-xl shadow-[0_0_15px_rgba(0,212,255,0.3)]">
            <div className="label-mono text-[#3cd7ff] text-xs mb-2">TOTAL_BALANCE</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#e5e1e4]">{balance ?? 0}</span>
              <span className="label-mono text-[#3cd7ff]">COINS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#e5e1e4]">Available Assets</h2>
        <span className="label-mono text-[#3cd7ff] bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)] px-3 py-1 rounded">
          {rewardItems.length} ITEMS
        </span>
      </div>

      {/* Items Loading State */}
      {itemsLoading && (
        <div className="flex items-center justify-center py-12" role="status">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#3c494e] border-t-[#00d4ff]" />
          <span className="sr-only">Loading reward items...</span>
        </div>
      )}

      {/* Items Error State */}
      {!itemsLoading && itemsError && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 p-6 text-center" role="alert">
          <p className="text-sm text-red-400 mb-3">{itemsError}</p>
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {rewardItems.map((item) => (
            <RewardItemCard
              key={item.itemId}
              item={item}
              balance={balance ?? 0}
              onPurchaseClick={handlePurchaseClick}
            />
          ))}
          {rewardItems.length === 0 && (
            <div className="col-span-full glass-panel border border-[#3c494e] bg-[#1c1b1d] p-8 text-center rounded-lg">
              <p className="text-sm text-[#859398]">
                No items available in the arsenal. Check back later!
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
