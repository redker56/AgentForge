import path from 'path';

import fs from 'fs-extra';

import type { RegistryRepository } from '../infra/registry-repository.js';
import {
  getAgentProjectSkillsDir,
  type Agent,
  type ProjectConfig,
  type SyncMode,
} from '../types.js';

import type { ReconcileService } from './reconcile-service.js';
import type { ScanService } from './scan-service.js';
import type {
  AgentSummaryData,
  AgentWorkbenchData,
  ImportCandidate,
  ImportSourcePreview,
  LibraryOverview,
  ProjectSummaryData,
  ProjectWorkbenchData,
  SkillDetailData,
  SyncAgentTypeItem,
  SyncPreview,
  WorkbenchQueries,
  WorkbenchSection,
  WorkbenchSkillRow,
} from './workbench-types.js';

interface FileOpsLike {
  pathExists(p: string): boolean;
  listSubdirectories(p: string): string[];
  fileExists(p: string): boolean;
}

function normalizePreviewText(text: string): string {
  let normalized = text.replace(/\r\n?/g, '\n');
  let sanitized = '';

  for (const char of normalized) {
    const code = char.charCodeAt(0);
    const isControl = (code >= 0 && code <= 8) || (code >= 11 && code <= 31) || code === 127;
    if (!isControl) {
      sanitized += char;
    }
  }

  normalized = sanitized;
  return normalized;
}

function sortRowsByName<T extends { name: string }>(rows: T[]): T[] {
  return [...rows].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
  );
}

function uniqueAgentTypes(
  typeIds: Set<string>,
  agents: Array<{ id: string; name: string }>
): SyncAgentTypeItem[] {
  return Array.from(typeIds)
    .sort()
    .map((agentType) => {
      const agent = agents.find((item) => item.id === agentType);
      return {
        id: agentType,
        label: agent ? `${agent.name} (${agent.id})` : agentType,
      };
    });
}

function parseProjectTargetPairs(
  targetIds: string[]
): Array<{ projectId: string; agentType: string }> {
  return targetIds
    .filter((targetId) => targetId.includes(':'))
    .map((targetId) => {
      const [projectId, agentType] = targetId.split(':');
      return { projectId, agentType };
    })
    .filter((target) => Boolean(target.projectId) && Boolean(target.agentType));
}

export class DefaultWorkbenchQueries implements WorkbenchQueries {
  constructor(
    private readonly storage: RegistryRepository,
    private readonly scanService: ScanService,
    private readonly fileOps: FileOpsLike,
    private readonly reconcileService?: ReconcileService
  ) {}

  async loadLibraryOverview(): Promise<LibraryOverview> {
    if (this.reconcileService) {
      await this.reconcileService.reconcile();
    }

    const skills = this.storage
      .listSkills()
      .map((skill) => ({
        ...skill,
        exists: this.fileOps.pathExists(this.storage.getSkillPath(skill.name)),
      }))
      .sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
      );
    const agents = this.storage.listAgents();
    const projects = this.storage.listProjects();

