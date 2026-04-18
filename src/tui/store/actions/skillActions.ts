/**
 * Skill action creators -- add and remove skill operations
 */

import type { StoreApi } from 'zustand';

import type { SkillCategoryUpdateMode } from '../../../app/skill-service.js';
import type { SkillMeta } from '../../../types.js';
import type { ServiceContext } from '../dataSlice.js';
import type { AppStore } from '../index.js';
import type { ConflictEntry } from '../uiSlice.js';

export interface CategoryActionResult {
  skillName: string;
  success: boolean;
  categories: string[];
  error?: string;
}

export interface SkillActions {
  addSkillFromUrl: (url: string, name?: string) => Promise<void>;
  addSkillFromDiscovery: (
    url: string,
    selectedSkills: Array<{ name: string; subPath: string }>,
    tempRepoPath: string
  ) => Promise<void>;
  categorizeSkills: (
    skillNames: string[],
    mode: SkillCategoryUpdateMode,
    categories: string[]
  ) => Promise<CategoryActionResult[]>;
  removeSkill: (skillName: string) => Promise<void>;
  restoreSkill: (snapshot: Record<string, unknown>) => void;
}

export function createSkillActions(store: StoreApi<AppStore>, ctx: ServiceContext): SkillActions {
  /**
   * Post-install conflict detection and resolution setup
   */
  function setupConflictDetection(skillName: string): void {
    const conflicts = ctx.syncCheck.detectConflicts(skillName);

    if (conflicts.length === 0) return;

    const entries: ConflictEntry[] = conflicts.map((c) => ({
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
          resolutions.set(
            entry.agentId,
            entry.resolution === 'pending' ? 'skip' : entry.resolution
          );
        }

        const linkedAgentIds = ctx.syncCheck.resolveConflicts(skillName, resolutions);

        // Merge linked agents into existing sync records
        const skill = ctx.storage.getSkill(skillName);
        if (skill) {
          const merged = new Map<string, (typeof skill.syncedTo)[0]>();
          for (const record of skill.syncedTo) {
            merged.set(record.agentId, record);
          }
          for (const agentId of linkedAgentIds) {
            merged.set(agentId, { agentId, mode: 'copy' as const });
          }
          ctx.storage.updateSkillSync(skillName, Array.from(merged.values()));
        }

        void state.refreshSkills();
      },
    });
  }

  return {
    addSkillFromUrl: async (url, name): Promise<void> => {
      try {
        let skillName: string;

        if (name) {
          skillName = await ctx.skillService.install(url, name);
        } else {
          // Parse URL for /tree/ sub-path pattern
          let repoUrl = url;
          let subPath = '';
          if (url.includes('/tree/')) {
            const match = url.match(/(https?:\/\/[^/]+\/[^/]+\/[^/]+)\/tree\/[^/]+\/(.+)/);
            if (match) {
              repoUrl = match[1];
              subPath = match[2];
            }
          }

          if (subPath) {
            skillName = await ctx.skillService.install(repoUrl, undefined, subPath);
          } else {
            // Clone to temp, discover skills
            const tempPath = await ctx.skillService.cloneRepoToTemp(url);
            const discovered = ctx.skillService.discoverSkillsInDirectory(tempPath, url);

            if (discovered.length === 0) {
              await ctx.skillService.removeTempRepo(tempPath);
              throw new Error('No skills found in repository');
            }

            if (discovered.length === 1) {
              skillName = await ctx.skillService.installFromDirectory(
                url,
                discovered[0].name,
                discovered[0].subPath ? `${tempPath}/${discovered[0].subPath}` : tempPath,
                discovered[0].subPath
              );
              await ctx.skillService.removeTempRepo(tempPath);
            } else {
              // Multiple skills -- store discovery data for form selection
              store.getState().setFormState({
                formType: 'addSkill',
                data: {
                  url,
                  tempRepoPath: tempPath,
                  discoveredSkills: JSON.stringify(discovered),
                  phase: 'discover',
                },
              });
              return;
            }
          }
        }

        // Success -- run conflict detection
        setupConflictDetection(skillName);
        await store.getState().refreshSkills();
        store.getState().pushToast(`Skill '${skillName}' installed`, 'success');
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        store.getState().setFormState({
          formType: 'addSkill',
          data: { error: message },
        });
      }
    },

    addSkillFromDiscovery: async (url, selectedSkills, tempRepoPath): Promise<void> => {
      try {
        let lastInstalledName: string | undefined;

        for (const skill of selectedSkills) {
          const sourceDir = skill.subPath ? `${tempRepoPath}/${skill.subPath}` : tempRepoPath;
          await ctx.skillService.installFromDirectory(url, skill.name, sourceDir, skill.subPath);
          lastInstalledName = skill.name;
        }

        await ctx.skillService.removeTempRepo(tempRepoPath);

        // Run conflict detection for the last installed skill
        // (or could run for each, but we show one conflict panel at a time)
        if (lastInstalledName) {
          setupConflictDetection(lastInstalledName);
        }

        store.getState().setFormState(null);
        await store.getState().refreshSkills();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        store.getState().setFormState({
          formType: 'addSkill',
          data: { error: message },
        });
      }
    },

    categorizeSkills: (skillNames, mode, categories): Promise<CategoryActionResult[]> => {
      const results: CategoryActionResult[] = [];

      for (const skillName of skillNames) {
        try {
          const updated = ctx.skillService.updateCategories(skillName, categories, mode);
          results.push({
            skillName,
            success: true,
            categories: updated.categories,
          });
        } catch (e: unknown) {
          results.push({
            skillName,
            success: false,
            categories: [],
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }

      store.setState((state) => {
        const updatedDetails = { ...state.skillDetails };
        for (const result of results) {
          const currentDetail = updatedDetails[result.skillName];
          if (result.success && currentDetail) {
            updatedDetails[result.skillName] = {
              ...currentDetail,
              categories: result.categories,
            };
          }
        }

        return {
          skillDetails: updatedDetails,
        };
      });

      store.getState().refreshSkills();
      return Promise.resolve(results);
    },

    removeSkill: async (skillName): Promise<void> => {
      const skill = ctx.storage.getSkill(skillName);
      if (!skill) return;

      // Unsync from all agents
      const agentIds = skill.syncedTo.map((r) => r.agentId);
      if (agentIds.length > 0) {
        await ctx.syncService.unsync(skillName, agentIds);
      }

      // Unsync from all projects
      const projectTargetIds = (skill.syncedProjects || []).map(
        (r) => `${r.projectId}:${r.agentType}`
      );
      if (projectTargetIds.length > 0) {
        await ctx.projectSyncService.unsync(skillName, projectTargetIds);
      }

      // Delete the skill (files + registry)
      await ctx.skillService.delete(skillName);
      await store.getState().refreshSkills();
    },

    restoreSkill: (snapshot): void => {
      const name = snapshot.name as string;
      if (!name) return;
      const createdAt = (snapshot.createdAt ?? new Date().toISOString()) as string;
      // Write the full SkillMeta back to registry preserving original fields
      ctx.storage.saveSkillMeta(name, {
        name,
        source: (snapshot.source ?? { type: 'local' }) as SkillMeta['source'],
        createdAt,
        updatedAt: (snapshot.updatedAt ?? createdAt) as string,
        categories: (snapshot.categories ?? []) as SkillMeta['categories'],
        syncedTo: (snapshot.syncedTo ?? []) as SkillMeta['syncedTo'],
        syncedProjects: (snapshot.syncedProjects ?? undefined) as SkillMeta['syncedProjects'],
      });
      void store.getState().refreshSkills();
    },
  };
}
