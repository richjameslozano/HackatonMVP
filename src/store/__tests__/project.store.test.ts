import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

// ─── Mock project.service ───────────────────────────────────────────────────

const mockListProjects = vi.fn();
const mockGetProjectsForDeveloper = vi.fn();
const mockGetAssignedProjectsForScrumMaster = vi.fn();
const mockListScrumMasters = vi.fn();
const mockRenameProjectService = vi.fn();
const mockAssignScrumMasterToTask = vi.fn();

vi.mock('../../services/project.service', () => ({
  listProjects: (...args: unknown[]) => mockListProjects(...args),
  getProjectsForDeveloper: (...args: unknown[]) => mockGetProjectsForDeveloper(...args),
  getAssignedProjectsForScrumMaster: (...args: unknown[]) => mockGetAssignedProjectsForScrumMaster(...args),
  listScrumMasters: (...args: unknown[]) => mockListScrumMasters(...args),
  renameProject: (...args: unknown[]) => mockRenameProjectService(...args),
  assignScrumMasterToTask: (...args: unknown[]) => mockAssignScrumMasterToTask(...args),
}));

import { useProjectStore } from '../project.store';

// ─── Helpers ────────────────────────────────────────────────────────────────

function resetStore() {
  useProjectStore.setState({
    projects: [],
    developerProjects: [],
    smAssignedProjects: [],
    scrumMasters: [],
    projectsLoading: false,
    renameError: null,
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useProjectStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  // ─── renameProject ──────────────────────────────────────────────────────

  describe('renameProject', () => {
    it('optimistically updates project name in projects and developerProjects', async () => {
      useProjectStore.setState({
        projects: [
          { projectId: 'p1', name: 'Old Name', description: 'desc' },
          { projectId: 'p2', name: 'Other', description: 'desc' },
        ],
        developerProjects: [
          { projectId: 'p1', name: 'Old Name', description: 'desc' },
        ],
      });

      mockRenameProjectService.mockResolvedValue({ projectId: 'p1', name: 'New Name', description: 'desc' });

      await act(async () => {
        await useProjectStore.getState().renameProject('p1', 'New Name');
      });

      const state = useProjectStore.getState();
      expect(state.projects[0].name).toBe('New Name');
      expect(state.projects[1].name).toBe('Other');
      expect(state.developerProjects[0].name).toBe('New Name');
      expect(state.renameError).toBeNull();
    });

    it('trims whitespace from the new name in local state', async () => {
      useProjectStore.setState({
        projects: [
          { projectId: 'p1', name: 'Old Name', description: 'desc' },
        ],
        developerProjects: [],
      });

      mockRenameProjectService.mockResolvedValue({ projectId: 'p1', name: 'Trimmed', description: 'desc' });

      await act(async () => {
        await useProjectStore.getState().renameProject('p1', '  Trimmed  ');
      });

      const state = useProjectStore.getState();
      expect(state.projects[0].name).toBe('Trimmed');
    });

    it('reverts to previous name and sets renameError on service failure', async () => {
      useProjectStore.setState({
        projects: [
          { projectId: 'p1', name: 'Original', description: 'desc' },
        ],
        developerProjects: [
          { projectId: 'p1', name: 'Original', description: 'desc' },
        ],
      });

      mockRenameProjectService.mockRejectedValue(new Error('Name already in use'));

      await act(async () => {
        await useProjectStore.getState().renameProject('p1', 'Duplicate Name');
      });

      const state = useProjectStore.getState();
      expect(state.projects[0].name).toBe('Original');
      expect(state.developerProjects[0].name).toBe('Original');
      expect(state.renameError).toBe('Name already in use');
    });

    it('clears renameError on success', async () => {
      useProjectStore.setState({
        projects: [
          { projectId: 'p1', name: 'Old', description: 'desc' },
        ],
        developerProjects: [],
        renameError: 'previous error',
      });

      mockRenameProjectService.mockResolvedValue({ projectId: 'p1', name: 'New', description: 'desc' });

      await act(async () => {
        await useProjectStore.getState().renameProject('p1', 'New');
      });

      const state = useProjectStore.getState();
      expect(state.renameError).toBeNull();
    });

    it('calls renameProjectService with correct arguments', async () => {
      const projects = [
        { projectId: 'p1', name: 'Current', description: 'desc' },
      ];
      useProjectStore.setState({ projects, developerProjects: [] });

      mockRenameProjectService.mockResolvedValue({ projectId: 'p1', name: 'Updated', description: 'desc' });

      await act(async () => {
        await useProjectStore.getState().renameProject('p1', 'Updated');
      });

      expect(mockRenameProjectService).toHaveBeenCalledWith('p1', 'Updated', projects);
    });

    it('sets generic error message for non-Error failures', async () => {
      useProjectStore.setState({
        projects: [
          { projectId: 'p1', name: 'Original', description: 'desc' },
        ],
        developerProjects: [],
      });

      mockRenameProjectService.mockRejectedValue('some string error');

      await act(async () => {
        await useProjectStore.getState().renameProject('p1', 'New');
      });

      const state = useProjectStore.getState();
      expect(state.projects[0].name).toBe('Original');
      expect(state.renameError).toBe('Failed to rename project');
    });
  });
});
