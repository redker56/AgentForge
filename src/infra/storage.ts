/**
 * @module Infra/JsonRegistryRepository
 * @layer infra
 * @allowed-imports types
 * @responsibility JSON registry repository -- reads/writes `~/.agentforge/registry.json`.
 *
 * All access to skill metadata, agent configuration, and project records
 * goes through this JSON-backed repository implementation.
 *
 * @architecture Infrastructure repository. Entry points instantiate this adapter and
 * inject it into app-layer services through `RegistryRepository`.
 */

import os from 'os';
import path from 'path';

import fs from 'fs-extra';

import {
  BUILTIN_AGENTS,
  type Agent,
  type RegistryData,
  type SkillMeta,
  normalizeSkillCategories,
  type SkillSource,
  type ProjectConfig,
  type SyncRecord,
  type ProjectSyncRecord,
  type StorageInterface,
} from '../types.js';

import type { RegistryRepository } from './registry-repository.js';

const DEFAULT_FORGE_DIR = path.join(os.homedir(), '.agentforge');

const DEFAULT_REGISTRY: RegistryData = {
  version: '1.0',
  skills: {},
  agents: {},
  projects: {},
};

export class JsonRegistryRepository implements StorageInterface, RegistryRepository {
  private readonly forgeDir: string;
  private readonly skillsDir: string;
  private readonly registryFile: string;
  private data: RegistryData;
  private batchDepth = 0;
  private batchDirty = false;

  constructor(forgeDir: string = DEFAULT_FORGE_DIR) {
    this.forgeDir = forgeDir;
    this.skillsDir = path.join(forgeDir, 'skills');
    this.registryFile = path.join(forgeDir, 'registry.json');
    this.data = this.load();
  }

  // ========== Path ==========

  getSkillsDir(): string {
    return this.skillsDir;
  }

  getSkillPath(name: string): string {
    return path.join(this.skillsDir, name);
  }

  // ========== Skill ==========

  listSkills(): SkillMeta[] {
    return Object.values(this.data.skills);
  }

  getSkill(name: string): SkillMeta | undefined {
    return this.data.skills[name];
  }

  /** Register a new skill with its source information and persist to disk. */
  saveSkill(name: string, source: SkillSource): void {
    const now = new Date().toISOString();
    this.data.skills[name] = {
      name,
      source,
      createdAt: now,
      updatedAt: now,
      categories: [],
      syncedTo: [],
    };
    this.schedulePersist();
  }

  /**
   * Write a full SkillMeta to the registry, preserving all fields.
   * Used by the undo restore system to re-add a skill entry with its
   * original createdAt, syncedTo, and syncedProjects values.
   */
  saveSkillMeta(name: string, meta: SkillMeta): void {
    this.data.skills[name] = {
      ...meta,
      categories: normalizeSkillCategories(meta.categories),
    };
    this.schedulePersist();
  }

  /** Remove a skill entry from the registry and persist. Does not touch the file system. */
  deleteSkill(name: string): void {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.data.skills[name];
    this.schedulePersist();
  }

  /** Replace the user-level sync records for a skill. */
  updateSkillSync(name: string, records: SyncRecord[]): void {
    const skill = this.data.skills[name];
    if (skill) {
      skill.syncedTo = records;
      this.schedulePersist();
    }
  }

  /** Replace the project-level sync records for a skill. */
  updateSkillProjectSync(name: string, records: ProjectSyncRecord[]): void {
    const skill = this.data.skills[name];
    if (skill) {
      skill.syncedProjects = records;
      this.schedulePersist();
    }
  }

  // ========== Agent ==========

  /** List all agents whose base path currently exists on disk (built-in + custom). */
  listAgents(): Agent[] {
    // Built-in Agents: only return those with existing paths
    const builtins = BUILTIN_AGENTS.filter((a) => fs.existsSync(a.basePath));
    // Custom Agents
    const customs = Object.entries(this.data.agents)
      .filter(([_, a]) => fs.existsSync(a.basePath))
      .map(([id, a]) => ({
        id,
        name: a.name,
        basePath: a.basePath,
        skillsDirName: a.skillsDirName,
      }));
    return [...builtins, ...customs];
  }

