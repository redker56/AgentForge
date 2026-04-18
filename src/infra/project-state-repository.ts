import type { AgentId, SyncMode } from '../types.js';

export interface ProjectLocalSyncRecord {
  name: string;
  syncedAt: string;
  mode: SyncMode;
  agentType: AgentId;
}

export interface ProjectLocalConfig {
  syncedSkills: ProjectLocalSyncRecord[];
}

export interface ProjectStateRepository {
  read(projectPath: string): ProjectLocalConfig;
  write(projectPath: string, config: ProjectLocalConfig): void;
  update(projectPath: string, updater: (config: ProjectLocalConfig) => ProjectLocalConfig): void;
  addSyncRecord(projectPath: string, record: ProjectLocalSyncRecord): void;
  removeSyncRecord(projectPath: string, skillName: string, agentType?: AgentId): void;
  getSyncRecord(
    projectPath: string,
    skillName: string,
    agentType: AgentId
  ): ProjectLocalSyncRecord | undefined;
}
