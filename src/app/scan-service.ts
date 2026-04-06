/**
 * @module App/ScanService
 * @layer app
 * @allowed-imports infra/, types
 * @responsibility Project scanning and skill import — discovers skills in project directories.
 *
 * Discovers skills inside project directories by walking Agent-specific
 * skill directories (e.g. `.claude/skills/`, `.agents/skills/`). Also
 * computes version status by comparing directory hashes against the
 * AgentForge master copy.
 */

import path from 'path';

import fs from 'fs-extra';

import { files } from '../infra/files.js';
import { Storage } from '../infra/storage.js';
import {
  getAgentProjectSkillsDir,
  getAgentProjectSkillsRelativePath,
  type Agent,
  type SkillSource,
} from '../types.js';

export interface DiscoveredSkill {
  name: string;
  path: string;
  agentId: string;
  agentName: string;
  hasSkillMd: boolean;
  subPath: string;
}

/**
 * Skill project distribution info
 */
export interface SkillProjectDistribution {
  projectId: string;
  agents: Array<{ id: string; name: string }>;
}

/**
 * Skill project distribution info with per-agent version status
 */
export interface SkillProjectDistributionWithStatus {
  projectId: string;
  agents: Array<{ id: string; name: string; isDifferentVersion: boolean }>;
}

/**
 * Project skill status
 */
export interface ProjectSkillStatus {
  name: string;
  path: string;
  agentId: string;
  agentName: string;
  /** Imported and content matches */
  isImported: boolean;
  /** Same name skill exists but content differs */
  isDifferentVersion: boolean;
  subPath: string;
  /** Source project ID (only returned by getAgentProjectSkills) */
  projectId?: string;
}

export class ScanService {
  constructor(private readonly storage: Storage) {}

  /** Return built-in and custom agents that are relevant for project-level scanning. */
  private getProjectAwareAgents(): Agent[] {
    return this.storage.listAgents();
  }

  /**
   * Scan a project directory for skills across all known agent types.
   *
   * Walks every agent's skill sub-directory inside the project and returns
   * the first occurrence of each unique skill name.
   *
   * @param projectPath - Absolute path to the project root.
   * @returns De-duplicated list of discovered skills.
   */
  scanProject(projectPath: string): DiscoveredSkill[] {
    const skills: DiscoveredSkill[] = [];
    const seen = new Set<string>();
    const agents = this.getProjectAwareAgents();

    for (const agent of agents) {
      const subPath = getAgentProjectSkillsRelativePath(agent);
      const skillDirPath = getAgentProjectSkillsDir(projectPath, agent);
      if (fs.existsSync(skillDirPath)) {
        const discovered = this.scanDirectory(skillDirPath, agent.id, agent.name, subPath);
        for (const skill of discovered) {
          if (!seen.has(skill.name)) {
            seen.add(skill.name);
            skills.push(skill);
          }
        }
      }
    }

    return skills;
  }

