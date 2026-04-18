/**
 * Data State Slice
 */

import type { StateCreator } from 'zustand';

import type {
  AgentSummaryData,
  AgentWorkbenchData,
  ProjectSummaryData,
  ProjectWorkbenchData,
  SkillDetailData,
} from '../../app/workbench-types.js';
import {
  ALL_SKILL_CATEGORY_FILTER,
  getSkillCategoryCounts,
  type SkillCategoryFilter,
} from '../../types.js';

import type { WorkbenchContext } from './workbenchContext.js';

import type { SkillListItem, StoreState } from './index.js';

export interface DataSlice {
  skills: SkillListItem[];
  agents: import('../../types.js').Agent[];
  projects: import('../../types.js').ProjectConfig[];
  skillDetails: Record<string, SkillDetailData | undefined>;
  loading: { skills: boolean; agents: boolean; projects: boolean };
  error: string | null;
  agentDetails: Record<string, AgentWorkbenchData | undefined>;
  projectDetails: Record<string, ProjectWorkbenchData | undefined>;
  agentSummaries: Record<string, AgentSummaryData | undefined>;
  projectSummaries: Record<string, ProjectSummaryData | undefined>;
  loadAllData: () => Promise<void>;
  loadSkillDetail: (name: string) => Promise<void>;
  refreshSkills: () => Promise<void>;
  loadAgentDetail: (agentId: string) => Promise<void>;
  loadProjectDetail: (projectId: string) => Promise<void>;
  refreshAgents: () => Promise<void>;
  refreshProjects: () => Promise<void>;
}

function resolveSkillCategoryFilter(
  activeFilter: SkillCategoryFilter,
  skills: Array<{ categories: string[] }>
): SkillCategoryFilter {
  if (
    activeFilter === ALL_SKILL_CATEGORY_FILTER ||
    getSkillCategoryCounts(skills).some((entry) => entry.key === activeFilter)
  ) {
    return activeFilter;
  }

  return ALL_SKILL_CATEGORY_FILTER;
}

export function createDataSlice(
  ctx: WorkbenchContext
): StateCreator<StoreState, [], [], DataSlice> {
  const reloadOverview = async (
    set: Parameters<StateCreator<StoreState, [], [], DataSlice>>[0],
    get: Parameters<StateCreator<StoreState, [], [], DataSlice>>[1],
    loadingPatch?: Partial<{ skills: boolean; agents: boolean; projects: boolean }>
  ): Promise<void> => {
    const state = get();
    set({
      loading: {
        skills: loadingPatch?.skills ?? state.loading.skills,
        agents: loadingPatch?.agents ?? state.loading.agents,
        projects: loadingPatch?.projects ?? state.loading.projects,
      },
      error: null,
    });

    try {
      const overview = await ctx.queries.loadLibraryOverview();
      set((current) => ({
        skills: overview.skills.map((skill) => ({ ...skill })),
        agents: overview.agents,
        projects: overview.projects,
        agentSummaries: overview.agentSummaries,
        projectSummaries: overview.projectSummaries,
        loading: { skills: false, agents: false, projects: false },
        error: null,
        skillsBrowserState: {
          ...current.skillsBrowserState,
          activeCategoryFilter: resolveSkillCategoryFilter(
            current.skillsBrowserState.activeCategoryFilter,
            overview.skills
          ),
        },
      }));
    } catch (error: unknown) {
      set({
        error: error instanceof Error ? error.message : String(error),
        loading: { skills: false, agents: false, projects: false },
      });
    }
  };

  return (set, get) => ({
    skills: [],
    agents: [],
    projects: [],
    skillDetails: {},
    loading: { skills: false, agents: false, projects: false },
    error: null,
    agentDetails: {},
    projectDetails: {},
    agentSummaries: {},
    projectSummaries: {},

    loadAllData: async (): Promise<void> => {
      await reloadOverview(set, get, { skills: true, agents: true, projects: true });
    },

    loadSkillDetail: async (name): Promise<void> => {
      const detail = await ctx.queries.loadSkillDetail(name);
      if (!detail) return;

      set((state) => ({
        skillDetails: {
          ...state.skillDetails,
          [name]: detail,
        },
      }));
    },

    refreshSkills: async (): Promise<void> => {
      await reloadOverview(set, get, { skills: true });
    },

    loadAgentDetail: async (agentId): Promise<void> => {
      const detail = await ctx.queries.loadAgentWorkbench(agentId);
      if (!detail) return;

      set((state) => ({
        agentDetails: {
          ...state.agentDetails,
          [agentId]: detail,
        },
      }));
    },

    loadProjectDetail: async (projectId): Promise<void> => {
      const detail = await ctx.queries.loadProjectWorkbench(projectId);
      if (!detail) return;

      set((state) => ({
        projectDetails: {
          ...state.projectDetails,
          [projectId]: detail,
        },
      }));
    },

    refreshAgents: async (): Promise<void> => {
      await reloadOverview(set, get, { agents: true });
      set({ agentDetails: {} });
    },

    refreshProjects: async (): Promise<void> => {
      await reloadOverview(set, get, { projects: true });
      set({ projectDetails: {} });
    },
  });
}
