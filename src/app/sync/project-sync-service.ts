/**
 * Project-level sync service
 */

import path from 'path';
import fs from 'fs-extra';
import { BaseSyncService, SyncResult } from './base-sync-service.js';
import { ProjectStorage } from '../project-storage.js';
import { files } from '../../infra/files.js';
import {
  getAgentProjectSkillsDir,
  type ProjectConfig,
  type SyncMode,
  type AgentId,
  type ProjectSyncTarget,
  type ProjectSyncRecord,
} from '../../types.js';

export class ProjectSyncService extends BaseSyncService<ProjectSyncTarget, ProjectSyncRecord> {
  private readonly projectStorage = new ProjectStorage();

  getAvailableTargets(): ProjectSyncTarget[] {
    const projects = this.storage.listProjects();
    const targets: ProjectSyncTarget[] = [];

    for (const project of projects) {
      const agentTypes = this.detectAgentTypes(project.path);
      for (const agentType of agentTypes) {
        targets.push({ project, agentType });
      }
    }

    return targets;
  }

  getTargetPath(target: ProjectSyncTarget, skillName: string): string {
    const agent = this.getAgentConfig(target.agentType);
    return path.join(getAgentProjectSkillsDir(target.project.path, agent), skillName);
  }

  getSyncRecords(skillName: string): ProjectSyncRecord[] {
    const meta = this.storage.getSkill(skillName);
    return meta?.syncedProjects || [];
  }

  saveSyncRecords(skillName: string, records: ProjectSyncRecord[]): void {
    this.storage.updateSkillProjectSync(skillName, records);
  }

  getRecordTarget(record: ProjectSyncRecord): string {
    return `${record.projectId}:${record.agentType}`;
  }

  protected getTargetPathFromRecord(record: ProjectSyncRecord, skillName: string): string | null {
    const project = this.storage.getProject(record.projectId);
    if (!project) return null;

    const agent = this.getAgentConfig(record.agentType);
    return path.join(getAgentProjectSkillsDir(project.path, agent), skillName);
  }

  protected updateRecords(skillName: string, results: SyncResult[]): void {
    const existing = this.getSyncRecords(skillName);
    const newRecords: ProjectSyncRecord[] = results
      .filter(r => r.success)
      .map(r => {
        const [projectId, agentType] = r.target.split(':');
        return { projectId, agentType: agentType as AgentId, mode: r.mode };
      });

    const merged = new Map<string, ProjectSyncRecord>();
    existing.forEach(r => merged.set(this.getRecordTarget(r), r));
    newRecords.forEach(r => merged.set(this.getRecordTarget(r), r));

    this.saveSyncRecords(skillName, Array.from(merged.values()));

    // Update project-local config
    this.updateProjectLocalConfigs(skillName, results);
  }

  // ========== Project-specific methods ==========

  /**
   * Detect existing Agent directories in project
   */
  detectAgentTypes(projectPath: string): AgentId[] {
    const agents = this.storage.listAgents();
    const detected: AgentId[] = [];

    for (const agent of agents) {
      const skillPath = getAgentProjectSkillsDir(projectPath, agent);
      if (fs.existsSync(skillPath)) {
        detected.push(agent.id);
      }
    }

    return detected;
  }

  /**
   * Sync to specified project
   */
  async syncToProject(
    skillName: string,
    projectId: string,
    agentTypes?: AgentId[],
    mode: SyncMode = 'copy'
  ): Promise<SyncResult[]> {
    const project = this.storage.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    if (!files.exists(project.path)) {
      throw new Error(`Project path does not exist: ${project.path}`);
    }

    // If agentTypes not specified, detect existing structure
    const types = agentTypes || this.detectAgentTypes(project.path);
    if (types.length === 0) {
      throw new Error(`No Agent directories detected in project ${projectId}. Use --agent-types to specify sync targets.`);
    }
    const targets: ProjectSyncTarget[] = types.map(agentType => ({ project, agentType }));

    return this.sync(skillName, targets, mode);
  }

