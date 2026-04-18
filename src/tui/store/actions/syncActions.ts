/**
 * Sync action creators -- sync, unsync, and update operations.
 */

import type { StateCreator, StoreApi } from 'zustand';

import type { SyncMode } from '../../../types.js';
import type { AppStore } from '../index.js';
import type { OperationResult, ProgressItem, UpdateResult } from '../uiSlice.js';
import type { WorkbenchContext } from '../workbenchContext.js';

export interface ProjectUnsyncOptions {
  mode?: 'all' | 'specific';
  agentTypes?: string[];
}

export interface SyncActions {
  syncSkillsToAgents: (skillNames: string[], agentIds: string[], mode: SyncMode) => Promise<void>;
  syncSkillsToProjects: (
    skillNames: string[],
    projectIds: string[],
    agentTypes: string[],
    mode: SyncMode
  ) => Promise<void>;
  unsyncFromAgents: (skillNames: string[], agentIds: string[]) => Promise<void>;
  unsyncFromProjects: (
    skillNames: string[],
    projectIds: string[],
    options?: ProjectUnsyncOptions
  ) => Promise<void>;
  updateSkills: (skillNames: string[]) => Promise<UpdateResult[]>;
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function makeResult(
  target: string,
  outcome: 'success' | 'error' | 'skipped',
  error?: string
): OperationResult {
  return {
    target,
    success: outcome === 'success',
    error,
    outcome,
  };
}

function queueProgressClear(store: StoreApi<AppStore>, delayMs = 2000): void {
  setTimeout(() => {
    store.getState().setUpdateProgressItems([]);
  }, delayMs);
}

function pushOperationToast(
  store: StoreApi<AppStore>,
  results: OperationResult[],
  successLabel: string
): void {
  const successCount = results.filter(
    (r) => (r.outcome ?? (r.success ? 'success' : 'error')) === 'success'
  ).length;
  const skippedCount = results.filter((r) => r.outcome === 'skipped').length;
  const errorCount = results.filter(
    (r) => (r.outcome ?? (r.success ? 'success' : 'error')) === 'error'
  ).length;

  if (errorCount > 0) {
    const extra = skippedCount > 0 ? `, ${skippedCount} skipped` : '';
    store
      .getState()
      .pushToast(`${errorCount} failed, ${successCount} ${successLabel}${extra}`, 'error');
    return;
  }

  if (successCount > 0) {
    const extra = skippedCount > 0 ? `, ${skippedCount} skipped` : '';
    store.getState().pushToast(`${successCount} ${successLabel}${extra}`, 'success');
    return;
  }

  if (skippedCount > 0) {
    store.getState().pushToast(`${skippedCount} skipped`, 'info');
  }
}

function pushUpdateToast(store: StoreApi<AppStore>, results: UpdateResult[]): void {
  const updatedCount = results.filter((r) => r.outcome === 'updated').length;
  const skippedCount = results.filter((r) => r.outcome === 'skipped').length;
  const errorCount = results.filter((r) => r.outcome === 'error').length;

  if (errorCount > 0) {
    const extra = skippedCount > 0 ? `, ${skippedCount} skipped` : '';
    store.getState().pushToast(`${errorCount} failed, ${updatedCount} updated${extra}`, 'error');
    return;
  }

  if (updatedCount > 0) {
    const extra = skippedCount > 0 ? `, ${skippedCount} skipped` : '';
    store.getState().pushToast(`${updatedCount} updated${extra}`, 'success');
    return;
  }

  if (skippedCount > 0) {
    store.getState().pushToast(`${skippedCount} skipped`, 'info');
  }
}

async function getProjectUnsyncAvailability(
  ctx: WorkbenchContext,
  skillName: string
): Promise<Map<string, Set<string>>> {
  const detail = await ctx.queries.loadSkillDetail(skillName);
  const availability = new Map<string, Set<string>>();

  for (const record of detail?.syncedProjects ?? []) {
    if (!availability.has(record.projectId)) {
      availability.set(record.projectId, new Set());
    }
    availability.get(record.projectId)?.add(record.agentType);
  }

  for (const project of detail?.projectDistribution ?? []) {
    if (!availability.has(project.projectId)) {
      availability.set(project.projectId, new Set());
    }
    const types = availability.get(project.projectId);
    for (const agent of project.agents) {
      types?.add(agent.id);
    }
  }

  return availability;
}

function getSkillSourceType(skillName: string, store: StoreApi<AppStore>): UpdateResult['sourceType'] {
  const skill = store.getState().skills.find((entry) => entry.name === skillName);
  if (!skill) return 'unknown';
  if (skill.source.type === 'git') return 'git';
  if (skill.source.type === 'project') return 'project';
  return 'local';
}

function parseProjectTargetPairs(
  projectIds: string[]
): Array<{ projectId: string; agentType: string }> {
  return projectIds
    .filter((projectId) => projectId.includes(':'))
    .map((projectId) => {
      const [actualProjectId, agentType] = projectId.split(':');
      return { projectId: actualProjectId, agentType };
    })
    .filter((target) => Boolean(target.projectId) && Boolean(target.agentType));
}

export async function doImportFromProject(
  ctx: WorkbenchContext,
  projectId: string,
  skillNames: string[]
): Promise<OperationResult[]> {
  const results = await ctx.commands.importFromProject(projectId, skillNames);
  return results.map((result) => ({
    target: result.target,
    success: result.success,
    error: result.error,
    outcome: result.outcome,
  }));
}

export async function doImportFromAgent(
  ctx: WorkbenchContext,
  agentId: string,
  skillNames: string[]
): Promise<OperationResult[]> {
  const results = await ctx.commands.importFromAgent(agentId, skillNames);
  return results.map((result) => ({
    target: result.target,
    success: result.success,
    error: result.error,
    outcome: result.outcome,
  }));
}

function createSyncActionsImpl(
  store: StoreApi<AppStore>,
  ctx: WorkbenchContext
): SyncActions {
  return {
    syncSkillsToAgents: async (skillNames, agentIds, mode): Promise<void> => {
      const state = store.getState();
      const uniqueSkills = unique(skillNames);
      const uniqueAgents = unique(agentIds);
      state.setSyncFormStep('executing');

      const items: ProgressItem[] = uniqueSkills.flatMap((skill) =>
        uniqueAgents.map((agentId) => ({
          id: `sync-${skill}-${agentId}`,
          label: `${skill} -> ${agentId}`,
          progress: 0,
          status: 'pending' as const,
        }))
      );
      state.setUpdateProgressItems(items);

      const results: OperationResult[] = [];
      for (const skillName of uniqueSkills) {
        for (const agentId of uniqueAgents) {
          const agent = state.agents.find((entry) => entry.id === agentId);
          const label = `${skillName} -> ${agent?.name ?? agentId}`;
          const itemId = `sync-${skillName}-${agentId}`;
          state.updateProgressItem(itemId, { status: 'running', progress: 30 });
          try {
            const syncResults = await ctx.commands.syncSkillsToAgents([skillName], [agentId], mode);
            const syncResult = syncResults[0];
            results.push(makeResult(label, syncResult?.success ? 'success' : 'error', syncResult?.error));
            state.updateProgressItem(itemId, { status: 'success', progress: 100 });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            results.push(makeResult(label, 'error', msg));
            state.updateProgressItem(itemId, { status: 'error', progress: 100, error: msg });
          }
        }
      }

      state.setSyncFormResults(results);
      state.setSyncFormStep('results');
      await state.refreshSkills();
      queueProgressClear(store);
      pushOperationToast(store, results, 'synced');
    },

    syncSkillsToProjects: async (skillNames, projectIds, agentTypes, mode): Promise<void> => {
      const state = store.getState();
      const uniqueSkills = unique(skillNames);
      const uniqueProjects = unique(projectIds);
      state.setSyncFormStep('executing');

      const items: ProgressItem[] = uniqueSkills.flatMap((skill) =>
        uniqueProjects.map((projectId) => ({
          id: `sync-${skill}-${projectId}`,
          label: `${skill} -> ${projectId}`,
          progress: 0,
          status: 'pending' as const,
        }))
      );
      state.setUpdateProgressItems(items);

      const results: OperationResult[] = [];
      for (const skillName of uniqueSkills) {
        for (const projectId of uniqueProjects) {
          const itemId = `sync-${skillName}-${projectId}`;
          state.updateProgressItem(itemId, { status: 'running', progress: 30 });
          try {
            const syncResults = await ctx.commands.syncSkillsToProjects(
              [skillName],
              [projectId],
              unique(agentTypes),
              mode
            );
            const syncResult = syncResults[0];
            results.push(
              makeResult(
                `${skillName} -> ${projectId}`,
                syncResult?.success ? 'success' : 'error',
                syncResult?.error
              )
            );
            state.updateProgressItem(itemId, { status: 'success', progress: 100 });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            results.push(makeResult(`${skillName} -> ${projectId}`, 'error', msg));
            state.updateProgressItem(itemId, { status: 'error', progress: 100, error: msg });
          }
        }
      }

      state.setSyncFormResults(results);
      state.setSyncFormStep('results');
      await state.refreshSkills();
      queueProgressClear(store);
      pushOperationToast(store, results, 'synced');
    },

    unsyncFromAgents: async (skillNames, agentIds): Promise<void> => {
      const state = store.getState();
      const uniqueSkills = unique(skillNames);
      const uniqueAgents = unique(agentIds);
      state.setSyncFormStep('executing');

      const planned = uniqueSkills.flatMap((skillName) => {
        const syncedAgents = new Set(
          (state.skillDetails[skillName]?.syncedTo ?? []).map((record) => record.agentId)
        );
        return uniqueAgents
          .filter((agentId) => syncedAgents.has(agentId))
          .map((agentId) => ({ skillName, agentId }));
      });

      const items: ProgressItem[] = planned.map(({ skillName, agentId }) => ({
        id: `unsync-${skillName}-${agentId}`,
        label: `unsync ${skillName} from ${agentId}`,
        progress: 0,
        status: 'pending' as const,
      }));
      state.setUpdateProgressItems(items);

      const results: OperationResult[] = [];
      for (const skillName of uniqueSkills) {
        const syncedAgents = new Set(
          (state.skillDetails[skillName]?.syncedTo ?? []).map((record) => record.agentId)
        );
        for (const agentId of uniqueAgents) {
          const label = `${skillName} -> ${agentId}`;
          if (!syncedAgents.has(agentId)) {
            results.push(makeResult(label, 'skipped', 'Not synced to this agent'));
            continue;
          }

          const itemId = `unsync-${skillName}-${agentId}`;
          state.updateProgressItem(itemId, { status: 'running', progress: 30 });
          try {
            await ctx.commands.unsyncSkillsFromAgents([skillName], [agentId]);
            results.push(makeResult(label, 'success'));
            state.updateProgressItem(itemId, { status: 'success', progress: 100 });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            results.push(makeResult(label, 'error', msg));
            state.updateProgressItem(itemId, { status: 'error', progress: 100, error: msg });
          }
        }
      }

      state.setSyncFormResults(results);
      state.setSyncFormStep('results');
      await state.refreshSkills();
      queueProgressClear(store);
      pushOperationToast(store, results, 'unsynced');
    },

    unsyncFromProjects: async (skillNames, projectIds, options): Promise<void> => {
      const state = store.getState();
      const uniqueSkills = unique(skillNames);
      const uniqueProjects = unique(projectIds);
      const mode = options?.mode ?? 'all';
      const agentTypes = unique(options?.agentTypes ?? []);
      const exactTargets = mode === 'specific' ? parseProjectTargetPairs(uniqueProjects) : [];
      state.setSyncFormStep('executing');

      const availabilityEntries = await Promise.all(
        uniqueSkills.map(
          async (skillName) =>
            [skillName, await getProjectUnsyncAvailability(ctx, skillName)] as const
        )
      );
      const availabilityBySkill = new Map(availabilityEntries);

      const plannedItems: ProgressItem[] = [];
      const results: OperationResult[] = [];

      for (const skillName of uniqueSkills) {
        const availability = availabilityBySkill.get(skillName) ?? new Map<string, Set<string>>();

        if (exactTargets.length > 0) {
          for (const target of exactTargets) {
            const availableTypes = availability.get(target.projectId) ?? new Set<string>();
            if (!availableTypes.has(target.agentType)) continue;
            plannedItems.push({
              id: `unsync-${skillName}-${target.projectId}-${target.agentType}`,
              label: `unsync ${skillName} from ${target.projectId}:${target.agentType}`,
              progress: 0,
              status: 'pending',
            });
          }
          continue;
        }

        for (const projectId of uniqueProjects) {
          const availableTypes = availability.get(projectId) ?? new Set<string>();
          if (mode === 'all') {
            if (availableTypes.size > 0) {
              plannedItems.push({
                id: `unsync-${skillName}-${projectId}`,
                label: `unsync ${skillName} from ${projectId}`,
                progress: 0,
                status: 'pending',
              });
            }
            continue;
          }

          for (const agentType of agentTypes) {
            if (!availableTypes.has(agentType)) continue;
            plannedItems.push({
              id: `unsync-${skillName}-${projectId}-${agentType}`,
              label: `unsync ${skillName} from ${projectId}:${agentType}`,
              progress: 0,
              status: 'pending',
            });
          }
        }
      }

      state.setUpdateProgressItems(plannedItems);

      for (const skillName of uniqueSkills) {
        const availability = availabilityBySkill.get(skillName) ?? new Map<string, Set<string>>();

        if (exactTargets.length > 0) {
          for (const target of exactTargets) {
            const availableTypes = availability.get(target.projectId) ?? new Set<string>();
            const label = `${skillName} -> ${target.projectId}:${target.agentType}`;
            if (!availableTypes.has(target.agentType)) {
              results.push(makeResult(label, 'skipped', 'Not synced for this agent type'));
              continue;
            }

            const itemId = `unsync-${skillName}-${target.projectId}-${target.agentType}`;
            state.updateProgressItem(itemId, { status: 'running', progress: 30 });
            try {
              await ctx.commands.unsyncSkillsFromProjects(
                [skillName],
                [`${target.projectId}:${target.agentType}`],
                { mode: 'specific', agentTypes: [target.agentType] }
              );
              results.push(makeResult(label, 'success'));
              state.updateProgressItem(itemId, { status: 'success', progress: 100 });
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : String(e);
              results.push(makeResult(label, 'error', msg));
              state.updateProgressItem(itemId, { status: 'error', progress: 100, error: msg });
            }
          }
          continue;
        }

        for (const projectId of uniqueProjects) {
          const availableTypes = availability.get(projectId) ?? new Set<string>();
          const labelBase = `${skillName} -> ${projectId}`;

          if (mode === 'all') {
            if (availableTypes.size === 0) {
              results.push(makeResult(labelBase, 'skipped', 'Not synced to this project'));
              continue;
            }

            const itemId = `unsync-${skillName}-${projectId}`;
            state.updateProgressItem(itemId, { status: 'running', progress: 30 });
            try {
              await ctx.commands.unsyncSkillsFromProjects([skillName], [projectId], { mode: 'all' });
              results.push(makeResult(labelBase, 'success'));
              state.updateProgressItem(itemId, { status: 'success', progress: 100 });
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : String(e);
              results.push(makeResult(labelBase, 'error', msg));
              state.updateProgressItem(itemId, { status: 'error', progress: 100, error: msg });
            }
            continue;
          }

          if (agentTypes.length === 0) {
            results.push(makeResult(labelBase, 'skipped', 'No agent types selected'));
            continue;
          }

          for (const agentType of agentTypes) {
            const label = `${labelBase}:${agentType}`;
            if (!availableTypes.has(agentType)) {
              results.push(makeResult(label, 'skipped', 'Not synced for this agent type'));
              continue;
            }

            const itemId = `unsync-${skillName}-${projectId}-${agentType}`;
            state.updateProgressItem(itemId, { status: 'running', progress: 30 });
            try {
              await ctx.commands.unsyncSkillsFromProjects([skillName], [projectId], {
                mode: 'specific',
                agentTypes: [agentType],
              });
              results.push(makeResult(label, 'success'));
              state.updateProgressItem(itemId, { status: 'success', progress: 100 });
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : String(e);
              results.push(makeResult(label, 'error', msg));
              state.updateProgressItem(itemId, { status: 'error', progress: 100, error: msg });
            }
          }
        }
      }

      state.setSyncFormResults(results);
      state.setSyncFormStep('results');
      await state.refreshSkills();
      queueProgressClear(store);
      pushOperationToast(store, results, 'unsynced');
    },

    updateSkills: async (skillNames): Promise<UpdateResult[]> => {
      const uniqueSkills = unique(skillNames);
      if (uniqueSkills.length === 0) return [];

      const state = store.getState();
      const resultBySkillName = new Map<string, UpdateResult>();
      const gitBackedSkills: string[] = [];

      for (const skillName of uniqueSkills) {
        const skill = state.skills.find((entry) => entry.name === skillName);
        const sourceType = getSkillSourceType(skillName, store);

        if (!skill) {
          resultBySkillName.set(skillName, {
            skillName,
            sourceType,
            outcome: 'error',
            detail: 'Skill not found',
          });
          continue;
        }

        if (skill.source.type !== 'git') {
          resultBySkillName.set(skillName, {
            skillName,
            sourceType,
            outcome: 'skipped',
            detail: 'Not git-backed',
          });
          continue;
        }

        gitBackedSkills.push(skillName);
      }

      if (gitBackedSkills.length === 0) {
        state.setUpdateProgressItems([]);
        const noGitResults = uniqueSkills.flatMap((skillName) => {
          const result = resultBySkillName.get(skillName);
          return result ? [result] : [];
        });
        pushUpdateToast(store, noGitResults);
        return noGitResults;
      }

      const progressItems: ProgressItem[] = gitBackedSkills.map((skillName) => ({
        id: `update-${skillName}`,
        label: `Updating ${skillName}`,
        progress: 0,
        status: 'pending',
      }));
      state.setUpdateProgressItems(progressItems);

      for (const skillName of gitBackedSkills) {
        const itemId = `update-${skillName}`;
        state.updateProgressItem(itemId, {
          status: 'running',
          progress: 30,
        });

        let updateResult: UpdateResult;
        try {
          const [result] = await ctx.commands.updateSkills([skillName]);
          updateResult = result ?? {
            skillName,
            sourceType: getSkillSourceType(skillName, store),
            outcome: 'error',
            detail: 'No update result returned',
          };
        } catch (error: unknown) {
          updateResult = {
            skillName,
            sourceType: getSkillSourceType(skillName, store),
            outcome: 'error',
            detail: error instanceof Error ? error.message : String(error),
          };
        }

        resultBySkillName.set(skillName, updateResult);
        state.updateProgressItem(itemId, {
          status: updateResult.outcome === 'error' ? 'error' : 'success',
          progress: 100,
          ...(updateResult.outcome === 'updated' ? { label: `${skillName} updated` } : {}),
          ...(updateResult.outcome === 'skipped' ? { label: `${skillName} skipped` } : {}),
          ...(updateResult.detail ? { error: updateResult.detail } : {}),
        });
      }

      const results = uniqueSkills.flatMap((skillName) => {
        const result = resultBySkillName.get(skillName);
        return result ? [result] : [];
      });

      await state.refreshSkills();
      queueProgressClear(store);
      pushUpdateToast(store, results);
      return results;
    },
  };
}

export function createSyncActions(store: StoreApi<AppStore>, ctx: WorkbenchContext): SyncActions {
  return createSyncActionsImpl(store, ctx);
}

export function createSyncActionsSlice(
  ctx: WorkbenchContext
): StateCreator<AppStore, [], [], SyncActions> {
  return (_set, _get, store) => createSyncActionsImpl(store as StoreApi<AppStore>, ctx);
}
