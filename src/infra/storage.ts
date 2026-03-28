/**
 * Storage Layer - Data Persistence
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { BUILTIN_AGENTS, type Agent, type RegistryData, type SkillMeta, type SkillSource, type ProjectConfig, type SyncRecord, type SyncMode, type ProjectSyncRecord } from '../types.js';

const FORGE_DIR = path.join(os.homedir(), '.agentforge');
const SKILLS_DIR = path.join(FORGE_DIR, 'skills');
const REGISTRY_FILE = path.join(FORGE_DIR, 'registry.json');

const DEFAULT_REGISTRY: RegistryData = {
  version: '1.0',
  skills: {},
  agents: {},
  projects: {},
};

export class Storage {
  private data: RegistryData;
  private static instance: Storage;

  private constructor() {
    this.data = this.load();
  }

  static getInstance(): Storage {
    if (!Storage.instance) {
      Storage.instance = new Storage();
    }
    return Storage.instance;
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

  saveSkill(name: string, source: SkillSource): void {
    this.data.skills[name] = {
      name,
      source,
      createdAt: new Date().toISOString(),
      syncedTo: [],
    };
    this.persist();
  }

  deleteSkill(name: string): void {
    delete this.data.skills[name];
    this.persist();
  }

  updateSkillSync(name: string, records: SyncRecord[]): void {
    const skill = this.data.skills[name];
    if (skill) {
      skill.syncedTo = records;
      this.persist();
    }
  }

  updateSkillProjectSync(name: string, records: ProjectSyncRecord[]): void {
    const skill = this.data.skills[name];
    if (skill) {
      skill.syncedProjects = records;
      this.persist();
    }
  }

  // ========== Agent ==========

  listAgents(): Agent[] {
    // Built-in Agents: only return those with existing paths
    const builtins = BUILTIN_AGENTS.filter(a => fs.existsSync(a.basePath));
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
    const builtin = BUILTIN_AGENTS.find(a => a.id === id);
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

  addAgent(id: string, name: string, basePath: string, skillsDirName?: string): void {
    this.data.agents[id] = { name, basePath, skillsDirName };
    this.persist();
  }

  removeAgent(id: string): boolean {
    if (this.data.agents[id]) {
      delete this.data.agents[id];
      this.persist();
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

  addProject(id: string, projectPath: string): void {
    this.data.projects[id] = {
      id,
      path: projectPath,
      addedAt: new Date().toISOString(),
    };
    this.persist();
  }

  removeProject(id: string): boolean {
    if (this.data.projects[id]) {
      delete this.data.projects[id];
      this.persist();
      return true;
    }
    return false;
  }

  // ========== Internal ==========

  private load(): RegistryData {
    try {
      if (fs.existsSync(REGISTRY_FILE)) {
        const content = fs.readFileSync(REGISTRY_FILE, 'utf-8');
        const data = JSON.parse(content);
        return { ...DEFAULT_REGISTRY, ...data };
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
}
