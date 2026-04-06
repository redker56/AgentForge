/**
 * FileOperationsService tests
 */

import os from 'os';
import path from 'path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FileOperationsService } from '../../src/app/file-operations.js';

const TEST_DIR = path.join(os.tmpdir(), 'agentforge-file-ops-test');

describe('FileOperationsService', () => {
  let service: FileOperationsService;

  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
    service = new FileOperationsService();
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  describe('pathExists', () => {
    it('returns true for existing path', async () => {
      const target = path.join(TEST_DIR, 'existing');
      await fs.ensureDir(target);
      expect(service.pathExists(target)).toBe(true);
    });

    it('returns false for non-existent path', () => {
      expect(service.pathExists(path.join(TEST_DIR, 'non-existent'))).toBe(false);
    });
  });

  describe('fileExists', () => {
    it('returns true for existing file', async () => {
      const filePath = path.join(TEST_DIR, 'test.txt');
      await fs.writeFile(filePath, 'content');
      expect(service.fileExists(filePath)).toBe(true);
    });

    it('returns true for existing directory (uses existsSync)', async () => {
      const dirPath = path.join(TEST_DIR, 'subdir');
      await fs.ensureDir(dirPath);
      expect(service.fileExists(dirPath)).toBe(true);
    });

    it('returns false for non-existent path', () => {
      expect(service.fileExists(path.join(TEST_DIR, 'nope.txt'))).toBe(false);
    });
  });

  describe('listSubdirectories', () => {
    beforeEach(async () => {
      await fs.ensureDir(path.join(TEST_DIR, 'dir-a'));
      await fs.ensureDir(path.join(TEST_DIR, 'dir-b'));
      await fs.ensureDir(path.join(TEST_DIR, 'hidden-dir'));
      await fs.writeFile(path.join(TEST_DIR, 'hidden-dir', 'file.txt'), '');
      // Create a hidden directory (starts with .)
      await fs.ensureDir(path.join(TEST_DIR, '.hidden'));
      // Create a file (not a directory)
      await fs.writeFile(path.join(TEST_DIR, 'not-a-dir.txt'), '');
    });

    it('returns visible subdirectory names', () => {
      // Rename hidden-dir to not-hidden so it shows
      const result = service.listSubdirectories(TEST_DIR);
      // Should include dir-a, dir-b but not .hidden
      expect(result).toContain('dir-a');
      expect(result).toContain('dir-b');
      expect(result).toContain('hidden-dir');
      expect(result).not.toContain('.hidden');
      expect(result).not.toContain('not-a-dir.txt');
    });

    it('returns empty array for non-existent directory', () => {
      expect(service.listSubdirectories(path.join(TEST_DIR, 'nope'))).toEqual([]);
    });
  });

  describe('scanSkillsInDirectory', () => {
    beforeEach(async () => {
      // Create skill directories containing SKILL.md
      await fs.ensureDir(path.join(TEST_DIR, 'skill-a'));
      await fs.writeFile(path.join(TEST_DIR, 'skill-a', 'SKILL.md'), '# Skill A');
      await fs.ensureDir(path.join(TEST_DIR, 'skill-b'));
      await fs.writeFile(path.join(TEST_DIR, 'skill-b', 'skill.md'), '# Skill B');
      // Directory without SKILL.md
      await fs.ensureDir(path.join(TEST_DIR, 'no-skill'));
      // Hidden directory with SKILL.md (should be excluded)
      await fs.ensureDir(path.join(TEST_DIR, '.hidden-skill'));
      await fs.writeFile(path.join(TEST_DIR, '.hidden-skill', 'SKILL.md'), '# Hidden');
    });

    it('returns directories containing SKILL.md', () => {
      const result = service.scanSkillsInDirectory(TEST_DIR);
      expect(result).toContain('skill-a');
      expect(result).toContain('skill-b');
    });

    it('excludes directories without SKILL.md', () => {
      const result = service.scanSkillsInDirectory(TEST_DIR);
      expect(result).not.toContain('no-skill');
    });

    it('excludes hidden directories', () => {
      const result = service.scanSkillsInDirectory(TEST_DIR);
      expect(result).not.toContain('.hidden-skill');
    });

    it('returns empty array for non-existent directory', () => {
      expect(service.scanSkillsInDirectory(path.join(TEST_DIR, 'nope'))).toEqual([]);
    });
  });

  describe('readFile', () => {
    it('returns file content for existing file', async () => {
      const filePath = path.join(TEST_DIR, 'readme.txt');
      await fs.writeFile(filePath, 'Hello World');
      expect(service.readFile(filePath)).toBe('Hello World');
    });

    it('returns null for non-existent file', () => {
      expect(service.readFile(path.join(TEST_DIR, 'missing.txt'))).toBeNull();
    });
  });

  describe('readFileSync', () => {
    it('returns file content for existing file', async () => {
      const filePath = path.join(TEST_DIR, 'readme-sync.txt');
      await fs.writeFile(filePath, 'Sync Content');
      expect(service.readFileSync(filePath)).toBe('Sync Content');
    });

    it('returns null for non-existent file', () => {
      expect(service.readFileSync(path.join(TEST_DIR, 'missing-sync.txt'))).toBeNull();
    });
  });

  describe('writeFileSync', () => {
    it('writes content to file', () => {
      const filePath = path.join(TEST_DIR, 'write.txt');
      service.writeFileSync(filePath, 'written content');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toBe('written content');
    });
  });

  describe('mkdirSync', () => {
    it('creates directory recursively', () => {
      const nestedPath = path.join(TEST_DIR, 'a', 'b', 'c');
      service.mkdirSync(nestedPath);
      expect(fs.existsSync(nestedPath)).toBe(true);
    });
  });

  describe('ensureDir', () => {
    it('creates directory async', async () => {
      const dirPath = path.join(TEST_DIR, 'async-dir');
      await service.ensureDir(dirPath);
      expect(fs.existsSync(dirPath)).toBe(true);
    });
  });

  describe('getDirectoryHash', () => {
    it('delegates to infra files module', async () => {
      const dirPath = path.join(TEST_DIR, 'hash-dir');
      await fs.ensureDir(dirPath);
      await fs.writeFile(path.join(dirPath, 'file.txt'), 'content');

      const hash = await service.getDirectoryHash(dirPath);
      expect(hash).toStrictEqual(expect.any(String));
      expect(typeof hash).toBe('string');
      expect(hash).not.toBeNull();
      expect((hash as string).length).toBeGreaterThan(0);
    });

    it('returns null for non-existent directory', async () => {
      const hash = await service.getDirectoryHash(path.join(TEST_DIR, 'nope'));
      expect(hash).toBeNull();
    });
  });
});
