/**
 * Data State Slice
 */

import path from 'path';

import fs from 'fs-extra';
import type { StateCreator } from 'zustand';

import type {
  SkillMeta,
  SyncRecord,
  ProjectSyncRecord,
  SkillSource,
  SyncMode,
  Agent,
  ProjectConfig,
} from '../../types.js';

import type { SkillListItem, StoreState } from './index.js';

export interface SkillDetailData {
  name: string;
  path: string;
  source: SkillSource;
  createdAt: string;
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
  userLevelSkills: Array<{
    name: string;
    syncMode: 'copy' | 'symlink';
    isSynced: boolean;
  }>;
  projectLevelSkills: Array<{
    projectId: string;
    skills: Array<{
      name: string;
      isDifferentVersion: boolean;
    }>;
  }>;
}

// NEW: Project detail data types
export interface ProjectDetailData {
  projectId: string;
  projectPath: string;
  skillsByAgent: Array<{
    agentId: string;
    agentName: string;
    skills: Array<{
      name: string;
      isImported: boolean;
      isDifferentVersion: boolean;
    }>;
  }>;
}

export interface ServiceContext {
  skillService: {
    list(): Array<SkillMeta & { exists: boolean }>;
    get(name: string): {
      name: string;
      path: string;
      source: SkillSource;
      createdAt: string;
      syncedTo: SyncRecord[];
      syncedProjects?: ProjectSyncRecord[];
    } | null;
    exists(name: string): boolean;
    install(url: string, name?: string, subPath?: string): Promise<string>;
    installFromDirectory(url: string, name: string, sourceDir: string): Promise<string>;
    importFromPath(sourcePath: string, name: string, source: SkillSource): Promise<void>;
    delete(name: string): Promise<void>;
    cloneRepoToTemp(repoUrl: string): Promise<string>;
    discoverSkillsInDirectory(
      repoDir: string,
      repoUrl: string
    ): Array<{ name: string; subPath: string }>;
    removeTempRepo(tempDir: string): Promise<void>;
    update(name: string): Promise<boolean>; // git pull on skill. Returns false if not a git skill or not a repo.
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

  // Actions
  loadAllData: () => void;
  loadSkillDetail: (name: string) => Promise<void>;
  refreshSkills: () => void;

  // NEW: Agent/project actions
  loadAgentDetail: (agentId: string) => void;
  loadProjectDetail: (projectId: string) => Promise<void>;
  refreshAgents: () => void;
  refreshProjects: () => void;
}

export function createDataSlice(ctx: ServiceContext): StateCreator<StoreState, [], [], DataSlice> {
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

    loadAllData(): void {
      set({ loading: { skills: true, agents: true, projects: true }, error: null });
      try {
        const skills = ctx.skillService.list();
        const agents = ctx.storage.listAgents();
        const projects = ctx.storage.listProjects();
        set({
          skills: skills.map((s) => ({ ...s })),
          agents,
          projects,
          loading: { skills: false, agents: false, projects: false },
        });
      } catch (e: unknown) {
        set({
          error: e instanceof Error ? e.message : String(e),
          loading: { skills: false, agents: false, projects: false },
        });
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
        loading: { ...state.loading, skills: false },
      }));
    },

    // NEW: Load agent detail data
    loadAgentDetail(agentId): void {
      const agent = ctx.storage.getAgent(agentId);
      if (!agent) return;

      // Get user-level skills from agent's skill directory
      const userLevelSkills: AgentDetailData['userLevelSkills'] = [];
      if (ctx.fileOps.pathExists(agent.basePath)) {
        const skillDirs = ctx.fileOps.listSubdirectories(agent.basePath);
        for (const skillDir of skillDirs) {
          const skillPath = path.join(agent.basePath, skillDir);
          // Check if it looks like a skill directory (has SKILL.md)
          try {
            const hasSkillMd =
              fs.existsSync(path.join(skillPath, 'SKILL.md')) ||
              fs.existsSync(path.join(skillPath, 'skill.md'));
            if (!hasSkillMd) continue;
          } catch {
            continue;
          }

          // Check sync record
          const skill = ctx.storage.getSkill(skillDir);
          const syncRecord = skill?.syncedTo.find((r) => r.agentId === agentId);
          userLevelSkills.push({
            name: skillDir,
            syncMode: syncRecord?.mode ?? 'copy',
            isSynced: !!syncRecord,
          });
        }
      }

      // Get project-level skills
      const projectLevelSkills: AgentDetailData['projectLevelSkills'] = [];
      const projects = ctx.storage.listProjects();
      for (const project of projects) {
        const dirName = agent.skillsDirName || agent.id;
        const agentSkillsDir = path.join(project.path, `.${dirName}`, 'skills');
        if (!ctx.fileOps.pathExists(agentSkillsDir)) continue;

        const projectSkillDirs = ctx.fileOps.listSubdirectories(agentSkillsDir);
        const projectSkills: Array<{ name: string; isDifferentVersion: boolean }> = [];

        for (const skillDir of projectSkillDirs) {
          const skillPath = path.join(agentSkillsDir, skillDir);
          try {
            const hasSkillMd =
              fs.existsSync(path.join(skillPath, 'SKILL.md')) ||
              fs.existsSync(path.join(skillPath, 'skill.md'));
            if (!hasSkillMd) continue;
          } catch {
            continue;
          }
          projectSkills.push({ name: skillDir, isDifferentVersion: false });
        }

        if (projectSkills.length > 0) {
          projectLevelSkills.push({
            projectId: project.id,
            skills: projectSkills,
          });
        }
      }

      set((state) => ({
        agentDetails: {
          ...state.agentDetails,
          [agentId]: {
            agentId,
            agentName: agent.name,
            basePath: agent.basePath,
            userLevelSkills,
            projectLevelSkills,
          },
        },
      }));
    },

    // NEW: Load project detail data
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
          name: skill.name,
          isImported: skill.isImported,
          isDifferentVersion: skill.isDifferentVersion,
        });
      }

      const skillsByAgent = Array.from(byAgent.values());

      set((state) => ({
        projectDetails: {
          ...state.projectDetails,
          [projectId]: {
            projectId,
            projectPath: project.path,
            skillsByAgent,
          },
        },
      }));
    },

    // NEW: Refresh agents
    refreshAgents(): void {
      const agents = ctx.storage.listAgents();
      set({ agents, agentDetails: {} });
    },

    // NEW: Refresh projects
    refreshProjects(): void {
      const projects = ctx.storage.listProjects();
      set({ projects, projectDetails: {} });
    },
  });
}
