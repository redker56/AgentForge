/**
 * Zustand Store -- composes UI, data, and action slices into the TUI store.
 */

import { create } from 'zustand';
import type { StoreApi } from 'zustand';

import type { SkillMeta } from '../../types.js';

import { createAgentActionsSlice, type AgentActions } from './actions/agentActions.js';
import { createImportActionsSlice, type ImportActions } from './actions/importActions.js';
import { createProjectActionsSlice, type ProjectActions } from './actions/projectActions.js';
import { createSkillActionsSlice, type SkillActions } from './actions/skillActions.js';
import { createSyncActionsSlice, type SyncActions } from './actions/syncActions.js';
import { createDataSlice, type DataSlice } from './dataSlice.js';
import { createUISlice, type UISlice, type TabId } from './uiSlice.js';
import type { WorkbenchContext } from './workbenchContext.js';

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

export type { TabId } from './uiSlice.js';

export function createAppStore(ctx: WorkbenchContext): StoreApi<AppStore> {
  return create<AppStore>()((...a) => ({
    ...createUISlice(...a),
    ...createDataSlice(ctx)(...a),
    ...createSkillActionsSlice(ctx)(...a),
    ...createImportActionsSlice(ctx)(...a),
    ...createAgentActionsSlice(ctx)(...a),
    ...createProjectActionsSlice(ctx)(...a),
    ...createSyncActionsSlice(ctx)(...a),
  }));
}
