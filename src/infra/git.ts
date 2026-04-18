/**
 * @module Infra/Git
 * @layer infra
 * @allowed-imports types
 * @responsibility Git operations wrapper — clone, pull, repo detection, and URL parsing.
 *
 * Thin wrapper around the `git` CLI via `execa`. All operations delegate to
 * external git commands and return structured results.
 *
 * @architecture Infrastructure layer — must only import from `types.ts` (currently
 * imports none, which is the correct pattern for pure infra modules).
 */

import path from 'path';

import { execa } from 'execa';
import fs from 'fs-extra';

export const git = {
  async clone(url: string, dest: string): Promise<void> {
    if (fs.existsSync(dest)) {
      throw new Error(`Directory already exists: ${dest}`);
    }
    await execa('git', ['clone', url, dest]);
  },

  async pull(repoPath: string): Promise<void> {
    await execa('git', ['pull'], { cwd: repoPath });
  },

  isRepo(dir: string): boolean {
    return fs.existsSync(path.join(dir, '.git'));
  },

  parseRepoName(url: string): string {
    const parts = url.split('/');
    const name = parts[parts.length - 1] || parts[parts.length - 2];
    return name?.replace(/\.git$/, '') || 'unknown';
  },
};
