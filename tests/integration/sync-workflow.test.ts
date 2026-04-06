/**
 * Integration test: Sync workflow
 *
 * Tests full sync/unsync using real temp directories, mocking only
 * the storage layer.
 */

import os from 'os';
import path from 'path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectSyncService } from '../../src/app/sync/project-sync-service.js';
import type { StorageInterface } from '../../src/types.js';

const TEST_DIR = path.join(os.tmpdir(), 'agentforge-integration-sync');

interface MinimalSyncStorage extends StorageInterface {
  getProject: ReturnType<typeof vi.fn>;
  listAgents: ReturnType<typeof vi.fn>;
  listAllDefinedAgents: ReturnType<typeof vi.fn>;
}

describe('sync integration workflow', () => {
  let projectSync: ProjectSyncService;
  let storage: MinimalSyncStorage;
  let sourceSkillPath: string;

  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);

    // Create source skill directory
    sourceSkillPath = path.join(TEST_DIR, 'skills', 'test-skill');
    await fs.ensureDir(sourceSkillPath);
    await fs.writeFile(path.join(sourceSkillPath, 'SKILL.md'), '# Test Skill');

    storage = {
      getProject: vi.fn(),
      getSkill: vi.fn(() => ({
        name: 'test-skill',
        source: { type: 'local' },
        createdAt: new Date().toISOString(),
        syncedTo: [],
        syncedProjects: [],
      })),
      listAgents: vi.fn(() => [
        {
          id: 'claude',
          name: 'Claude Code',
          basePath: path.join(TEST_DIR, 'agents/claude'),
          skillsDirName: 'claude',
        },
      ]),
      listAllDefinedAgents: vi.fn(() => [
        {
          id: 'claude',
          name: 'Claude Code',
          basePath: path.join(TEST_DIR, 'agents/claude'),
          skillsDirName: 'claude',
        },
      ]),
      updateSkillProjectSync: vi.fn(),
      getSkillPath: vi.fn((_name: string) => sourceSkillPath),
      getSkillsDirPath: vi.fn(() => path.join(TEST_DIR, 'skills')),
      listProjects: vi.fn(() => []),
      listSkills: vi.fn(() => []),
      getAgent: vi.fn(),
      saveSkill: vi.fn(),
      updateSkillSync: vi.fn(),
      removeAgent: vi.fn(() => true),
      removeProject: vi.fn(() => true),
    } as unknown as MinimalSyncStorage;

    projectSync = new ProjectSyncService(storage as StorageInterface);
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  describe('ProjectSyncService', () => {
    it('copies skill files to project directory', async () => {
      const projectPath = path.join(TEST_DIR, 'projects', 'demo-project');
      await fs.ensureDir(projectPath);
      storage.getProject = vi.fn(() => ({
        id: 'demo-project',
        path: projectPath,
        addedAt: new Date().toISOString(),
      }));

      const results = await projectSync.syncToProject(
        'test-skill',
        'demo-project',
        ['claude'],
        'copy'
      );

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);

      const targetPath = path.join(projectPath, '.claude', 'skills', 'test-skill', 'SKILL.md');
      expect(fs.existsSync(targetPath)).toBe(true);
      const content = fs.readFileSync(targetPath, 'utf-8');
      expect(content).toContain('# Test Skill');
    });

    it('creates symlink in symlink mode', async () => {
      const projectPath = path.join(TEST_DIR, 'projects', 'sym-project');
      await fs.ensureDir(projectPath);
      storage.getProject = vi.fn(() => ({
        id: 'sym-project',
        path: projectPath,
        addedAt: new Date().toISOString(),
      }));

      const results = await projectSync.syncToProject(
        'test-skill',
        'sym-project',
        ['claude'],
        'symlink'
      );

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('unsyncs skill from project', async () => {
      const projectPath = path.join(TEST_DIR, 'projects', 'unsync-project');
      await fs.ensureDir(projectPath);
      storage.getProject = vi.fn(() => ({
        id: 'unsync-project',
        path: projectPath,
        addedAt: new Date().toISOString(),
      }));

      // First sync
      await projectSync.syncToProject('test-skill', 'unsync-project', ['claude'], 'copy');
      const skillDir = path.join(projectPath, '.claude', 'skills', 'test-skill');
      expect(fs.existsSync(skillDir)).toBe(true);

      // Unsync
      await projectSync.unsync('test-skill', ['unsync-project:claude']);

      // Skill dir should be removed
      expect(fs.existsSync(skillDir)).toBe(false);
    });

    it('throws error when project path does not exist', async () => {
      storage.getProject = vi.fn(() => ({
        id: 'nonexistent',
        path: path.join(TEST_DIR, 'does-not-exist'),
        addedAt: new Date().toISOString(),
      }));

      await expect(
        projectSync.syncToProject('test-skill', 'nonexistent', ['claude'])
      ).rejects.toThrow('Project path does not exist');
    });

    it('throws error when no agent types detected', async () => {
      const projectPath = path.join(TEST_DIR, 'projects', 'empty-project');
      await fs.ensureDir(projectPath);
      storage.getProject = vi.fn(() => ({
        id: 'empty-project',
        path: projectPath,
        addedAt: new Date().toISOString(),
      }));

      await expect(projectSync.syncToProject('test-skill', 'empty-project')).rejects.toThrow(
        'No Agent directories detected'
      );
    });
  });
});
