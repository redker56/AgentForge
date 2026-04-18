import os from 'os';
import path from 'path';

import { vi } from 'vitest';

import type { WorkbenchContext } from '../../../src/tui/store/workbenchContext.js';
import type { Agent, ProjectConfig, SkillMeta, SyncMode } from '../../../src/types.js';

type LegacyServices = {
  skillService: {
    list: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
    install: ReturnType<typeof vi.fn>;
    installFromDirectory: ReturnType<typeof vi.fn>;
    importFromPath: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    cloneRepoToTemp: ReturnType<typeof vi.fn>;
    discoverSkillsInDirectory: ReturnType<typeof vi.fn>;
    removeTempRepo: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateCategories: ReturnType<typeof vi.fn>;
  };
  scanService: {
    getSkillProjectDistributionWithStatus: ReturnType<typeof vi.fn>;
    getProjectSkillsWithStatus: ReturnType<typeof vi.fn>;
    scanProject: ReturnType<typeof vi.fn>;
  };
  storage: {
    listAgents: ReturnType<typeof vi.fn>;
    listProjects: ReturnType<typeof vi.fn>;
    listAllDefinedAgents: ReturnType<typeof vi.fn>;
    getAgent: ReturnType<typeof vi.fn>;
    getProject: ReturnType<typeof vi.fn>;
    getSkill: ReturnType<typeof vi.fn>;
    listSkills: ReturnType<typeof vi.fn>;
    saveSkill: ReturnType<typeof vi.fn>;
    addAgent: ReturnType<typeof vi.fn>;
    removeAgent: ReturnType<typeof vi.fn>;
    addProject: ReturnType<typeof vi.fn>;
    removeProject: ReturnType<typeof vi.fn>;
    updateSkillSync: ReturnType<typeof vi.fn>;
    updateSkillProjectSync: ReturnType<typeof vi.fn>;
    getSkillsDir: ReturnType<typeof vi.fn>;
    getSkillPath: ReturnType<typeof vi.fn>;
    deleteSkill: ReturnType<typeof vi.fn>;
    saveSkillMeta: ReturnType<typeof vi.fn>;
    runBatch: ReturnType<typeof vi.fn>;
    snapshot: ReturnType<typeof vi.fn>;
  };
  syncService: {
    unsync: ReturnType<typeof vi.fn>;
    checkSyncStatus: ReturnType<typeof vi.fn>;
    sync: ReturnType<typeof vi.fn>;
    resync: ReturnType<typeof vi.fn>;
    getSyncedAgents: ReturnType<typeof vi.fn>;
  };
  projectSyncService: {
    unsync: ReturnType<typeof vi.fn>;
    unsyncFromProject: ReturnType<typeof vi.fn>;
    syncToProject: ReturnType<typeof vi.fn>;
    resync: ReturnType<typeof vi.fn>;
    detectAgentTypes: ReturnType<typeof vi.fn>;
  };
  syncCheck: {
    detectConflicts: ReturnType<typeof vi.fn>;
    resolveConflicts: ReturnType<typeof vi.fn>;
  };
  fileOps: {
    pathExists: ReturnType<typeof vi.fn>;
    listSubdirectories: ReturnType<typeof vi.fn>;
    ensureDir: ReturnType<typeof vi.fn>;
    fileExists: ReturnType<typeof vi.fn>;
  };
};

export type MockWorkbenchContext = WorkbenchContext & LegacyServices;

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function toImportResult(target: string, outcome: 'success' | 'error' | 'skipped', error?: string) {
  return {
    target,
    success: outcome === 'success',
    outcome,
    ...(error ? { error } : {}),
  };
}

