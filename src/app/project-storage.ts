/**
 * @module App/ProjectStorage
 * @layer app
 * @allowed-imports infra/, types
 * @responsibility Project-local `.agentforge.json` config read/write.
 *
 * Manages the project-local config file that records which skills have been
 * synced to that project (and under which agent type / mode). Unlike the
 * user-level Storage singleton, this is per-project and stateless.
 */

import path from 'path';

import fs from 'fs-extra';

import type {
  ProjectLocalConfig,
  ProjectLocalSyncRecord,
  ProjectStateRepository,
} from '../infra/project-state-repository.js';
import type { AgentId } from '../types.js';

const DEFAULT_CONFIG: ProjectLocalConfig = {
  syncedSkills: [],
};

const CONFIG_FILE = '.agentforge.json';

/**
 * Read, write, and update the project-local `.agentforge.json` config.
 * All methods are synchronous because the file is small and operations are fast.
 */
export class ProjectStorage implements ProjectStateRepository {
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

  update(projectPath: string, updater: (config: ProjectLocalConfig) => ProjectLocalConfig): void {
    const current = this.read(projectPath);
    this.write(projectPath, updater(current));
  }

  addSyncRecord(projectPath: string, record: ProjectLocalSyncRecord): void {
    this.update(projectPath, (config) => {
      const next = {
        ...config,
        syncedSkills: [...config.syncedSkills],
      };
      const existingIndex = next.syncedSkills.findIndex(
        (s) => s.name === record.name && s.agentType === record.agentType
      );

      if (existingIndex >= 0) {
        next.syncedSkills[existingIndex] = record;
      } else {
        next.syncedSkills.push(record);
      }

      return next;
    });
  }

  removeSyncRecord(projectPath: string, skillName: string, agentType?: AgentId): void {
    this.update(projectPath, (config) => ({
      ...config,
      syncedSkills: config.syncedSkills.filter((s) => {
        if (s.name !== skillName) return true;
        if (agentType && s.agentType !== agentType) return true;
        return false;
      }),
    }));
  }

  getSyncRecord(
    projectPath: string,
    skillName: string,
    agentType: AgentId
  ): ProjectLocalSyncRecord | undefined {
    const config = this.read(projectPath);
    return config.syncedSkills.find((s) => s.name === skillName && s.agentType === agentType);
  }
}
