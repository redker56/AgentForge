import type {
  Agent,
  ProjectConfig,
  ProjectSyncRecord,
  RegistryData,
  RegistrySettings,
  SkillMeta,
  SkillSource,
  StorageInterface,
  SyncRecord,
} from '../types.js';

export interface RegistryRepository extends StorageInterface {
  listAgents(): Agent[];
  getAgent(id: string): Agent | undefined;
  listAllDefinedAgents(): Agent[];
  listProjects(): ProjectConfig[];
  getProject(id: string): ProjectConfig | undefined;
  listSkills(): SkillMeta[];
  getSkill(name: string): SkillMeta | undefined;
  saveSkill(name: string, source: SkillSource): void;
  saveSkillMeta(name: string, meta: SkillMeta): void;
  deleteSkill(name: string): void;
  updateSkillSync(name: string, records: SyncRecord[]): void;
  updateSkillProjectSync(name: string, records: ProjectSyncRecord[]): void;
  getSettings(): RegistrySettings;
  updateSettings(settings: Partial<RegistrySettings>): void;
  runBatch<T>(mutator: (repo: RegistryRepository) => T): T;
  snapshot(): RegistryData;
}
