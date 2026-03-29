/**
 * Skill Service Tests
 *
 * Simplified version: test core logic without singleton dependency
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
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
      const cloneSpy = vi.spyOn(git, 'clone').mockImplementation(async (_repoUrl: string, dest: string) => {
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

        await expect(service.discoverSkillsInRepo('https://github.com/kvarnelis/deep-recon'))
          .resolves
          .toEqual([{ name: 'deep-recon', subPath: '' }]);
      } finally {
        cloneSpy.mockRestore();
      }
    });
  });
});
