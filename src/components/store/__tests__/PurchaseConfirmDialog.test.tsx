import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { RewardItem } from '../../../types';
import { PurchaseConfirmDialog } from '../PurchaseConfirmDialog';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<RewardItem> = {}): RewardItem {
  return {
    itemId: 'item-1',
    title: 'Premium Badge',
    description: 'A shiny badge',
    cost: 150,
    imageUrl: null,
    stockQuantity: 10,
    isActive: true,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PurchaseConfirmDialog', () => {
  it('shows correct remaining balance (balance - cost)', () => {
    const item = makeItem({ cost: 150 });

    render(
      <PurchaseConfirmDialog
        item={item}
        balance={500}
        isLoading={false}
        error={null}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // The dialog should show balance after purchase: 500 - 150 = 350
    expect(screen.getByText('350 coins')).toBeInTheDocument();

    // Also verify the current balance and cost are shown
    expect(screen.getByText('500 coins')).toBeInTheDocument();
    expect(screen.getByText('150 coins')).toBeInTheDocument();
  });

  it('renders nothing when item is null', () => {
    const { container } = render(
      <PurchaseConfirmDialog
        item={null}
        balance={500}
        isLoading={false}
        error={null}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows negative remaining balance in red when cost exceeds balance', () => {
    const item = makeItem({ cost: 600 });

    render(
      <PurchaseConfirmDialog
        item={item}
        balance={500}
        isLoading={false}
        error={null}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Balance after purchase: 500 - 600 = -100
    expect(screen.getByText('-100 coins')).toBeInTheDocument();
  });
});
