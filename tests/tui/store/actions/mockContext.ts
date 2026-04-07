/**
 * Shared mock ServiceContext factory for store action tests
 *
 * Provides a complete mock of ServiceContext interface with vi.fn() spies
 * for all service methods. Tests can override specific mocks as needed.
 */

import { vi } from 'vitest';

import type { ServiceContext } from '../../../src/tui/store/dataSlice.js';
import type { SkillMeta, Agent, ProjectConfig, SyncMode } from '../../../src/types.js';

/**
 * Creates a mock ServiceContext with all methods mocked as vi.fn()
 * Tests can override specific mocks as needed
 */
export function createMockServiceContext(): ServiceContext {
  return {
    skillService: {
      list: vi.fn(() => []),
      get: vi.fn(() => null),
      exists: vi.fn(() => false),
      install: vi.fn(),
      installFromDirectory: vi.fn(),
      importFromPath: vi.fn(),
      delete: vi.fn(),
      cloneRepoToTemp: vi.fn(),
      discoverSkillsInDirectory: vi.fn(() => []),
      removeTempRepo: vi.fn(),
      update: vi.fn(),
    },
    scanService: {
      getSkillProjectDistributionWithStatus: vi.fn(async () => []),
      getProjectSkillsWithStatus: vi.fn(async () => []),
      scanProject: vi.fn(() => []),
    },
    storage: {
      listAgents: vi.fn(() => []),
      listProjects: vi.fn(() => []),
      listAllDefinedAgents: vi.fn(() => []),
      getAgent: vi.fn(() => undefined),
      getProject: vi.fn(() => undefined),
      getSkill: vi.fn(() => undefined),
      listSkills: vi.fn(() => []),
      addAgent: vi.fn(),
      removeAgent: vi.fn(() => true),
      addProject: vi.fn(),
      removeProject: vi.fn(() => true),
      updateSkillSync: vi.fn(),
      updateSkillProjectSync: vi.fn(),
      getSkillsDir: vi.fn(() => '/test/skills'),
      deleteSkill: vi.fn(),
      saveSkillMeta: vi.fn(),
    },
    syncService: {
      unsync: vi.fn(),
      checkSyncStatus: vi.fn(() => []),
      sync: vi.fn(async () => []),
      resync: vi.fn(),
      getSyncedAgents: vi.fn(() => []),
    },
    projectSyncService: {
      unsync: vi.fn(),
      syncToProject: vi.fn(async () => []),
      resync: vi.fn(),
      detectAgentTypes: vi.fn(() => []),
    },
    syncCheck: {
      detectConflicts: vi.fn(() => []),
      resolveConflicts: vi.fn(() => []),
    },
    fileOps: {
      pathExists: vi.fn(() => false),
      listSubdirectories: vi.fn(() => []),
      ensureDir: vi.fn(),
      fileExists: vi.fn(() => false),
    },
  };
}

/**
 * Creates a mock skill for testing
 */
export function createMockSkill(overrides: Partial<SkillMeta> = {}): SkillMeta {
  return {
    name: 'test-skill',
    source: { type: 'local' },
    createdAt: '2024-01-01T00:00:00.000Z',
    syncedTo: [],
    ...overrides,
  };
}

/**
 * Creates a mock agent for testing
 */
export function createMockAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'test-agent',
    name: 'Test Agent',
    basePath: '/test/agent',
    skillsDirName: undefined,
    ...overrides,
  };
}

/**
 * Creates a mock project for testing
 */
export function createMockProject(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return {
    id: 'test-project',
    path: '/test/project',
    addedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Helper to create a mock sync result
 */
export function createMockSyncResult(
  target: string,
  success: boolean,
  options: { path?: string; mode?: SyncMode; error?: string } = {}
) {
  return {
    target,
    success,
    path: options.path || `/test/path/${target}`,
    mode: (options.mode || 'copy') as SyncMode,
    ...(options.error && { error: options.error }),
  };
}
