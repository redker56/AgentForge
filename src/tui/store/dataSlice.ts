/**
 * Data State Slice
 */

import path from 'path';

import fs from 'fs-extra';
import type { StateCreator } from 'zustand';

import { ReconcileService } from '../../app/reconcile-service.js';
import type { SkillCategoryUpdateMode } from '../../app/skill-service.js';
import {
  ALL_SKILL_CATEGORY_FILTER,
  getSkillCategoryCounts,
  getAgentProjectSkillsDir,
  type SkillMeta,
  type SyncRecord,
  type ProjectSyncRecord,
  type SkillCategoryFilter,
  type SkillSource,
  type SyncMode,
  type Agent,
  type ProjectConfig,
} from '../../types.js';
import type { ContextSkillRow, ContextSkillSection } from '../contextTypes.js';

import type { SkillListItem, StoreState } from './index.js';

export interface SkillDetailData {
  name: string;
  path: string;
  source: SkillSource;
  createdAt: string;
  updatedAt?: string;
  categories: string[];
  syncedTo: SyncRecord[];
  syncedProjects?: ProjectSyncRecord[];
  syncStatus: Array<{
    agentId: string;
    agentName: string;
    mode: SyncMode;
    // Sprint 1: only 'synced' and 'missing' are computed.
    // 'needs-re-sync' is deferred to a later sprint.
    status: 'synced' | 'missing';
  }>;
  projectDistribution: Array<{
    projectId: string;
    agents: Array<{ id: string; name: string; isDifferentVersion: boolean }>;
  }>;
  skillMdPreview: string | null;
}

// NEW: Agent detail data types
export interface AgentDetailData {
  agentId: string;
  agentName: string;
  basePath: string;
  userLevelSkills: ContextSkillRow[];
  projectLevelSkills: Array<{
    projectId: string;
    skills: ContextSkillRow[];
  }>;
  sections: ContextSkillSection[];
}

// NEW: Project detail data types
export interface ProjectDetailData {
  projectId: string;
  projectPath: string;
  skillsByAgent: Array<{
    agentId: string;
    agentName: string;
    skills: ContextSkillRow[];
  }>;
  sections: ContextSkillSection[];
}

export interface AgentSummaryData {
  userLevelSkillCount: number;
  projectLevelSkillCount: number;
}

export interface ProjectSummaryData {
  skillCount: number;
}

