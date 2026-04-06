/**
 * Integration test: Add skill workflow
 *
 * Tests the full path from skill installation through storage records
 * without spinning up actual git/network operations.
 */

import os from 'os';
import path from 'path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SkillService } from '../../src/app/skill-service.js';
import type { StorageInterface } from '../../src/types.js';

// Mock execa for git clone
vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: 'cloned', exitCode: 0 }),
}));

const TEST_DIR = path.join(os.tmpdir(), 'agentforge-integration-add-skill');

interface MinimalStorage extends StorageInterface {
  saveSkill: ReturnType<typeof vi.fn>;
  getSkillsDirPath: ReturnType<typeof vi.fn>;
}

describe('add-skill integration workflow', () => {
  let storage: MinimalStorage;
  let skillsDir: string;

  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
    skillsDir = path.join(TEST_DIR, 'skills');
    await fs.ensureDir(skillsDir);

    storage = {
      saveSkill: vi.fn(),
      getSkillsDirPath: vi.fn(() => skillsDir),
      getSkillPath: vi.fn((_name: string) => path.join(skillsDir, _name)),
      listAgents: vi.fn(() => []),
      getAgent: vi.fn(),
      listProjects: vi.fn(() => []),
      getProject: vi.fn(),
      listSkills: vi.fn(() => []),
      getSkill: vi.fn(),
      updateSkillSync: vi.fn(),
      updateSkillProjectSync: vi.fn(),
      removeAgent: vi.fn(() => true),
      removeProject: vi.fn(() => true),
    } as unknown as MinimalStorage;
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  it('installs a skill and saves metadata to storage', async () => {
    const skillService = new SkillService(storage as StorageInterface);

    // Simulate a cloned skill directory
    const clonedDir = path.join(TEST_DIR, 'cloned-repo', 'test-skill');
    await fs.ensureDir(clonedDir);
    await fs.writeFile(path.join(clonedDir, 'SKILL.md'), '# Test Skill');

    // Install from directory
    await skillService.installFromDirectory(
      'https://example.com/repo.git',
      'test-skill',
      path.join(TEST_DIR, 'cloned-repo')
    );

    // Verify storage.saveSkill was called with the skill name
    expect(storage.saveSkill).toHaveBeenCalledWith('test-skill', {
      type: 'git',
      url: 'https://example.com/repo.git',
    });
  });

  it('cleans up temp repo after install', async () => {
    const skillService = new SkillService(storage as StorageInterface);

    const tempRepo = path.join(TEST_DIR, 'temp-repo');
    await fs.ensureDir(tempRepo);
    await fs.writeFile(path.join(tempRepo, 'file.txt'), 'content');

    await skillService.removeTempRepo(tempRepo);
    expect(fs.existsSync(tempRepo)).toBe(false);
  });
});
