/**
 * Project Local Config Read/Write
 *
 * Handles .agentforge.json file in project directories
 */

import path from 'path';
import fs from 'fs-extra';
import type { SyncMode, AgentId } from '../types.js';

// Note: This type is for project local config file, different from ProjectSyncRecord in types.ts
// ProjectSyncRecord in types.ts is for registry.json
export interface ProjectLocalSyncRecord {
  name: string;
  syncedAt: string;
  mode: SyncMode;
  agentType: AgentId;
}

export interface ProjectLocalConfig {
  syncedSkills: ProjectLocalSyncRecord[];
}

const DEFAULT_CONFIG: ProjectLocalConfig = {
  syncedSkills: [],
};

const CONFIG_FILE = '.agentforge.json';

export class ProjectStorage {
  private getConfigPath(projectPath: string): string {
    return path.join(projectPath, CONFIG_FILE);
  }

  read(projectPath: string): ProjectLocalConfig {
    const configPath = this.getConfigPath(projectPath);

    try {
      if (fs.existsSync(configPath)) {
        const data = fs.readJsonSync(configPath);
        return { ...DEFAULT_CONFIG, ...data };
      }
    } catch {
      // File corrupted or read failed, return default config
    }

    return { ...DEFAULT_CONFIG };
  }

  write(projectPath: string, config: ProjectLocalConfig): void {
    const configPath = this.getConfigPath(projectPath);
    fs.ensureDirSync(path.dirname(configPath));
    fs.writeJsonSync(configPath, config, { spaces: 2 });
  }

  addSyncRecord(projectPath: string, record: ProjectLocalSyncRecord): void {
    const config = this.read(projectPath);

    const existingIndex = config.syncedSkills.findIndex(
      s => s.name === record.name && s.agentType === record.agentType
    );

    if (existingIndex >= 0) {
      config.syncedSkills[existingIndex] = record;
    } else {
      config.syncedSkills.push(record);
    }

    this.write(projectPath, config);
  }

  removeSyncRecord(projectPath: string, skillName: string, agentType?: AgentId): void {
    const config = this.read(projectPath);

    config.syncedSkills = config.syncedSkills.filter(s => {
      if (s.name !== skillName) return true;
      if (agentType && s.agentType !== agentType) return true;
      return false;
    });

    this.write(projectPath, config);
  }

  getSyncRecord(projectPath: string, skillName: string, agentType: AgentId): ProjectLocalSyncRecord | undefined {
    const config = this.read(projectPath);
    return config.syncedSkills.find(s => s.name === skillName && s.agentType === agentType);
  }
}
