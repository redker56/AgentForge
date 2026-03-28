/**
 * Git Operations
 */

import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';

export const git = {
  async clone(url: string, dest: string): Promise<void> {
    if (fs.existsSync(dest)) {
      throw new Error(`Directory already exists: ${dest}`);
    }
    await execa('git', ['clone', url, dest], { stdio: 'inherit' });
  },

  async pull(repoPath: string): Promise<void> {
    await execa('git', ['pull'], { cwd: repoPath, stdio: 'inherit' });
  },

  isRepo(dir: string): boolean {
    return fs.existsSync(path.join(dir, '.git'));
  },

  parseRepoName(url: string): string {
    const parts = url.split('/');
    let name = parts[parts.length - 1] || parts[parts.length - 2];
    return name?.replace(/\.git$/, '') || 'unknown';
  },
};
