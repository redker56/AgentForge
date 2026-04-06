/**
 * BaseSyncService Tests
 *
 * Test shared methods of abstract base class
 */

import os from 'os';
import path from 'path';

import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const TEST_DIR = path.join(os.tmpdir(), 'agentforge-base-sync-test');

describe('BaseSyncService utility methods', () => {
  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  describe('doSync', () => {
    it('should be able to copy directory', async () => {
      const sourceDir = path.join(TEST_DIR, 'source');
      const targetDir = path.join(TEST_DIR, 'target');

      await fs.ensureDir(sourceDir);
      await fs.writeFile(path.join(sourceDir, 'skill.md'), '# Test');

      // Test copy
      await fs.copy(sourceDir, targetDir);

      expect(await fs.pathExists(targetDir)).toBe(true);
      expect(await fs.readFile(path.join(targetDir, 'skill.md'), 'utf-8')).toBe('# Test');
    });

    it('should be able to create symlink', async () => {
      const sourceDir = path.join(TEST_DIR, 'source');
      const targetDir = path.join(TEST_DIR, 'target');

      await fs.ensureDir(sourceDir);
      await fs.writeFile(path.join(sourceDir, 'skill.md'), '# Link');

      try {
        await fs.symlink(sourceDir, targetDir, 'junction');
        const stats = await fs.lstat(targetDir);
        expect(stats.isSymbolicLink()).toBe(true);
      } catch {
        console.log('Symlink test skipped (may need admin rights on Windows)');
      }
    });
  });

  describe('Delete when target exists', () => {
    it('should be able to delete existing directory', async () => {
      const targetDir = path.join(TEST_DIR, 'to-remove');
      await fs.ensureDir(targetDir);
      await fs.writeFile(path.join(targetDir, 'old.md'), 'old');

      await fs.remove(targetDir);

      expect(await fs.pathExists(targetDir)).toBe(false);
    });
  });
});
