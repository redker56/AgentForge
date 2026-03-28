/**
 * Git operations tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execa } from 'execa';
import { git } from '../../src/infra/git.js';

const TEST_GIT_USER_NAME = 'AgentForge Test';
const TEST_GIT_USER_EMAIL = 'test@example.com';

async function initTestRepo(repoDir: string): Promise<void> {
  await fs.ensureDir(repoDir);
  await execa('git', ['init'], { cwd: repoDir });
  await execa('git', ['config', 'user.name', TEST_GIT_USER_NAME], { cwd: repoDir });
  await execa('git', ['config', 'user.email', TEST_GIT_USER_EMAIL], { cwd: repoDir });
}

describe('git', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), 'agentforge-git-test', Date.now().toString());
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('parseRepoName', () => {
    it('should parse HTTPS URL', () => {
      const result = git.parseRepoName('https://github.com/user/my-repo.git');
      expect(result).toBe('my-repo');
    });

    it('should parse HTTPS URL (without .git)', () => {
      const result = git.parseRepoName('https://github.com/user/my-repo');
      expect(result).toBe('my-repo');
    });

    it('should parse SSH URL', () => {
      const result = git.parseRepoName('git@github.com:user/my-repo.git');
      expect(result).toBe('my-repo');
    });

    it('should handle unknown format', () => {
      const result = git.parseRepoName('invalid-url');
      expect(result).toBe('invalid-url');
    });
  });

  describe('isRepo', () => {
    it('returns true for Git repo', async () => {
      const repoDir = path.join(testDir, 'repo');
      await initTestRepo(repoDir);

      expect(git.isRepo(repoDir)).toBe(true);
    });

    it('returns false for normal directory', async () => {
      const normalDir = path.join(testDir, 'normal');
      await fs.ensureDir(normalDir);

      expect(git.isRepo(normalDir)).toBe(false);
    });
  });

  describe('clone', () => {
    it('should clone local repo', async () => {
      // Create source repo
      const srcRepo = path.join(testDir, 'src-repo');
      await initTestRepo(srcRepo);
      await fs.writeFile(path.join(srcRepo, 'README.md'), '# Test');
      await execa('git', ['add', '.'], { cwd: srcRepo });
      await execa('git', ['commit', '-m', 'init'], { cwd: srcRepo });

      // Clone
      const destDir = path.join(testDir, 'cloned');
      await git.clone(srcRepo, destDir);

      expect(await fs.pathExists(destDir)).toBe(true);
      expect(await fs.pathExists(path.join(destDir, '.git'))).toBe(true);
      expect(await fs.readFile(path.join(destDir, 'README.md'), 'utf-8')).toBe('# Test');
    });

    it('should throw when destination exists', async () => {
      const srcRepo = path.join(testDir, 'src-repo');
      await initTestRepo(srcRepo);

      const destDir = path.join(testDir, 'existing');
      await fs.ensureDir(destDir);

      await expect(git.clone(srcRepo, destDir)).rejects.toThrow();
    });
  });

  describe('pull', () => {
    it('should pull updates', async () => {
      // Create source repo
      const srcRepo = path.join(testDir, 'src-repo');
      await initTestRepo(srcRepo);
      await fs.writeFile(path.join(srcRepo, 'README.md'), '# v1');
      await execa('git', ['add', '.'], { cwd: srcRepo });
      await execa('git', ['commit', '-m', 'v1'], { cwd: srcRepo });

      // Clone
      const clonedRepo = path.join(testDir, 'cloned');
      await execa('git', ['clone', srcRepo, clonedRepo]);

      // Update source repo
      await fs.writeFile(path.join(srcRepo, 'README.md'), '# v2');
      await execa('git', ['add', '.'], { cwd: srcRepo });
      await execa('git', ['commit', '-m', 'v2'], { cwd: srcRepo });

      // Pull
      await git.pull(clonedRepo);

      expect(await fs.readFile(path.join(clonedRepo, 'README.md'), 'utf-8')).toBe('# v2');
    });
  });
});
