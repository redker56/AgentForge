/**
 * ProjectStorage Tests
 */

import os from 'os';
import path from 'path';

import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { ProjectStorage } from '../../src/app/project-storage.js';

const TEST_DIR = path.join(os.tmpdir(), 'agentforge-project-storage-test');

describe('ProjectStorage', () => {
  let projectStorage: ProjectStorage;
  let projectPath: string;

  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
    projectPath = path.join(TEST_DIR, 'test-project');
    await fs.ensureDir(projectPath);
    projectStorage = new ProjectStorage();
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  describe('read/write', () => {
    it('should be able to read and write config', () => {
      const config = {
        syncedSkills: [
          {
            name: 'test-skill',
            syncedAt: '2024-01-01T00:00:00Z',
            mode: 'copy' as const,
            agentType: 'claude' as const,
          },
        ],
      };

      projectStorage.write(projectPath, config);
      const loaded = projectStorage.read(projectPath);

      expect(loaded.syncedSkills).toHaveLength(1);
      expect(loaded.syncedSkills[0].name).toBe('test-skill');
    });

    it('should return default config when file does not exist', () => {
      const loaded = projectStorage.read(projectPath);
      expect(loaded.syncedSkills).toEqual([]);
    });

    it('should return default config when file is corrupted', async () => {
      await fs.writeFile(path.join(projectPath, '.agentforge.json'), 'invalid json');
      const loaded = projectStorage.read(projectPath);
      expect(loaded.syncedSkills).toEqual([]);
    });
  });

  describe('addSyncRecord', () => {
    it('should add new record', () => {
      projectStorage.addSyncRecord(projectPath, {
        name: 'skill-1',
        syncedAt: '2024-01-01T00:00:00Z',
        mode: 'copy',
        agentType: 'claude',
      });

      const config = projectStorage.read(projectPath);
      expect(config.syncedSkills).toHaveLength(1);
    });

    it('should update existing record', () => {
      projectStorage.addSyncRecord(projectPath, {
        name: 'skill-1',
        syncedAt: '2024-01-01T00:00:00Z',
        mode: 'copy',
        agentType: 'claude',
      });

      projectStorage.addSyncRecord(projectPath, {
        name: 'skill-1',
        syncedAt: '2024-01-02T00:00:00Z',
        mode: 'symlink',
        agentType: 'claude',
      });

      const config = projectStorage.read(projectPath);
      expect(config.syncedSkills).toHaveLength(1);
      expect(config.syncedSkills[0].mode).toBe('symlink');
    });

    it('same skill with different agentType should be different records', () => {
      projectStorage.addSyncRecord(projectPath, {
        name: 'skill-1',
        syncedAt: '2024-01-01T00:00:00Z',
        mode: 'copy',
        agentType: 'claude',
      });

      projectStorage.addSyncRecord(projectPath, {
        name: 'skill-1',
        syncedAt: '2024-01-01T00:00:00Z',
        mode: 'copy',
        agentType: 'codex',
      });

      const config = projectStorage.read(projectPath);
      expect(config.syncedSkills).toHaveLength(2);
    });
  });

  describe('removeSyncRecord', () => {
    it('should delete specified record', () => {
      projectStorage.addSyncRecord(projectPath, {
        name: 'skill-1',
        syncedAt: '2024-01-01T00:00:00Z',
        mode: 'copy',
        agentType: 'claude',
      });

      projectStorage.removeSyncRecord(projectPath, 'skill-1', 'claude');

      const config = projectStorage.read(projectPath);
      expect(config.syncedSkills).toHaveLength(0);
    });

    it('should only delete record for specified agentType', () => {
      projectStorage.addSyncRecord(projectPath, {
        name: 'skill-1',
        syncedAt: '2024-01-01T00:00:00Z',
        mode: 'copy',
        agentType: 'claude',
      });

      projectStorage.addSyncRecord(projectPath, {
        name: 'skill-1',
        syncedAt: '2024-01-01T00:00:00Z',
        mode: 'copy',
        agentType: 'codex',
      });

      projectStorage.removeSyncRecord(projectPath, 'skill-1', 'claude');

      const config = projectStorage.read(projectPath);
      expect(config.syncedSkills).toHaveLength(1);
      expect(config.syncedSkills[0].agentType).toBe('codex');
    });

    it('should delete all records with same name when agentType not specified', () => {
      projectStorage.addSyncRecord(projectPath, {
        name: 'skill-1',
        syncedAt: '2024-01-01T00:00:00Z',
        mode: 'copy',
        agentType: 'claude',
      });

      projectStorage.addSyncRecord(projectPath, {
        name: 'skill-1',
        syncedAt: '2024-01-01T00:00:00Z',
        mode: 'copy',
        agentType: 'codex',
      });

      projectStorage.removeSyncRecord(projectPath, 'skill-1');

      const config = projectStorage.read(projectPath);
      expect(config.syncedSkills).toHaveLength(0);
    });
  });

  describe('getSyncRecord', () => {
    it('should get specified record', () => {
      projectStorage.addSyncRecord(projectPath, {
        name: 'skill-1',
        syncedAt: '2024-01-01T00:00:00Z',
        mode: 'copy',
        agentType: 'claude',
      });

      const record = projectStorage.getSyncRecord(projectPath, 'skill-1', 'claude');
      expect(record).toBeDefined();
      expect(record?.name).toBe('skill-1');
      expect(record?.mode).toBe('copy');
    });

    it('should return undefined when not exists', () => {
      const record = projectStorage.getSyncRecord(projectPath, 'nonexistent', 'claude');
      expect(record).toBeUndefined();
    });
  });
});
