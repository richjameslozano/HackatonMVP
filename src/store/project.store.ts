import { create } from 'zustand';
import type { Project, Member, Role } from '../types';
import {
  listProjects,
  getProjectsForDeveloper,
  getAssignedProjectsForScrumMaster,
  listScrumMasters,
  renameProject as renameProjectService,
  assignScrumMasterToTask as assignScrumMasterToTaskService,
  assignScrumMasterToProject as assignScrumMasterToProjectService,
} from '../services/project.service';

// ─── State Interface ────────────────────────────────────────────────────────

export interface ProjectState {
  projects: Project[];
  developerProjects: Project[];
  smAssignedProjects: Project[];
  scrumMasters: Member[];
  projectsLoading: boolean;
  renameError: string | null;
  assignError: string | null;

  // Actions
  fetchProjects: () => Promise<void>;
  fetchDeveloperProjects: (memberId: string) => Promise<void>;
  fetchSmAssignedProjects: (scrumMasterId: string) => Promise<void>;
  fetchScrumMasters: () => Promise<void>;
  renameProject: (projectId: string, newName: string) => Promise<void>;
  assignScrumMasterToTask: (taskId: string, scrumMasterId: string, callerRole: Role) => Promise<void>;
  assignScrumMasterToProject: (projectId: string, scrumMasterId: string, callerRole: Role) => Promise<void>;
}

// ─── Store Implementation ───────────────────────────────────────────────────

export const useProjectStore = create<ProjectState>((set, get) => ({
  // Initial state
  projects: [],
  developerProjects: [],
  smAssignedProjects: [],
  scrumMasters: [],
  projectsLoading: false,
  renameError: null,
  assignError: null,

  // ─── Actions ────────────────────────────────────────────────────────────

  fetchProjects: async () => {
    set({ projectsLoading: true });
    try {
      const projects = await listProjects();
      set({ projects });
    } catch (err: unknown) {
      console.error('Failed to fetch projects:', err);
    } finally {
      set({ projectsLoading: false });
    }
  },

  fetchDeveloperProjects: async (memberId: string) => {
    set({ projectsLoading: true });
    try {
      const developerProjects = await getProjectsForDeveloper(memberId);
      set({ developerProjects });
    } catch (err: unknown) {
      console.error('Failed to fetch developer projects:', err);
    } finally {
      set({ projectsLoading: false });
    }
  },

  fetchSmAssignedProjects: async (scrumMasterId: string) => {
    set({ projectsLoading: true });
    try {
      const smAssignedProjects = await getAssignedProjectsForScrumMaster(scrumMasterId);
      set({ smAssignedProjects });
    } catch (err: unknown) {
      console.error('Failed to fetch SM assigned projects:', err);
    } finally {
      set({ projectsLoading: false });
    }
  },

  fetchScrumMasters: async () => {
    set({ projectsLoading: true });
    try {
      const scrumMasters = await listScrumMasters();
      set({ scrumMasters });
    } catch (err: unknown) {
      console.error('Failed to fetch scrum masters:', err);
    } finally {
      set({ projectsLoading: false });
    }
  },

  renameProject: async (projectId: string, newName: string) => {
    const trimmedName = newName.trim();
    const { projects, developerProjects } = get();

    // Find the project and save previous name for rollback
    const targetProject = projects.find((p) => p.projectId === projectId);
    const previousName = targetProject?.name ?? '';

    // Optimistically update projects array
    const updatedProjects = projects.map((p) =>
      p.projectId === projectId ? { ...p, name: trimmedName } : p
    );

    // Optimistically update developerProjects array
    const updatedDeveloperProjects = developerProjects.map((p) =>
      p.projectId === projectId ? { ...p, name: trimmedName } : p
    );

    set({ projects: updatedProjects, developerProjects: updatedDeveloperProjects, renameError: null });

    try {
      await renameProjectService(projectId, newName, projects);
      set({ renameError: null });
    } catch (err: unknown) {
      // Revert to previous name on failure
      const revertedProjects = get().projects.map((p) =>
        p.projectId === projectId ? { ...p, name: previousName } : p
      );
      const revertedDeveloperProjects = get().developerProjects.map((p) =>
        p.projectId === projectId ? { ...p, name: previousName } : p
      );

      const errorMessage = err instanceof Error ? err.message : 'Failed to rename project';
      set({
        projects: revertedProjects,
        developerProjects: revertedDeveloperProjects,
        renameError: errorMessage,
      });
    }
  },

  assignScrumMasterToTask: async (taskId: string, scrumMasterId: string, callerRole: Role) => {
    set({ assignError: null });

    try {
      await assignScrumMasterToTaskService(taskId, scrumMasterId, callerRole);
      set({ assignError: null });
      // Refresh SM assigned projects to reflect the new assignment
      void get().fetchSmAssignedProjects(scrumMasterId);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign Scrum Master';
      set({ assignError: errorMessage });
    }
  },

  assignScrumMasterToProject: async (projectId: string, scrumMasterId: string, callerRole: Role) => {
    set({ assignError: null });

    // Optimistically update local state
    const { projects } = get();
    const updatedProjects = projects.map((p) =>
      p.projectId === projectId ? { ...p, scrumMasterId } : p
    );
    set({ projects: updatedProjects });

    try {
      await assignScrumMasterToProjectService(projectId, scrumMasterId, callerRole);
      set({ assignError: null });
    } catch (err: unknown) {
      // Revert optimistic update
      set({ projects, assignError: err instanceof Error ? err.message : 'Failed to assign Scrum Master' });
    }
  },
}));
