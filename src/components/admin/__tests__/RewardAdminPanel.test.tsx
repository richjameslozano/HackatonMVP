import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RewardItem } from '../../../types';

// ─── Mock store.service ─────────────────────────────────────────────────────

const mockCreateRewardItem = vi.fn();
const mockUpdateRewardItem = vi.fn();
const mockDeactivateRewardItem = vi.fn();

vi.mock('../../../services/store.service', () => ({
  createRewardItem: (...args: unknown[]) => mockCreateRewardItem(...args),
  updateRewardItem: (...args: unknown[]) => mockUpdateRewardItem(...args),
  deactivateRewardItem: (...args: unknown[]) => mockDeactivateRewardItem(...args),
}));

// ─── Mock reward.store ──────────────────────────────────────────────────────

const mockFetchAllRewardItems = vi.fn();

const mockRewardItems: RewardItem[] = [
  {
    itemId: 'item-1',
    title: 'Coffee Voucher',
    description: 'A free coffee',
    cost: 50,
    imageUrl: null,
    stockQuantity: 10,
    isActive: true,
  },
  {
    itemId: 'item-2',
    title: 'Inactive Gift Card',
    description: 'An old gift card',
    cost: 200,
    imageUrl: null,
    stockQuantity: 5,
    isActive: false,
  },
  {
    itemId: 'item-3',
    title: 'Lunch Treat',
    description: 'Free lunch',
    cost: 100,
    imageUrl: 'https://example.com/lunch.png',
    stockQuantity: -1,
    isActive: true,
  },
];

const mockStoreState = {
  rewardItems: mockRewardItems,
  itemsLoading: false,
  itemsError: null,
  fetchAllRewardItems: mockFetchAllRewardItems,
};

vi.mock('../../../store/reward.store', () => ({
  useRewardStore: (selector?: (state: unknown) => unknown) =>
    selector ? selector(mockStoreState) : mockStoreState,
}));

import { RewardAdminPanel } from '../RewardAdminPanel';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('RewardAdminPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAllRewardItems.mockResolvedValue(undefined);
    mockDeactivateRewardItem.mockResolvedValue(undefined);
  });

  it('lists all items including inactive', () => {
    render(<RewardAdminPanel />);

    // All three items should be visible
    expect(screen.getByText('Coffee Voucher')).toBeInTheDocument();
    expect(screen.getByText('Inactive Gift Card')).toBeInTheDocument();
    expect(screen.getByText('Lunch Treat')).toBeInTheDocument();

    // Active/Inactive status labels
    const activeLabels = screen.getAllByText('Active');
    const inactiveLabels = screen.getAllByText('Inactive');
    expect(activeLabels.length).toBe(2); // Coffee Voucher + Lunch Treat
    expect(inactiveLabels.length).toBe(1); // Inactive Gift Card
  });

  it('deactivation button calls deactivateRewardItem', async () => {
    render(<RewardAdminPanel />);

    // Find all Deactivate buttons — only active items show one
    const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i });
    // item-1 and item-3 are active, item-2 is inactive (no button)
    expect(deactivateButtons.length).toBe(2);

    // Click the first deactivate button (Coffee Voucher, item-1)
    fireEvent.click(deactivateButtons[0]);

    await waitFor(() => {
      expect(mockDeactivateRewardItem).toHaveBeenCalledWith('item-1');
    });

    // After deactivation, fetchAllRewardItems should be called to refresh
    await waitFor(() => {
      expect(mockFetchAllRewardItems).toHaveBeenCalled();
    });
  });
});
