/**
 * Import action creators -- import from project and import from agent
 */

import type { StateCreator, StoreApi } from 'zustand';

import type { ContextSkillRow } from '../../contextTypes.js';
import type { AppStore } from '../index.js';
import type { ConflictEntry, OperationResult } from '../uiSlice.js';
import type { WorkbenchContext } from '../workbenchContext.js';

import { doImportFromProject, doImportFromAgent } from './syncActions.js';

export interface ImportActions {
  importFromProject: (projectId: string, skillNames: string[]) => Promise<OperationResult[]>;
  importFromAgent: (agentId: string, skillNames: string[]) => Promise<OperationResult[]>;
  importContextSkills: (rows: ContextSkillRow[]) => Promise<OperationResult[]>;
  scanProjectSkills: (
    projectId: string
  ) => Array<{ name: string; path: string; alreadyExists: boolean }>;
  scanAgentSkills: (
    agentId: string
  ) => Array<{ name: string; path: string; alreadyExists: boolean; hasSkillMd: boolean }>;
}

function createImportActionsImpl(
  store: StoreApi<AppStore>,
  ctx: WorkbenchContext
): ImportActions {
  /**
   * Post-import conflict detection
   */
  function setupConflictDetection(skillName: string): void {
    const conflicts = ctx.commands.detectConflicts(skillName);
    if (conflicts.length === 0) return;

    const entries: ConflictEntry[] = conflicts.map((conflict) => ({
      agentId: conflict.agentId,
      agentName: conflict.agentName,
      sameContent: conflict.sameContent,
      resolution: conflict.sameContent ? 'link' : 'pending',
    }));

    store.getState().setConflictState({
      skillName,
      conflicts: entries,
      onComplete: () => {
        const state = store.getState();
        const conflictInfo = state.shellState.conflictState;
        if (!conflictInfo) return;

        const resolutions = new Map<string, 'link' | 'skip' | 'cancel'>();
        for (const entry of conflictInfo.conflicts) {
          resolutions.set(
            entry.agentId,
            entry.resolution === 'pending' ? 'skip' : entry.resolution
          );
        }

        ctx.commands.resolveConflicts(skillName, resolutions);
        void state.refreshSkills();
      },
    });
  }

  return {
    scanProjectSkills: (
      projectId
    ): Array<{ name: string; path: string; alreadyExists: boolean }> => {
      const preview = ctx.queries.loadImportSourcePreview({
        sourceType: 'project',
        sourceId: projectId,
      });
      return (
        preview?.candidates.map((candidate) => ({
          name: candidate.name,
          path: candidate.path,
          alreadyExists: candidate.alreadyExists,
        })) ?? []
      );
    },

    scanAgentSkills: (
      agentId
    ): Array<{ name: string; path: string; alreadyExists: boolean; hasSkillMd: boolean }> => {
      const preview = ctx.queries.loadImportSourcePreview({
        sourceType: 'agent',
        sourceId: agentId,
      });
      return (
        preview?.candidates.map((candidate) => ({
          ...candidate,
          hasSkillMd: candidate.hasSkillMd ?? false,
        })) ?? []
      );
    },

    importFromProject: async (projectId, skillNames): Promise<OperationResult[]> => {
      const results = await doImportFromProject(ctx, projectId, skillNames);

      // Handle conflict detection for any successfully imported skill
      const imported = results.filter((r) => r.success).map((r) => r.target);
      if (imported.length > 0) {
        setupConflictDetection(imported[imported.length - 1]);
      }

      store.getState().setFormState(null);
      await store.getState().refreshSkills();
      return results;
    },

    importFromAgent: async (agentId, skillNames): Promise<OperationResult[]> => {
      const results = await doImportFromAgent(ctx, agentId, skillNames);

      // Handle conflict detection for any successfully imported skill
      const imported = results.filter((r) => r.success).map((r) => r.target);
      if (imported.length > 0) {
        setupConflictDetection(imported[imported.length - 1]);
      }

      store.getState().setFormState(null);
      await store.getState().refreshSkills();
      return results;
    },

    importContextSkills: async (rows): Promise<OperationResult[]> => {
      const uniqueRows = Array.from(new Map(rows.map((row) => [row.rowId, row] as const)).values());
      const results: OperationResult[] = [];

      const importedResults = await ctx.commands.importContextSkills(uniqueRows);
      for (const result of importedResults) {
        results.push({
          target: result.target,
          success: result.success,
          outcome: result.outcome,
          error: result.error,
        });
        if (result.success) {
          const row = uniqueRows.find((entry) =>
            result.target === (entry.projectId ? `${entry.projectId}:${entry.name}` : entry.name)
          );
          if (row) setupConflictDetection(row.name);
        }
      }

      await store.getState().refreshSkills();
      await store.getState().refreshAgents();
      await store.getState().refreshProjects();
      return results;
    },
  };
}

export function createImportActions(store: StoreApi<AppStore>, ctx: WorkbenchContext): ImportActions {
  return createImportActionsImpl(store, ctx);
}

export function createImportActionsSlice(
  ctx: WorkbenchContext
): StateCreator<AppStore, [], [], ImportActions> {
  return (_set, _get, store) => createImportActionsImpl(store as StoreApi<AppStore>, ctx);
}
