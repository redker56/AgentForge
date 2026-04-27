/**
 * JSON registry repository tests
 *
 * Tests use temporary repository roots so persistence stays isolated.
 */

import os from 'os';
import path from 'path';

import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { JsonRegistryRepository } from '../../src/infra/storage.js';

// Set test environment variable
const TEST_HOME = path.join(os.tmpdir(), 'agentforge-storage-test');

describe('JsonRegistryRepository', () => {
  let originalHome: string | undefined;

  beforeEach(async () => {
    // Save original HOME env var
    originalHome = process.env.HOME;

    // Set test directory
    await fs.remove(TEST_HOME);
    await fs.ensureDir(path.join(TEST_HOME, '.agentforge', 'skills'));

    // Modify env var (note: this only affects subsequent path calculation)
    process.env.HOME = TEST_HOME;
  });

  afterEach(async () => {
    // Restore original env var
    if (originalHome !== undefined) {
      process.env.HOME = originalHome;
    }
    await fs.remove(TEST_HOME);
  });

  describe('File Operations', () => {
    it('should create and read JSON file', async () => {
      const registryPath = path.join(TEST_HOME, '.agentforge', 'registry.json');
      const data = {
        version: '1.0',
        skills: { 'test-skill': { name: 'test-skill' } },
        agents: {},
        projects: {},
      };

      await fs.writeJson(registryPath, data);
      const loaded = await fs.readJson(registryPath);

      expect(loaded.version).toBe('1.0');
      expect(loaded.skills['test-skill']).toBeDefined();
    });

    it('should create skill directory', async () => {
      const skillDir = path.join(TEST_HOME, '.agentforge', 'skills', 'my-skill');
      await fs.ensureDir(skillDir);
      await fs.writeFile(path.join(skillDir, 'skill.md'), '# My Skill');

      expect(await fs.pathExists(skillDir)).toBe(true);
      expect(await fs.readFile(path.join(skillDir, 'skill.md'), 'utf-8')).toBe('# My Skill');
    });

    it('supports an injected AgentForge root directory', () => {
      const forgeDir = path.join(TEST_HOME, '.custom-agentforge');
      const storage = new JsonRegistryRepository(forgeDir);

      storage.saveSkill('demo-skill', { type: 'local' });

      expect(storage.getSkillsDir()).toBe(path.join(forgeDir, 'skills'));
      expect(storage.getSkillPath('demo-skill')).toBe(path.join(forgeDir, 'skills', 'demo-skill'));
      expect(fs.pathExistsSync(path.join(forgeDir, 'registry.json'))).toBe(true);
    });

    it('leaves no temporary registry files after writes', () => {
      const forgeDir = path.join(TEST_HOME, '.atomic-agentforge');
      const storage = new JsonRegistryRepository(forgeDir);

      storage.saveSkill('demo-skill', { type: 'local' });

      const tempFiles = fs
        .readdirSync(forgeDir)
        .filter((name) => name.startsWith('registry.json.tmp-'));
      expect(tempFiles).toEqual([]);
    });
  });
});
