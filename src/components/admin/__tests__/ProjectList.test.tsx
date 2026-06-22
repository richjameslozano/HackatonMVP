import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock project.service ───────────────────────────────────────────────────

const mockListProjects = vi.fn();
const mockGetProjectQuestCount = vi.fn();

vi.mock('../../../services/project.service', () => ({
  listProjects: (...args: unknown[]) => mockListProjects(...args),
  getProjectQuestCount: (...args: unknown[]) => mockGetProjectQuestCount(...args),
  createProject: vi.fn().mockResolvedValue({ projectId: 'new', name: 'New', description: '' }),
}));

// ─── Mock project store ─────────────────────────────────────────────────────

const mockRenameProject = vi.fn();
const mockFetchProjects = vi.fn().mockResolvedValue(undefined);
const mockFetchScrumMasters = vi.fn().mockResolvedValue(undefined);
const mockAssignScrumMasterToProject = vi.fn();

vi.mock('../../../store/project.store', () => ({
  useProjectStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      renameProject: mockRenameProject,
      renameError: null,
      projects: [],
      fetchProjects: mockFetchProjects,
      scrumMasters: [],
      fetchScrumMasters: mockFetchScrumMasters,
      assignScrumMasterToProject: mockAssignScrumMasterToProject,
      assignError: null,
    }),
}));

import { ProjectList } from '../ProjectList';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ProjectList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state message when no projects exist', async () => {
    mockListProjects.mockResolvedValue([]);

    render(<ProjectList />);

    await waitFor(() => {
      expect(screen.getByText('No projects found. Add one to get started.')).toBeInTheDocument();
    });
  });

  it('shows error state with retry button on fetch failure', async () => {
    mockListProjects.mockRejectedValue(new Error('Network error'));

    render(<ProjectList />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Retry button should be present
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    // Clicking retry should call listProjects again
    mockListProjects.mockResolvedValue([]);
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockListProjects).toHaveBeenCalledTimes(2);
    });
  });

  it('renders projects when data is available', async () => {
    const mockProjects = [
      { projectId: 'p1', name: 'Alpha Project', description: 'First project' },
      { projectId: 'p2', name: 'Beta Project', description: 'Second project' },
    ];
    mockListProjects.mockResolvedValue(mockProjects);
    mockGetProjectQuestCount.mockResolvedValue(3);

    render(<ProjectList />);

    await waitFor(() => {
      expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    });

    expect(screen.getByText('Beta Project')).toBeInTheDocument();

    // Quest counts should be displayed
    const questCountBadges = screen.getAllByText(/3 quests/);
    expect(questCountBadges.length).toBe(2);
  });
});
