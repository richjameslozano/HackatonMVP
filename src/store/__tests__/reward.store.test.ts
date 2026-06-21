import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

// ─── Mock store.service ─────────────────────────────────────────────────────

const mockGetActiveRewardItems = vi.fn();
const mockProcessPurchase = vi.fn();
const mockGetPurchaseHistory = vi.fn();

vi.mock('../../services/store.service', () => ({
  getActiveRewardItems: (...args: unknown[]) => mockGetActiveRewardItems(...args),
  getAllRewardItems: vi.fn(),
  processPurchase: (...args: unknown[]) => mockProcessPurchase(...args),
  getPurchaseHistory: (...args: unknown[]) => mockGetPurchaseHistory(...args),
}));

// ─── Mock coin.store ────────────────────────────────────────────────────────

const mockRefreshBalance = vi.fn();

vi.mock('../coin.store', () => ({
  useCoinStore: {
    getState: () => ({
      refreshBalance: mockRefreshBalance,
    }),
  },
}));

import { useRewardStore } from '../reward.store';

// ─── Helpers ────────────────────────────────────────────────────────────────

function resetStore() {
  useRewardStore.setState({
    rewardItems: [],
    purchaseHistory: [],
    itemsLoading: false,
    purchaseLoading: false,
    historyLoading: false,
    itemsError: null,
    purchaseError: null,
    historyError: null,
    lastPurchase: null,
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useRewardStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  // ─── fetchRewardItems ───────────────────────────────────────────────────

  describe('fetchRewardItems', () => {
    it('sets itemsLoading true then sets rewardItems and itemsLoading false on success', async () => {
      const items = [
        { itemId: 'item1', title: 'Reward A', description: 'Desc', cost: 10, imageUrl: null, stockQuantity: 5, isActive: true },
        { itemId: 'item2', title: 'Reward B', description: 'Desc', cost: 20, imageUrl: null, stockQuantity: -1, isActive: true },
      ];
      mockGetActiveRewardItems.mockResolvedValue(items);

      // Verify loading state is set immediately
      const fetchPromise = act(async () => {
        useRewardStore.getState().fetchRewardItems();
      });

      // After the action resolves
      await fetchPromise;

      const state = useRewardStore.getState();
      expect(state.rewardItems).toEqual(items);
      expect(state.itemsLoading).toBe(false);
      expect(state.itemsError).toBeNull();
    });

    it('sets itemsError on failure', async () => {
      mockGetActiveRewardItems.mockRejectedValue(new Error('Network timeout'));

      await act(async () => {
        await useRewardStore.getState().fetchRewardItems();
      });

      const state = useRewardStore.getState();
      expect(state.rewardItems).toEqual([]);
      expect(state.itemsLoading).toBe(false);
      expect(state.itemsError).toBe('Network timeout');
    });
  });

  // ─── purchaseItem ─────────────────────────────────────────────────────────

  describe('purchaseItem', () => {
    it('sets lastPurchase and triggers refreshBalance on success', async () => {
      const purchaseRecord = {
        purchaseId: 'pur1',
        memberId: 'member1',
        rewardItemId: 'item1',
        rewardItemTitle: 'Reward A',
        coinsSpent: 10,
        purchasedAt: 1700000000000,
      };
      mockProcessPurchase.mockResolvedValue(purchaseRecord);
      mockRefreshBalance.mockResolvedValue(undefined);

      await act(async () => {
        await useRewardStore.getState().purchaseItem('member1', 'item1');
      });

      const state = useRewardStore.getState();
      expect(state.lastPurchase).toEqual(purchaseRecord);
      expect(state.purchaseLoading).toBe(false);
      expect(state.purchaseError).toBeNull();
      expect(mockProcessPurchase).toHaveBeenCalledWith('member1', 'item1');
      expect(mockRefreshBalance).toHaveBeenCalledWith('member1');
    });

    it('sets purchaseError on failure without triggering balance refresh', async () => {
      mockProcessPurchase.mockRejectedValue(new Error('Insufficient coins'));

      await act(async () => {
        await useRewardStore.getState().purchaseItem('member1', 'item1');
      });

      const state = useRewardStore.getState();
      expect(state.purchaseError).toBe('Insufficient coins');
      expect(state.purchaseLoading).toBe(false);
      expect(state.lastPurchase).toBeNull();
      expect(mockRefreshBalance).not.toHaveBeenCalled();
    });
  });

  // ─── fetchPurchaseHistory ─────────────────────────────────────────────────

  describe('fetchPurchaseHistory', () => {
    it('sets purchaseHistory on success', async () => {
      const history = [
        { purchaseId: 'p1', memberId: 'member1', rewardItemId: 'item1', rewardItemTitle: 'Reward A', coinsSpent: 10, purchasedAt: 1700000000000 },
        { purchaseId: 'p2', memberId: 'member1', rewardItemId: 'item2', rewardItemTitle: 'Reward B', coinsSpent: 20, purchasedAt: 1699000000000 },
      ];
      mockGetPurchaseHistory.mockResolvedValue(history);

      await act(async () => {
        await useRewardStore.getState().fetchPurchaseHistory('member1');
      });

      const state = useRewardStore.getState();
      expect(state.purchaseHistory).toEqual(history);
      expect(state.historyLoading).toBe(false);
      expect(state.historyError).toBeNull();
    });

    it('sets historyError on failure', async () => {
      mockGetPurchaseHistory.mockRejectedValue(new Error('Failed to fetch purchase history'));

      await act(async () => {
        await useRewardStore.getState().fetchPurchaseHistory('member1');
      });

      const state = useRewardStore.getState();
      expect(state.purchaseHistory).toEqual([]);
      expect(state.historyLoading).toBe(false);
      expect(state.historyError).toBe('Failed to fetch purchase history');
    });
  });
});
