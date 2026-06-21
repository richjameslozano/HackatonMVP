import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock coin.store ────────────────────────────────────────────────────────

const mockUseCoinStore = vi.fn();

vi.mock('../../../store/coin.store', () => ({
  useCoinStore: (selector: unknown) => mockUseCoinStore(selector),
}));

vi.mock('../../../utils/formatting', () => ({
  formatCoinBalance: (balance: number) => new Intl.NumberFormat().format(balance),
}));

import { CoinBalance } from '../CoinBalance';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('CoinBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "--" when error state is set and balance is null', () => {
    mockUseCoinStore.mockImplementation((selector: (state: unknown) => unknown) => {
      const state = {
        balance: null,
        isLoading: false,
        error: 'Failed to fetch',
        lastFetchedAt: null,
      };
      return selector(state);
    });

    render(<CoinBalance />);

    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('shows formatted value when balance is available', () => {
    mockUseCoinStore.mockImplementation((selector: (state: unknown) => unknown) => {
      const state = {
        balance: 1234,
        isLoading: false,
        error: null,
        lastFetchedAt: Date.now(),
      };
      return selector(state);
    });

    render(<CoinBalance />);

    // 1234 formatted with locale thousands separators
    const formatted = new Intl.NumberFormat().format(1234);
    expect(screen.getByText(formatted)).toBeInTheDocument();
  });

  it('shows coin icon', () => {
    mockUseCoinStore.mockImplementation((selector: (state: unknown) => unknown) => {
      const state = {
        balance: 100,
        isLoading: false,
        error: null,
        lastFetchedAt: Date.now(),
      };
      return selector(state);
    });

    render(<CoinBalance />);

    expect(screen.getByText('🪙')).toBeInTheDocument();
  });

  it('shows "--" when balance is null and no error', () => {
    mockUseCoinStore.mockImplementation((selector: (state: unknown) => unknown) => {
      const state = {
        balance: null,
        isLoading: true,
        error: null,
        lastFetchedAt: null,
      };
      return selector(state);
    });

    render(<CoinBalance />);

    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('shows formatted balance even when error exists but balance is cached', () => {
    mockUseCoinStore.mockImplementation((selector: (state: unknown) => unknown) => {
      const state = {
        balance: 5000,
        isLoading: false,
        error: 'Refresh failed',
        lastFetchedAt: Date.now(),
      };
      return selector(state);
    });

    render(<CoinBalance />);

    const formatted = new Intl.NumberFormat().format(5000);
    expect(screen.getByText(formatted)).toBeInTheDocument();
  });
});
