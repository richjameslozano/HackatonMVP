import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock coin.service ──────────────────────────────────────────────────────

const mockGetCoinConfig = vi.fn();
const mockUpdateCoinConfig = vi.fn();

vi.mock('../../../services/coin.service', () => ({
  getCoinConfig: (...args: unknown[]) => mockGetCoinConfig(...args),
  updateCoinConfig: (...args: unknown[]) => mockUpdateCoinConfig(...args),
}));

import { CoinConfigPanel } from '../CoinConfigPanel';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('CoinConfigPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows success message on save success', async () => {
    mockGetCoinConfig.mockResolvedValue({
      easy_coins: 2,
      medium_coins: 4,
      hard_coins: 8,
    });
    mockUpdateCoinConfig.mockResolvedValue({
      easy_coins: 2,
      medium_coins: 4,
      hard_coins: 8,
    });

    render(<CoinConfigPanel />);

    // Wait for config to load
    await waitFor(() => {
      expect(screen.getByLabelText('Easy Quest Coins')).toBeInTheDocument();
    });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /save configuration/i }));

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText('Coin values updated successfully.')).toBeInTheDocument();
    });
  });

  it('shows error banner on save failure and retains form values', async () => {
    mockGetCoinConfig.mockResolvedValue({
      easy_coins: 10,
      medium_coins: 20,
      hard_coins: 30,
    });
    mockUpdateCoinConfig.mockRejectedValue(new Error('Network error'));

    render(<CoinConfigPanel />);

    // Wait for config to load
    await waitFor(() => {
      expect(screen.getByLabelText('Easy Quest Coins')).toBeInTheDocument();
    });

    // Verify initial values are loaded
    expect(screen.getByLabelText('Easy Quest Coins')).toHaveValue(10);
    expect(screen.getByLabelText('Medium Quest Coins')).toHaveValue(20);
    expect(screen.getByLabelText('Hard Quest Coins')).toHaveValue(30);

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /save configuration/i }));

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Failed to save coin configuration. Please try again.')).toBeInTheDocument();
    });

    // Verify form values are retained
    expect(screen.getByLabelText('Easy Quest Coins')).toHaveValue(10);
    expect(screen.getByLabelText('Medium Quest Coins')).toHaveValue(20);
    expect(screen.getByLabelText('Hard Quest Coins')).toHaveValue(30);
  });

  it('shows validation errors for invalid values', async () => {
    mockGetCoinConfig.mockResolvedValue({
      easy_coins: 1,
      medium_coins: 3,
      hard_coins: 5,
    });

    render(<CoinConfigPanel />);

    // Wait for config to load
    await waitFor(() => {
      expect(screen.getByLabelText('Easy Quest Coins')).toBeInTheDocument();
    });

    // Set invalid value (0 is below minimum)
    const easyInput = screen.getByLabelText('Easy Quest Coins');
    fireEvent.change(easyInput, { target: { value: '0' } });

    // Submit the form to trigger validation
    fireEvent.click(screen.getByRole('button', { name: /save configuration/i }));

    // Wait for validation error
    await waitFor(() => {
      expect(screen.getByText(/coin value must be a positive integer/i)).toBeInTheDocument();
    });

    // updateCoinConfig should NOT be called when validation fails
    expect(mockUpdateCoinConfig).not.toHaveBeenCalled();
  });
});
