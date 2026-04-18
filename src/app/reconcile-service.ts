/**
 * @module App/ReconcileService
 * @layer app
 * @responsibility Reconcile registry and project-local metadata with real file-system state.
 */

import path from 'path';

import fs from 'fs-extra';

import {
  type Agent,
  type ProjectConfig,
  type ProjectSyncRecord,
  type SkillMeta,
  type SkillSource,
  type SyncMode,
  type SyncRecord,
} from '../types.js';

import { ProjectStorage } from './project-storage.js';

interface ScanServiceLike {
  getSkillProjectDistributionWithStatus(skillName: string): Promise<
    Array<{
      projectId: string;
      agents: Array<{ id: string; name: string; isDifferentVersion: boolean }>;
    }>
  >;
}

interface StorageLike {
  getSkillsDir(): string;
  deleteSkill(name: string): void;
  listProjects(): ProjectConfig[];
  getProject(id: string): ProjectConfig | undefined;
  listSkills(): SkillMeta[];
  listAllDefinedAgents(): Agent[];
  saveSkill(name: string, source: SkillSource): void;
  updateSkillSync(name: string, records: SyncRecord[]): void;
  updateSkillProjectSync(name: string, records: ProjectSyncRecord[]): void;
}

interface ReconcileSummary {
  registeredSkillsAdded: number;
  registeredSkillsRemoved: number;
  userSyncRecordsUpdated: number;
  projectSyncRecordsUpdated: number;
  localConfigUpdated: number;
}

interface DesiredProjectSyncRecord {
  projectId: string;
  skillName: string;
  agentType: string;
  mode: SyncMode;
}

const DEFAULT_SUMMARY: ReconcileSummary = {
  registeredSkillsAdded: 0,
  registeredSkillsRemoved: 0,
  userSyncRecordsUpdated: 0,
  projectSyncRecordsUpdated: 0,
  localConfigUpdated: 0,
};

const hasSkillManifest = (skillPath: string): boolean => {
  return (
    fs.existsSync(path.join(skillPath, 'SKILL.md')) ||
    fs.existsSync(path.join(skillPath, 'skill.md'))
  );
};

const sortSyncRecords = (records: SyncRecord[]): SyncRecord[] =>
  records
    .slice()
    .sort((a, b) => (a.agentId < b.agentId ? -1 : a.agentId > b.agentId ? 1 : 0));

const sortProjectSyncRecords = (records: ProjectSyncRecord[]): ProjectSyncRecord[] =>
  records
    .slice()
    .sort((a, b) => {
      if (a.projectId !== b.projectId) return a.projectId < b.projectId ? -1 : 1;
      if (a.agentType !== b.agentType) return a.agentType < b.agentType ? -1 : 1;
      return 0;
    });

const isSameSyncRecords = (a: SyncRecord[], b: SyncRecord[]): boolean => {
  const left = sortSyncRecords(a);
  const right = sortSyncRecords(b);
  if (left.length !== right.length) return false;
  return left.every(
    (record, index) =>
      record.agentId === right[index].agentId && record.mode === right[index].mode
  );
};

const isSameProjectSyncRecords = (
  a: ProjectSyncRecord[],
  b: ProjectSyncRecord[]
): boolean => {
  const left = sortProjectSyncRecords(a);
  const right = sortProjectSyncRecords(b);
  if (left.length !== right.length) return false;
  return left.every(
    (record, index) =>
      record.projectId === right[index].projectId &&
      record.agentType === right[index].agentType &&
      record.mode === right[index].mode
  );
};

const isSameProjectLocalRecords = (
  existing: Array<{ name: string; mode: SyncMode; agentType: string }>,
  next: Array<{ name: string; mode: SyncMode; agentType: string }>
): boolean => {
  if (existing.length !== next.length) return false;

  const normalizedExisting = existing
    .slice()
    .sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : a.agentType < b.agentType ? -1 : 1
    );
  const normalizedNext = next
    .slice()
    .sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : a.agentType < b.agentType ? -1 : 1
    );

  return normalizedExisting.every(
    (record, index) =>
      record.name === normalizedNext[index].name &&
      record.agentType === normalizedNext[index].agentType &&
      record.mode === normalizedNext[index].mode
  );
};

export class ReconcileService {
  private readonly projectStorage = new ProjectStorage();

  constructor(
    private readonly storage: StorageLike,
    private readonly scanService: ScanServiceLike
  ) {}

  async reconcile(): Promise<ReconcileSummary> {
    const summary: ReconcileSummary = { ...DEFAULT_SUMMARY };

    const knownAgents = this.storage.listAllDefinedAgents();
    const knownProjects = this.storage.listProjects();
    const configuredSkills = this.storage.listSkills();
    const discoveredSkills = this.discoverSkillFolders();

    for (const skill of configuredSkills) {
      if (!discoveredSkills.has(skill.name)) {
        this.storage.deleteSkill(skill.name);
        summary.registeredSkillsRemoved += 1;
      }
    }

    const configuredByName = new Map(configuredSkills.map((skill) => [skill.name, skill]));
    for (const skillName of discoveredSkills) {
      if (!configuredByName.has(skillName)) {
        this.storage.saveSkill(skillName, { type: 'local' } as SkillSource);
        summary.registeredSkillsAdded += 1;
      }
    }

    const refreshedSkills = this.storage.listSkills();
    this.reconcileUserSyncRecords(refreshedSkills, knownAgents, summary);

    const desiredProjectRecords = await this.reconcileProjectSyncRecords(
      refreshedSkills,
      knownProjects,
      summary
    );
    summary.localConfigUpdated += this.reconcileProjectLocalConfigs(
      knownProjects,
      desiredProjectRecords
    );

    return summary;
  }

