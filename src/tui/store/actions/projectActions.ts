/**
 * Project action creators -- add and remove project operations
 */

import os from 'os';

import type { StoreApi } from 'zustand';

import type { ServiceContext } from '../dataSlice.js';
import type { AppStore } from '../index.js';

export interface ProjectActions {
  addProject: (id: string, projectPath: string) => Promise<void>;
  removeProject: (projectId: string) => Promise<void>;
  restoreProject: (snapshot: Record<string, unknown>) => void;
}

export function createProjectActions(
  store: StoreApi<AppStore>,
  ctx: ServiceContext
): ProjectActions {
  return {
    addProject: async (id, projectPath): Promise<void> => {
      // Validate ID
      if (!id.trim()) throw new Error('Project ID is required');
      if (!/^[a-zA-Z0-9-_]+$/.test(id))
        throw new Error('Project ID must contain only letters, numbers, hyphens, and underscores');

      // Check not duplicate
      const projects = ctx.storage.listProjects();
      if (projects.some((p) => p.id === id)) throw new Error(`Project "${id}" already exists`);

      // Expand ~ in projectPath
      const expandedPath = projectPath.replace(/^~(?=[/\\])/, os.homedir());

      // Validate path exists
      if (!ctx.fileOps.pathExists(expandedPath))
        throw new Error(`Path does not exist: ${expandedPath}`);

      ctx.storage.addProject(id, expandedPath);
      await store.getState().refreshProjects();
    },

    removeProject: async (projectId): Promise<void> => {
      // Clean up sync references for all skills
      const skills = ctx.storage.listSkills();
      for (const skill of skills) {
        const updated = (skill.syncedProjects || []).filter((r) => r.projectId !== projectId);
        if (updated.length !== (skill.syncedProjects || []).length) {
          ctx.storage.updateSkillProjectSync(skill.name, updated);
        }
      }

      ctx.storage.removeProject(projectId);
      await store.getState().refreshProjects();
      await store.getState().refreshSkills();
    },

    restoreProject: (snapshot): void => {
      const id = snapshot.id as string;
      const projPath = snapshot.path as string;
      const addedAt = snapshot.addedAt as string | undefined;
      if (!id || !projPath) return;
      ctx.storage.addProject(id, projPath, addedAt);
      void store.getState().refreshProjects();
      void store.getState().refreshSkills();
    },
  };
}
