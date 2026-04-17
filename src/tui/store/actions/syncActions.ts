/**
 * Sync action creators -- sync, unsync, and update operations
 *
 * Also exposes isolated import helpers for use by ImportFormTab
 * (Known Deviation 1: helpers call services directly, no formState).
 */

import type { StoreApi } from 'zustand';

import type { SyncMode } from '../../../types.js';
import type { ServiceContext } from '../dataSlice.js';
import type { AppStore } from '../index.js';
import type { OperationResult, ProgressItem, UpdateResult } from '../uiSlice.js';

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
  const successCount = results.filter((r) => (r.outcome ?? (r.success ? 'success' : 'error')) === 'success').length;
  const skippedCount = results.filter((r) => r.outcome === 'skipped').length;
  const errorCount = results.filter((r) => (r.outcome ?? (r.success ? 'success' : 'error')) === 'error').length;

  if (errorCount > 0) {
    const extra = skippedCount > 0 ? `, ${skippedCount} skipped` : '';
    store.getState().pushToast(`${errorCount} failed, ${successCount} ${successLabel}${extra}`, 'error');
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

function getProjectUnsyncAvailability(
  ctx: ServiceContext,
  skillName: string
): Promise<Map<string, Set<string>>> {
  return ctx.scanService.getSkillProjectDistributionWithStatus(skillName).then((distribution) => {
    const availability = new Map<string, Set<string>>();
    const recorded = ctx.storage.getSkill(skillName)?.syncedProjects || [];

    for (const record of recorded) {
      if (!availability.has(record.projectId)) {
        availability.set(record.projectId, new Set());
      }
      availability.get(record.projectId)?.add(record.agentType);
    }

    for (const project of distribution) {
      if (!availability.has(project.projectId)) {
        availability.set(project.projectId, new Set());
      }
      const types = availability.get(project.projectId);
      for (const agent of project.agents) {
        types?.add(agent.id);
      }
    }

    return availability;
  });
}

function getSkillSourceType(skillName: string, ctx: ServiceContext): UpdateResult['sourceType'] {
  const skill = ctx.storage.getSkill(skillName);
  if (!skill) return 'unknown';
  if (skill.source.type === 'git') return 'git';
  if (skill.source.type === 'project') return 'project';
  return 'local';
}

// ============================================================
// Isolated import helpers (Known Deviation 1)
// ============================================================

export async function doImportFromProject(
  ctx: ServiceContext,
  projectId: string,
  skillNames: string[]
): Promise<OperationResult[]> {
  const project = ctx.storage.getProject(projectId);
  if (!project) {
    return [{ target: projectId, success: false, error: 'Project not found', outcome: 'error' }];
  }
  const discovered = ctx.scanService.scanProject(project.path);
  const results: OperationResult[] = [];
  for (const skillName of skillNames) {
    const found = discovered.find((s) => s.name === skillName);
    if (!found) {
      results.push({ target: skillName, success: false, error: 'Not found in project', outcome: 'error' });
      continue;
    }
    if (ctx.skillService.exists(skillName)) {
      results.push({ target: skillName, success: false, error: 'Already exists', outcome: 'error' });
      continue;
    }
    try {
      await ctx.skillService.importFromPath(found.path, skillName, { type: 'project', projectId });
      results.push({ target: skillName, success: true, outcome: 'success' });
    } catch (e: unknown) {
      results.push({
        target: skillName,
        success: false,
        error: e instanceof Error ? e.message : String(e),
        outcome: 'error',
      });
    }
  }
  return results;
}

export async function doImportFromAgent(
  ctx: ServiceContext,
  agentId: string,
  skillNames: string[]
): Promise<OperationResult[]> {
  const agent = ctx.storage.getAgent(agentId);
  if (!agent) {
    return [{ target: agentId, success: false, error: 'Agent not found', outcome: 'error' }];
  }
  const results: OperationResult[] = [];
  for (const skillName of skillNames) {
    if (ctx.skillService.exists(skillName)) {
      results.push({ target: skillName, success: false, error: 'Already exists', outcome: 'error' });
      continue;
    }
    try {
      const srcPath = `${agent.basePath}/${skillName}`;
      await ctx.skillService.importFromPath(srcPath, skillName, {
        type: 'local',
        importedFrom: { agent: agentId, path: srcPath },
      });
      results.push({ target: skillName, success: true, outcome: 'success' });
    } catch (e: unknown) {
      results.push({
        target: skillName,
        success: false,
        error: e instanceof Error ? e.message : String(e),
        outcome: 'error',
      });
    }
  }
  return results;
}

// ============================================================
// SyncActions factory
// ============================================================

export function createSyncActions(store: StoreApi<AppStore>, ctx: ServiceContext): SyncActions {
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
          const agent = ctx.storage.getAgent(agentId);
          const label = `${skillName} -> ${agent ? agent.name : agentId}`;
          const itemId = `sync-${skillName}-${agentId}`;
          state.updateProgressItem(itemId, { status: 'running', progress: 30 });
          try {
            await ctx.syncService.sync(skillName, agent ? [agent] : [], mode);
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
            await ctx.projectSyncService.syncToProject(skillName, projectId, unique(agentTypes), mode);
            results.push(makeResult(`${skillName} -> ${projectId}`, 'success'));
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
        const syncedAgents = new Set((ctx.storage.getSkill(skillName)?.syncedTo || []).map((r) => r.agentId));
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
        const syncedAgents = new Set((ctx.storage.getSkill(skillName)?.syncedTo || []).map((r) => r.agentId));
        for (const agentId of uniqueAgents) {
          const label = `${skillName} -> ${agentId}`;
          if (!syncedAgents.has(agentId)) {
            results.push(makeResult(label, 'skipped', 'Not synced to this agent'));
            continue;
          }

          const itemId = `unsync-${skillName}-${agentId}`;
          state.updateProgressItem(itemId, { status: 'running', progress: 30 });
          try {
            await ctx.syncService.unsync(skillName, [agentId]);
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
      state.setSyncFormStep('executing');

      const availabilityEntries = await Promise.all(
        uniqueSkills.map(async (skillName) => [skillName, await getProjectUnsyncAvailability(ctx, skillName)] as const)
      );
      const availabilityBySkill = new Map(availabilityEntries);

      const plannedItems: ProgressItem[] = [];
      const results: OperationResult[] = [];

      for (const skillName of uniqueSkills) {
        const availability = availabilityBySkill.get(skillName) ?? new Map<string, Set<string>>();
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
              await ctx.projectSyncService.unsyncFromProject(skillName, projectId);
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
              await ctx.projectSyncService.unsync(skillName, [`${projectId}:${agentType}`]);
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
      const results: UpdateResult[] = [];
      const gitBackedSkills: string[] = [];

      for (const skillName of uniqueSkills) {
        const skill = ctx.storage.getSkill(skillName);
        const sourceType = getSkillSourceType(skillName, ctx);

        if (!skill) {
          results.push({
            skillName,
            sourceType,
            outcome: 'error',
            detail: 'Skill not found',
          });
          continue;
        }

        if (skill.source.type !== 'git') {
          results.push({
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
        pushUpdateToast(store, results);
        return results;
      }

      const progressItems: ProgressItem[] = gitBackedSkills.map((skillName) => ({
        id: `update-${skillName}`,
        label: `Updating ${skillName}`,
        progress: 0,
        status: 'pending',
      }));
      state.setUpdateProgressItems(progressItems);

      for (const skillName of gitBackedSkills) {
        state.updateProgressItem(`update-${skillName}`, { status: 'running', progress: 30 });
        try {
          const updated = await ctx.skillService.update(skillName);
          if (!updated) {
            results.push({
              skillName,
              sourceType: 'git',
              outcome: 'skipped',
              detail: 'Repository could not be updated',
            });
            state.updateProgressItem(`update-${skillName}`, {
              status: 'success',
              progress: 100,
              label: `${skillName} skipped`,
            });
            continue;
          }

          try {
            await ctx.syncService.resync(skillName);
          } catch {
            // Keep update success even if background resync fails.
          }
          try {
            await ctx.projectSyncService.resync(skillName);
          } catch {
            // Keep update success even if background resync fails.
          }

          results.push({
            skillName,
            sourceType: 'git',
            outcome: 'updated',
          });
          state.updateProgressItem(`update-${skillName}`, {
            status: 'success',
            progress: 100,
            label: `${skillName} updated`,
          });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          results.push({
            skillName,
            sourceType: 'git',
            outcome: 'error',
            detail: msg,
          });
          state.updateProgressItem(`update-${skillName}`, {
            status: 'error',
            progress: 100,
            error: msg,
          });
        }
      }

      await state.refreshSkills();
      queueProgressClear(store);
      pushUpdateToast(store, results);
      return results;
    },
  };
}
