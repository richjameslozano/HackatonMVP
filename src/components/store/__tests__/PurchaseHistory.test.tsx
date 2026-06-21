import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PurchaseHistory } from '../PurchaseHistory';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PurchaseHistory', () => {
  it('shows empty state message when purchases array is empty', () => {
    render(
      <PurchaseHistory
        purchases={[]}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />
    );

    expect(
      screen.getByText('No purchases yet. Browse the store to spend your coins!')
    ).toBeInTheDocument();
  });

  it('shows error message and retry button when error is set', () => {
    const onRetry = vi.fn();

    render(
      <PurchaseHistory
        purchases={[]}
        isLoading={false}
        error="Failed to load purchase history"
        onRetry={onRetry}
      />
    );

    // Error message should be displayed
    expect(screen.getByText('Failed to load purchase history')).toBeInTheDocument();

    // Retry button should be present and clickable
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator when isLoading is true', () => {
    render(
      <PurchaseHistory
        purchases={[]}
        isLoading={true}
        error={null}
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading purchase history...')).toBeInTheDocument();
  });
});