export interface ServiceContext {
  skillService: {
    list(): Array<SkillMeta & { exists: boolean }>;
    get(name: string): {
      name: string;
      path: string;
      source: SkillSource;
      createdAt: string;
      updatedAt?: string;
      categories: string[];
      syncedTo: SyncRecord[];
      syncedProjects?: ProjectSyncRecord[];
    } | null;
    exists(name: string): boolean;
    install(url: string, name?: string, subPath?: string): Promise<string>;
    installFromDirectory(
      url: string,
      name: string,
      sourceDir: string,
      subPath?: string
    ): Promise<string>;
    importFromPath(sourcePath: string, name: string, source: SkillSource): Promise<void>;
    delete(name: string): Promise<void>;
    cloneRepoToTemp(repoUrl: string): Promise<string>;
    discoverSkillsInDirectory(
      repoDir: string,
      repoUrl: string
    ): Array<{ name: string; subPath: string }>;
    removeTempRepo(tempDir: string): Promise<void>;
    update(name: string): Promise<boolean>; // Refresh a git-backed skill from source. Returns false if not git-backed.
    updateCategories(name: string, categories: string[], mode?: SkillCategoryUpdateMode): SkillMeta;
  };
  scanService: {
    getSkillProjectDistributionWithStatus(skillName: string): Promise<
      Array<{
        projectId: string;
        agents: Array<{ id: string; name: string; isDifferentVersion: boolean }>;
      }>
    >;
    getProjectSkillsWithStatus(projectId: string): Promise<
      Array<{
        name: string;
        path: string;
        agentId: string;
        agentName: string;
        isImported: boolean;
        isDifferentVersion: boolean;
        subPath: string;
      }>
    >;
    getAgentProjectSkills(agentId: string): Promise<
      Array<{
        name: string;
        path: string;
        agentId: string;
        agentName: string;
        isImported: boolean;
        isDifferentVersion: boolean;
        subPath: string;
        projectId?: string;
      }>
    >;
    scanProject(projectPath: string): Array<{
      name: string;
      path: string;
      agentId: string;
      agentName: string;
      hasSkillMd: boolean;
      subPath: string;
    }>;
  };
  storage: {
    listAgents(): Agent[];
    listProjects(): ProjectConfig[];
    listAllDefinedAgents(): Agent[];
    getAgent(id: string): Agent | undefined;
    getProject(id: string): ProjectConfig | undefined;
    getSkill(name: string): SkillMeta | undefined;
    listSkills(): SkillMeta[];
    saveSkill(name: string, source: SkillMeta['source']): void;
    addAgent(id: string, name: string, basePath: string, skillsDirName?: string): void;
    removeAgent(id: string): boolean;
    addProject(id: string, path: string, addedAt?: string): void;
    removeProject(id: string): boolean;
    updateSkillSync(name: string, records: SyncRecord[]): void;
    updateSkillProjectSync(name: string, records: ProjectSyncRecord[]): void;
    getSkillsDir(): string;
    deleteSkill(name: string): void;
    saveSkillMeta(name: string, meta: SkillMeta): void;
  };
  syncService: {
    unsync(skillName: string, targetIds?: string[]): Promise<void>;
    checkSyncStatus(skillName: string): Array<{
      target: string;
      exists: boolean;
      sameContent: boolean | null;
      isSymlink: boolean;
      linkTarget: string | null;
    }>;
    sync(
      skillName: string,
      targets: unknown[],
      mode: SyncMode
    ): Promise<
      Array<{ target: string; success: boolean; path: string; mode: SyncMode; error?: string }>
    >;
    resync(skillName: string): Promise<void>;
    getSyncedAgents(skillName: string): Agent[];
  };
  projectSyncService: {
    unsync(skillName: string, targetIds?: string[]): Promise<void>;
    unsyncFromProject(skillName: string, projectId: string, agentTypes?: string[]): Promise<void>;
    syncToProject(
      skillName: string,
      projectId: string,
      agentTypes?: string[],
      mode?: SyncMode
    ): Promise<
      Array<{ target: string; success: boolean; path: string; mode: SyncMode; error?: string }>
    >;
    resync(skillName: string): Promise<void>;
    detectAgentTypes(projectPath: string): string[];
  };
  syncCheck: {
    detectConflicts(
      skillName: string
    ): Array<{ agentId: string; agentName: string; sameContent: boolean }>;
    resolveConflicts(
      skillName: string,
      resolutions: Map<string, 'link' | 'skip' | 'cancel'>
    ): string[];
  };
  fileOps: {
    pathExists(p: string): boolean;
    listSubdirectories(p: string): string[];
    ensureDir(p: string): Promise<void>;
    fileExists(p: string): boolean;
  };
}

export interface DataSlice {
  // State
  skills: SkillListItem[];
  agents: Agent[];
  projects: ProjectConfig[];
  skillDetails: Record<string, SkillDetailData | undefined>;
  loading: { skills: boolean; agents: boolean; projects: boolean };
  error: string | null;

  // NEW: Agent/project detail caches
  agentDetails: Record<string, AgentDetailData | undefined>;
  projectDetails: Record<string, ProjectDetailData | undefined>;
  agentSummaries: Record<string, AgentSummaryData | undefined>;
  projectSummaries: Record<string, ProjectSummaryData | undefined>;

  // Actions
  loadAllData: () => Promise<void>;
  loadSkillDetail: (name: string) => Promise<void>;
  refreshSkills: () => void;

  // NEW: Agent/project actions
  loadAgentDetail: (agentId: string) => Promise<void>;
  loadProjectDetail: (projectId: string) => Promise<void>;
  refreshAgents: () => void;
  refreshProjects: () => void;
}