    return {
      skills,
      agents,
      projects,
      agentSummaries: this.buildAgentSummaries(agents, projects),
      projectSummaries: this.buildProjectSummaries(projects, agents),
    };
  }

  async loadSkillDetail(skillName: string): Promise<SkillDetailData | null> {
    const skill = this.storage.getSkill(skillName);
    if (!skill) return null;

    const skillPath = this.storage.getSkillPath(skillName);
    if (!this.fileOps.pathExists(skillPath)) return null;

    const allAgents = this.storage.listAgents();
    const syncStatus = allAgents.map((agent) => {
      const record = skill.syncedTo.find((item) => item.agentId === agent.id);
      if (!record) {
        return {
          agentId: agent.id,
          agentName: agent.name,
          mode: 'copy' as SyncMode,
          status: 'missing' as const,
        };
      }

      return {
        agentId: agent.id,
        agentName: agent.name,
        mode: record.mode,
        status: 'synced' as const,
      };
    });

    const projectDistribution =
      await this.scanService.getSkillProjectDistributionWithStatus(skillName);

    let skillMdPreview: string | null = null;
    try {
      for (const candidate of ['SKILL.md', 'skill.md']) {
        const mdPath = path.join(skillPath, candidate);
        if (fs.existsSync(mdPath)) {
          skillMdPreview = normalizePreviewText(fs.readFileSync(mdPath, 'utf-8'))
            .split('\n')
            .slice(0, 20)
            .join('\n');
          break;
        }
      }
    } catch {
      skillMdPreview = null;
    }

    return {
      name: skillName,
      path: skillPath,
      source: skill.source,
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt,
      categories: skill.categories,
      syncedTo: skill.syncedTo,
      syncedProjects: skill.syncedProjects,
      syncStatus,
      projectDistribution,
      skillMdPreview,
    };
  }

  async loadAgentWorkbench(agentId: string): Promise<AgentWorkbenchData | null> {
    const agent = this.storage.getAgent(agentId);
    if (!agent) return null;

    const userLevelSkills: WorkbenchSkillRow[] = [];
    if (this.fileOps.pathExists(agent.basePath)) {
      const skillDirs = [...this.fileOps.listSubdirectories(agent.basePath)].sort((left, right) =>
        left.localeCompare(right, undefined, { sensitivity: 'base' })
      );
      for (const skillDir of skillDirs) {
        const skillPath = path.join(agent.basePath, skillDir);
        const hasSkillMd =
          fs.existsSync(path.join(skillPath, 'SKILL.md')) ||
          fs.existsSync(path.join(skillPath, 'skill.md'));
        if (!hasSkillMd) continue;

        const skill = this.storage.getSkill(skillDir);
        const syncRecord = skill?.syncedTo.find((record) => record.agentId === agentId);
        userLevelSkills.push({
          rowId: `agent:${agentId}:user:${skillDir}`,
          name: skillDir,
          path: skillPath,
          registrySkillName: skill?.name,
          agentId,
          agentName: agent.name,
          isImported: Boolean(skill),
          isDifferentVersion: false,
          syncMode: syncRecord?.mode,
          isSynced: Boolean(syncRecord),
          sourceType: 'agent-user',
        });
      }
    }

    const byProject = new Map<string, WorkbenchSkillRow[]>();
    const projectLevelStatuses = await this.scanService.getAgentProjectSkills(agentId);
    for (const skill of projectLevelStatuses) {
      if (!skill.projectId) continue;

      const rows = byProject.get(skill.projectId) ?? [];
      rows.push({
        rowId: `agent:${agentId}:project:${skill.projectId}:${skill.name}`,
        name: skill.name,
        path: skill.path,
        registrySkillName: this.storage.getSkill(skill.name) ? skill.name : undefined,
        agentId: skill.agentId,
        agentName: skill.agentName,
        projectId: skill.projectId,
        isImported: Boolean(this.storage.getSkill(skill.name)),
        isDifferentVersion: skill.isDifferentVersion,
        sourceType: 'agent-project',
      });
      byProject.set(skill.projectId, rows);
    }

    const projectLevelSkills = Array.from(byProject.keys())
      .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }))
      .map((projectId) => ({
        projectId,
        skills: sortRowsByName(byProject.get(projectId) ?? []),
      }));

    const sections: WorkbenchSection[] = [];
    if (userLevelSkills.length > 0) {
      sections.push({
        id: `agent:${agentId}:user-level`,
        title: 'User-level',
        rows: sortRowsByName(userLevelSkills),
      });
    }
    for (const projectGroup of projectLevelSkills) {
      if (projectGroup.skills.length === 0) continue;
      sections.push({
        id: `agent:${agentId}:project:${projectGroup.projectId}`,
        title: `Project-level / ${projectGroup.projectId}`,
        rows: projectGroup.skills,
      });
    }

    return {
      agentId,
      agentName: agent.name,
      basePath: agent.basePath,
      userLevelSkills: sortRowsByName(userLevelSkills),
      projectLevelSkills,
      sections,
    };
  }

  async loadProjectWorkbench(projectId: string): Promise<ProjectWorkbenchData | null> {
    const project = this.storage.getProject(projectId);
    if (!project) return null;

    const byAgent = new Map<
      string,
      { agentId: string; agentName: string; skills: WorkbenchSkillRow[] }
    >();
    const projectSkills = await this.scanService.getProjectSkillsWithStatus(projectId);

    for (const skill of projectSkills) {
      let group = byAgent.get(skill.agentId);
      if (!group) {
        group = {
          agentId: skill.agentId,
          agentName: skill.agentName,
          skills: [],
        };
        byAgent.set(skill.agentId, group);
      }

      group.skills.push({
        rowId: `project:${projectId}:${skill.agentId}:${skill.name}`,
        name: skill.name,
        path: skill.path,
        registrySkillName: this.storage.getSkill(skill.name) ? skill.name : undefined,
        agentId: skill.agentId,
        agentName: skill.agentName,
        projectId,
        isImported: Boolean(this.storage.getSkill(skill.name)),
        isDifferentVersion: skill.isDifferentVersion,
        sourceType: 'project',
      });
    }

    const skillsByAgent = Array.from(byAgent.values())
      .sort((left, right) =>
        left.agentName.localeCompare(right.agentName, undefined, { sensitivity: 'base' })
      )
      .map((group) => ({
        ...group,
        skills: sortRowsByName(group.skills),
      }));

    return {
      projectId,
      projectPath: project.path,
      skillsByAgent,
      sections: skillsByAgent
        .filter((group) => group.skills.length > 0)
        .map((group) => ({
          id: `project:${projectId}:agent:${group.agentId}`,
          title: group.agentName,
          rows: group.skills,
        })),
    };
  }

  async loadSyncPreview(input: {
    operation: 'sync-agents' | 'sync-projects' | 'unsync' | null;
    unsyncScope: 'agents' | 'projects' | null;
    selectedSkillNames: string[];
    selectedProjectTargetIds?: string[];
  }): Promise<SyncPreview> {
    const agents = this.storage.listAgents().map((agent) => ({ id: agent.id, name: agent.name }));
    const projects = this.storage
      .listProjects()
      .map((project) => ({ id: project.id, path: project.path }));
    const selectedSkillNames = input.selectedSkillNames;

    if (input.operation === 'sync-agents') {
      return {
        targets: agents.map((agent) => ({ id: agent.id, label: `${agent.name} (${agent.id})` })),
        agentTypes: [],
      };
    }

    if (input.operation === 'sync-projects') {
      return {
        targets: projects.map((project) => ({
          id: project.id,
          label: `${project.id}  ${project.path}`,
        })),
        agentTypes: [],
      };
    }

    if (input.operation !== 'unsync') {
      return { targets: [], agentTypes: [] };
    }

    if (input.unsyncScope === 'agents') {
      const agentIds = new Set<string>();
      for (const skillName of selectedSkillNames) {
        for (const record of this.storage.getSkill(skillName)?.syncedTo ?? []) {
          agentIds.add(record.agentId);
        }
      }

      return {
        targets: agents
          .filter((agent) => agentIds.has(agent.id))
          .map((agent) => ({ id: agent.id, label: `${agent.name} (${agent.id})` })),
        agentTypes: [],
      };
    }

    if (input.unsyncScope !== 'projects') {
      return { targets: [], agentTypes: [] };
    }

    const availabilityBySkill = await Promise.all(
      selectedSkillNames.map(async (skillName) => {
        const availability = new Map<string, Set<string>>();
        for (const record of this.storage.getSkill(skillName)?.syncedProjects ?? []) {
          if (!availability.has(record.projectId)) {
            availability.set(record.projectId, new Set<string>());
          }
          availability.get(record.projectId)?.add(record.agentType);
        }

        const distribution =
          await this.scanService.getSkillProjectDistributionWithStatus(skillName);
        for (const project of distribution) {
          if (!availability.has(project.projectId)) {
            availability.set(project.projectId, new Set<string>());
          }
          for (const agent of project.agents) {
            availability.get(project.projectId)?.add(agent.id);
          }
        }

        return [skillName, availability] as const;
      })
    );
    const availabilityMap = new Map(availabilityBySkill);
    const projectIds = new Set<string>();

    for (const skillName of selectedSkillNames) {
      const availability = availabilityMap.get(skillName) ?? new Map<string, Set<string>>();
      for (const projectId of availability.keys()) {
        projectIds.add(projectId);
      }
    }

    const exactTargets = parseProjectTargetPairs(input.selectedProjectTargetIds ?? []);
    if (exactTargets.length > 0) {
      return {
        targets: projects
          .filter((project) => projectIds.has(project.id))
          .map((project) => ({ id: project.id, label: `${project.id}  ${project.path}` })),
        agentTypes: uniqueAgentTypes(
          new Set(exactTargets.map((target) => target.agentType)),
          agents
        ),
      };
    }

    const agentTypeIds = new Set<string>();
    for (const skillName of selectedSkillNames) {
      const availability = availabilityMap.get(skillName) ?? new Map<string, Set<string>>();
      for (const projectId of input.selectedProjectTargetIds ?? []) {
        for (const agentType of availability.get(projectId) ?? []) {
          agentTypeIds.add(agentType);
        }
      }
    }

    return {
      targets: projects
        .filter((project) => projectIds.has(project.id))
        .map((project) => ({ id: project.id, label: `${project.id}  ${project.path}` })),
      agentTypes: uniqueAgentTypes(agentTypeIds, agents),
    };
  }

  loadImportSourcePreview(input: {
    sourceType: 'project' | 'agent';
    sourceId: string;
  }): ImportSourcePreview | null {
    if (input.sourceType === 'project') {
      const project = this.storage.getProject(input.sourceId);
      if (!project) return null;

      const candidates: ImportCandidate[] = this.scanService
        .scanProject(project.path)
        .map((skill) => ({
          name: skill.name,
          path: skill.path,
          alreadyExists: Boolean(this.storage.getSkill(skill.name)),
          hasSkillMd: skill.hasSkillMd,
        }));

      return {
        sourceLabel: `${project.id}  ${project.path}`,
        candidates,
      };
    }

    const agent = this.storage.getAgent(input.sourceId);
    if (!agent) return null;

    const candidates = this.fileOps
      .listSubdirectories(agent.basePath)
      .map((name) => {
        const skillPath = path.join(agent.basePath, name);
        const hasSkillMd =
          this.fileOps.fileExists(path.join(skillPath, 'SKILL.md')) ||
          this.fileOps.fileExists(path.join(skillPath, 'skill.md'));
        return {
          name,
          path: skillPath,
          alreadyExists: Boolean(this.storage.getSkill(name)),
          hasSkillMd,
        };
      })
      .filter((candidate) => candidate.hasSkillMd);

    return {
      sourceLabel: `${agent.name} (${agent.id})`,
      candidates,
    };
  }

  private countValidSkillDirs(dirPath: string): number {
    if (!this.fileOps.pathExists(dirPath)) return 0;

    return this.fileOps.listSubdirectories(dirPath).filter((skillDir) => {
      const skillPath = path.join(dirPath, skillDir);
      return (
        this.fileOps.fileExists(path.join(skillPath, 'SKILL.md')) ||
        this.fileOps.fileExists(path.join(skillPath, 'skill.md'))
      );
    }).length;
  }

  private buildAgentSummaries(
    agents: Agent[],
    projects: ProjectConfig[]
  ): Record<string, AgentSummaryData> {
    const summaries: Record<string, AgentSummaryData> = {};

    for (const agent of agents) {
      let projectLevelSkillCount = 0;
      for (const project of projects) {
        projectLevelSkillCount += this.countValidSkillDirs(
          getAgentProjectSkillsDir(project.path, agent)
        );
      }

      summaries[agent.id] = {
        userLevelSkillCount: this.countValidSkillDirs(agent.basePath),
        projectLevelSkillCount,
      };
    }

    return summaries;
  }

  private buildProjectSummaries(
    projects: ProjectConfig[],
    agents: Agent[]
  ): Record<string, ProjectSummaryData> {
    const summaries: Record<string, ProjectSummaryData> = {};

    for (const project of projects) {
      let skillCount = 0;
      for (const agent of agents) {
        skillCount += this.countValidSkillDirs(getAgentProjectSkillsDir(project.path, agent));
      }
      summaries[project.id] = { skillCount };
    }

    return summaries;
  }
}
