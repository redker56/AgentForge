/**
 * Sync action creators -- sync, unsync, and update operations
 *
 * Also exposes isolated import helpers for use by ImportFormTab
 * (Known Deviation 1: helpers call services directly, no formState).
 */

import type { StoreApi } from 'zustand';
import type { SyncMode } from '../../../types.js';
import type { AppStore } from '../index.js';
import type { ServiceContext } from '../dataSlice.js';
import type { OperationResult, ProgressItem } from '../uiSlice.js';

export interface SyncActions {
  syncSkillsToAgents: (skillNames: string[], agentIds: string[], mode: SyncMode) => Promise<void>;
  syncSkillsToProjects: (skillNames: string[], projectIds: string[], agentTypes: string[], mode: SyncMode) => Promise<void>;
  unsyncFromAgents: (skillNames: string[], agentIds: string[]) => Promise<void>;
  unsyncFromProjects: (skillNames: string[], targetIds: string[]) => Promise<void>;
  updateSkill: (skillName: string) => Promise<void>;
  updateAllSkills: () => Promise<void>;
}

// ============================================================
// Isolated import helpers (Known Deviation 1)
// ============================================================

export async function doImportFromProject(
  ctx: ServiceContext,
  projectId: string,
  skillNames: string[],
): Promise<OperationResult[]> {
  const project = ctx.storage.getProject(projectId);
  if (!project) {
    return [{ target: projectId, success: false, error: 'Project not found' }];
  }
  const discovered = ctx.scanService.scanProject(project.path);
  const results: OperationResult[] = [];
  for (const skillName of skillNames) {
    const found = discovered.find((s) => s.name === skillName);
    if (!found) {
      results.push({ target: skillName, success: false, error: 'Not found in project' });
      continue;
    }
    if (ctx.skillService.exists(skillName)) {
      results.push({ target: skillName, success: false, error: 'Already exists' });
      continue;
    }
    try {
      await ctx.skillService.importFromPath(found.path, skillName, { type: 'project', projectId });
      results.push({ target: skillName, success: true });
    } catch (e: unknown) {
      results.push({ target: skillName, success: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}

export async function doImportFromAgent(
  ctx: ServiceContext,
  agentId: string,
  skillNames: string[],
): Promise<OperationResult[]> {
  const agent = ctx.storage.getAgent(agentId);
  if (!agent) {
    return [{ target: agentId, success: false, error: 'Agent not found' }];
  }
  const results: OperationResult[] = [];
  for (const skillName of skillNames) {
    if (ctx.skillService.exists(skillName)) {
      results.push({ target: skillName, success: false, error: 'Already exists' });
      continue;
    }
    try {
      const srcPath = `${agent.basePath}/${skillName}`;
      await ctx.skillService.importFromPath(srcPath, skillName, {
        type: 'local',
        importedFrom: { agent: agentId, path: srcPath },
      });
      results.push({ target: skillName, success: true });
    } catch (e: unknown) {
      results.push({ target: skillName, success: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}

// ============================================================
// SyncActions factory
// ============================================================

export function createSyncActions(
  store: StoreApi<AppStore>,
  ctx: ServiceContext,
): SyncActions {
  return {
    syncSkillsToAgents: async (skillNames, agentIds, mode) => {
      const s = store.getState();
      s.setSyncFormStep('executing');

      // Build progress items
      const items: ProgressItem[] = skillNames.flatMap((skill) =>
        agentIds.map((agentId) => ({
          id: `sync-${skill}-${agentId}`,
          label: `${skill} -> ${agentId}`,
          progress: 0,
          status: 'pending' as const,
        })),
      );
      s.setUpdateProgressItems(items);

      const results: OperationResult[] = [];
      for (const skillName of skillNames) {
        for (const agentId of agentIds) {
          const agent = ctx.storage.getAgent(agentId);
          const label = `${skillName} -> ${agent ? agent.name : agentId}`;
          const itemId = `sync-${skillName}-${agentId}`;
          s.updateProgressItem(itemId, { status: 'running', progress: 30 });
          try {
            await ctx.syncService.sync(skillName, agent ? [agent] : [], mode);
            results.push({ target: label, success: true });
            s.updateProgressItem(itemId, { status: 'success', progress: 100 });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            results.push({ target: label, success: false, error: msg });
            s.updateProgressItem(itemId, { status: 'error', progress: 100, error: msg });
          }
        }
      }
      s.setSyncFormResults(results);
      s.setSyncFormStep('results');
      await s.refreshSkills();
      // Clear progress after a delay
      setTimeout(() => s.setUpdateProgressItems([]), 2000);
      // Push summary toast
      const failCount1 = results.filter(r => !r.success).length;
      if (failCount1 === 0) {
        s.pushToast(`${results.length} skill(s) synced`, 'success');
      } else {
        s.pushToast(`${failCount1} of ${results.length} failed`, 'error');
      }
    },

    syncSkillsToProjects: async (skillNames, projectIds, agentTypes, mode) => {
      const s = store.getState();
      s.setSyncFormStep('executing');

      // Build progress items
      const items: ProgressItem[] = skillNames.flatMap((skill) =>
        projectIds.map((projectId) => ({
          id: `sync-${skill}-${projectId}`,
          label: `${skill} -> ${projectId}`,
          progress: 0,
          status: 'pending' as const,
        })),
      );
      s.setUpdateProgressItems(items);

      const results: OperationResult[] = [];
      for (const skillName of skillNames) {
        for (const projectId of projectIds) {
          const label = `${skillName} -> ${projectId}`;
          const itemId = `sync-${skillName}-${projectId}`;
          s.updateProgressItem(itemId, { status: 'running', progress: 30 });
          try {
            await ctx.projectSyncService.syncToProject(skillName, projectId, agentTypes, mode);
            results.push({ target: label, success: true });
            s.updateProgressItem(itemId, { status: 'success', progress: 100 });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            results.push({ target: label, success: false, error: msg });
            s.updateProgressItem(itemId, { status: 'error', progress: 100, error: msg });
          }
        }
      }
      s.setSyncFormResults(results);
      s.setSyncFormStep('results');
      await s.refreshSkills();
      // Clear progress after a delay
      setTimeout(() => s.setUpdateProgressItems([]), 2000);
      // Push summary toast
      const failCount2 = results.filter(r => !r.success).length;
      if (failCount2 === 0) {
        s.pushToast(`${results.length} skill(s) synced`, 'success');
      } else {
        s.pushToast(`${failCount2} of ${results.length} failed`, 'error');
      }
    },

    unsyncFromAgents: async (skillNames, agentIds) => {
      const s = store.getState();
      s.setSyncFormStep('executing');

      // Build progress items
      const items: ProgressItem[] = skillNames.flatMap((skill) =>
        agentIds.map((agentId) => ({
          id: `unsync-${skill}-${agentId}`,
          label: `unsync ${skill} from ${agentId}`,
          progress: 0,
          status: 'pending' as const,
        })),
      );
      s.setUpdateProgressItems(items);

      const results: OperationResult[] = [];
      for (const skillName of skillNames) {
        for (const agentId of agentIds) {
          const itemId = `unsync-${skillName}-${agentId}`;
          s.updateProgressItem(itemId, { status: 'running', progress: 30 });
          try {
            await ctx.syncService.unsync(skillName, [agentId]);
            results.push({ target: `${skillName} (unsync from ${agentId})`, success: true });
            s.updateProgressItem(itemId, { status: 'success', progress: 100 });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            results.push({ target: `${skillName} (unsync from ${agentId})`, success: false, error: msg });
            s.updateProgressItem(itemId, { status: 'error', progress: 100, error: msg });
          }
        }
      }
      s.setSyncFormResults(results);
      s.setSyncFormStep('results');
      await s.refreshSkills();
      // Clear progress after a delay
      setTimeout(() => s.setUpdateProgressItems([]), 2000);
      // Push summary toast
      const failCount3 = results.filter(r => !r.success).length;
      if (failCount3 === 0) {
        s.pushToast(`${results.length} item(s) unsynced`, 'success');
      } else {
        s.pushToast(`${failCount3} of ${results.length} failed`, 'error');
      }
    },

    unsyncFromProjects: async (skillNames, targetIds) => {
      const s = store.getState();
      s.setSyncFormStep('executing');

      // Build progress items
      const items: ProgressItem[] = skillNames.flatMap((skill) =>
        targetIds.map((targetId) => ({
          id: `unsync-${skill}-${targetId}`,
          label: `unsync ${skill} from ${targetId}`,
          progress: 0,
          status: 'pending' as const,
        })),
      );
      s.setUpdateProgressItems(items);

      const results: OperationResult[] = [];
      for (const skillName of skillNames) {
        for (const targetId of targetIds) {
          const itemId = `unsync-${skillName}-${targetId}`;
          s.updateProgressItem(itemId, { status: 'running', progress: 30 });
          try {
            await ctx.projectSyncService.unsync(skillName, [targetId]);
            results.push({ target: `${skillName} (unsync from ${targetId})`, success: true });
            s.updateProgressItem(itemId, { status: 'success', progress: 100 });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            results.push({ target: `${skillName} (unsync from ${targetId})`, success: false, error: msg });
            s.updateProgressItem(itemId, { status: 'error', progress: 100, error: msg });
          }
        }
      }
      s.setSyncFormResults(results);
      s.setSyncFormStep('results');
      await s.refreshSkills();
      // Clear progress after a delay
      setTimeout(() => s.setUpdateProgressItems([]), 2000);
      // Push summary toast
      const failCount4 = results.filter(r => !r.success).length;
      if (failCount4 === 0) {
        s.pushToast(`${results.length} item(s) unsynced`, 'success');
      } else {
        s.pushToast(`${failCount4} of ${results.length} failed`, 'error');
      }
    },

    updateSkill: async (skillName: string) => {
      const skill = ctx.storage.getSkill(skillName);
      if (!skill) return;

      const s = store.getState();
      s.setUpdateProgressItems([
        { id: `update-${skillName}`, label: `Updating ${skillName}...`, progress: 0, status: 'running' as const },
      ]);

      try {
        const updated = await ctx.skillService.update(skillName);
        if (!updated) {
          s.updateProgressItem(`update-${skillName}`, { status: 'success', progress: 100, label: `${skillName} (skipped)` });
          await s.refreshSkills();
          setTimeout(() => {
            const cur = store.getState().updateProgressItems;
            s.setUpdateProgressItems(cur.filter((i) => i.id !== `update-${skillName}`));
          }, 2000);
          return;
        }
        try { await ctx.syncService.resync(skillName); } catch { /* ignore */ }
        try { await ctx.projectSyncService.resync(skillName); } catch { /* ignore */ }
        s.updateProgressItem(`update-${skillName}`, { status: 'success', progress: 100, label: `${skillName} updated` });
        await s.refreshSkills();
        setTimeout(() => {
          const cur = store.getState().updateProgressItems;
          s.setUpdateProgressItems(cur.filter((i) => i.id !== `update-${skillName}`));
        }, 2000);
        s.pushToast(`Skill '${skillName}' updated`, 'success');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        s.updateProgressItem(`update-${skillName}`, { status: 'error', progress: 100, error: msg });
        await s.refreshSkills();
        setTimeout(() => {
          const cur = store.getState().updateProgressItems;
          s.setUpdateProgressItems(cur.filter((i) => i.id !== `update-${skillName}`));
        }, 2000);
        s.pushToast(`Update failed: ${skillName}`, 'error');
      }
    },

    updateAllSkills: async () => {
      const allSkills = ctx.skillService.list();
      const gitSkills = allSkills.filter((sk) => sk.source && (sk.source as { type: string }).type === 'git');
      if (gitSkills.length === 0) return;

      const s = store.getState();
      const items: ProgressItem[] = gitSkills.map((sk) => ({
        id: `update-${sk.name}`,
        label: `Updating ${sk.name}`,
        progress: 0,
        status: 'pending' as const,
      }));
      s.setUpdateProgressItems(items);

      for (const skill of gitSkills) {
        s.updateProgressItem(`update-${skill.name}`, { status: 'running', progress: 30 });
        try {
          const updated = await ctx.skillService.update(skill.name);
          if (!updated) {
            s.updateProgressItem(`update-${skill.name}`, { status: 'success', progress: 100, label: `${skill.name} (skipped)` });
            continue;
          }
          try { await ctx.syncService.resync(skill.name); } catch { /* ignore */ }
          try { await ctx.projectSyncService.resync(skill.name); } catch { /* ignore */ }
          s.updateProgressItem(`update-${skill.name}`, { status: 'success', progress: 100, label: `${skill.name} updated` });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          s.updateProgressItem(`update-${skill.name}`, { status: 'error', progress: 100, error: msg });
        }
      }
      await s.refreshSkills();
    },
  };
}
