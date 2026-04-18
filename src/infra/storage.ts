/**
 * @module Infra/Storage
 * @layer infra
 * @allowed-imports types
 * @responsibility Data persistence singleton — reads/writes `~/.agentforge/registry.json`.
 *
 * All access to skill metadata, agent configuration, and project records
 * goes through this class. Implements the StorageInterface defined in types.ts.
 *
 * @architecture Infrastructure layer singleton. Only imports from `types.ts`.
 * Instantiated via `getInstance()` in `cli.ts` and injected into app-layer services.
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

const FORGE_DIR = path.join(os.homedir(), '.agentforge');
const SKILLS_DIR = path.join(FORGE_DIR, 'skills');
const REGISTRY_FILE = path.join(FORGE_DIR, 'registry.json');

const DEFAULT_REGISTRY: RegistryData = {
  version: '1.0',
  skills: {},
  agents: {},
  projects: {},
};

export class Storage implements StorageInterface, RegistryRepository {
  private data: RegistryData;
  private batchDepth = 0;
  private batchDirty = false;

  constructor() {
    this.data = this.load();
  }

  // ========== Path ==========

  getSkillsDir(): string {
    return SKILLS_DIR;
  }

  getSkillPath(name: string): string {
    return path.join(SKILLS_DIR, name);
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
      if (fs.existsSync(REGISTRY_FILE)) {
        const content = fs.readFileSync(REGISTRY_FILE, 'utf-8');
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
          fs.ensureDirSync(FORGE_DIR);
          fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
        }

        return registry;
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_REGISTRY };
  }

  private persist(): void {
    fs.ensureDirSync(FORGE_DIR);
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(this.data, null, 2));
  }

  private schedulePersist(): void {
    if (this.batchDepth > 0) {
      this.batchDirty = true;
      return;
    }

    this.persist();
  }
}
