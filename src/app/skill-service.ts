/**
 * @module App/SkillService
 * @layer app
 * @allowed-imports infra/, types
 * @responsibility Skill CRUD operations — install, update, delete, discover, and import skills.
 *
 * All skill mutations go through this service so that storage and file
 * operations stay consistent. File operations delegate to `infra/files.ts`;
 * persistence delegates to `infra/storage.ts`.
 *
 * @architecture App-layer orchestration — receives a Storage instance via
 * constructor injection and delegates all I/O to the infra layer.
 */

import path from 'path';

import fs from 'fs-extra';

import { files } from '../infra/files.js';
import { git } from '../infra/git.js';
import type { RegistryRepository } from '../infra/registry-repository.js';
import {
  normalizeSkillCategories,
  type Skill,
  type SkillMeta,
  type SkillSource,
} from '../types.js';

export type SkillCategoryUpdateMode = 'set' | 'add' | 'remove' | 'clear';

export class SkillService {
  constructor(private readonly storage: RegistryRepository) {}

  private buildNextCategories(
    currentCategories: string[],
    nextCategories: string[],
    mode: SkillCategoryUpdateMode
  ): string[] {
    const normalizedCurrent = normalizeSkillCategories(currentCategories);
    const normalizedNext = normalizeSkillCategories(nextCategories);

    if (mode === 'clear') {
      return [];
    }

    if (mode === 'set') {
      return normalizedNext;
    }

    if (mode === 'add') {
      return normalizeSkillCategories([...normalizedCurrent, ...normalizedNext]);
    }

    const categoriesToRemove = new Set(
      normalizedNext.map((category) => category.toLocaleLowerCase())
    );
    return normalizedCurrent.filter(
      (category) => !categoriesToRemove.has(category.toLocaleLowerCase())
    );
  }

  /** Extract the skill name from the last path segment, normalizing backslashes. */
  private getSkillNameFromSubPath(subPath: string): string {
    return path.posix.basename(subPath.replace(/\\/g, '/'));
  }

  private parseGitSource(source: Extract<SkillSource, { type: 'git' }>): {
    repoUrl: string;
    subPath: string;
  } {
    let repoUrl = source.url;
    let subPath = source.subPath ?? '';

    if (source.url.includes('/tree/')) {
      const match = source.url.match(/(https?:\/\/[^/]+\/[^/]+\/[^/]+)\/tree\/[^/]+\/(.+)/);
      if (match) {
        repoUrl = match[1];
        if (!subPath) {
          subPath = match[2];
        }
      }
    }

    return { repoUrl, subPath: subPath.replace(/\\/g, '/') };
  }

  private resolveGitSkillSubPath(
    repoDir: string,
    source: Extract<SkillSource, { type: 'git' }>,
    skillName: string
  ): { repoUrl: string; subPath: string } {
    const parsed = this.parseGitSource(source);
    if (parsed.subPath) {
      return parsed;
    }

    const discovered = this.discoverSkillsInDirectory(repoDir, parsed.repoUrl);
    const exactMatches = discovered.filter((entry) => entry.name === skillName);

    if (exactMatches.length === 1) {
      return { repoUrl: parsed.repoUrl, subPath: exactMatches[0].subPath };
    }

    if (discovered.length === 1) {
      return { repoUrl: parsed.repoUrl, subPath: discovered[0].subPath };
    }

    throw new Error(`Could not determine repository path for skill '${skillName}'`);
  }

  private async replaceSkillDirectory(skillPath: string, sourceDir: string): Promise<void> {
    if (fs.existsSync(skillPath)) {
      await files.remove(skillPath);
    }

    await files.copy(sourceDir, skillPath);
    await files.cleanupSkillDir(skillPath);
  }

  /** Clone a remote repository into a temporary directory under the skills folder. */
  async cloneRepoToTemp(repoUrl: string): Promise<string> {
    const tempDir = path.join(this.storage.getSkillsDir(), `._temp_discover_${Date.now()}`);
    await git.clone(repoUrl, tempDir);
    return tempDir;
  }

