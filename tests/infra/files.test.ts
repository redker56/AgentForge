/**
 * File operations tests
 */

import os from 'os';
import path from 'path';

import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { files } from '../../src/infra/files.js';

describe('files', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), 'agentforge-files-test', Date.now().toString());
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('copy', () => {
    it('should copy directory', async () => {
      const srcDir = path.join(testDir, 'src');
      const destDir = path.join(testDir, 'dest');

      await fs.ensureDir(srcDir);
      await fs.writeFile(path.join(srcDir, 'test.txt'), 'hello');

      await files.copy(srcDir, destDir);

      expect(await fs.pathExists(destDir)).toBe(true);
      expect(await fs.readFile(path.join(destDir, 'test.txt'), 'utf-8')).toBe('hello');
    });

    it('should overwrite existing target', async () => {
      const srcDir = path.join(testDir, 'src');
      const destDir = path.join(testDir, 'dest');

      await fs.ensureDir(srcDir);
      await fs.writeFile(path.join(srcDir, 'test.txt'), 'new');

      await fs.ensureDir(destDir);
      await fs.writeFile(path.join(destDir, 'test.txt'), 'old');

      await files.copy(srcDir, destDir);

      expect(await fs.readFile(path.join(destDir, 'test.txt'), 'utf-8')).toBe('new');
    });
  });

  describe('remove', () => {
    it('should delete directory', async () => {
      const dir = path.join(testDir, 'to-delete');
      await fs.ensureDir(dir);
      await fs.writeFile(path.join(dir, 'file.txt'), 'content');

      await files.remove(dir);

      expect(await fs.pathExists(dir)).toBe(false);
    });
  });

  describe('exists', () => {
    it('returns true for existing path', async () => {
      const filePath = path.join(testDir, 'exists.txt');
      await fs.writeFile(filePath, 'content');

      expect(files.exists(filePath)).toBe(true);
    });

    it('returns false for non-existing path', () => {
      expect(files.exists(path.join(testDir, 'not-exists.txt'))).toBe(false);
    });
  });

  describe('ensureDir', () => {
    it('should create directory', async () => {
      const dir = path.join(testDir, 'nested', 'dir');

      await files.ensureDir(dir);

      expect(await fs.pathExists(dir)).toBe(true);
    });
  });

  describe('symlink', () => {
    it('should create symlink', async () => {
      const srcDir = path.join(testDir, 'src');
      const linkDir = path.join(testDir, 'link');

      await fs.ensureDir(srcDir);
      await fs.writeFile(path.join(srcDir, 'test.txt'), 'content');

      const result = await files.symlink(srcDir, linkDir);

      // May fail in some environments (e.g., no permission)
      if (result) {
        expect(files.isSymlink(linkDir)).toBe(true);
        expect(await fs.readFile(path.join(linkDir, 'test.txt'), 'utf-8')).toBe('content');
      }
    });

    it('should delete existing target before creating symlink', async () => {
      const srcDir = path.join(testDir, 'src');
      const linkDir = path.join(testDir, 'link');

      await fs.ensureDir(srcDir);
      await fs.writeFile(path.join(srcDir, 'test.txt'), 'new');

      // Create old target
      await fs.ensureDir(linkDir);
      await fs.writeFile(path.join(linkDir, 'old.txt'), 'old');

      const result = await files.symlink(srcDir, linkDir);

      if (result) {
        expect(files.isSymlink(linkDir)).toBe(true);
        expect(await fs.pathExists(path.join(linkDir, 'old.txt'))).toBe(false);
      }
    });
  });

  describe('isSymlink', () => {
    it('returns true for symlink', async () => {
      const srcDir = path.join(testDir, 'src');
      const linkDir = path.join(testDir, 'link');

      await fs.ensureDir(srcDir);
      const result = await files.symlink(srcDir, linkDir);

      if (result) {
        expect(files.isSymlink(linkDir)).toBe(true);
      }
    });

    it('returns false for normal directory', async () => {
      const dir = path.join(testDir, 'normal');
      await fs.ensureDir(dir);

      expect(files.isSymlink(dir)).toBe(false);
    });

    it('returns false for non-existing path', () => {
      expect(files.isSymlink(path.join(testDir, 'not-exists'))).toBe(false);
    });
  });

  describe('readSymlink', () => {
    it('should read symlink target', async () => {
      const srcDir = path.join(testDir, 'src');
      const linkDir = path.join(testDir, 'link');

      await fs.ensureDir(srcDir);
      const result = await files.symlink(srcDir, linkDir);

      if (result) {
        const target = files.readSymlink(linkDir);
        expect(target).toBeTruthy();
      }
    });

    it('returns null for non-symlink', async () => {
      const dir = path.join(testDir, 'normal');
      await fs.ensureDir(dir);

      expect(files.readSymlink(dir)).toBeNull();
    });
  });
});
