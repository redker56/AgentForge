/**
 * Import action creators -- import from project and import from agent
 */

import type { StoreApi } from 'zustand';
import type { ServiceContext } from '../dataSlice.js';
import type { AppStore } from '../index.js';
import type { ConflictEntry } from '../uiSlice.js';
import { doImportFromProject, doImportFromAgent } from './syncActions.js';

export interface ImportActions {
  importFromProject: (projectId: string, skillNames: string[]) => Promise<void>;
  importFromAgent: (agentId: string, skillNames: string[]) => Promise<void>;
  scanProjectSkills: (projectId: string) => Array<{ name: string; path: string; alreadyExists: boolean }>;
  scanAgentSkills: (agentId: string) => Array<{ name: string; path: string; alreadyExists: boolean; hasSkillMd: boolean }>;
}

export function createImportActions(store: StoreApi<AppStore>, ctx: ServiceContext): ImportActions {
  /**
   * Post-import conflict detection
   */
  function setupConflictDetection(skillName: string): void {
    const conflicts = ctx.syncCheck.detectConflicts(skillName);
    if (conflicts.length === 0) return;

    const entries: ConflictEntry[] = conflicts.map(c => ({
      agentId: c.agentId,
      agentName: c.agentName,
      sameContent: c.sameContent,
      resolution: c.sameContent ? 'link' : 'pending',
    }));

    store.getState().setConflictState({
      skillName,
      conflicts: entries,
      onComplete: () => {
        const state = store.getState();
        const conflictInfo = state.conflictState;
        if (!conflictInfo) return;

        const resolutions = new Map<string, 'link' | 'skip' | 'cancel'>();
        for (const entry of conflictInfo.conflicts) {
          resolutions.set(entry.agentId, entry.resolution === 'pending' ? 'skip' : entry.resolution);
        }

        const linkedAgentIds = ctx.syncCheck.resolveConflicts(skillName, resolutions);

        const skill = ctx.storage.getSkill(skillName);
        if (skill) {
          const merged = new Map<string, typeof skill.syncedTo[0]>();
          for (const record of skill.syncedTo) {
            merged.set(record.agentId, record);
          }
          for (const agentId of linkedAgentIds) {
            merged.set(agentId, { agentId, mode: 'copy' as const });
          }
          ctx.storage.updateSkillSync(skillName, Array.from(merged.values()));
        }

        state.refreshSkills();
      },
    });
  }

  return {
    scanProjectSkills: (projectId) => {
      const project = ctx.storage.getProject(projectId);
      if (!project) return [];

      const discovered = ctx.scanService.scanProject(project.path);
      return discovered.map(skill => ({
        name: skill.name,
        path: skill.path,
        alreadyExists: ctx.skillService.exists(skill.name),
      }));
    },

    scanAgentSkills: (agentId) => {
      const agent = ctx.storage.getAgent(agentId);
      if (!agent) return [];

      const subdirs = ctx.fileOps.listSubdirectories(agent.basePath);
      return subdirs.map(name => {
        const skillPath = `${agent.basePath}/${name}`;
        const hasSkillMd = ctx.fileOps.fileExists(`${skillPath}/SKILL.md`)
          || ctx.fileOps.fileExists(`${skillPath}/skill.md`);
        return {
          name,
          path: skillPath,
          alreadyExists: ctx.skillService.exists(name),
          hasSkillMd,
        };
      }).filter(s => s.hasSkillMd);
    },

    importFromProject: async (projectId, skillNames) => {
      const results = await doImportFromProject(ctx, projectId, skillNames);

      // Handle conflict detection for any successfully imported skill
      const imported = results.filter(r => r.success).map(r => r.target);
      if (imported.length > 0) {
        setupConflictDetection(imported[imported.length - 1]);
      }

      store.getState().setFormState(null);
      await store.getState().refreshSkills();
    },

    importFromAgent: async (agentId, skillNames) => {
      const results = await doImportFromAgent(ctx, agentId, skillNames);

      // Handle conflict detection for any successfully imported skill
      const imported = results.filter(r => r.success).map(r => r.target);
      if (imported.length > 0) {
        setupConflictDetection(imported[imported.length - 1]);
      }

      store.getState().setFormState(null);
      await store.getState().refreshSkills();
    },
  };
}