export function createMockServiceContext(): MockWorkbenchContext {
  const legacy: LegacyServices = {
    skillService: {
      list: vi.fn(() => []),
      get: vi.fn(() => null),
      exists: vi.fn(() => false),
      install: vi.fn(),
      installFromDirectory: vi.fn(),
      importFromPath: vi.fn(),
      delete: vi.fn(),
      cloneRepoToTemp: vi.fn(),
      discoverSkillsInDirectory: vi.fn(() => []),
      removeTempRepo: vi.fn(),
      update: vi.fn(),
      updateCategories: vi.fn((name: string, categories: string[]) => ({
        name,
        source: { type: 'local' as const },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        categories,
        syncedTo: [],
        syncedProjects: [],
      })),
    },
    scanService: {
      getSkillProjectDistributionWithStatus: vi.fn(() => Promise.resolve([])),
      getProjectSkillsWithStatus: vi.fn(() => Promise.resolve([])),
      scanProject: vi.fn(() => []),
    },
    storage: {
      listAgents: vi.fn(() => []),
      listProjects: vi.fn(() => []),
      listAllDefinedAgents: vi.fn(() => []),
      getAgent: vi.fn(() => undefined),
      getProject: vi.fn(() => undefined),
      getSkill: vi.fn(() => undefined),
      listSkills: vi.fn(() => []),
      saveSkill: vi.fn(),
      addAgent: vi.fn(),
      removeAgent: vi.fn(() => true),
      addProject: vi.fn(),
      removeProject: vi.fn(() => true),
      updateSkillSync: vi.fn(),
      updateSkillProjectSync: vi.fn(),
      getSkillsDir: vi.fn(() => '/test/skills'),
      getSkillPath: vi.fn((name: string) => `/test/skills/${name}`),
      deleteSkill: vi.fn(),
      saveSkillMeta: vi.fn(),
      runBatch: vi.fn((mutator: (repo: unknown) => unknown) => mutator(legacy.storage)),
      snapshot: vi.fn(() => ({ version: '1.0', skills: {}, agents: {}, projects: {} })),
    },
    syncService: {
      unsync: vi.fn(),
      checkSyncStatus: vi.fn(() => []),
      sync: vi.fn(() => Promise.resolve([])),
      resync: vi.fn(),
      getSyncedAgents: vi.fn(() => []),
    },
    projectSyncService: {
      unsync: vi.fn(),
      unsyncFromProject: vi.fn(),
      syncToProject: vi.fn(() => Promise.resolve([])),
      resync: vi.fn(),
      detectAgentTypes: vi.fn(() => []),
    },
    syncCheck: {
      detectConflicts: vi.fn(() => []),
      resolveConflicts: vi.fn(() => []),
    },
    fileOps: {
      pathExists: vi.fn(() => false),
      listSubdirectories: vi.fn(() => []),
      ensureDir: vi.fn(),
      fileExists: vi.fn(() => false),
    },
  };

  const queries: WorkbenchContext['queries'] = {
    loadLibraryOverview: vi.fn(() =>
      Promise.resolve({
        skills: legacy.storage.listSkills().map((skill: SkillMeta) => ({
          ...skill,
          exists: true,
        })),
        agents: legacy.storage.listAgents(),
        projects: legacy.storage.listProjects(),
        agentSummaries: {},
        projectSummaries: {},
      })
    ),
    loadSkillDetail: vi.fn(async (skillName: string) => {
      const skill = legacy.storage.getSkill(skillName);
      if (!skill) return null;

      const distribution =
        await legacy.scanService.getSkillProjectDistributionWithStatus(skillName);
      return {
        name: skill.name,
        path: legacy.storage.getSkillPath(skillName),
        source: skill.source,
        createdAt: skill.createdAt,
        updatedAt: skill.updatedAt,
        categories: skill.categories,
        syncedTo: skill.syncedTo,
        syncedProjects: skill.syncedProjects ?? [],
        syncStatus: [],
        projectDistribution: distribution,
        skillMdPreview: null,
      };
    }),
    loadAgentWorkbench: vi.fn(() => Promise.resolve(null)),
    loadProjectWorkbench: vi.fn(() => Promise.resolve(null)),
    loadSyncPreview: vi.fn(() => Promise.resolve({ targets: [], agentTypes: [] })),
    loadImportSourcePreview: vi.fn(
      (input: { sourceType: 'project' | 'agent'; sourceId: string }) => {
        if (input.sourceType === 'project') {
          const project = legacy.storage.getProject(input.sourceId);
          if (!project) return null;

          const candidates = legacy.scanService
            .scanProject(project.path)
            .map((skill: { name: string; path: string; hasSkillMd?: boolean }) => ({
              name: skill.name,
              path: skill.path,
              alreadyExists: legacy.skillService.exists(skill.name),
              hasSkillMd: skill.hasSkillMd ?? true,
            }));
          return {
            sourceLabel: `${project.id}  ${project.path}`,
            candidates,
          };
        }

        const agent = legacy.storage.getAgent(input.sourceId);
        if (!agent) return null;

        const candidates = legacy.fileOps.listSubdirectories(agent.basePath).map((name: string) => {
          const skillPath = path.join(agent.basePath, name);
          const hasSkillMd =
            legacy.fileOps.fileExists(path.join(skillPath, 'SKILL.md')) ||
            legacy.fileOps.fileExists(path.join(skillPath, 'skill.md'));
          return {
            name,
            path: skillPath,
            alreadyExists: legacy.skillService.exists(name),
            hasSkillMd,
          };
        });

        return {
          sourceLabel: `${agent.name} (${agent.id})`,
          candidates: candidates.filter((candidate) => candidate.hasSkillMd),
        };
      }
    ),
  };

  const commands: WorkbenchContext['commands'] = {
    installSkillFromUrl: vi.fn(async (url: string, name?: string) => {
      if (name) {
        return legacy.skillService.install(url, name);
      }

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
        return legacy.skillService.install(repoUrl, undefined, subPath);
      }

      const discovered = await commands.discoverSkillsInRepo(url);
      if (discovered.skills.length === 0) {
        await commands.cleanupDiscoveredRepo(discovered.tempRepoPath);
        throw new Error('No skills found in repository');
      }

      if (discovered.skills.length > 1) {
        throw new Error('Multiple skills discovered, explicit selection required');
      }

      const installed = await commands.installSkillsFromDiscovery(
        url,
        discovered.skills,
        discovered.tempRepoPath
      );
      return installed[0];
    }),
    discoverSkillsInRepo: vi.fn(async (repoUrl: string) => {
      const tempRepoPath = await legacy.skillService.cloneRepoToTemp(repoUrl);
      return {
        tempRepoPath,
        skills: legacy.skillService.discoverSkillsInDirectory(tempRepoPath, repoUrl),
      };
    }),
    installSkillsFromDiscovery: vi.fn(
      async (
        repoUrl: string,
        selections: Array<{ name: string; subPath: string }>,
        tempRepoPath: string
      ) => {
        const installedNames: string[] = [];
        try {
          for (const selection of selections) {
            const sourceDir = selection.subPath
              ? path.join(tempRepoPath, selection.subPath)
              : tempRepoPath;
            await legacy.skillService.installFromDirectory(
              repoUrl,
              selection.name,
              sourceDir,
              selection.subPath
            );
            installedNames.push(selection.name);
          }
        } finally {
          await commands.cleanupDiscoveredRepo(tempRepoPath);
        }
        return installedNames;
      }
    ),
    cleanupDiscoveredRepo: vi.fn((tempRepoPath: string) =>
      Promise.resolve(legacy.skillService.removeTempRepo(tempRepoPath))
    ),
    detectConflicts: vi.fn((skillName: string) => legacy.syncCheck.detectConflicts(skillName)),
    resolveConflicts: vi.fn(
      (skillName: string, resolutions: Map<string, 'link' | 'skip' | 'cancel'>) =>
        legacy.syncCheck.resolveConflicts(skillName, resolutions)
    ),
    syncSkillsToAgents: vi.fn(async (skillNames: string[], agentIds: string[], mode: SyncMode) => {
      const results: Array<{
        target: string;
        success: boolean;
        path: string;
        mode: SyncMode;
        error?: string;
      }> = [];
      for (const skillName of unique(skillNames)) {
        for (const agentId of unique(agentIds)) {
          const agent = legacy.storage.getAgent(agentId);
          const syncResults = await legacy.syncService.sync(skillName, agent ? [agent] : [], mode);
          results.push(...syncResults);
        }
      }
      return results;
    }),
    syncSkillsToProjects: vi.fn(
      async (skillNames: string[], projectIds: string[], agentTypes: string[], mode: SyncMode) => {
        const results: Array<{
          target: string;
          success: boolean;
          path: string;
          mode: SyncMode;
          error?: string;
        }> = [];
        for (const skillName of unique(skillNames)) {
          for (const projectId of unique(projectIds)) {
            const syncResults = await legacy.projectSyncService.syncToProject(
              skillName,
              projectId,
              unique(agentTypes),
              mode
            );
            results.push(...syncResults);
          }
        }
        return results;
      }
    ),
    unsyncSkillsFromAgents: vi.fn(async (skillNames: string[], agentIds: string[]) => {
      for (const skillName of unique(skillNames)) {
        for (const agentId of unique(agentIds)) {
          await legacy.syncService.unsync(skillName, [agentId]);
        }
      }
    }),
    unsyncSkillsFromProjects: vi.fn(
      async (
        skillNames: string[],
        projectIds: string[],
        options?: { mode?: 'all' | 'specific'; agentTypes?: string[] }
      ) => {
        const mode = options?.mode ?? 'all';
        for (const skillName of unique(skillNames)) {
          if (mode === 'all') {
            for (const projectId of unique(projectIds)) {
              await legacy.projectSyncService.unsyncFromProject(skillName, projectId);
            }
            continue;
          }

          const agentTypes = unique(options?.agentTypes ?? []);
          for (const projectId of unique(projectIds)) {
            for (const agentType of agentTypes) {
              await legacy.projectSyncService.unsync(skillName, [`${projectId}:${agentType}`]);
            }
          }
        }
      }
    ),
    updateSkills: vi.fn(async (skillNames: string[]) => {
      const results = [];
      for (const skillName of unique(skillNames)) {
        const skill = legacy.storage.getSkill(skillName);
        if (!skill) {
          results.push({
            skillName,
            sourceType: 'unknown' as const,
            outcome: 'error' as const,
            detail: 'Skill not found',
          });
          continue;
        }
        if (skill.source.type !== 'git') {
          results.push({
            skillName,
            sourceType: skill.source.type === 'project' ? ('project' as const) : ('local' as const),
            outcome: 'skipped' as const,
            detail: 'Not git-backed',
          });
          continue;
        }

        try {
          const updated = await legacy.skillService.update(skillName);
          if (!updated) {
            results.push({
              skillName,
              sourceType: 'git' as const,
              outcome: 'skipped' as const,
              detail: 'Repository could not be updated',
            });
            continue;
          }

          await legacy.syncService.resync(skillName);
          await legacy.projectSyncService.resync(skillName);
          results.push({ skillName, sourceType: 'git' as const, outcome: 'updated' as const });
        } catch (error: unknown) {
          results.push({
            skillName,
            sourceType: 'git' as const,
            outcome: 'error' as const,
            detail: error instanceof Error ? error.message : String(error),
          });
        }
      }
      return results;
    }),
    updateCategories: vi.fn(
      (skillNames: string[], mode: 'set' | 'add' | 'remove' | 'clear', categories: string[]) =>
        Promise.resolve(
          unique(skillNames).map((skillName) => {
            try {
              const updated = legacy.skillService.updateCategories(skillName, categories, mode);
              return { skillName, success: true, categories: updated.categories };
            } catch (error: unknown) {
              return {
                skillName,
                success: false,
                categories: [],
                error: error instanceof Error ? error.message : String(error),
              };
            }
          })
        )
    ),
    removeSkill: vi.fn(async (skillName: string) => {
      const skill = legacy.storage.getSkill(skillName);
      if (!skill) return;

      const agentIds = skill.syncedTo.map((record: { agentId: string }) => record.agentId);
      if (agentIds.length > 0) {
        await legacy.syncService.unsync(skillName, agentIds);
      }

      const projectTargetIds = (skill.syncedProjects ?? []).map(
        (record: { projectId: string; agentType: string }) =>
          `${record.projectId}:${record.agentType}`
      );
      if (projectTargetIds.length > 0) {
        await legacy.projectSyncService.unsync(skillName, projectTargetIds);
      }

      await legacy.skillService.delete(skillName);
    }),
    restoreSkill: vi.fn((snapshot: Record<string, unknown>) => {
      const name = snapshot.name as string;
      if (!name) return;
      const createdAt = (snapshot.createdAt ?? new Date().toISOString()) as string;
      legacy.storage.saveSkillMeta(name, {
        name,
        source: (snapshot.source ?? { type: 'local' }) as SkillMeta['source'],
        createdAt,
        updatedAt: (snapshot.updatedAt ?? createdAt) as string,
        categories: (snapshot.categories ?? []) as SkillMeta['categories'],
        syncedTo: (snapshot.syncedTo ?? []) as SkillMeta['syncedTo'],
        syncedProjects: (snapshot.syncedProjects ?? undefined) as SkillMeta['syncedProjects'],
      });
    }),
    importFromProject: vi.fn(async (projectId: string, skillNames: string[]) => {
      const project = legacy.storage.getProject(projectId);
      if (!project) return [toImportResult(projectId, 'error', 'Project not found')];

      const discovered = legacy.scanService.scanProject(project.path);
      const results = [];
      for (const skillName of unique(skillNames)) {
        const found = discovered.find((entry: { name: string }) => entry.name === skillName);
        if (!found) {
          results.push(toImportResult(skillName, 'error', 'Not found in project'));
          continue;
        }
        if (legacy.skillService.exists(skillName)) {
          results.push(toImportResult(skillName, 'error', 'Already exists'));
          continue;
        }
        try {
          await legacy.skillService.importFromPath(found.path, skillName, {
            type: 'project',
            projectId,
          });
          results.push(toImportResult(skillName, 'success'));
        } catch (error: unknown) {
          results.push(
            toImportResult(
              skillName,
              'error',
              error instanceof Error ? error.message : String(error)
            )
          );
        }
      }
      return results;
    }),
    importFromAgent: vi.fn(async (agentId: string, skillNames: string[]) => {
      const agent = legacy.storage.getAgent(agentId);
      if (!agent) return [toImportResult(agentId, 'error', 'Agent not found')];

      const results = [];
      for (const skillName of unique(skillNames)) {
        if (legacy.skillService.exists(skillName)) {
          results.push(toImportResult(skillName, 'error', 'Already exists'));
          continue;
        }
        try {
          const sourcePath = path.join(agent.basePath, skillName);
          await legacy.skillService.importFromPath(sourcePath, skillName, {
            type: 'local',
            importedFrom: { agent: agentId, path: sourcePath },
          });
          results.push(toImportResult(skillName, 'success'));
        } catch (error: unknown) {
          results.push(
            toImportResult(
              skillName,
              'error',
              error instanceof Error ? error.message : String(error)
            )
          );
        }
      }
      return results;
    }),
    importContextSkills: vi.fn(() => Promise.resolve([])),
    addAgent: vi.fn(async (id: string, name: string, basePath: string, skillsDirName?: string) => {
      if (!id.trim()) throw new Error('Agent ID is required');
      if (!/^[a-zA-Z0-9-_]+$/.test(id)) {
        throw new Error('Agent ID must contain only letters, numbers, hyphens, and underscores');
      }
      const builtinIds = ['claude', 'codex', 'gemini', 'openclaw', 'qoder', 'opencode', 'cursor'];
      if (builtinIds.includes(id)) {
        throw new Error(`"${id}" is a built-in agent ID and cannot be used`);
      }
      if (legacy.storage.listAllDefinedAgents().some((agent: { id: string }) => agent.id === id)) {
        throw new Error(`Agent "${id}" already exists`);
      }

      const expandedPath = basePath.replace(/^~(?=[/\\])/, os.homedir());
      if (!legacy.fileOps.pathExists(expandedPath)) {
        await legacy.fileOps.ensureDir(expandedPath);
      }

      legacy.storage.addAgent(id, name, expandedPath, skillsDirName);
    }),
    removeAgent: vi.fn((agentId: string) => {
      legacy.storage.runBatch((repo: typeof legacy.storage) => {
        for (const skill of repo.listSkills()) {
          const updatedSyncedTo = skill.syncedTo.filter(
            (record: { agentId: string }) => record.agentId !== agentId
          );
          if (updatedSyncedTo.length !== skill.syncedTo.length) {
            repo.updateSkillSync(skill.name, updatedSyncedTo);
          }

          const updatedSyncedProjects = (skill.syncedProjects ?? []).filter(
            (record: { agentType: string }) => record.agentType !== agentId
          );
          if (updatedSyncedProjects.length !== (skill.syncedProjects ?? []).length) {
            repo.updateSkillProjectSync(skill.name, updatedSyncedProjects);
          }
        }

        repo.removeAgent(agentId);
      });
      return Promise.resolve();
    }),
    restoreAgent: vi.fn((snapshot: Record<string, unknown>) => {
      const id = snapshot.id as string;
      const name = snapshot.name as string;
      const basePath = snapshot.basePath as string;
      const skillsDirName = snapshot.skillsDirName as string | undefined;
      if (!id || !name || !basePath) return;
      legacy.storage.addAgent(id, name, basePath, skillsDirName);
    }),
    addProject: vi.fn((id: string, projectPath: string) => {
      if (!id.trim()) throw new Error('Project ID is required');
      if (!/^[a-zA-Z0-9-_]+$/.test(id)) {
        throw new Error('Project ID must contain only letters, numbers, hyphens, and underscores');
      }
      if (legacy.storage.listProjects().some((project: { id: string }) => project.id === id)) {
        throw new Error(`Project "${id}" already exists`);
      }

      const expandedPath = projectPath.replace(/^~(?=[/\\])/, os.homedir());
      if (!legacy.fileOps.pathExists(expandedPath)) {
        throw new Error(`Path does not exist: ${expandedPath}`);
      }

      legacy.storage.addProject(id, expandedPath);
      return Promise.resolve();
    }),
    removeProject: vi.fn((projectId: string) => {
      legacy.storage.runBatch((repo: typeof legacy.storage) => {
        for (const skill of repo.listSkills()) {
          const updatedProjects = (skill.syncedProjects ?? []).filter(
            (record: { projectId: string }) => record.projectId !== projectId
          );
          if (updatedProjects.length !== (skill.syncedProjects ?? []).length) {
            repo.updateSkillProjectSync(skill.name, updatedProjects);
          }
        }

        repo.removeProject(projectId);
      });
      return Promise.resolve();
    }),
    restoreProject: vi.fn((snapshot: Record<string, unknown>) => {
      const id = snapshot.id as string;
      const projectPath = snapshot.path as string;
      const addedAt = snapshot.addedAt as string | undefined;
      if (!id || !projectPath) return;
      legacy.storage.addProject(id, projectPath, addedAt);
    }),
  };

  return {
    ...legacy,
    queries,
    commands,
  };
}

export function createMockSkill(overrides: Partial<SkillMeta> = {}): SkillMeta {
  return {
    name: 'test-skill',
    source: { type: 'local' },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    categories: [],
    syncedTo: [],
    syncedProjects: [],
    ...overrides,
  };
}

export function createMockAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'test-agent',
    name: 'Test Agent',
    basePath: '/test/agent',
    skillsDirName: undefined,
    ...overrides,
  };
}

export function createMockProject(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return {
    id: 'test-project',
    path: '/test/project',
    addedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockSyncResult(
  target: string,
  success: boolean,
  options: { path?: string; mode?: SyncMode; error?: string } = {}
) {
  return {
    target,
    success,
    path: options.path || `/test/path/${target}`,
    mode: (options.mode || 'copy') as SyncMode,
    ...(options.error && { error: options.error }),
  };
}
