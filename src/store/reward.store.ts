import { create } from 'zustand';
import type { RewardItem, PurchaseRecord } from '../types';
import {
  getActiveRewardItems,
  getAllRewardItems,
  processPurchase,
  getPurchaseHistory,
} from '../services/store.service';
import { useCoinStore } from './coin.store';

// ─── Store State Interface ──────────────────────────────────────────────────

export interface RewardState {
  // Data
  rewardItems: RewardItem[];
  purchaseHistory: PurchaseRecord[];

  // Loading states (per operation)
  itemsLoading: boolean;
  purchaseLoading: boolean;
  historyLoading: boolean;

  // Error states (per operation)
  itemsError: string | null;
  purchaseError: string | null;
  historyError: string | null;

  // Purchase success feedback
  lastPurchase: PurchaseRecord | null;

  // Actions
  fetchRewardItems: () => Promise<void>;
  fetchAllRewardItems: () => Promise<void>;
  purchaseItem: (memberId: string, itemId: string) => Promise<void>;
  fetchPurchaseHistory: (memberId: string) => Promise<void>;
  clearPurchaseError: () => void;
  clearLastPurchase: () => void;
}

// ─── Store Implementation ───────────────────────────────────────────────────

export const useRewardStore = create<RewardState>()((set) => ({
  // Initial state
  rewardItems: [],
  purchaseHistory: [],
  itemsLoading: false,
  purchaseLoading: false,
  historyLoading: false,
  itemsError: null,
  purchaseError: null,
  historyError: null,
  lastPurchase: null,

  // ─── Actions ────────────────────────────────────────────────────────────

  fetchRewardItems: async () => {
    set({ itemsLoading: true, itemsError: null });
    try {
      const items = await getActiveRewardItems();
      set({ rewardItems: items, itemsLoading: false });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch reward items';
      set({ itemsLoading: false, itemsError: errorMessage });
    }
  },

  fetchAllRewardItems: async () => {
    set({ itemsLoading: true, itemsError: null });
    try {
      const items = await getAllRewardItems();
      set({ rewardItems: items, itemsLoading: false });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch reward items';
      set({ itemsLoading: false, itemsError: errorMessage });
    }
  },

  purchaseItem: async (memberId: string, itemId: string) => {
    set({ purchaseLoading: true, purchaseError: null });
    try {
      const purchase = await processPurchase(memberId, itemId);
      set({ lastPurchase: purchase, purchaseLoading: false });
      // Refresh balance in the coin store to keep navigation display consistent
      void useCoinStore.getState().refreshBalance(memberId);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to process purchase';
      set({ purchaseLoading: false, purchaseError: errorMessage });
    }
  },

  fetchPurchaseHistory: async (memberId: string) => {
    set({ historyLoading: true, historyError: null });
    try {
      const history = await getPurchaseHistory(memberId);
      set({ purchaseHistory: history, historyLoading: false });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch purchase history';
      set({ historyLoading: false, historyError: errorMessage });
    }
  },

  // ─── State Clearers ────────────────────────────────────────────────────

  clearPurchaseError: () => {
    set({ purchaseError: null });
  },

  clearLastPurchase: () => {
    set({ lastPurchase: null });
  },
}));
