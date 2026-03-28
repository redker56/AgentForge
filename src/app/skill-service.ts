/**
 * Skill Management Service
 */

import path from 'path';
import fs from 'fs-extra';
import { Storage } from '../infra/storage.js';
import { git } from '../infra/git.js';
import { files } from '../infra/files.js';
import type { Skill, SkillMeta } from '../types.js';

export class SkillService {
  constructor(private readonly storage: Storage) {}

  /**
   * Discover all skills in a repository
   */
  async discoverSkillsInRepo(repoUrl: string): Promise<Array<{ name: string; subPath: string }>> {
    const tempDir = path.join(this.storage.getSkillsDir(), `._temp_discover_${Date.now()}`);

    try {
      await git.clone(repoUrl, tempDir);

      // Scan temp directory for subdirectories containing SKILL.md
      const skills: Array<{ name: string; subPath: string }> = [];

      const scanDir = (dir: string, basePath: string = ''): void => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          if (item.startsWith('.') || item === 'node_modules') continue;

          const itemPath = path.join(dir, item);
          const relativePath = basePath ? path.join(basePath, item) : item;

          const stat = fs.statSync(itemPath);
          if (stat.isDirectory()) {
            // Check if this is a skill directory (contains SKILL.md)
            const skillMdPath = path.join(itemPath, 'SKILL.md');
            const skillMdPathLower = path.join(itemPath, 'skill.md');
            if (fs.existsSync(skillMdPath) || fs.existsSync(skillMdPathLower)) {
              skills.push({
                name: item,
                subPath: relativePath.replace(/\\/g, '/'),
              });
            } else {
              // Recursively scan subdirectories
              scanDir(itemPath, relativePath);
            }
          }
        }
      };

      scanDir(tempDir);

      return skills;
    } finally {
      // Clean up temp directory
      if (fs.existsSync(tempDir)) {
        await files.remove(tempDir);
      }
    }
  }

  list(): Array<SkillMeta & { exists: boolean }> {
    const skills = this.storage.listSkills();
    return skills.map(s => ({
      ...s,
      exists: files.exists(this.storage.getSkillPath(s.name)),
    }));
  }

  get(name: string): Skill | null {
    const meta = this.storage.getSkill(name);
    if (!meta) return null;

    const skillPath = this.storage.getSkillPath(name);
    if (!files.exists(skillPath)) return null;

    return { ...meta, path: skillPath };
  }

  async install(url: string, name?: string, subPath?: string): Promise<string> {
    // Parse URL, handle subdirectory (e.g., GitHub /tree/ URLs)
    let repoUrl = url;
    let resolvedSubPath = subPath || '';

    if (!subPath && url.includes('/tree/')) {
      // https://github.com/user/repo/tree/branch/subdir
      const match = url.match(/(https?:\/\/[^\/]+\/[^\/]+\/[^\/]+)\/tree\/[^\/]+\/(.+)/);
      if (match) {
        repoUrl = match[1];
        resolvedSubPath = match[2];
      }
    }

    const skillName = name || (resolvedSubPath ? path.basename(resolvedSubPath) : git.parseRepoName(url));
    const skillPath = this.storage.getSkillPath(skillName);

    if (files.exists(skillPath)) {
      throw new Error(`Skill already exists: ${skillName}`);
    }

    if (resolvedSubPath) {
      // Clone subdirectory: clone entire repo to temp, then copy subdirectory
      const tempDir = path.join(this.storage.getSkillsDir(), `._temp_${Date.now()}`);
      await git.clone(repoUrl, tempDir);

      const sourceDir = path.join(tempDir, resolvedSubPath);
      await files.copy(sourceDir, skillPath);
      await files.remove(tempDir);
    } else {
      await git.clone(url, skillPath);
    }

    // Clean up unnecessary files
    await files.cleanupSkillDir(skillPath);

    this.storage.saveSkill(skillName, { type: 'git', url });

    return skillName;
  }

  async update(name: string): Promise<boolean> {
    const meta = this.storage.getSkill(name);
    if (!meta) throw new Error(`Skill not found: ${name}`);

    if (meta.source.type !== 'git') {
      return false;
    }

    const skillPath = this.storage.getSkillPath(name);
    if (!git.isRepo(skillPath)) {
      return false;
    }

    await git.pull(skillPath);
    return true;
  }

  async delete(name: string): Promise<void> {
    const skillPath = this.storage.getSkillPath(name);

    if (files.exists(skillPath)) {
      await files.remove(skillPath);
    }

    this.storage.deleteSkill(name);
  }

  exists(name: string): boolean {
    return files.exists(this.storage.getSkillPath(name));
  }
}