  private reconcileUserSyncRecords(
    skills: SkillMeta[],
    agents: Agent[],
    summary: ReconcileSummary
  ): void {
    for (const skill of skills) {
      const currentByAgent = new Map<string, SyncMode>(
        skill.syncedTo.map((record) => [record.agentId, record.mode])
      );
      const wanted: SyncRecord[] = [];

      for (const agent of agents) {
        if (!fs.existsSync(agent.basePath)) continue;

        const skillPath = path.join(agent.basePath, skill.name);
        if (!fs.existsSync(skillPath) || !hasSkillManifest(skillPath)) continue;

        wanted.push({ agentId: agent.id, mode: currentByAgent.get(agent.id) ?? 'copy' });
      }

      if (!isSameSyncRecords(wanted, skill.syncedTo)) {
        this.storage.updateSkillSync(skill.name, wanted);
        summary.userSyncRecordsUpdated += 1;
      }
    }
  }

  private async reconcileProjectSyncRecords(
    skills: SkillMeta[],
    projects: ProjectConfig[],
    summary: ReconcileSummary
  ): Promise<Map<string, DesiredProjectSyncRecord[]>> {
    const desiredBySkill = new Map<string, DesiredProjectSyncRecord[]>();
    const projectPathById = new Map(projects.map((project) => [project.id, project.path]));

    for (const skill of skills) {
      const syncedByTarget = new Map<string, SyncMode>(
        (skill.syncedProjects || []).map((record) => [`${record.projectId}:${record.agentType}`, record.mode])
      );
      const desiredRecords: ProjectSyncRecord[] = [];
      const desiredByProject: DesiredProjectSyncRecord[] = [];
      const distribution = await this.scanService.getSkillProjectDistributionWithStatus(skill.name);

      for (const project of distribution) {
        const projectPath = projectPathById.get(project.projectId);
        if (!projectPath) continue;

        for (const agent of project.agents) {
          const targetKey = `${project.projectId}:${agent.id}`;
          const localMode = this.getProjectLocalMode(projectPath, skill.name, agent.id);
          const mode = localMode ?? syncedByTarget.get(targetKey) ?? 'copy';

          desiredRecords.push({
            projectId: project.projectId,
            agentType: agent.id,
            mode,
          });
          desiredByProject.push({
            projectId: project.projectId,
            skillName: skill.name,
            agentType: agent.id,
            mode,
          });
        }
      }

      if (!isSameProjectSyncRecords(skill.syncedProjects || [], desiredRecords)) {
        this.storage.updateSkillProjectSync(skill.name, desiredRecords);
        summary.projectSyncRecordsUpdated += 1;
      }

      desiredBySkill.set(skill.name, desiredByProject);
    }

    return desiredBySkill;
  }

  private reconcileProjectLocalConfigs(
    projects: ProjectConfig[],
    desiredBySkill: Map<string, DesiredProjectSyncRecord[]>
  ): number {
    let updated = 0;

    const desiredByProject = new Map<string, Array<{ name: string; agentType: string; mode: SyncMode; syncedAt: string }>>();
    for (const [skillName, records] of desiredBySkill) {
      for (const record of records) {
        const existing = desiredByProject.get(record.projectId) || [];
        existing.push({
          name: skillName,
          agentType: record.agentType,
          mode: record.mode,
          syncedAt: new Date().toISOString(),
        });
        desiredByProject.set(record.projectId, existing);
      }
    }

    for (const project of projects) {
      const existing = this.projectStorage.read(project.path);
      const desired = desiredByProject.get(project.id) || [];
      const existingReduced = existing.syncedSkills.map((record) => ({
        name: record.name,
        agentType: record.agentType,
        mode: record.mode,
      }));
      const next = desired.map((record) => ({
        name: record.name,
        agentType: record.agentType,
        mode: record.mode,
      }));

      if (!isSameProjectLocalRecords(existingReduced, next)) {
        const syncedAtByKey = new Map(
          existing.syncedSkills.map((record) => [
            `${record.name}:${record.agentType}`,
            record.syncedAt,
          ])
        );

        this.projectStorage.write(project.path, {
          syncedSkills: next.map((record) => ({
            name: record.name,
            agentType: record.agentType,
            mode: record.mode,
            syncedAt: syncedAtByKey.get(`${record.name}:${record.agentType}`) ?? new Date().toISOString(),
          })),
        });
        updated += 1;
      }
    }

    return updated;
  }

  private getProjectLocalMode(projectPath: string, skillName: string, agentType: string): SyncMode | null {
    const projectConfig = this.projectStorage.read(projectPath);
    const record = projectConfig.syncedSkills.find(
      (entry) => entry.name === skillName && entry.agentType === agentType
    );
    return record?.mode ?? null;
  }

  private discoverSkillFolders(): Set<string> {
    const skillsDir = this.storage.getSkillsDir();
    const discovered = new Set<string>();
    if (!fs.existsSync(skillsDir)) return discovered;

    for (const entry of fs.readdirSync(skillsDir)) {
      const skillPath = path.join(skillsDir, entry);
      try {
        if (!fs.statSync(skillPath).isDirectory() || !hasSkillManifest(skillPath)) continue;
      } catch {
        continue;
      }
      discovered.add(entry);
    }

    return discovered;
  }
}
