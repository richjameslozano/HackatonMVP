import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RewardItemForm } from '../RewardItemForm';
import type { RewardItemFormProps, RewardItemFormValues } from '../RewardItemForm';

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderForm(overrides: Partial<RewardItemFormProps> = {}) {
  const defaults: RewardItemFormProps = {
    mode: 'create',
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    isLoading: false,
    error: null,
    ...overrides,
  };
  return { ...render(<RewardItemForm {...defaults} />), props: defaults };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('RewardItemForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Validation Errors ────────────────────────────────────────────────

  it('shows validation errors when invalid values submitted', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });

    // Leave all fields empty and submit
    const submitButton = screen.getByRole('button', { name: /create item/i });
    fireEvent.click(submitButton);

    // Validation errors should appear for required fields (use role="alert" to target error messages)
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThanOrEqual(2);
    });

    // Specific error messages
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    expect(screen.getByText(/cost must be a positive integer/i)).toBeInTheDocument();
    expect(screen.getByText(/stock quantity must be/i)).toBeInTheDocument();

    // onSubmit should NOT have been called
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // ─── Edit Mode Pre-population ─────────────────────────────────────────

  it('edit mode pre-populates with initialValues', () => {
    const initialValues: RewardItemFormValues = {
      title: 'Coffee Voucher',
      description: 'A delicious coffee from the local cafe',
      cost: 50,
      imageUrl: 'https://example.com/coffee.png',
      stockQuantity: 25,
    };

    renderForm({ mode: 'edit', initialValues });

    // Verify all fields are pre-populated
    expect(screen.getByLabelText(/title/i)).toHaveValue('Coffee Voucher');
    expect(screen.getByLabelText(/description/i)).toHaveValue(
      'A delicious coffee from the local cafe'
    );
    expect(screen.getByLabelText(/cost/i)).toHaveValue(50);
    expect(screen.getByLabelText(/image url/i)).toHaveValue('https://example.com/coffee.png');
    expect(screen.getByLabelText(/stock quantity/i)).toHaveValue(25);

    // Should show edit mode heading
    expect(screen.getByText(/edit reward item/i)).toBeInTheDocument();
  });

  // ─── Form Preserves Values on API Error ───────────────────────────────

  it('preserves entered values when API error occurs', () => {
    const initialValues: RewardItemFormValues = {
      title: 'Premium Headphones',
      description: 'Noise-cancelling headphones',
      cost: 500,
      imageUrl: 'https://example.com/headphones.png',
      stockQuantity: 3,
    };

    const { rerender } = render(
      <RewardItemForm
        mode="create"
        initialValues={initialValues}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onCancel={vi.fn()}
        isLoading={false}
        error={null}
      />
    );

    // Verify values are there
    expect(screen.getByLabelText(/title/i)).toHaveValue('Premium Headphones');
    expect(screen.getByLabelText(/cost/i)).toHaveValue(500);

    // Simulate an API error by re-rendering with error prop
    rerender(
      <RewardItemForm
        mode="create"
        initialValues={initialValues}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onCancel={vi.fn()}
        isLoading={false}
        error="Failed to create reward item"
      />
    );

    // Error message should be displayed
    expect(screen.getByText('Failed to create reward item')).toBeInTheDocument();

    // Form values should still be preserved
    expect(screen.getByLabelText(/title/i)).toHaveValue('Premium Headphones');
    expect(screen.getByLabelText(/description/i)).toHaveValue('Noise-cancelling headphones');
    expect(screen.getByLabelText(/cost/i)).toHaveValue(500);
    expect(screen.getByLabelText(/image url/i)).toHaveValue('https://example.com/headphones.png');
    expect(screen.getByLabelText(/stock quantity/i)).toHaveValue(3);
  });
});