  /**
   * Walk a local directory tree and return every sub-directory that contains
   * a `SKILL.md` (case-insensitive) file.
   *
   * @param repoDir  - Root of the cloned repository or local directory.
   * @param repoUrl  - Original URL (used to derive the root skill name).
   * @returns Array of `{ name, subPath }` objects where `subPath` is the
   *          relative path from `repoDir` (empty string for root-level skill).
   */
  discoverSkillsInDirectory(
    repoDir: string,
    repoUrl: string
  ): Array<{ name: string; subPath: string }> {
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

  /**
   * Clone a remote repository, discover skills inside it, and clean up the temp clone.
   *
   * @returns Discovered skill entries with name and relative subPath.
   */
  async discoverSkillsInRepo(repoUrl: string): Promise<Array<{ name: string; subPath: string }>> {
    const tempDir = await this.cloneRepoToTemp(repoUrl);

    try {
      return this.discoverSkillsInDirectory(tempDir, repoUrl);
    } finally {
      await this.removeTempRepo(tempDir);
    }
  }

  /** Remove a previously created temporary repository directory. */
  async removeTempRepo(tempDir: string): Promise<void> {
    if (fs.existsSync(tempDir)) {
      await files.remove(tempDir);
    }
  }

  /** List all registered skills enriched with an `exists` flag for the on-disk directory. */
  list(): Array<SkillMeta & { exists: boolean }> {
    const skills = this.storage.listSkills();
    return skills
      .map((s) => ({
        ...s,
        exists: files.exists(this.storage.getSkillPath(s.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  }

  /**
   * Retrieve a single skill by name.
   *
   * @returns Full skill data including on-disk path, or `null` if not found.
   */
  get(name: string): Skill | null {
    const meta = this.storage.getSkill(name);
    if (!meta) return null;

    const skillPath = this.storage.getSkillPath(name);
    if (!files.exists(skillPath)) return null;

    return { ...meta, path: skillPath };
  }

  /**
   * Install a skill from a Git URL.
   *
   * Supports sub-path extraction via `/tree/<branch>/<path>` URL fragments.
   * Throws if a skill with the same name already exists.
   *
   * @returns The resolved skill name.
   */
  async install(url: string, name?: string, subPath?: string): Promise<string> {
    let repoUrl = url;
    let resolvedSubPath = subPath || '';

    if (!subPath && url.includes('/tree/')) {
      const match = url.match(/(https?:\/\/[^/]+\/[^/]+\/[^/]+)\/tree\/[^/]+\/(.+)/);
      if (match) {
        repoUrl = match[1];
        resolvedSubPath = match[2];
      }
    }

    const skillName =
      name ||
      (resolvedSubPath ? this.getSkillNameFromSubPath(resolvedSubPath) : git.parseRepoName(url));
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
    this.storage.saveSkill(skillName, {
      type: 'git',
      url: repoUrl,
      ...(resolvedSubPath ? { subPath: resolvedSubPath.replace(/\\/g, '/') } : {}),
    });

    return skillName;
  }

  /**
   * Install a skill from an already-cloned local directory.
   *
   * Used when the repo has already been fetched and a specific sub-path identified.
   *
   * @returns The skill name.
   */
  async installFromDirectory(
    url: string,
    name: string,
    sourceDir: string,
    subPath?: string
  ): Promise<string> {
    const skillPath = this.storage.getSkillPath(name);

    if (files.exists(skillPath)) {
      throw new Error(`Skill already exists: ${name}`);
    }

    await files.copy(sourceDir, skillPath);
    await files.cleanupSkillDir(skillPath);
    this.storage.saveSkill(name, {
      type: 'git',
      url,
      ...(subPath ? { subPath: subPath.replace(/\\/g, '/') } : {}),
    });

    return name;
  }

  /**
   * Refresh a git-backed skill from its remote repository.
   *
   * @returns `true` if updated, `false` if the skill is not git-backed.
   */
  async update(name: string): Promise<boolean> {
    const meta = this.storage.getSkill(name);
    if (!meta) throw new Error(`Skill not found: ${name}`);

    if (meta.source.type !== 'git') {
      return false;
    }

    const skillPath = this.storage.getSkillPath(name);
    const tempDir = await this.cloneRepoToTemp(this.parseGitSource(meta.source).repoUrl);
    const updatedAt = new Date().toISOString();

    try {
      const { repoUrl, subPath } = this.resolveGitSkillSubPath(tempDir, meta.source, name);
      const sourceDir = subPath ? path.join(tempDir, subPath) : tempDir;

      if (!fs.existsSync(sourceDir)) {
        throw new Error(
          subPath
            ? `Skill path not found in repository: ${subPath}`
            : `Skill root not found in repository: ${name}`
        );
      }

      await this.replaceSkillDirectory(skillPath, sourceDir);
      this.storage.saveSkillMeta(name, {
        ...meta,
        source: {
          type: 'git',
          url: repoUrl,
          ...(subPath ? { subPath } : {}),
        },
        updatedAt,
      });

      return true;
    } finally {
      await this.removeTempRepo(tempDir);
    }
  }

  /** Delete a skill -- removes the on-disk directory and the registry entry. */
  async delete(name: string): Promise<void> {
    const skillPath = this.storage.getSkillPath(name);

    if (files.exists(skillPath)) {
      await files.remove(skillPath);
    }

    this.storage.deleteSkill(name);
  }

  /** Check whether a skill directory exists on disk. */
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

  updateCategories(
    name: string,
    categories: string[],
    mode: SkillCategoryUpdateMode = 'set'
  ): SkillMeta {
    const meta = this.storage.getSkill(name);
    if (!meta) {
      throw new Error(`Skill not found: ${name}`);
    }

    const nextMeta: SkillMeta = {
      ...meta,
      categories: this.buildNextCategories(meta.categories, categories, mode),
    };

    this.storage.saveSkillMeta(name, nextMeta);
    return nextMeta;
  }
}
