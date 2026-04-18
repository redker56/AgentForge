/**
 * Project action creators -- add and remove project operations
 */

import type { StateCreator, StoreApi } from 'zustand';

import type { AppStore } from '../index.js';
import type { WorkbenchContext } from '../workbenchContext.js';

export interface ProjectActions {
  addProject: (id: string, projectPath: string) => Promise<void>;
  removeProject: (projectId: string) => Promise<void>;
  restoreProject: (snapshot: Record<string, unknown>) => void;
}

function createProjectActionsImpl(
  _set: StoreApi<AppStore>['setState'],
  get: StoreApi<AppStore>['getState'],
  ctx: WorkbenchContext
): ProjectActions {
  return {
    addProject: async (id, projectPath): Promise<void> => {
      await ctx.commands.addProject(id, projectPath);
      await get().refreshProjects();
    },

    removeProject: async (projectId): Promise<void> => {
      await ctx.commands.removeProject(projectId);
      await get().refreshProjects();
      await get().refreshSkills();
    },

    restoreProject: (snapshot): void => {
      ctx.commands.restoreProject(snapshot);
      void get().refreshProjects();
      void get().refreshSkills();
    },
  };
}

export function createProjectActions(
  store: StoreApi<AppStore>,
  ctx: WorkbenchContext
): ProjectActions {
  return createProjectActionsImpl(store.setState, store.getState, ctx);
}

export function createProjectActionsSlice(
  ctx: WorkbenchContext
): StateCreator<AppStore, [], [], ProjectActions> {
  return (set, get) => createProjectActionsImpl(set, get, ctx);
}
