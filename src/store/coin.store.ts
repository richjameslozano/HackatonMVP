import { create } from 'zustand';
import { getSpendableBalance } from '../services/store.service';

// ─── Store State Interface ──────────────────────────────────────────────────

export interface CoinState {
  balance: number | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;

  // Actions
  fetchBalance: (memberId: string) => Promise<void>;
  refreshBalance: (memberId: string) => Promise<void>;
  setBalance: (balance: number) => void;
}

// ─── Store Implementation ───────────────────────────────────────────────────

export const useCoinStore = create<CoinState>()((set) => ({
  // Initial state
  balance: null,
  isLoading: false,
  error: null,
  lastFetchedAt: null,

  // ─── Actions ────────────────────────────────────────────────────────────

  fetchBalance: async (memberId: string) => {
    set({ isLoading: true, error: null });
    try {
      const balance = await getSpendableBalance(memberId);
      set({
        balance,
        isLoading: false,
        error: null,
        lastFetchedAt: Date.now(),
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch coin balance';
      set({ isLoading: false, error: errorMessage });
    }
  },

  refreshBalance: async (memberId: string) => {
    set({ isLoading: true, error: null });
    try {
      const balance = await getSpendableBalance(memberId);
      set({
        balance,
        isLoading: false,
        error: null,
        lastFetchedAt: Date.now(),
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to refresh coin balance';
      set({ isLoading: false, error: errorMessage });
    }
  },

  setBalance: (balance: number) => {
    set({ balance });
  },
}));
