/**
 * Skill Service Tests
 *
 * Simplified version: test core logic without singleton dependency
 */

import os from 'os';
import path from 'path';

import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { SkillService } from '../../src/app/skill-service.js';
import { git } from '../../src/infra/git.js';

const TEST_DIR = path.join(os.tmpdir(), 'agentforge-skill-test');

describe('SkillService core functionality', () => {
  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(path.join(TEST_DIR, 'skills'));
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  describe('Skill directory management', () => {
    it('should create skill directory', async () => {
      const skillDir = path.join(TEST_DIR, 'skills', 'test-skill');
      await fs.ensureDir(skillDir);

      expect(await fs.pathExists(skillDir)).toBe(true);
    });

    it('should create skill.md file', async () => {
      const skillDir = path.join(TEST_DIR, 'skills', 'test-skill');
      await fs.ensureDir(skillDir);

      const template = `# test-skill\n\nSkill description`;
      await fs.writeFile(path.join(skillDir, 'skill.md'), template);

      const content = await fs.readFile(path.join(skillDir, 'skill.md'), 'utf-8');
      expect(content).toContain('# test-skill');
    });

    it('should detect if skill exists', async () => {
      const skillDir = path.join(TEST_DIR, 'skills', 'existing-skill');
      await fs.ensureDir(skillDir);

      expect(await fs.pathExists(skillDir)).toBe(true);
      expect(await fs.pathExists(path.join(TEST_DIR, 'skills', 'non-existing'))).toBe(false);
    });

    it('should delete skill directory', async () => {
      const skillDir = path.join(TEST_DIR, 'skills', 'to-delete');
      await fs.ensureDir(skillDir);
      await fs.writeFile(path.join(skillDir, 'skill.md'), 'content');

      await fs.remove(skillDir);

      expect(await fs.pathExists(skillDir)).toBe(false);
    });
  });

  describe('repository discovery', () => {
    it('should discover a root-level skill repository', async () => {
      const cloneSpy = vi
        .spyOn(git, 'clone')
        .mockImplementation(async (_repoUrl: string, dest: string) => {
          await fs.ensureDir(dest);
          await fs.writeFile(path.join(dest, 'SKILL.md'), '# deep-recon');
          await fs.ensureDir(path.join(dest, 'agents'));
          await fs.writeFile(path.join(dest, 'agents', 'explorer.md'), 'agent');
        });

      try {
        const storage = {
          getSkillsDir: () => TEST_DIR,
        } as never;
        const service = new SkillService(storage);

        await expect(
          service.discoverSkillsInRepo('https://github.com/kvarnelis/deep-recon')
        ).resolves.toEqual([{ name: 'deep-recon', subPath: '' }]);
      } finally {
        cloneSpy.mockRestore();
      }
    });

    it('uses the final path segment as the skill name for tree subdirectories', async () => {
      const cloneSpy = vi
        .spyOn(git, 'clone')
        .mockImplementation(async (_repoUrl: string, dest: string) => {
          await fs.ensureDir(path.join(dest, 'skills', 'glmv-stock-analyst'));
          await fs.writeFile(
            path.join(dest, 'skills', 'glmv-stock-analyst', 'SKILL.md'),
            '# GLMV Stock Analyst'
          );
        });

      try {
        const storage = {
          getSkillsDir: () => TEST_DIR,
          getSkillPath: (name: string) => path.join(TEST_DIR, 'skills', name),
          saveSkill: vi.fn(),
        } as never;
        const service = new SkillService(storage);

        await expect(
          service.install(
            'https://github.com/zai-org/GLM-skills',
            undefined,
            'skills/glmv-stock-analyst'
          )
        ).resolves.toBe('glmv-stock-analyst');
      } finally {
        cloneSpy.mockRestore();
      }
    });
  });

  describe('update', () => {
    it('updates a git-backed skill by re-cloning the repository root', async () => {
      const skillPath = path.join(TEST_DIR, 'skills', 'deep-recon');
      await fs.ensureDir(skillPath);
      await fs.writeFile(path.join(skillPath, 'SKILL.md'), '# old');
      await fs.writeFile(path.join(skillPath, 'old.txt'), 'stale');

      const saveSkillMeta = vi.fn();
      const storage = {
        getSkillsDir: () => path.join(TEST_DIR, 'skills'),
        getSkillPath: (name: string) => path.join(TEST_DIR, 'skills', name),
        getSkill: vi.fn(() => ({
          name: 'deep-recon',
          source: { type: 'git', url: 'https://github.com/kvarnelis/deep-recon' },
          createdAt: '2024-01-01T00:00:00.000Z',
          syncedTo: [],
        })),
        saveSkillMeta,
      } as never;

      const cloneSpy = vi
        .spyOn(git, 'clone')
        .mockImplementation(async (_repoUrl: string, dest: string) => {
          await fs.ensureDir(dest);
          await fs.writeFile(path.join(dest, 'SKILL.md'), '# new');
          await fs.writeFile(path.join(dest, 'notes.md'), 'fresh');
        });

      try {
        const service = new SkillService(storage);

        await expect(service.update('deep-recon')).resolves.toBe(true);

        expect(await fs.readFile(path.join(skillPath, 'SKILL.md'), 'utf8')).toContain('# new');
        expect(await fs.pathExists(path.join(skillPath, 'notes.md'))).toBe(true);
        expect(await fs.pathExists(path.join(skillPath, 'old.txt'))).toBe(false);
        expect(saveSkillMeta).toHaveBeenCalledWith('deep-recon', {
          name: 'deep-recon',
          source: { type: 'git', url: 'https://github.com/kvarnelis/deep-recon' },
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: expect.any(String),
          syncedTo: [],
        });
      } finally {
        cloneSpy.mockRestore();
      }
    });

    it('updates a git-backed skill installed from a repository subpath and records the subPath', async () => {
      const skillPath = path.join(TEST_DIR, 'skills', 'glmv-stock-analyst');
      await fs.ensureDir(skillPath);
      await fs.writeFile(path.join(skillPath, 'SKILL.md'), '# old');

      const saveSkillMeta = vi.fn();
      const storage = {
        getSkillsDir: () => path.join(TEST_DIR, 'skills'),
        getSkillPath: (name: string) => path.join(TEST_DIR, 'skills', name),
        getSkill: vi.fn(() => ({
          name: 'glmv-stock-analyst',
          source: {
            type: 'git',
            url: 'https://github.com/zai-org/GLM-skills/tree/main/skills/glmv-stock-analyst',
          },
          createdAt: '2024-01-01T00:00:00.000Z',
          syncedTo: [],
        })),
        saveSkillMeta,
      } as never;

      const cloneSpy = vi
        .spyOn(git, 'clone')
        .mockImplementation(async (_repoUrl: string, dest: string) => {
          await fs.ensureDir(path.join(dest, 'skills', 'glmv-stock-analyst'));
          await fs.writeFile(
            path.join(dest, 'skills', 'glmv-stock-analyst', 'SKILL.md'),
            '# updated'
          );
          await fs.writeFile(path.join(dest, 'skills', 'glmv-stock-analyst', 'report.md'), 'fresh');
        });

      try {
        const service = new SkillService(storage);

        await expect(service.update('glmv-stock-analyst')).resolves.toBe(true);

        expect(await fs.readFile(path.join(skillPath, 'SKILL.md'), 'utf8')).toContain('# updated');
        expect(await fs.pathExists(path.join(skillPath, 'report.md'))).toBe(true);
        expect(saveSkillMeta).toHaveBeenCalledWith('glmv-stock-analyst', {
          name: 'glmv-stock-analyst',
          source: {
            type: 'git',
            url: 'https://github.com/zai-org/GLM-skills',
            subPath: 'skills/glmv-stock-analyst',
          },
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: expect.any(String),
          syncedTo: [],
        });
      } finally {
        cloneSpy.mockRestore();
      }
    });
  });
});
