/**
 * @module Types
 * @layer shared
 * @allowed-imports (none — this is the shared type layer)
 * @responsibility Core type definitions, interfaces, and constants used across all layers.
 *
 * This file is the only module that every layer may import from.
 * It must not import from infra/, app/, commands/, or tui/.
 */

// ========== Sync Mode ==========

export type SyncMode = 'copy' | 'symlink';

// ========== Agent ID ==========

export type AgentId =
  | 'claude'
  | 'codex'
  | 'gemini'
  | 'openclaw'
  | 'qoder'
  | 'opencode'
  | 'cursor'
  | string;

// ========== Project Sync ==========

export interface ProjectSyncTarget {
  project: ProjectConfig;
  agentType: AgentId;
}

export interface ProjectSyncRecord {
  projectId: string;
  agentType: AgentId;
  mode: SyncMode;
}

// ========== Agent ==========

export interface Agent {
  readonly id: string;
  readonly name: string;
  readonly basePath: string;
  readonly skillsDirName?: string;
}

// ========== Project ==========

export interface ProjectConfig {
  readonly id: string; // Unique identifier (alias)
  readonly path: string; // Project path
  readonly addedAt: string; // Added timestamp
}

// ========== Skill ==========

export type SkillSource =
  | { type: 'local'; importedFrom?: { agent: string; path: string } }
  | { type: 'git'; url: string }
  | { type: 'project'; projectId: string }; // Project source, path info detected at runtime

export interface SyncRecord {
  agentId: string;
  mode: SyncMode;
}

export interface SkillMeta {
  readonly name: string;
  readonly source: SkillSource;
  readonly createdAt: string;
  syncedTo: SyncRecord[];
  syncedProjects?: ProjectSyncRecord[];
}

export interface Skill extends SkillMeta {
  readonly path: string;
}

// ========== Registry ==========

export interface RegistryData {
  readonly version: string;
  skills: Record<string, SkillMeta>;
  agents: Record<string, { name: string; basePath: string; skillsDirName?: string }>;
  projects: Record<string, ProjectConfig>; // Project configurations
}

// ========== Built-in Agents ==========

import os from 'os';
import path from 'path';

export const BUILTIN_AGENTS: Agent[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    basePath: path.join(os.homedir(), '.claude', 'skills'),
    skillsDirName: 'claude',
  },
  {
    id: 'codex',
    name: 'Codex',
    basePath: path.join(os.homedir(), '.codex', 'skills'),
    skillsDirName: 'agents',
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    basePath: path.join(os.homedir(), '.gemini', 'skills'),
    skillsDirName: 'gemini',
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    basePath: path.join(os.homedir(), '.openclaw', 'workspace', 'skills'),
    skillsDirName: 'agents',
  },
  {
    id: 'qoder',
    name: 'Qoder',
    basePath: path.join(os.homedir(), '.qoder', 'skills'),
    skillsDirName: 'qoder',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    basePath: path.join(os.homedir(), '.config', 'opencode', 'skills'),
    skillsDirName: 'opencode',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    basePath: path.join(os.homedir(), '.cursor', 'skills'),
    skillsDirName: 'cursor',
  },
];

export function getAgentProjectSkillsRelativePath(
  agent: Pick<Agent, 'id' | 'skillsDirName'>
): string {
  const dirName = agent.skillsDirName || agent.id;
  return path.posix.join(`.${dirName}`, 'skills');
}

export function getAgentProjectSkillsDir(
  projectPath: string,
  agent: Pick<Agent, 'id' | 'skillsDirName'>
): string {
  return path.join(projectPath, ...getAgentProjectSkillsRelativePath(agent).split('/'));
}

// ========== Storage Interface (for layer compliance) ==========

/**
 * Storage interface for layer compliance.
 * Commands layer can import this type from types.ts, avoiding direct infra imports.
 * The actual Storage implementation is in infra/storage.ts and implements this interface.
 */
export interface StorageInterface {
  getSkillsDir(): string;
  getSkillPath(name: string): string;
  listSkills(): SkillMeta[];
  getSkill(name: string): SkillMeta | undefined;
  saveSkill(name: string, source: SkillSource): void;
  saveSkillMeta(name: string, meta: SkillMeta): void;
  deleteSkill(name: string): void;
  updateSkillSync(name: string, records: SyncRecord[]): void;
  updateSkillProjectSync(name: string, records: ProjectSyncRecord[]): void;
  listAgents(): Agent[];
  getAgent(id: string): Agent | undefined;
  listAllDefinedAgents(): Agent[];
  addAgent(id: string, name: string, basePath: string, skillsDirName?: string): void;
  removeAgent(id: string): boolean;
  listProjects(): ProjectConfig[];
  getProject(id: string): ProjectConfig | undefined;
  addProject(id: string, projectPath: string, addedAt?: string): void;
  removeProject(id: string): boolean;
}
