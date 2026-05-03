import os from 'os';
import path from 'path';

import type { RegistryRepository } from '../infra/registry-repository.js';
import type { SyncMode, SkillMeta, TuiLanguagePreference } from '../types.js';

import type { FileOperationsService } from './file-operations.js';
import type { ScanService } from './scan-service.js';
import type { SkillCategoryUpdateMode, SkillService } from './skill-service.js';
import type { AgentSyncService } from './sync/agent-sync-service.js';
import type { ProjectSyncService } from './sync/project-sync-service.js';
import type { SyncCheckService } from './sync-check-service.js';
import type {
  ContextImportResult,
  UpdateSkillResult,
  WorkbenchCommands,
  WorkbenchConflict,
  WorkbenchConflictResolution,
  WorkbenchSkillRow,
} from './workbench-types.js';

function makeImportResult(
  target: string,
  outcome: 'success' | 'error' | 'skipped',
  error?: string
): ContextImportResult {
  return {
    target,
    success: outcome === 'success',
    outcome,
    error,
  };
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export class DefaultWorkbenchCommands implements WorkbenchCommands {
  constructor(
    private readonly storage: RegistryRepository,
    private readonly skillService: SkillService,
    private readonly scanService: ScanService,
    private readonly syncService: AgentSyncService,
    private readonly projectSyncService: ProjectSyncService,
    private readonly syncCheck: SyncCheckService,
    private readonly fileOps: FileOperationsService
  ) {}

  async installSkillFromUrl(url: string, name?: string): Promise<string> {
    if (name) {
      return this.skillService.install(url, name);
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
      return this.skillService.install(repoUrl, undefined, subPath);
    }

    const discovered = await this.discoverSkillsInRepo(url);
    if (discovered.skills.length === 0) {
      await this.cleanupDiscoveredRepo(discovered.tempRepoPath);
      throw new Error('No skills found in repository');
    }

    if (discovered.skills.length > 1) {
      throw new Error('Multiple skills discovered, explicit selection required');
    }

    const installed = await this.installSkillsFromDiscovery(
      url,
      discovered.skills,
      discovered.tempRepoPath
    );
    return installed[0];
  }

  async discoverSkillsInRepo(repoUrl: string): Promise<{
    tempRepoPath: string;
    skills: Array<{ name: string; subPath: string }>;
  }> {
    const tempRepoPath = await this.skillService.cloneRepoToTemp(repoUrl);
    return {
      tempRepoPath,
      skills: this.skillService.discoverSkillsInDirectory(tempRepoPath, repoUrl),
    };
  }

  async installSkillsFromDiscovery(
    repoUrl: string,
    selections: Array<{ name: string; subPath: string }>,
    tempRepoPath: string
  ): Promise<string[]> {
    const installedNames: string[] = [];

    try {
      for (const selection of selections) {
        const sourceDir = selection.subPath
          ? path.join(tempRepoPath, selection.subPath)
          : tempRepoPath;
        await this.skillService.installFromDirectory(
          repoUrl,
          selection.name,
          sourceDir,
          selection.subPath
        );
        installedNames.push(selection.name);
      }
    } finally {
      await this.cleanupDiscoveredRepo(tempRepoPath);
    }

    return installedNames;
  }

  async cleanupDiscoveredRepo(tempRepoPath: string): Promise<void> {
    await this.skillService.removeTempRepo(tempRepoPath);
  }

  detectConflicts(skillName: string): WorkbenchConflict[] {
    return this.syncCheck.detectConflicts(skillName);
  }

  resolveConflicts(
    skillName: string,
    resolutions: Map<string, WorkbenchConflictResolution>
  ): string[] {
    const linkedAgentIds = this.syncCheck.resolveConflicts(skillName, resolutions);
    const skill = this.storage.getSkill(skillName);
    if (!skill) return linkedAgentIds;

    const merged = new Map<string, SyncMode extends never ? never : (typeof skill.syncedTo)[0]>();
    for (const record of skill.syncedTo) {
      merged.set(record.agentId, record);
    }
    for (const agentId of linkedAgentIds) {
      merged.set(agentId, { agentId, mode: 'copy' });
    }
    this.storage.updateSkillSync(skillName, Array.from(merged.values()));
    return linkedAgentIds;
  }

  async syncSkillsToAgents(
    skillNames: string[],
    agentIds: string[],
    mode: SyncMode
  ): Promise<
    Array<{ target: string; success: boolean; path: string; mode: SyncMode; error?: string }>
  > {
    const results: Array<{
      target: string;
      success: boolean;
      path: string;
      mode: SyncMode;
      error?: string;
    }> = [];

    for (const skillName of unique(skillNames)) {
      for (const agentId of unique(agentIds)) {
        const agent = this.storage.getAgent(agentId);
        const syncResults = await this.syncService.sync(skillName, agent ? [agent] : [], mode);
        results.push(...syncResults);
      }
    }

    return results;
  }

  async syncSkillsToProjects(
    skillNames: string[],
    projectIds: string[],
    agentTypes: string[],
    mode: SyncMode
  ): Promise<
    Array<{ target: string; success: boolean; path: string; mode: SyncMode; error?: string }>
  > {
    const results: Array<{
      target: string;
      success: boolean;
      path: string;
      mode: SyncMode;
      error?: string;
    }> = [];

    for (const skillName of unique(skillNames)) {
      for (const projectId of unique(projectIds)) {
        const syncResults = await this.projectSyncService.syncToProject(
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

  async unsyncSkillsFromAgents(skillNames: string[], agentIds: string[]): Promise<void> {
    for (const skillName of unique(skillNames)) {
      await this.syncService.unsync(skillName, unique(agentIds));
    }
  }

  async unsyncSkillsFromProjects(
    skillNames: string[],
    projectIds: string[],
    options?: { mode?: 'all' | 'specific'; agentTypes?: string[] }
  ): Promise<void> {
    const mode = options?.mode ?? 'all';
    const uniqueProjects = unique(projectIds);
    const uniqueTypes = unique(options?.agentTypes ?? []);

    for (const skillName of unique(skillNames)) {
      if (mode === 'all') {
        for (const projectId of uniqueProjects) {
          await this.projectSyncService.unsyncFromProject(skillName, projectId);
        }
        continue;
      }

      for (const projectId of uniqueProjects) {
        if (projectId.includes(':')) {
          await this.projectSyncService.unsync(skillName, [projectId]);
          continue;
        }

        await this.projectSyncService.unsyncFromProject(skillName, projectId, uniqueTypes);
      }
    }
  }

  async updateSkills(skillNames: string[]): Promise<UpdateSkillResult[]> {
    const results: UpdateSkillResult[] = [];

    for (const skillName of unique(skillNames)) {
      const skill = this.storage.getSkill(skillName);
      const sourceType = !skill
        ? 'unknown'
        : skill.source.type === 'git'
          ? 'git'
          : skill.source.type === 'project'
            ? 'project'
            : 'local';

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

      try {
        const updated = await this.skillService.update(skillName);
        if (!updated) {
          results.push({
            skillName,
            sourceType,
            outcome: 'skipped',
            detail: 'Repository could not be updated',
          });
          continue;
        }

        try {
          await this.syncService.resync(skillName);
        } catch {
          // Keep update success even if background resync fails.
        }
        try {
          await this.projectSyncService.resync(skillName);
        } catch {
          // Keep update success even if background resync fails.
        }

        results.push({
          skillName,
          sourceType,
          outcome: 'updated',
        });
      } catch (error: unknown) {
        results.push({
          skillName,
          sourceType,
          outcome: 'error',
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  updateCategories(
    skillNames: string[],
    mode: SkillCategoryUpdateMode,
    categories: string[]
  ): Promise<Array<{ skillName: string; success: boolean; categories: string[]; error?: string }>> {
    return Promise.resolve(
      unique(skillNames).map((skillName) => {
        try {
          const updated = this.skillService.updateCategories(skillName, categories, mode);
          return {
            skillName,
            success: true,
            categories: updated.categories,
          };
        } catch (error: unknown) {
          return {
            skillName,
            success: false,
            categories: [],
            error: error instanceof Error ? error.message : String(error),
          };
        }
      })
    );
  }

  async removeSkill(skillName: string): Promise<void> {
    const skill = this.storage.getSkill(skillName);
    if (!skill) return;

    const agentIds = skill.syncedTo.map((record) => record.agentId);
    if (agentIds.length > 0) {
      await this.syncService.unsync(skillName, agentIds);
    }

    const projectTargetIds = (skill.syncedProjects ?? []).map(
      (record) => `${record.projectId}:${record.agentType}`
    );
    if (projectTargetIds.length > 0) {
      await this.projectSyncService.unsync(skillName, projectTargetIds);
    }

    await this.skillService.delete(skillName);
  }

  restoreSkill(snapshot: Record<string, unknown>): void {
    const name = snapshot.name as string;
    if (!name) return;
    const createdAt = (snapshot.createdAt ?? new Date().toISOString()) as string;
    this.storage.saveSkillMeta(name, {
      name,
      source: (snapshot.source ?? { type: 'local' }) as SkillMeta['source'],
      createdAt,
      updatedAt: (snapshot.updatedAt ?? createdAt) as string,
      categories: (snapshot.categories ?? []) as SkillMeta['categories'],
      syncedTo: (snapshot.syncedTo ?? []) as SkillMeta['syncedTo'],
      syncedProjects: (snapshot.syncedProjects ?? undefined) as SkillMeta['syncedProjects'],
    });
  }

  async importFromProject(projectId: string, skillNames: string[]): Promise<ContextImportResult[]> {
    const project = this.storage.getProject(projectId);
    if (!project) {
      return [makeImportResult(projectId, 'error', 'Project not found')];
    }

    const discovered = this.scanService.scanProject(project.path);
    const results: ContextImportResult[] = [];
    for (const skillName of unique(skillNames)) {
      const found = discovered.find((item) => item.name === skillName);
      if (!found) {
        results.push(makeImportResult(skillName, 'error', 'Not found in project'));
        continue;
      }
      if (this.skillService.exists(skillName)) {
        results.push(makeImportResult(skillName, 'error', 'Already exists'));
        continue;
      }
      try {
        await this.skillService.importFromPath(found.path, skillName, {
          type: 'project',
          projectId,
        });
        results.push(makeImportResult(skillName, 'success'));
      } catch (error: unknown) {
        results.push(
          makeImportResult(
            skillName,
            'error',
            error instanceof Error ? error.message : String(error)
          )
        );
      }
    }
    return results;
  }

  async importFromAgent(agentId: string, skillNames: string[]): Promise<ContextImportResult[]> {
    const agent = this.storage.getAgent(agentId);
    if (!agent) {
      return [makeImportResult(agentId, 'error', 'Agent not found')];
    }

    const results: ContextImportResult[] = [];
    for (const skillName of unique(skillNames)) {
      if (this.skillService.exists(skillName)) {
        results.push(makeImportResult(skillName, 'error', 'Already exists'));
        continue;
      }
      try {
        const sourcePath = path.join(agent.basePath, skillName);
        await this.skillService.importFromPath(sourcePath, skillName, {
          type: 'local',
          importedFrom: { agent: agentId, path: sourcePath },
        });
        results.push(makeImportResult(skillName, 'success'));
      } catch (error: unknown) {
        results.push(
          makeImportResult(
            skillName,
            'error',
            error instanceof Error ? error.message : String(error)
          )
        );
      }
    }
    return results;
  }

  async importContextSkills(rows: WorkbenchSkillRow[]): Promise<ContextImportResult[]> {
    const uniqueRows = Array.from(new Map(rows.map((row) => [row.rowId, row] as const)).values());
    const results: ContextImportResult[] = [];

    for (const row of uniqueRows) {
      if (row.registrySkillName || this.skillService.exists(row.name)) {
        results.push(
          makeImportResult(
            row.projectId ? `${row.projectId}:${row.name}` : row.name,
            'skipped',
            'Already imported'
          )
        );
        continue;
      }

      try {
        if (row.projectId) {
          await this.skillService.importFromPath(row.path, row.name, {
            type: 'project',
            projectId: row.projectId,
          });
        } else {
          await this.skillService.importFromPath(row.path, row.name, {
            type: 'local',
            importedFrom: {
              agent: row.agentId ?? 'unknown',
              path: row.path,
            },
          });
        }

        results.push(
          makeImportResult(row.projectId ? `${row.projectId}:${row.name}` : row.name, 'success')
        );
      } catch (error: unknown) {
        results.push(
          makeImportResult(
            row.projectId ? `${row.projectId}:${row.name}` : row.name,
            'error',
            error instanceof Error ? error.message : String(error)
          )
        );
      }
    }

    return results;
  }

  async addAgent(
    id: string,
    name: string,
    basePath: string,
    skillsDirName?: string
  ): Promise<void> {
    if (!id.trim()) throw new Error('Agent ID is required');
    if (!/^[a-zA-Z0-9-_]+$/.test(id)) {
      throw new Error('Agent ID must contain only letters, numbers, hyphens, and underscores');
    }
    if (this.storage.listAllDefinedAgents().some((agent) => agent.id === id)) {
      throw new Error(`Agent "${id}" already exists`);
    }

    const expandedPath = basePath.replace(/^~(?=[/\\])/, os.homedir());
    if (!this.fileOps.pathExists(expandedPath)) {
      await this.fileOps.ensureDir(expandedPath);
    }

    this.storage.addAgent(id, name, expandedPath, skillsDirName);
  }

  removeAgent(agentId: string): Promise<void> {
    this.storage.runBatch((repo) => {
      for (const skill of repo.listSkills()) {
        const updatedSyncedTo = skill.syncedTo.filter((record) => record.agentId !== agentId);
        if (updatedSyncedTo.length !== skill.syncedTo.length) {
          repo.updateSkillSync(skill.name, updatedSyncedTo);
        }

        const updatedSyncedProjects = (skill.syncedProjects ?? []).filter(
          (record) => record.agentType !== agentId
        );
        if (updatedSyncedProjects.length !== (skill.syncedProjects ?? []).length) {
          repo.updateSkillProjectSync(skill.name, updatedSyncedProjects);
        }
      }

      repo.removeAgent(agentId);
    });
    return Promise.resolve();
  }

  restoreAgent(snapshot: Record<string, unknown>): void {
    const id = snapshot.id as string;
    const name = snapshot.name as string;
    const basePath = snapshot.basePath as string;
    const skillsDirName = snapshot.skillsDirName as string | undefined;
    if (!id || !name || !basePath) return;
    this.storage.addAgent(id, name, basePath, skillsDirName);
  }

  addProject(id: string, projectPath: string): Promise<void> {
    if (!id.trim()) throw new Error('Project ID is required');
    if (!/^[a-zA-Z0-9-_]+$/.test(id)) {
      throw new Error('Project ID must contain only letters, numbers, hyphens, and underscores');
    }
    if (this.storage.listProjects().some((project) => project.id === id)) {
      throw new Error(`Project "${id}" already exists`);
    }

    const expandedPath = projectPath.replace(/^~(?=[/\\])/, os.homedir());
    if (!this.fileOps.pathExists(expandedPath)) {
      throw new Error(`Path does not exist: ${expandedPath}`);
    }

    this.storage.addProject(id, expandedPath);
    return Promise.resolve();
  }

  removeProject(projectId: string): Promise<void> {
    this.storage.runBatch((repo) => {
      for (const skill of repo.listSkills()) {
        const updatedProjects = (skill.syncedProjects ?? []).filter(
          (record) => record.projectId !== projectId
        );
        if (updatedProjects.length !== (skill.syncedProjects ?? []).length) {
          repo.updateSkillProjectSync(skill.name, updatedProjects);
        }
      }

      repo.removeProject(projectId);
    });
    return Promise.resolve();
  }

  restoreProject(snapshot: Record<string, unknown>): void {
    const id = snapshot.id as string;
    const projectPath = snapshot.path as string;
    const addedAt = snapshot.addedAt as string | undefined;
    if (!id || !projectPath) return;
    this.storage.addProject(id, projectPath, addedAt);
  }

  setTuiLanguagePreference(preference: TuiLanguagePreference): void {
    this.storage.updateSettings({ tuiLanguage: preference });
  }
}
