/**
 * Zustand Store -- combines UI and Data slices with async action creators
 *
 * CRITICAL: Never use store.setState(newValue, true) with replace:true.
 * The Object.assign pattern below attaches action properties directly to
 * the state object after creation. Using replace:true would wipe ALL action
 * properties, breaking the store.
 */

import { create } from 'zustand';
import type { StoreApi } from 'zustand';

import type { SkillMeta } from '../../types.js';

import { createAgentActions, type AgentActions } from './actions/agentActions.js';
import { createImportActions, type ImportActions } from './actions/importActions.js';
import { createProjectActions, type ProjectActions } from './actions/projectActions.js';
import { createSkillActions, type CategoryActionResult, type SkillActions } from './actions/skillActions.js';
import { createSyncActions, type SyncActions } from './actions/syncActions.js';
import { createDataSlice, type DataSlice, type ServiceContext } from './dataSlice.js';
import { createUISlice, type OperationResult, type UISlice, type TabId, type UpdateResult } from './uiSlice.js';

// SkillListItem extends SkillMeta with the 'exists' flag from SkillService.list()
export type SkillListItem = SkillMeta & {
  exists: boolean;
};

// Full store type is the union of both slices plus action interfaces
export type AppStore = UISlice &
  DataSlice &
  SkillActions &
  ImportActions &
  AgentActions &
  ProjectActions &
  SyncActions;

// Re-export for use in slice files that need a placeholder for the full store type
export type StoreState = AppStore;

// Shared tab ID ordering constant -- single source of truth for tab navigation
export const TAB_IDS: TabId[] = ['skills', 'agents', 'projects', 'sync', 'import'];

export type { ServiceContext } from './dataSlice.js';
export type { TabId } from './uiSlice.js';

export function createAppStore(ctx: ServiceContext): StoreApi<AppStore> {
  // Create store with slices first, then attach action creators via Object.assign.
  // We create as AppStore directly so slice creators get the correct StateCreator type.
  const store = create<AppStore>()((...a) => ({
    ...createUISlice(...a),
    ...createDataSlice(ctx)(...a),
    // Placeholder functions -- will be overwritten by Object.assign below.
    // This satisfies the type checker during store creation.
    addSkillFromUrl: async (): Promise<void> => {},
    addSkillFromDiscovery: async (): Promise<void> => {},
    categorizeSkills: (): Promise<CategoryActionResult[]> => Promise.resolve([]),
    removeSkill: async (): Promise<void> => {},
    importFromProject: async (): Promise<void> => {},
    importFromAgent: async (): Promise<void> => {},
    importContextSkills: (): Promise<OperationResult[]> => Promise.resolve([]),
    scanProjectSkills: (): Array<{ name: string; path: string; alreadyExists: boolean }> => [],
    scanAgentSkills: (): Array<{
      name: string;
      path: string;
      alreadyExists: boolean;
      hasSkillMd: boolean;
    }> => [],
    addAgent: async (): Promise<void> => {},
    removeAgent: async (): Promise<void> => {},
    addProject: async (): Promise<void> => {},
    removeProject: async (): Promise<void> => {},
    syncSkillsToAgents: async (): Promise<void> => {},
    syncSkillsToProjects: async (): Promise<void> => {},
    unsyncFromAgents: async (): Promise<void> => {},
    unsyncFromProjects: async (): Promise<void> => {},
    updateSkills: (): Promise<UpdateResult[]> => Promise.resolve([]),
    // Sprint 3: Restore actions (placeholders for undo system)
    restoreSkill: (): void => {},
    restoreAgent: (): void => {},
    restoreProject: (): void => {},
  }));

  // Overwrite placeholders with real action creators bound to store + context
  Object.assign(store.getState(), {
    ...createSkillActions(store, ctx),
    ...createImportActions(store, ctx),
    ...createAgentActions(store, ctx),
    ...createProjectActions(store, ctx),
    ...createSyncActions(store, ctx),
  });

  return store;
}
