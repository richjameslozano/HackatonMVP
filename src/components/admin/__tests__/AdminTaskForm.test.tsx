import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock project.service ───────────────────────────────────────────────────

const mockListProjects = vi.fn();

vi.mock('../../../services/project.service', () => ({
  listProjects: (...args: unknown[]) => mockListProjects(...args),
}));

// ─── Mock quest.service (dynamic import) ────────────────────────────────────

const mockCreateAdminTask = vi.fn();

vi.mock('../../../services/quest.service', () => ({
  createAdminTask: (...args: unknown[]) => mockCreateAdminTask(...args),
}));

// ─── Mock DifficultySelector to avoid nested service calls ──────────────────

vi.mock('../../shared/DifficultySelector', () => ({
  DifficultySelector: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select
      data-testid="difficulty-selector"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="easy">Easy</option>
      <option value="medium">Medium</option>
      <option value="hard">Hard</option>
    </select>
  ),
}));

import { AdminTaskForm } from '../AdminTaskForm';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('AdminTaskForm', () => {
  const mockProjects = [
    { projectId: 'p1', name: 'Project One', description: 'Desc 1' },
    { projectId: 'p2', name: 'Project Two', description: 'Desc 2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockListProjects.mockResolvedValue(mockProjects);
  });

  it('shows validation errors for invalid form fields', async () => {
    render(<AdminTaskForm />);

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Project One')).toBeInTheDocument();
    });

    // Submit empty form
    fireEvent.click(screen.getByRole('button', { name: /create task/i }));

    // Wait for validation errors
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one project must be selected/i)).toBeInTheDocument();
  });

  it('successful submission creates task', async () => {
    mockCreateAdminTask.mockResolvedValue({ questId: 'q1' });

    render(<AdminTaskForm />);

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Project One')).toBeInTheDocument();
    });

    // Fill in form fields
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'New Task Title' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Task description content' },
    });

    // Select a project
    const projectCheckbox = screen.getByLabelText('Project One');
    fireEvent.click(projectCheckbox);

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /create task/i }));

    // Wait for success
    await waitFor(() => {
      expect(screen.getByText('Task created successfully.')).toBeInTheDocument();
    });

    expect(mockCreateAdminTask).toHaveBeenCalledWith(
      'New Task Title',
      'Task description content',
      'easy',
      'developer',
      ['p1']
    );
  });

  it('preserves form data on submission failure', async () => {
    mockCreateAdminTask.mockRejectedValue(new Error('Server error'));

    render(<AdminTaskForm />);

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Project One')).toBeInTheDocument();
    });

    // Fill in form fields
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'My Important Task' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Important description' },
    });

    // Select a project
    fireEvent.click(screen.getByLabelText('Project Two'));

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /create task/i }));

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Failed to create task. Please try again.')).toBeInTheDocument();
    });

    // Verify form values are preserved
    expect(screen.getByLabelText('Title')).toHaveValue('My Important Task');
    expect(screen.getByLabelText('Description')).toHaveValue('Important description');
  });
});
