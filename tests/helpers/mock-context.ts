/**
 * Shared mock factory for CommandContext
 *
 * Extracts the repeated `createMockFileOps` and `createMockContext`
 * factory functions previously duplicated across multiple test files.
 */

import { vi } from 'vitest';

import type { CommandContext } from '../../src/commands/index.js';

export function createMockFileOps(overrides: Record<string, unknown> = {}) {
  return {
    pathExists: vi.fn(() => false),
    fileExists: vi.fn(() => false),
    readFile: vi.fn(() => null),
    readFileSync: vi.fn(() => null),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    ensureDir: vi.fn().mockResolvedValue(undefined),
    listSubdirectories: vi.fn(() => []),
    scanSkillsInDirectory: vi.fn(() => []),
    getDirectoryHash: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

export function createMockContext(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    skills: {
      list: vi.fn(() => []),
      get: vi.fn(() => undefined),
      exists: vi.fn(() => false),
      delete: vi.fn().mockResolvedValue(undefined),
      install: vi.fn().mockResolvedValue('test-skill'),
      update: vi.fn().mockResolvedValue(undefined),
      importFromPath: vi.fn().mockResolvedValue(undefined),
    } as never,
    sync: {
      sync: vi.fn().mockResolvedValue([]),
      unsync: vi.fn().mockResolvedValue(undefined),
      resync: vi.fn().mockResolvedValue(undefined),
      checkSyncStatus: vi.fn(() => []),
    } as never,
    syncCheck: {
      resolveAndRecordSyncLinks: vi.fn().mockResolvedValue([]),
    } as never,
    storage: {
      listAgents: vi.fn(() => []),
      getAgent: vi.fn(() => undefined),
      listProjects: vi.fn(() => []),
      getProject: vi.fn(() => undefined),
      listSkills: vi.fn(() => []),
      getSkill: vi.fn(() => undefined),
      saveSkill: vi.fn(),
      updateSkillSync: vi.fn(),
      updateSkillProjectSync: vi.fn(),
      removeProject: vi.fn(() => true),
      removeAgent: vi.fn(() => true),
    } as never,
    scan: {
      scanProject: vi.fn(() => []),
      getSkillProjectDistributionWithStatus: vi.fn().mockResolvedValue([]),
    } as never,
    projectSync: {
      syncToProject: vi.fn().mockResolvedValue([]),
      unsync: vi.fn().mockResolvedValue(undefined),
    } as never,
    fileOps: createMockFileOps(),
    ...overrides,
  } as unknown as CommandContext;
}
