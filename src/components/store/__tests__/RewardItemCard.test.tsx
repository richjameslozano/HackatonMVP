import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { RewardItem } from '../../../types';

// ─── Mock Dependencies ──────────────────────────────────────────────────────

vi.mock('../../../utils/formatting', () => ({
  truncateDescription: (text: string) => text,
}));

vi.mock('../../../utils/store-helpers', () => ({
  isPurchasable: (balance: number, cost: number, stock: number) =>
    balance >= cost && (stock === -1 || stock > 0),
}));

import { RewardItemCard } from '../RewardItemCard';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<RewardItem> = {}): RewardItem {
  return {
    itemId: 'item-1',
    title: 'Test Reward',
    description: 'A test reward item',
    cost: 100,
    imageUrl: null,
    stockQuantity: 5,
    isActive: true,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('RewardItemCard', () => {
  it('renders SVG placeholder when imageUrl is null', () => {
    const item = makeItem({ imageUrl: null });

    render(<RewardItemCard item={item} balance={200} onPurchaseClick={vi.fn()} />);

    // The SVG placeholder should be rendered (the svg element inside the placeholder div)
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();

    // No img element should be present
    const img = document.querySelector('img');
    expect(img).not.toBeInTheDocument();
  });

  it('renders image when imageUrl is provided', () => {
    const item = makeItem({ imageUrl: 'https://example.com/image.png' });

    render(<RewardItemCard item={item} balance={200} onPurchaseClick={vi.fn()} />);

    const img = screen.getByRole('img', { name: 'Test Reward' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/image.png');
  });

  it('shows "{n} left" text for positive stock', () => {
    const item = makeItem({ stockQuantity: 7 });

    render(<RewardItemCard item={item} balance={200} onPurchaseClick={vi.fn()} />);

    expect(screen.getByText('7 left')).toBeInTheDocument();
  });

  it('does not show stock count when stockQuantity is -1 (unlimited)', () => {
    const item = makeItem({ stockQuantity: -1 });

    render(<RewardItemCard item={item} balance={200} onPurchaseClick={vi.fn()} />);

    expect(screen.queryByText(/left/)).not.toBeInTheDocument();
  });

  it('shows "Out of Stock" text when stockQuantity is 0', () => {
    const item = makeItem({ stockQuantity: 0 });

    render(<RewardItemCard item={item} balance={200} onPurchaseClick={vi.fn()} />);

    // "Out of Stock" appears both as the overlay badge and the disabled button label
    const outOfStockElements = screen.getAllByText('Out of Stock');
    expect(outOfStockElements.length).toBeGreaterThanOrEqual(1);
  });
});