  getAgent(id: string): Agent | undefined {
    // Built-in Agents: only return if path exists
    const builtin = BUILTIN_AGENTS.find((a) => a.id === id);
    if (builtin && fs.existsSync(builtin.basePath)) {
      return builtin;
    }

    // Custom Agents
    const custom = this.data.agents[id];
    if (custom && fs.existsSync(custom.basePath)) {
      return {
        id,
        name: custom.name,
        basePath: custom.basePath,
        skillsDirName: custom.skillsDirName,
      };
    }
    return undefined;
  }

  /**
   * List all defined Agents (including those with non-existent paths)
   * Used by project sync to resolve agent configs regardless of path existence
   */
  listAllDefinedAgents(): Agent[] {
    const builtins = BUILTIN_AGENTS;
    const customs = Object.entries(this.data.agents).map(([id, a]) => ({
      id,
      name: a.name,
      basePath: a.basePath,
      skillsDirName: a.skillsDirName,
    }));
    return [...builtins, ...customs];
  }

  /** Register a custom agent and persist. */
  addAgent(id: string, name: string, basePath: string, skillsDirName?: string): void {
    this.data.agents[id] = { name, basePath, skillsDirName };
    this.schedulePersist();
  }

  /** Remove a custom agent. Returns `true` if the agent existed and was removed. */
  removeAgent(id: string): boolean {
    if (this.data.agents[id]) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.data.agents[id];
      this.schedulePersist();
      return true;
    }
    return false;
  }

  // ========== Project ==========

  listProjects(): ProjectConfig[] {
    return Object.values(this.data.projects);
  }

  getProject(id: string): ProjectConfig | undefined {
    return this.data.projects[id];
  }

  /** Register a project and persist. */
  addProject(id: string, projectPath: string, addedAt?: string): void {
    this.data.projects[id] = {
      id,
      path: projectPath,
      addedAt: addedAt ?? new Date().toISOString(),
    };
    this.schedulePersist();
  }

  /** Remove a project. Returns `true` if the project existed and was removed. */
  removeProject(id: string): boolean {
    if (this.data.projects[id]) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.data.projects[id];
      this.schedulePersist();
      return true;
    }
    return false;
  }

  runBatch<T>(mutator: (repo: RegistryRepository) => T): T {
    this.batchDepth += 1;
    try {
      return mutator(this);
    } finally {
      this.batchDepth -= 1;
      if (this.batchDepth === 0 && this.batchDirty) {
        this.persist();
        this.batchDirty = false;
      }
    }
  }

  snapshot(): RegistryData {
    return JSON.parse(JSON.stringify(this.data)) as RegistryData;
  }

  // ========== Internal ==========

  private load(): RegistryData {
    try {
      if (fs.existsSync(this.registryFile)) {
        const content = fs.readFileSync(this.registryFile, 'utf-8');
        const data = JSON.parse(content) as Partial<RegistryData>;
        let migrated = false;

        const skills = Object.fromEntries(
          Object.entries(data.skills ?? {}).map(([name, skill]) => {
            const normalizedCategories = normalizeSkillCategories(skill.categories ?? []);
            const normalized: SkillMeta = {
              ...skill,
              categories: normalizedCategories,
              syncedTo: skill.syncedTo ?? [],
              ...(skill.syncedProjects ? { syncedProjects: skill.syncedProjects } : {}),
              ...(skill.updatedAt || !skill.createdAt ? {} : { updatedAt: skill.createdAt }),
            };

            if (
              (!skill.updatedAt && skill.createdAt) ||
              !Array.isArray(skill.categories) ||
              normalizedCategories.length !== (skill.categories ?? []).length ||
              normalizedCategories.some(
                (category, index) => category !== (skill.categories ?? [])[index]
              )
            ) {
              migrated = true;
            }

            return [name, normalized];
          })
        );

        const registry: RegistryData = {
          ...DEFAULT_REGISTRY,
          ...data,
          skills,
          agents: data.agents ?? {},
          projects: data.projects ?? {},
        };

        if (migrated) {
          this.writeRegistry(registry);
        }

        return registry;
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_REGISTRY };
  }

  private persist(): void {
    this.writeRegistry(this.data);
  }

  private writeRegistry(data: RegistryData): void {
    fs.ensureDirSync(this.forgeDir);
    const tempFile = `${this.registryFile}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
    fs.renameSync(tempFile, this.registryFile);
  }

  private schedulePersist(): void {
    if (this.batchDepth > 0) {
      this.batchDirty = true;
      return;
    }

    this.persist();
  }
}