  /** Recursively scan a directory for skill folders containing `SKILL.md`. */
  private scanDirectory(
    dir: string,
    agentId: string,
    agentName: string,
    dirName: string
  ): DiscoveredSkill[] {
    const skills: DiscoveredSkill[] = [];
    const subPath = dirName;

    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const itemPath = path.join(dir, item);

        // Skip hidden directories and non-directories
        if (item.startsWith('.')) continue;
        try {
          if (!fs.statSync(itemPath).isDirectory()) continue;
        } catch {
          continue;
        }

        // Check if SKILL.md exists (case-insensitive)
        const skillMdPath = path.join(itemPath, 'SKILL.md');
        const skillMdPathLower = path.join(itemPath, 'skill.md');
        const hasSkillMd = fs.existsSync(skillMdPath) || fs.existsSync(skillMdPathLower);

        // Skip directories without SKILL.md
        if (!hasSkillMd) continue;

        skills.push({
          name: item,
          path: itemPath,
          agentId,
          agentName,
          hasSkillMd,
          subPath,
        });
      }
    } catch {
      // Directory read failed, return empty
    }

    return skills;
  }

  /**
   * Import skill to AgentForge
   * @param skillPath Full path to the skill
   * @param name Name after import (optional, defaults to original directory name)
   * @param projectId Source project ID (optional, for tracking source)
   */
  async importSkill(skillPath: string, name?: string, projectId?: string): Promise<string> {
    const skillName = name || path.basename(skillPath);
    const targetPath = this.storage.getSkillPath(skillName);

    // Check if already exists
    if (files.exists(targetPath)) {
      throw new Error(`Skill already exists: ${skillName}`);
    }

    // Copy skill to AgentForge
    await files.copy(skillPath, targetPath);

    // Save metadata
    const source: SkillSource = projectId ? { type: 'project', projectId } : { type: 'local' };
    this.storage.saveSkill(skillName, source);

    return skillName;
  }

  /**
   * Batch import skills (simple version, without sync detection)
   */
  async importSkills(
    skills: DiscoveredSkill[],
    projectId?: string
  ): Promise<Array<{ name: string; success: boolean; error?: string }>> {
    const results: Array<{ name: string; success: boolean; error?: string }> = [];

    for (const skill of skills) {
      try {
        await this.importSkill(skill.path, skill.name, projectId);
        results.push({ name: skill.name, success: true });
      } catch (e: unknown) {
        results.push({
          name: skill.name,
          success: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return results;
  }

  /**
   * Get skill distribution across all projects (with per-agent version status)
   */
  async getSkillProjectDistributionWithStatus(
    skillName: string
  ): Promise<SkillProjectDistributionWithStatus[]> {
    const projects = this.storage.listProjects();
    const projectAgents = this.getProjectAwareAgents();
    const results: SkillProjectDistributionWithStatus[] = [];

    const importedSkillPath = this.storage.getSkillPath(skillName);
    const hasImportedSkill = fs.existsSync(importedSkillPath);
    let importedHash: string | null = null;

    if (hasImportedSkill) {
      importedHash = await files.getDirectoryHash(importedSkillPath);
    }

    for (const project of projects) {
      const projectMatches: Array<{ id: string; name: string; isDifferentVersion: boolean }> = [];

      for (const agent of projectAgents) {
        const resolvedSkillPath = path.join(
          getAgentProjectSkillsDir(project.path, agent),
          skillName
        );
        if (this.isValidSkillDir(resolvedSkillPath)) {
          let isDifferent = false;
          if (hasImportedSkill && importedHash) {
            const projectHash = await files.getDirectoryHash(resolvedSkillPath);
            isDifferent = projectHash !== null && projectHash !== importedHash;
          }
          projectMatches.push({ id: agent.id, name: agent.name, isDifferentVersion: isDifferent });
        }
      }

      if (projectMatches.length > 0) {
        results.push({ projectId: project.id, agents: projectMatches });
      }
    }

    return results;
  }

  /**
   * Check if directory is a valid skill directory (contains SKILL.md)
   */
  private isValidSkillDir(dirPath: string): boolean {
    try {
      if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        return false;
      }
      const files = fs.readdirSync(dirPath);
      return files.some((f) => f.toLowerCase() === 'skill.md');
    } catch {
      return false;
    }
  }

  /**
   * Get skill distribution across all projects
   * Returns list of projects containing the skill and Agent types
   */
  getSkillProjectDistribution(skillName: string): SkillProjectDistribution[] {
    const projects = this.storage.listProjects();
    const projectAgents = this.getProjectAwareAgents();
    const results: SkillProjectDistribution[] = [];

    for (const project of projects) {
      const projectMatches: Array<{ id: string; name: string }> = [];

      for (const agent of projectAgents) {
        const resolvedSkillPath = path.join(
          getAgentProjectSkillsDir(project.path, agent),
          skillName
        );
        if (this.isValidSkillDir(resolvedSkillPath)) {
          projectMatches.push({ id: agent.id, name: agent.name });
        }
      }

      if (projectMatches.length > 0) {
        results.push({ projectId: project.id, agents: projectMatches });
      }
    }

    return results;
  }

  /**
   * Get all skills in a project with their import status
   */
  async getProjectSkillsWithStatus(projectId: string): Promise<ProjectSkillStatus[]> {
    const project = this.storage.getProject(projectId);
    if (!project) return [];

    const skills: ProjectSkillStatus[] = [];
    const importedSkills = this.storage.listSkills().map((s) => s.name);
    const agents = this.getProjectAwareAgents();

    for (const agent of agents) {
      const subPath = getAgentProjectSkillsRelativePath(agent);
      const skillDirPath = getAgentProjectSkillsDir(project.path, agent);
      if (fs.existsSync(skillDirPath)) {
        const discovered = this.scanDirectory(skillDirPath, agent.id, agent.name, subPath);
        for (const skill of discovered) {
          const status = await this.getSkillImportStatus(skill.path, skill.name, importedSkills);
          skills.push({
            name: skill.name,
            path: skill.path,
            agentId: agent.id,
            agentName: agent.name,
            isImported: status.isImported,
            isDifferentVersion: status.isDifferentVersion,
            subPath: skill.subPath,
          });
        }
      }
    }

    return skills;
  }

  /**
   * Get skills for a specific Agent across all projects
   */
  async getAgentProjectSkills(agentId: string): Promise<ProjectSkillStatus[]> {
    const projects = this.storage.listProjects();
    const agent = this.getProjectAwareAgents().find((candidate) => candidate.id === agentId);
    if (!agent) return [];

    const skills: ProjectSkillStatus[] = [];
    const importedSkills = this.storage.listSkills().map((s) => s.name);
    const subPath = getAgentProjectSkillsRelativePath(agent);

    for (const project of projects) {
      const skillDirPath = getAgentProjectSkillsDir(project.path, agent);
      if (fs.existsSync(skillDirPath)) {
        const discovered = this.scanDirectory(skillDirPath, agent.id, agent.name, subPath);
        for (const skill of discovered) {
          const status = await this.getSkillImportStatus(skill.path, skill.name, importedSkills);
          skills.push({
            name: skill.name,
            path: skill.path,
            agentId: agent.id,
            agentName: agent.name,
            isImported: status.isImported,
            isDifferentVersion: status.isDifferentVersion,
            subPath: skill.subPath,
            projectId: project.id,
          });
        }
      }
    }

    return skills;
  }

  /**
   * Get skill import status
   */
  private async getSkillImportStatus(
    projectSkillPath: string,
    skillName: string,
    importedSkills: string[]
  ): Promise<{ isImported: boolean; isDifferentVersion: boolean }> {
    // If no imported skill with same name
    if (!importedSkills.includes(skillName)) {
      return { isImported: false, isDifferentVersion: false };
    }

    const importedSkillPath = this.storage.getSkillPath(skillName);
    if (!fs.existsSync(importedSkillPath)) {
      return { isImported: false, isDifferentVersion: false };
    }

    // Calculate hash and compare
    const [projectHash, importedHash] = await Promise.all([
      files.getDirectoryHash(projectSkillPath),
      files.getDirectoryHash(importedSkillPath),
    ]);

    if (projectHash !== null && importedHash !== null && projectHash === importedHash) {
      // Content matches, already imported
      return { isImported: true, isDifferentVersion: false };
    } else {
      // Same name but different content
      return { isImported: false, isDifferentVersion: true };
    }
  }
}
