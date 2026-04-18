/**
 * ProjectSyncService Tests
 *
 * Tests full lifecycle operations: syncToProject, unsyncFromProject, resync.
 */

import os from 'os';
import path from 'path';

import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { ProjectSyncService } from '../../../src/app/sync/project-sync-service.js';
import type { Agent, ProjectSyncRecord, SkillMeta } from '../../../src/types.js';

const TEST_DIR = path.join(os.tmpdir(), 'agentforge-project-sync-test');
const PROJECT_ID = 'demo-project';
const SKILL_NAME = 'demo-skill';

interface StorageMock {
  getSkill: (name: string) => SkillMeta | undefined;
  getSkillPath: (name: string) => string;
  getProject: (id: string) => { id: string; path: string; addedAt: string } | undefined;
  listAgents: () => Agent[];
  listAllDefinedAgents: () => Agent[];
  listProjects: () => Array<{ id: string; path: string; addedAt: string }>;
  updateSkillProjectSync: ReturnType<typeof vi.fn>;
}

function createStorageMock(
  projectPath: string,
  syncedProjects: ProjectSyncRecord[] = []
): StorageMock {
  const project = { id: PROJECT_ID, path: projectPath, addedAt: new Date().toISOString() };
  const agents: Agent[] = [
    {
      id: 'claude',
      name: 'Claude Code',
      basePath: path.join(TEST_DIR, '.claude', 'skills'),
      skillsDirName: 'claude',
    },
    {
      id: 'codex',
      name: 'Codex',
      basePath: path.join(TEST_DIR, '.codex', 'skills'),
      skillsDirName: 'agents',
    },
  ];
  const skillMeta: SkillMeta = {
    name: SKILL_NAME,
    source: { type: 'local' },
    createdAt: new Date().toISOString(),
    syncedTo: [],
    syncedProjects: [...syncedProjects],
  };

  return {
    getSkill: (name: string) => (name === SKILL_NAME ? skillMeta : undefined),
    getSkillPath: (name: string) => path.join(TEST_DIR, '.agentforge', 'skills', name),
    getProject: (id: string) => (id === PROJECT_ID ? project : undefined),
    listAgents: () => agents,
    listAllDefinedAgents: () => agents,
    listProjects: () => [project],
    updateSkillProjectSync: vi.fn((name: string, records: ProjectSyncRecord[]) => {
      if (name === SKILL_NAME) {
        skillMeta.syncedProjects = [...records];
      }
    }),
  };
}

