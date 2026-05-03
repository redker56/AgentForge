/**
 * Skill action creators -- add and remove skill operations
 */

import type { StateCreator, StoreApi } from 'zustand';

import type { SkillCategoryUpdateMode } from '../../../app/skill-service.js';
import { getTuiText } from '../../i18n.js';
import type { AppStore } from '../index.js';
import type { ConflictEntry } from '../uiSlice.js';
import type { WorkbenchContext } from '../workbenchContext.js';

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

function createSkillActionsImpl(
  set: StoreApi<AppStore>['setState'],
  get: StoreApi<AppStore>['getState'],
  ctx: WorkbenchContext
): SkillActions {
  function setupConflictDetection(skillName: string): void {
    const conflicts = ctx.commands.detectConflicts(skillName);
    if (conflicts.length === 0) return;

    const entries: ConflictEntry[] = conflicts.map((conflict) => ({
      agentId: conflict.agentId,
      agentName: conflict.agentName,
      sameContent: conflict.sameContent,
      resolution: conflict.sameContent ? 'link' : 'pending',
    }));

    get().setConflictState({
      skillName,
      conflicts: entries,
      onComplete: () => {
        const conflictState = get().shellState.conflictState;
        if (!conflictState) return;

        const resolutions = new Map<string, 'link' | 'skip' | 'cancel'>();
        for (const entry of conflictState.conflicts) {
          resolutions.set(
            entry.agentId,
            entry.resolution === 'pending' ? 'skip' : entry.resolution
          );
        }

        ctx.commands.resolveConflicts(skillName, resolutions);
        void get().refreshSkills();
      },
    });
  }

  return {
    addSkillFromUrl: async (url, name): Promise<void> => {
      try {
        const text = getTuiText(get().shellState.locale);
        if (name) {
          const skillName = await ctx.commands.installSkillFromUrl(url, name);
          setupConflictDetection(skillName);
          await get().refreshSkills();
          get().pushToast(text.mutations.skillInstalled(skillName), 'success');
          return;
        }

        if (url.includes('/tree/')) {
          const skillName = await ctx.commands.installSkillFromUrl(url);
          setupConflictDetection(skillName);
          await get().refreshSkills();
          get().pushToast(text.mutations.skillInstalled(skillName), 'success');
          return;
        }

        const discovered = await ctx.commands.discoverSkillsInRepo(url);
        if (discovered.skills.length === 0) {
          await ctx.commands.cleanupDiscoveredRepo(discovered.tempRepoPath);
          throw new Error(text.addForm.noSkillsFound);
        }

        if (discovered.skills.length === 1) {
          const [skillName] = await ctx.commands.installSkillsFromDiscovery(
            url,
            discovered.skills,
            discovered.tempRepoPath
          );
          setupConflictDetection(skillName);
          await get().refreshSkills();
          get().pushToast(text.mutations.skillInstalled(skillName), 'success');
          return;
        }

        get().setFormState({
          formType: 'addSkill',
          data: {
            url,
            tempRepoPath: discovered.tempRepoPath,
            discoveredSkills: JSON.stringify(discovered.skills),
            phase: 'discover',
          },
        });
      } catch (error: unknown) {
        get().setFormState({
          formType: 'addSkill',
          data: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    },

    addSkillFromDiscovery: async (url, selectedSkills, tempRepoPath): Promise<void> => {
      try {
        const installedNames = await ctx.commands.installSkillsFromDiscovery(
          url,
          selectedSkills,
          tempRepoPath
        );
        const lastInstalledName = installedNames.at(-1);
        if (lastInstalledName) {
          setupConflictDetection(lastInstalledName);
        }
        get().setFormState(null);
        await get().refreshSkills();
      } catch (error: unknown) {
        get().setFormState({
          formType: 'addSkill',
          data: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    },

    categorizeSkills: async (skillNames, mode, categories): Promise<CategoryActionResult[]> => {
      const results = await ctx.commands.updateCategories(skillNames, mode, categories);

      set((state) => {
        const updatedDetails = { ...state.skillDetails };
        for (const result of results) {
          const detail = updatedDetails[result.skillName];
          if (result.success && detail) {
            updatedDetails[result.skillName] = {
              ...detail,
              categories: result.categories,
            };
          }
        }

        return {
          skillDetails: updatedDetails,
        };
      });

      await get().refreshSkills();
      return results;
    },

    removeSkill: async (skillName): Promise<void> => {
      await ctx.commands.removeSkill(skillName);
      await get().refreshSkills();
    },

    restoreSkill: (snapshot): void => {
      const name = snapshot.name as string;
      if (!name) return;
      ctx.commands.restoreSkill(snapshot);
      void get().refreshSkills();
    },
  };
}

export function createSkillActions(store: StoreApi<AppStore>, ctx: WorkbenchContext): SkillActions {
  return createSkillActionsImpl(store.setState, store.getState, ctx);
}

export function createSkillActionsSlice(
  ctx: WorkbenchContext
): StateCreator<AppStore, [], [], SkillActions> {
  return (set, get) => createSkillActionsImpl(set, get, ctx);
}
