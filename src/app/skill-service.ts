/**
 * Skill Management Service
 */

import path from 'path';
import fs from 'fs-extra';
import { Storage } from '../infra/storage.js';
import { git } from '../infra/git.js';
import { files } from '../infra/files.js';
import type { Skill, SkillMeta, SkillSource } from '../types.js';

export class SkillService {
  constructor(private readonly storage: Storage) {}

  private getSkillNameFromSubPath(subPath: string): string {
    return path.posix.basename(subPath.replace(/\\/g, '/'));
  }

  async cloneRepoToTemp(repoUrl: string): Promise<string> {
    const tempDir = path.join(this.storage.getSkillsDir(), `._temp_discover_${Date.now()}`);
    await git.clone(repoUrl, tempDir);
    return tempDir;
  }

  discoverSkillsInDirectory(repoDir: string, repoUrl: string): Array<{ name: string; subPath: string }> {
    const skills: Array<{ name: string; subPath: string }> = [];

    const rootSkillMdPath = path.join(repoDir, 'SKILL.md');
    const rootSkillMdPathLower = path.join(repoDir, 'skill.md');
    if (fs.existsSync(rootSkillMdPath) || fs.existsSync(rootSkillMdPathLower)) {
      skills.push({
        name: git.parseRepoName(repoUrl),
        subPath: '',
      });
    }

    const scanDir = (dir: string, basePath: string = ''): void => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules') continue;

        const itemPath = path.join(dir, item);
        const relativePath = basePath ? path.join(basePath, item) : item;
        const stat = fs.statSync(itemPath);

        if (!stat.isDirectory()) continue;

        const skillMdPath = path.join(itemPath, 'SKILL.md');
        const skillMdPathLower = path.join(itemPath, 'skill.md');
        if (fs.existsSync(skillMdPath) || fs.existsSync(skillMdPathLower)) {
          skills.push({
            name: item,
            subPath: relativePath.replace(/\\/g, '/'),
          });
        } else {
          scanDir(itemPath, relativePath);
        }
      }
    };

    scanDir(repoDir);
    return skills;
  }

  async discoverSkillsInRepo(repoUrl: string): Promise<Array<{ name: string; subPath: string }>> {
    const tempDir = await this.cloneRepoToTemp(repoUrl);

    try {
      return this.discoverSkillsInDirectory(tempDir, repoUrl);
    } finally {
      await this.removeTempRepo(tempDir);
    }
  }

  async removeTempRepo(tempDir: string): Promise<void> {
    if (fs.existsSync(tempDir)) {
      await files.remove(tempDir);
    }
  }

  list(): Array<SkillMeta & { exists: boolean }> {
    const skills = this.storage.listSkills();
    return skills
      .map(s => ({
        ...s,
        exists: files.exists(this.storage.getSkillPath(s.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  }

  get(name: string): Skill | null {
    const meta = this.storage.getSkill(name);
    if (!meta) return null;

    const skillPath = this.storage.getSkillPath(name);
    if (!files.exists(skillPath)) return null;

    return { ...meta, path: skillPath };
  }

  async install(url: string, name?: string, subPath?: string): Promise<string> {
    let repoUrl = url;
    let resolvedSubPath = subPath || '';

    if (!subPath && url.includes('/tree/')) {
      const match = url.match(/(https?:\/\/[^\/]+\/[^\/]+\/[^\/]+)\/tree\/[^\/]+\/(.+)/);
      if (match) {
        repoUrl = match[1];
        resolvedSubPath = match[2];
      }
    }

    const skillName = name
      || (resolvedSubPath ? this.getSkillNameFromSubPath(resolvedSubPath) : git.parseRepoName(url));
    const skillPath = this.storage.getSkillPath(skillName);

    if (files.exists(skillPath)) {
      throw new Error(`Skill already exists: ${skillName}`);
    }

    if (resolvedSubPath) {
      const tempDir = path.join(this.storage.getSkillsDir(), `._temp_${Date.now()}`);
      await git.clone(repoUrl, tempDir);

      const sourceDir = path.join(tempDir, resolvedSubPath);
      await files.copy(sourceDir, skillPath);
      await files.remove(tempDir);
    } else {
      await git.clone(url, skillPath);
    }

    await files.cleanupSkillDir(skillPath);
    this.storage.saveSkill(skillName, { type: 'git', url });

    return skillName;
  }

  async installFromDirectory(url: string, name: string, sourceDir: string): Promise<string> {
    const skillPath = this.storage.getSkillPath(name);

    if (files.exists(skillPath)) {
      throw new Error(`Skill already exists: ${name}`);
    }

    await files.copy(sourceDir, skillPath);
    await files.cleanupSkillDir(skillPath);
    this.storage.saveSkill(name, { type: 'git', url });

    return name;
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

  /**
   * Import skill from a directory path
   */
  async importFromPath(sourcePath: string, name: string, source: SkillSource): Promise<void> {
    const skillPath = this.storage.getSkillPath(name);

    if (files.exists(skillPath)) {
      throw new Error(`Skill already exists: ${name}`);
    }

    await files.copy(sourcePath, skillPath);
    await files.cleanupSkillDir(skillPath);
    this.storage.saveSkill(name, source);
  }
}