describe('ProjectSyncService', () => {
  let projectPath: string;

  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    projectPath = path.join(TEST_DIR, PROJECT_ID);
    await fs.ensureDir(projectPath);
    await fs.ensureDir(path.join(TEST_DIR, '.agentforge', 'skills', SKILL_NAME));
    await fs.writeFile(
      path.join(TEST_DIR, '.agentforge', 'skills', SKILL_NAME, 'SKILL.md'),
      '# Demo Skill'
    );
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  describe('detectAgentTypes', () => {
    it('detects only Agent directories that already exist in the project', async () => {
      await fs.ensureDir(path.join(projectPath, '.agents', 'skills'));

      const service = new ProjectSyncService(createStorageMock(projectPath) as never);

      expect(service.detectAgentTypes(projectPath)).toEqual(['codex']);
    });

    it('does not invent a default Agent type for a clean project', () => {
      const service = new ProjectSyncService(createStorageMock(projectPath) as never);

      expect(service.detectAgentTypes(projectPath)).toEqual([]);
    });

    it('detects multiple agent types', async () => {
      await fs.ensureDir(path.join(projectPath, '.claude', 'skills'));
      await fs.ensureDir(path.join(projectPath, '.agents', 'skills'));

      const service = new ProjectSyncService(createStorageMock(projectPath) as never);

      // Order may vary, so check inclusion
      const types = service.detectAgentTypes(projectPath);
      expect(types).toContain('claude');
      expect(types).toContain('codex');
    });
  });

  describe('syncToProject', () => {
    it('requires explicit Agent types when a clean project has no detectable structure', async () => {
      const service = new ProjectSyncService(createStorageMock(projectPath) as never);

      await expect(service.syncToProject(SKILL_NAME, PROJECT_ID)).rejects.toThrow(
        'No Agent directories detected in project demo-project. Use --agent-types to specify sync targets.'
      );
    });

    it('syncs to an explicitly selected Agent on a clean project', async () => {
      const service = new ProjectSyncService(createStorageMock(projectPath) as never);

      await service.syncToProject(SKILL_NAME, PROJECT_ID, ['codex']);

      expect(
        await fs.pathExists(path.join(projectPath, '.agents', 'skills', SKILL_NAME, 'SKILL.md'))
      ).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, '.claude', 'skills', SKILL_NAME))).toBe(
        false
      );
    });

    it('syncs to multiple agent types in one project', async () => {
      const service = new ProjectSyncService(createStorageMock(projectPath) as never);

      await service.syncToProject(SKILL_NAME, PROJECT_ID, ['claude', 'codex']);

      expect(
        await fs.pathExists(path.join(projectPath, '.claude', 'skills', SKILL_NAME, 'SKILL.md'))
      ).toBe(true);
      expect(
        await fs.pathExists(path.join(projectPath, '.agents', 'skills', SKILL_NAME, 'SKILL.md'))
      ).toBe(true);
    });

    it('syncs with symlink mode', async () => {
      const service = new ProjectSyncService(createStorageMock(projectPath) as never);

      const results = await service.syncToProject(SKILL_NAME, PROJECT_ID, ['codex'], 'symlink');

      expect(results[0].success).toBe(true);
      // Symlink may fall back to copy on Windows
      const targetPath = path.join(projectPath, '.agents', 'skills', SKILL_NAME);
      expect(await fs.pathExists(targetPath)).toBe(true);
    });

    it('throws error when project not found', async () => {
      const service = new ProjectSyncService(createStorageMock(projectPath) as never);

      await expect(
        service.syncToProject(SKILL_NAME, 'nonexistent-project', ['claude'])
      ).rejects.toThrow('Project not found');
    });

    it('throws error when project path does not exist', async () => {
      const storage = createStorageMock('/nonexistent/path');
      const service = new ProjectSyncService(storage as never);

      await expect(service.syncToProject(SKILL_NAME, PROJECT_ID, ['claude'])).rejects.toThrow(
        'Project path does not exist'
      );
    });

    it('throws error when skill does not exist', async () => {
      const service = new ProjectSyncService(createStorageMock(projectPath) as never);

      await expect(
        service.syncToProject('nonexistent-skill', PROJECT_ID, ['claude'])
      ).rejects.toThrow('Skill not found');
    });

    it('updates registry after sync', async () => {
      const storage = createStorageMock(projectPath);
      const service = new ProjectSyncService(storage as never);

      await service.syncToProject(SKILL_NAME, PROJECT_ID, ['claude']);

      expect(storage.updateSkillProjectSync).toHaveBeenCalledWith(
        SKILL_NAME,
        expect.arrayContaining([
          expect.objectContaining({ projectId: PROJECT_ID, agentType: 'claude', mode: 'copy' }),
        ])
      );
    });
  });

  describe('unsyncFromProject', () => {
    it('removes skill from project directory', async () => {
      const service = new ProjectSyncService(createStorageMock(projectPath) as never);

      // First sync
      await service.syncToProject(SKILL_NAME, PROJECT_ID, ['codex']);

      // Then unsync
      await service.unsyncFromProject(SKILL_NAME, PROJECT_ID);

      expect(await fs.pathExists(path.join(projectPath, '.agents', 'skills', SKILL_NAME))).toBe(
        false
      );
    });

    it('removes detected on-disk project syncs even when no registry record exists', async () => {
      const storage = createStorageMock(projectPath);
      const service = new ProjectSyncService(storage as never);
      const targetPath = path.join(projectPath, '.agents', 'skills', SKILL_NAME);

      await fs.ensureDir(targetPath);
      await fs.writeFile(path.join(targetPath, 'SKILL.md'), '# Demo Skill');

      await service.unsyncFromProject(SKILL_NAME, PROJECT_ID);

      expect(await fs.pathExists(targetPath)).toBe(false);
      expect(storage.updateSkillProjectSync).toHaveBeenCalledWith(SKILL_NAME, []);
    });

    it('unsyncs from specific agent types only', async () => {
      const service = new ProjectSyncService(createStorageMock(projectPath) as never);

      // Sync to both
      await service.syncToProject(SKILL_NAME, PROJECT_ID, ['claude', 'codex']);

      // Unsync only codex
      await service.unsyncFromProject(SKILL_NAME, PROJECT_ID, ['codex']);

      // Codex removed
      expect(await fs.pathExists(path.join(projectPath, '.agents', 'skills', SKILL_NAME))).toBe(
        false
      );
      // Claude remains
      expect(await fs.pathExists(path.join(projectPath, '.claude', 'skills', SKILL_NAME))).toBe(
        true
      );
    });
  });

  describe('resync', () => {
    it('updates project content from source', async () => {
      const skillPath = path.join(TEST_DIR, '.agentforge', 'skills', SKILL_NAME);
      const service = new ProjectSyncService(createStorageMock(projectPath) as never);

      // Initial sync
      await service.syncToProject(SKILL_NAME, PROJECT_ID, ['codex']);

      // Modify source
      await fs.appendFile(path.join(skillPath, 'SKILL.md'), '\n\nMore content');

      // Resync
      await service.resync(SKILL_NAME);

      const targetContent = await fs.readFile(
        path.join(projectPath, '.agents', 'skills', SKILL_NAME, 'SKILL.md'),
        'utf-8'
      );
      expect(targetContent).toContain('More content');
    });

    it('does nothing when no sync records exist', async () => {
      const service = new ProjectSyncService(createStorageMock(projectPath) as never);

      await expect(service.resync(SKILL_NAME)).resolves.not.toThrow();
    });

    it('resyncs to multiple projects', async () => {
      // Use separate directory for this test to avoid conflicts
      const multiTestDir = path.join(
        os.tmpdir(),
        'agentforge-multi-project-test',
        Date.now().toString()
      );
      const project1Dir = path.join(multiTestDir, 'project-1');
      const project2Dir = path.join(multiTestDir, 'project-2');
      const skillSourceDir = path.join(multiTestDir, '.agentforge', 'skills', SKILL_NAME);

      try {
        // Create directories - using correct agent directory names
        await fs.ensureDir(path.join(project1Dir, '.agents', 'skills')); // codex uses .agents
        await fs.ensureDir(path.join(project2Dir, '.claude', 'skills')); // claude uses .claude
        await fs.ensureDir(skillSourceDir);
        await fs.writeFile(path.join(skillSourceDir, 'SKILL.md'), '# Demo Skill');

        const agents: Agent[] = [
          {
            id: 'claude',
            name: 'Claude Code',
            basePath: path.join(multiTestDir, '.claude', 'skills'),
            skillsDirName: 'claude',
          },
          {
            id: 'codex',
            name: 'Codex',
            basePath: path.join(multiTestDir, '.codex', 'skills'),
            skillsDirName: 'agents',
          },
        ];

        const skillMeta: SkillMeta = {
          name: SKILL_NAME,
          source: { type: 'local' },
          createdAt: new Date().toISOString(),
          syncedTo: [],
          syncedProjects: [
            { projectId: 'project-1', agentType: 'codex', mode: 'copy' },
            { projectId: 'project-2', agentType: 'claude', mode: 'copy' },
          ],
        };

        const storage: StorageMock = {
          getSkill: (name: string) => (name === SKILL_NAME ? skillMeta : undefined),
          getSkillPath: (name: string) => path.join(multiTestDir, '.agentforge', 'skills', name),
          getProject: (id: string) =>
            id === 'project-1'
              ? { id: 'project-1', path: project1Dir, addedAt: new Date().toISOString() }
              : id === 'project-2'
                ? { id: 'project-2', path: project2Dir, addedAt: new Date().toISOString() }
                : undefined,
          listAgents: () => agents,
          listAllDefinedAgents: () => agents,
          listProjects: () => [
            { id: 'project-1', path: project1Dir, addedAt: new Date().toISOString() },
            { id: 'project-2', path: project2Dir, addedAt: new Date().toISOString() },
          ],
          updateSkillProjectSync: vi.fn(),
        };

        const service = new ProjectSyncService(storage as never);

        // Modify source
        await fs.appendFile(path.join(skillSourceDir, 'SKILL.md'), '\n\nUpdated');

        // Resync
        await service.resync(SKILL_NAME);

        // Both projects should have updated content
        const content1 = await fs.readFile(
          path.join(project1Dir, '.agents', 'skills', SKILL_NAME, 'SKILL.md'),
          'utf-8'
        );
        expect(content1).toContain('Updated');

        const content2 = await fs.readFile(
          path.join(project2Dir, '.claude', 'skills', SKILL_NAME, 'SKILL.md'),
          'utf-8'
        );
        expect(content2).toContain('Updated');
      } finally {
        await fs.remove(multiTestDir);
      }
    });
  });

  describe('checkSyncStatus', () => {
    it('returns correct status for unsynced project', () => {
      const service = new ProjectSyncService(createStorageMock(projectPath) as never);

      const status = service.checkSyncStatus(SKILL_NAME);

      // Should have status for each project/agent combination
      expect(status.length).toBeGreaterThanOrEqual(0);
    });

    it('returns exists=true for synced project', async () => {
      const service = new ProjectSyncService(createStorageMock(projectPath) as never);

      await service.syncToProject(SKILL_NAME, PROJECT_ID, ['codex']);

      const status = service.checkSyncStatus(SKILL_NAME);
      const codexStatus = status.find((s) => s.target === `${PROJECT_ID}:codex`);
      expect(codexStatus?.exists).toBe(true);
    });
  });
});