export function createDataSlice(ctx: ServiceContext): StateCreator<StoreState, [], [], DataSlice> {
  const resolveSkillCategoryFilter = (
    activeFilter: SkillCategoryFilter,
    skills: SkillMeta[]
  ): SkillCategoryFilter => {
    if (
      activeFilter === ALL_SKILL_CATEGORY_FILTER ||
      getSkillCategoryCounts(skills).some((entry) => entry.key === activeFilter)
    ) {
      return activeFilter;
    }

    return ALL_SKILL_CATEGORY_FILTER;
  };

  const countValidSkillDirs = (dirPath: string): number => {
    if (!ctx.fileOps.pathExists(dirPath)) return 0;

    return ctx.fileOps.listSubdirectories(dirPath).filter((skillDir) => {
      const skillPath = path.join(dirPath, skillDir);
      return (
        ctx.fileOps.fileExists(path.join(skillPath, 'SKILL.md')) ||
        ctx.fileOps.fileExists(path.join(skillPath, 'skill.md'))
      );
    }).length;
  };

  const buildAgentSummaries = (
    agents: Agent[],
    projects: ProjectConfig[]
  ): Record<string, AgentSummaryData> => {
    const summaries: Record<string, AgentSummaryData> = {};

    for (const agent of agents) {
      let projectLevelSkillCount = 0;
      for (const project of projects) {
        projectLevelSkillCount += countValidSkillDirs(
          getAgentProjectSkillsDir(project.path, agent)
        );
      }

      summaries[agent.id] = {
        userLevelSkillCount: countValidSkillDirs(agent.basePath),
        projectLevelSkillCount,
      };
    }

    return summaries;
  };

  const buildProjectSummaries = (
    projects: ProjectConfig[],
    agents: Agent[]
  ): Record<string, ProjectSummaryData> => {
    const summaries: Record<string, ProjectSummaryData> = {};

    for (const project of projects) {
      let skillCount = 0;
      for (const agent of agents) {
        skillCount += countValidSkillDirs(getAgentProjectSkillsDir(project.path, agent));
      }
      summaries[project.id] = { skillCount };
    }

    return summaries;
  };

  const sortRowsByName = <T extends { name: string }>(rows: T[]): T[] =>
    [...rows].sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    );

  const reconcileService = new ReconcileService(ctx.storage, ctx.scanService);

  return (set, _get) => ({
    skills: [],
    agents: [],
    projects: [],
    skillDetails: {},
    loading: { skills: false, agents: false, projects: false },
    error: null,

    // NEW: Agent/project detail caches
    agentDetails: {},
    projectDetails: {},
    agentSummaries: {},
    projectSummaries: {},

    loadAllData(): Promise<void> {
      set({ loading: { skills: true, agents: true, projects: true }, error: null });
      const reconcileResult = reconcileService.reconcile().catch((error: unknown) => {
        set({ error: error instanceof Error ? error.message : String(error) });
      });

      try {
        return reconcileResult
          .then(() => {
            const skills = ctx.skillService.list();
            const agents = ctx.storage.listAgents();
            const projects = ctx.storage.listProjects();
            const agentSummaries = buildAgentSummaries(agents, projects);
            const projectSummaries = buildProjectSummaries(projects, agents);
            set({
              skills: skills.map((s) => ({ ...s })),
              activeSkillCategoryFilter: resolveSkillCategoryFilter(
                _get().activeSkillCategoryFilter,
                skills
              ),
              agents,
              projects,
              agentSummaries,
              projectSummaries,
              loading: { skills: false, agents: false, projects: false },
            });
          })
          .catch((error: unknown) => {
            set({
              error: error instanceof Error ? error.message : String(error),
              loading: { skills: false, agents: false, projects: false },
            });
          });
      } catch (e: unknown) {
        set({
          error: e instanceof Error ? e.message : String(e),
          loading: { skills: false, agents: false, projects: false },
        });
        return Promise.resolve();
      }
    },

    loadSkillDetail: async (name): Promise<void> => {
      const skill = ctx.skillService.get(name);
      if (!skill) return;

      const allAgents = ctx.storage.listAgents();
      const syncStatus = allAgents.map((agent) => {
        const record = skill.syncedTo.find((r) => r.agentId === agent.id);
        if (!record) {
          return {
            agentId: agent.id,
            agentName: agent.name,
            mode: 'copy' as SyncMode,
            status: 'missing' as const,
          };
        }
        // Sprint 1: treats all synced records as 'synced'.
        return {
          agentId: agent.id,
          agentName: agent.name,
          mode: record.mode,
          status: 'synced' as const,
        };
      });

      const projectDistribution = await ctx.scanService.getSkillProjectDistributionWithStatus(name);

      // Read SKILL.md preview (first 20 lines, case-insensitive filename)
      let skillMdPreview: string | null = null;
      try {
        const skillDir = skill.path;
        const skillMdCandidates = ['SKILL.md', 'skill.md'];
        for (const candidate of skillMdCandidates) {
          const mdPath = path.join(skillDir, candidate);
          if (fs.existsSync(mdPath)) {
            const content = fs.readFileSync(mdPath, 'utf-8');
            const lines = content.split('\n').slice(0, 20);
            skillMdPreview = lines.join('\n');
            break;
          }
        }
      } catch {
        // Ignore errors reading SKILL.md
      }

      set((state) => ({
        skillDetails: {
          ...state.skillDetails,
          [name]: {
            name,
            path: skill.path,
            source: skill.source,
            createdAt: skill.createdAt,
            updatedAt: skill.updatedAt,
            categories: skill.categories,
            syncedTo: skill.syncedTo,
            syncedProjects: skill.syncedProjects,
            syncStatus,
            projectDistribution,
            skillMdPreview,
          },
        },
      }));
    },

    refreshSkills(): void {
      set((state) => ({ loading: { ...state.loading, skills: true } }));
      const skills = ctx.skillService.list();
      set((state) => ({
        skills: skills.map((s) => ({ ...s })),
        activeSkillCategoryFilter: resolveSkillCategoryFilter(
          state.activeSkillCategoryFilter,
          skills
        ),
        loading: { ...state.loading, skills: false },
      }));
    },

    // NEW: Load agent detail data
    loadAgentDetail: async (agentId): Promise<void> => {
      const agent = ctx.storage.getAgent(agentId);
      if (!agent) return;

      const userLevelSkills: AgentDetailData['userLevelSkills'] = [];
      if (ctx.fileOps.pathExists(agent.basePath)) {
        const skillDirs = [...ctx.fileOps.listSubdirectories(agent.basePath)].sort((left, right) =>
          left.localeCompare(right, undefined, { sensitivity: 'base' })
        );
        for (const skillDir of skillDirs) {
          const skillPath = path.join(agent.basePath, skillDir);
          try {
            const hasSkillMd =
              fs.existsSync(path.join(skillPath, 'SKILL.md')) ||
              fs.existsSync(path.join(skillPath, 'skill.md'));
            if (!hasSkillMd) continue;
          } catch {
            continue;
          }

          const skill = ctx.storage.getSkill(skillDir);
          const syncRecord = skill?.syncedTo.find((r) => r.agentId === agentId);
          userLevelSkills.push({
            rowId: `agent:${agentId}:user:${skillDir}`,
            name: skillDir,
            path: skillPath,
            registrySkillName: skill?.name,
            agentId,
            agentName: agent.name,
            isImported: Boolean(skill),
            isDifferentVersion: false,
            syncMode: syncRecord?.mode,
            isSynced: !!syncRecord,
            sourceType: 'agent-user',
          });
        }
      }

      const projectLevelSkills: AgentDetailData['projectLevelSkills'] = [];
      const projectLevelStatuses = await ctx.scanService.getAgentProjectSkills(agentId);
      const byProject = new Map<string, ContextSkillRow[]>();
      for (const skill of projectLevelStatuses) {
        const projectId = skill.projectId;
        if (!projectId) continue;

        const rows = byProject.get(projectId) ?? [];
        rows.push({
          rowId: `agent:${agentId}:project:${projectId}:${skill.name}`,
          name: skill.name,
          path: skill.path,
          registrySkillName: ctx.storage.getSkill(skill.name) ? skill.name : undefined,
          agentId: skill.agentId,
          agentName: skill.agentName,
          projectId,
          isImported: Boolean(ctx.storage.getSkill(skill.name)),
          isDifferentVersion: skill.isDifferentVersion,
          sourceType: 'agent-project',
        });
        byProject.set(projectId, rows);
      }

      for (const projectId of Array.from(byProject.keys()).sort((left, right) =>
        left.localeCompare(right, undefined, { sensitivity: 'base' })
      )) {
        projectLevelSkills.push({
          projectId,
          skills: sortRowsByName(byProject.get(projectId) ?? []),
        });
      }

      const sections: ContextSkillSection[] = [];
      if (userLevelSkills.length > 0) {
        sections.push({
          id: `agent:${agentId}:user-level`,
          title: 'User-level',
          rows: sortRowsByName(userLevelSkills),
        });
      }
      for (const projectGroup of projectLevelSkills) {
        if (projectGroup.skills.length === 0) continue;
        sections.push({
          id: `agent:${agentId}:project:${projectGroup.projectId}`,
          title: `Project-level / ${projectGroup.projectId}`,
          rows: projectGroup.skills,
        });
      }

      set((state) => ({
        agentDetails: {
          ...state.agentDetails,
          [agentId]: {
            agentId,
            agentName: agent.name,
            basePath: agent.basePath,
            userLevelSkills: sortRowsByName(userLevelSkills),
            projectLevelSkills,
            sections,
          },
        },
      }));
    },

    loadProjectDetail: async (projectId): Promise<void> => {
      const project = ctx.storage.getProject(projectId);
      if (!project) return;

      const allProjectSkills = await ctx.scanService.getProjectSkillsWithStatus(projectId);

      // Group by agent
      const byAgent = new Map<
        string,
        {
          agentId: string;
          agentName: string;
          skills: ProjectDetailData['skillsByAgent'][0]['skills'];
        }
      >();
      for (const skill of allProjectSkills) {
        let group = byAgent.get(skill.agentId);
        if (!group) {
          group = { agentId: skill.agentId, agentName: skill.agentName, skills: [] };
          byAgent.set(skill.agentId, group);
        }
        group.skills.push({
          rowId: `project:${projectId}:${skill.agentId}:${skill.name}`,
          name: skill.name,
          path: skill.path,
          registrySkillName: ctx.storage.getSkill(skill.name) ? skill.name : undefined,
          agentId: skill.agentId,
          agentName: skill.agentName,
          projectId,
          isImported: Boolean(ctx.storage.getSkill(skill.name)),
          isDifferentVersion: skill.isDifferentVersion,
          sourceType: 'project',
        });
      }

      const skillsByAgent = Array.from(byAgent.values())
        .sort((left, right) =>
          left.agentName.localeCompare(right.agentName, undefined, { sensitivity: 'base' })
        )
        .map((group) => ({
          ...group,
          skills: sortRowsByName(group.skills),
        }));

      const sections: ContextSkillSection[] = skillsByAgent
        .filter((group) => group.skills.length > 0)
        .map((group) => ({
          id: `project:${projectId}:agent:${group.agentId}`,
          title: group.agentName,
          rows: group.skills,
        }));

      set((state) => ({
        projectDetails: {
          ...state.projectDetails,
          [projectId]: {
            projectId,
            projectPath: project.path,
            skillsByAgent,
            sections,
          },
        },
      }));
    },

    // NEW: Refresh agents
    refreshAgents(): void {
      const agents = ctx.storage.listAgents();
      const projects = ctx.storage.listProjects();
      set({
        agents,
        agentDetails: {},
        agentSummaries: buildAgentSummaries(agents, projects),
        projectSummaries: buildProjectSummaries(projects, agents),
      });
    },

    // NEW: Refresh projects
    refreshProjects(): void {
      const projects = ctx.storage.listProjects();
      const agents = ctx.storage.listAgents();
      set({
        projects,
        projectDetails: {},
        agentSummaries: buildAgentSummaries(agents, projects),
        projectSummaries: buildProjectSummaries(projects, agents),
      });
    },
  });
}
