import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock project store ─────────────────────────────────────────────────────

let mockRenameError: string | null = null;

vi.mock('../../../store/project.store', () => ({
  useProjectStore: (selector: (s: { renameError: string | null }) => unknown) =>
    selector({ renameError: mockRenameError }),
}));

import { ProjectRenameForm } from '../ProjectRenameForm';

// ─── Helper ─────────────────────────────────────────────────────────────────

function openEditMode() {
  const renameButton = screen.getByRole('button', { name: /rename project/i });
  fireEvent.click(renameButton);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ProjectRenameForm', () => {
  const defaultProps = {
    projectId: 'proj-1',
    currentName: 'My Project',
    existingNames: ['Other Project', 'Another One'],
    onRename: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRenameError = null;
  });

  it('renders a Rename button initially', () => {
    render(<ProjectRenameForm {...defaultProps} />);

    expect(screen.getByRole('button', { name: /rename project/i })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows the input form pre-filled with currentName when Rename is clicked', () => {
    render(<ProjectRenameForm {...defaultProps} />);
    openEditMode();

    const input = screen.getByLabelText(/new project name/i) as HTMLInputElement;
    expect(input.value).toBe('My Project');
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('shows validation error when name is empty after trim', async () => {
    render(<ProjectRenameForm {...defaultProps} />);
    openEditMode();

    const input = screen.getByLabelText(/new project name/i);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot be empty/i);
    expect(defaultProps.onRename).not.toHaveBeenCalled();
  });

  it('shows validation error when name exceeds 100 characters', async () => {
    render(<ProjectRenameForm {...defaultProps} />);
    openEditMode();

    const longName = 'a'.repeat(101);
    const input = screen.getByLabelText(/new project name/i);
    fireEvent.change(input, { target: { value: longName } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/100 characters/i);
    expect(defaultProps.onRename).not.toHaveBeenCalled();
  });

  it('shows validation error when name is a duplicate (case-insensitive)', async () => {
    render(<ProjectRenameForm {...defaultProps} />);
    openEditMode();

    const input = screen.getByLabelText(/new project name/i);
    fireEvent.change(input, { target: { value: 'other project' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i);
    expect(defaultProps.onRename).not.toHaveBeenCalled();
  });

  it('calls onRename with projectId and trimmed name on valid submission', async () => {
    render(<ProjectRenameForm {...defaultProps} />);
    openEditMode();

    const input = screen.getByLabelText(/new project name/i);
    fireEvent.change(input, { target: { value: '  Valid Name  ' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(defaultProps.onRename).toHaveBeenCalledWith('proj-1', 'Valid Name');
    });
  });

  it('disables the Save button while submitting', async () => {
    let resolveRename: () => void;
    const slowRename = vi.fn(
      () => new Promise<void>((resolve) => { resolveRename = resolve; })
    );

    render(<ProjectRenameForm {...defaultProps} onRename={slowRename} />);
    openEditMode();

    const input = screen.getByLabelText(/new project name/i);
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // Button should be disabled while submitting
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    });

    // Resolve and check button is re-enabled
    resolveRename!();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /saving/i })).not.toBeInTheDocument();
    });
  });

  it('shows store renameError as an error banner when in edit mode', () => {
    mockRenameError = 'Lark sync failed';

    render(<ProjectRenameForm {...defaultProps} />);
    openEditMode();

    const alerts = screen.getAllByRole('alert');
    const bannerAlert = alerts.find((el) => el.textContent?.includes('Lark sync failed'));
    expect(bannerAlert).toBeInTheDocument();
  });

  it('clears validation error when input changes', async () => {
    render(<ProjectRenameForm {...defaultProps} />);
    openEditMode();

    const input = screen.getByLabelText(/new project name/i);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();

    // Change input - validation error should clear
    fireEvent.change(input, { target: { value: 'New value' } });
    expect(screen.queryByText(/cannot be empty/i)).not.toBeInTheDocument();
  });

  it('hides the form and resets on Cancel', () => {
    render(<ProjectRenameForm {...defaultProps} />);
    openEditMode();

    const input = screen.getByLabelText(/new project name/i);
    fireEvent.change(input, { target: { value: 'Changed' } });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // Should be back to the Rename button
    expect(screen.getByRole('button', { name: /rename project/i })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('does not call onRename if name equals currentName', async () => {
    render(<ProjectRenameForm {...defaultProps} />);
    openEditMode();

    // Submit without changing the name
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      // Should just close the form
      expect(screen.getByRole('button', { name: /rename project/i })).toBeInTheDocument();
    });
    expect(defaultProps.onRename).not.toHaveBeenCalled();
  });
});
