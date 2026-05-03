import type {
  Agent,
  ProjectConfig,
  ProjectSyncRecord,
  SkillMeta,
  SkillSource,
  SyncMode,
  SyncRecord,
  TuiLanguagePreference,
} from '../types.js';

export type ContextSkillFilter = 'all' | 'imported' | 'unimported';

export interface WorkbenchSkillRow {
  rowId: string;
  name: string;
  path: string;
  registrySkillName?: string;
  agentId?: string;
  agentName?: string;
  projectId?: string;
  isImported: boolean;
  isDifferentVersion: boolean;
  syncMode?: SyncMode;
  isSynced?: boolean;
  sourceType: 'agent-user' | 'agent-project' | 'project';
}

export interface WorkbenchSection {
  id: string;
  title: string;
  rows: WorkbenchSkillRow[];
}

export interface SkillDetailData {
  name: string;
  path: string;
  source: SkillSource;
  createdAt: string;
  updatedAt?: string;
  categories: string[];
  syncedTo: SyncRecord[];
  syncedProjects?: ProjectSyncRecord[];
  syncStatus: Array<{
    agentId: string;
    agentName: string;
    mode: SyncMode;
    status: 'synced' | 'missing';
  }>;
  projectDistribution: Array<{
    projectId: string;
    agents: Array<{ id: string; name: string; isDifferentVersion: boolean }>;
  }>;
  skillMdPreview: string | null;
}

export interface AgentWorkbenchData {
  agentId: string;
  agentName: string;
  basePath: string;
  userLevelSkills: WorkbenchSkillRow[];
  projectLevelSkills: Array<{
    projectId: string;
    skills: WorkbenchSkillRow[];
  }>;
  sections: WorkbenchSection[];
}

export interface ProjectWorkbenchData {
  projectId: string;
  projectPath: string;
  skillsByAgent: Array<{
    agentId: string;
    agentName: string;
    skills: WorkbenchSkillRow[];
  }>;
  sections: WorkbenchSection[];
}

export interface AgentSummaryData {
  userLevelSkillCount: number;
  projectLevelSkillCount: number;
}

export interface ProjectSummaryData {
  skillCount: number;
}

export interface LibraryOverview {
  skills: Array<SkillMeta & { exists: boolean }>;
  agents: Agent[];
  projects: ProjectConfig[];
  agentSummaries: Record<string, AgentSummaryData>;
  projectSummaries: Record<string, ProjectSummaryData>;
}

export interface WorkbenchConflict {
  agentId: string;
  agentName: string;
  sameContent: boolean;
}

export type WorkbenchConflictResolution = 'link' | 'skip' | 'cancel';

export interface SyncTargetItem {
  id: string;
  label: string;
}

export interface SyncAgentTypeItem {
  id: string;
  label: string;
}

export interface SyncPreview {
  targets: SyncTargetItem[];
  agentTypes: SyncAgentTypeItem[];
}

export interface ImportCandidate {
  name: string;
  path: string;
  alreadyExists: boolean;
  hasSkillMd?: boolean;
}

export interface ImportSourcePreview {
  sourceLabel: string;
  candidates: ImportCandidate[];
}

export interface ContextImportResult {
  target: string;
  success: boolean;
  error?: string;
  outcome?: 'success' | 'error' | 'skipped';
}

export interface UpdateSkillResult {
  skillName: string;
  sourceType: 'git' | 'local' | 'project' | 'unknown';
  outcome: 'updated' | 'skipped' | 'error';
  detail?: string;
}

export interface WorkbenchQueries {
  loadLibraryOverview(): Promise<LibraryOverview>;
  loadSkillDetail(skillName: string): Promise<SkillDetailData | null>;
  loadAgentWorkbench(agentId: string): Promise<AgentWorkbenchData | null>;
  loadProjectWorkbench(projectId: string): Promise<ProjectWorkbenchData | null>;
  loadSyncPreview(input: {
    operation: 'sync-agents' | 'sync-projects' | 'unsync' | null;
    unsyncScope: 'agents' | 'projects' | null;
    selectedSkillNames: string[];
    selectedProjectTargetIds?: string[];
  }): Promise<SyncPreview>;
  loadImportSourcePreview(input: {
    sourceType: 'project' | 'agent';
    sourceId: string;
  }): ImportSourcePreview | null;
}

export interface WorkbenchCommands {
  installSkillFromUrl(url: string, name?: string): Promise<string>;
  discoverSkillsInRepo(repoUrl: string): Promise<{
    tempRepoPath: string;
    skills: Array<{ name: string; subPath: string }>;
  }>;
  installSkillsFromDiscovery(
    repoUrl: string,
    selections: Array<{ name: string; subPath: string }>,
    tempRepoPath: string
  ): Promise<string[]>;
  cleanupDiscoveredRepo(tempRepoPath: string): Promise<void>;
  detectConflicts(skillName: string): WorkbenchConflict[];
  resolveConflicts(
    skillName: string,
    resolutions: Map<string, WorkbenchConflictResolution>
  ): string[];
  syncSkillsToAgents(
    skillNames: string[],
    agentIds: string[],
    mode: SyncMode
  ): Promise<
    Array<{ target: string; success: boolean; path: string; mode: SyncMode; error?: string }>
  >;
  syncSkillsToProjects(
    skillNames: string[],
    projectIds: string[],
    agentTypes: string[],
    mode: SyncMode
  ): Promise<
    Array<{ target: string; success: boolean; path: string; mode: SyncMode; error?: string }>
  >;
  unsyncSkillsFromAgents(skillNames: string[], agentIds: string[]): Promise<void>;
  unsyncSkillsFromProjects(
    skillNames: string[],
    projectIds: string[],
    options?: { mode?: 'all' | 'specific'; agentTypes?: string[] }
  ): Promise<void>;
  updateSkills(skillNames: string[]): Promise<UpdateSkillResult[]>;
  updateCategories(
    skillNames: string[],
    mode: 'set' | 'add' | 'remove' | 'clear',
    categories: string[]
  ): Promise<Array<{ skillName: string; success: boolean; categories: string[]; error?: string }>>;
  removeSkill(skillName: string): Promise<void>;
  restoreSkill(snapshot: Record<string, unknown>): void;
  importFromProject(projectId: string, skillNames: string[]): Promise<ContextImportResult[]>;
  importFromAgent(agentId: string, skillNames: string[]): Promise<ContextImportResult[]>;
  importContextSkills(rows: WorkbenchSkillRow[]): Promise<ContextImportResult[]>;
  addAgent(id: string, name: string, basePath: string, skillsDirName?: string): Promise<void>;
  removeAgent(agentId: string): Promise<void>;
  restoreAgent(snapshot: Record<string, unknown>): void;
  addProject(id: string, projectPath: string): Promise<void>;
  removeProject(projectId: string): Promise<void>;
  restoreProject(snapshot: Record<string, unknown>): void;
  setTuiLanguagePreference(preference: TuiLanguagePreference): void;
}