  /**
   * Re-sync (based on saved records)
   */
  async resync(skillName: string): Promise<void> {
    const records = this.getSyncRecords(skillName);
    if (records.length === 0) return;

    // Group by projectId
    const byProject = new Map<string, ProjectSyncRecord[]>();
    for (const record of records) {
      const existing = byProject.get(record.projectId) || [];
      existing.push(record);
      byProject.set(record.projectId, existing);
    }

    for (const [projectId, projectRecords] of byProject) {
      const project = this.storage.getProject(projectId);
      if (!project) continue;

      const agentTypes = projectRecords.map(r => r.agentType);
      const mode = projectRecords[0].mode; // Use first record's mode
      await this.syncToProject(skillName, projectId, agentTypes, mode);
    }
  }

  // ========== Helper methods ==========

  protected override getTargetId(target: ProjectSyncTarget): string {
    return `${target.project.id}:${target.agentType}`;
  }

  private getAgentConfig(agentType: AgentId) {
    return this.storage.listAllDefinedAgents().find(a => a.id === agentType)
      || { id: agentType };
  }

  private getExistingSkillAgentTypes(project: ProjectConfig, skillName: string): AgentId[] {
    const detected = new Set<AgentId>();

    for (const agent of this.storage.listAgents()) {
      const skillPath = path.join(getAgentProjectSkillsDir(project.path, agent), skillName);
      if (files.exists(skillPath)) {
        detected.add(agent.id);
      }
    }

    return Array.from(detected);
  }

  private updateProjectLocalConfigs(skillName: string, results: SyncResult[]): void {
    for (const result of results) {
      if (!result.success) continue;

      const [projectId, agentType] = result.target.split(':');
      const project = this.storage.getProject(projectId);
      if (!project) continue;

      this.projectStorage.addSyncRecord(project.path, {
        name: skillName,
        syncedAt: new Date().toISOString(),
        mode: result.mode,
        agentType: agentType as AgentId,
      });
    }
  }

  /**
   * Unsync (supports direct file deletion when no record exists)
   */
  override async unsync(skillName: string, targetIds?: string[]): Promise<void> {
    const records = this.getSyncRecords(skillName);
    const toRemove = targetIds || records.map(r => this.getRecordTarget(r));

    for (const targetId of toRemove) {
      // Parse targetId: "projectId:agentType"
      const [projectId, agentType] = targetId.split(':');
      const project = this.storage.getProject(projectId);
      if (!project) continue;

      // Calculate target path directly, don't rely on records
      const agent = this.getAgentConfig(agentType);
      const targetPath = path.join(getAgentProjectSkillsDir(project.path, agent), skillName);

      if (files.exists(targetPath)) {
        await files.remove(targetPath);
      }
    }

    // Update records
    const remaining = records.filter(r => !toRemove.includes(this.getRecordTarget(r)));
    this.saveSyncRecords(skillName, remaining);

    // Update project-local config
    for (const targetId of toRemove) {
      const [projectId, agentType] = targetId.split(':');
      const project = this.storage.getProject(projectId);
      if (project && agentType) {
        this.projectStorage.removeSyncRecord(project.path, skillName, agentType as AgentId);
      }
    }
  }

  /**
   * Unsync from project and update project config
   */
  async unsyncFromProject(
    skillName: string,
    projectId: string,
    agentTypes?: AgentId[]
  ): Promise<void> {
    const project = this.storage.getProject(projectId);
    const records = this.getSyncRecords(skillName);
    const detectedAgentTypes = project ? this.getExistingSkillAgentTypes(project, skillName) : [];
    const recordedAgentTypes = records
      .filter(r => r.projectId === projectId)
      .map(r => r.agentType);

    const targetAgentTypes = agentTypes || Array.from(new Set([...recordedAgentTypes, ...detectedAgentTypes]));
    const toRemove = targetAgentTypes.map(agentType => `${projectId}:${agentType}`);

    await this.unsync(skillName, toRemove);

    // Update project local config
    if (project) {
      if (agentTypes) {
        for (const agentType of agentTypes) {
          this.projectStorage.removeSyncRecord(project.path, skillName, agentType);
        }
      } else {
        this.projectStorage.removeSyncRecord(project.path, skillName);
      }
    }
  }
}
