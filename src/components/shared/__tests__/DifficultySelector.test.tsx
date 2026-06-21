import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock coin.service ──────────────────────────────────────────────────────

const mockGetCoinConfig = vi.fn();

vi.mock('../../../services/coin.service', () => ({
  getCoinConfig: (...args: unknown[]) => mockGetCoinConfig(...args),
}));

import { DifficultySelector } from '../DifficultySelector';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('DifficultySelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCoinConfig.mockResolvedValue({
      easy_coins: 2,
      medium_coins: 6,
      hard_coins: 10,
    });
  });

  it('renders 3 radio options (easy, medium, hard)', () => {
    render(<DifficultySelector value="easy" onChange={vi.fn()} />);

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);

    expect(screen.getByLabelText(/easy/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/medium/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hard/i)).toBeInTheDocument();
  });

  it('displays coin previews next to each option', async () => {
    render(<DifficultySelector value="easy" onChange={vi.fn()} />);

    // Wait for the coin config to be fetched and rendered
    expect(await screen.findByText(/🪙 2 coins/)).toBeInTheDocument();
    expect(await screen.findByText(/🪙 6 coins/)).toBeInTheDocument();
    expect(await screen.findByText(/🪙 10 coins/)).toBeInTheDocument();
  });

  it('displays default coin values when config fetch fails', async () => {
    mockGetCoinConfig.mockRejectedValue(new Error('Network error'));

    render(<DifficultySelector value="easy" onChange={vi.fn()} />);

    // Falls back to defaults: 1, 3, 5
    expect(await screen.findByText(/🪙 1 coins/)).toBeInTheDocument();
    expect(screen.getByText(/🪙 3 coins/)).toBeInTheDocument();
    expect(screen.getByText(/🪙 5 coins/)).toBeInTheDocument();
  });

  it('calls onChange when selection changes', () => {
    const onChange = vi.fn();
    render(<DifficultySelector value="easy" onChange={onChange} />);

    const hardRadio = screen.getByLabelText(/hard/i);
    fireEvent.click(hardRadio);

    expect(onChange).toHaveBeenCalledWith('hard');
  });

  it('shows the currently selected option as checked', () => {
    render(<DifficultySelector value="medium" onChange={vi.fn()} />);

    const mediumRadio = screen.getByRole('radio', { name: /medium/i }) as HTMLInputElement;
    expect(mediumRadio.checked).toBe(true);

    const easyRadio = screen.getByRole('radio', { name: /easy/i }) as HTMLInputElement;
    expect(easyRadio.checked).toBe(false);
  });
});
