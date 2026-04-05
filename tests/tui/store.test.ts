/**
 * TUI Zustand store test -- verifies basic store creation
 */

import { describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../src/tui/store/index.js';

function createMockContext() {
  return {
    skills: {
      list: vi.fn(() => []),
      get: vi.fn(() => undefined),
      add: vi.fn(),
      remove: vi.fn(),
      setSynced: vi.fn(),
    },
    storage: {
      getAgent: vi.fn(() => undefined),
      listAgents: vi.fn(() => []),
      getProject: vi.fn(() => undefined),
      listProjects: vi.fn(() => []),
    } as any,
    scan: {
      getSkillProjectDistributionWithStatus: vi.fn(() => []),
      scanProjectForSkills: vi.fn(() => []),
    } as any,
    sync: {
      sync: vi.fn(),
      unsync: vi.fn(),
    } as any,
    projectSync: {
      syncToProject: vi.fn(),
      unsync: vi.fn(),
      unsyncFromProject: vi.fn(),
    } as any,
    fileOps: {
      pathExists: vi.fn(() => false),
      mkdirSync: vi.fn(),
      readFileSync: vi.fn(() => ''),
      writeFileSync: vi.fn(),
      removeSync: vi.fn(),
    } as any,
    cli: {
      buildLink: vi.fn(() => ''),
    } as any,
  };
}

describe('createAppStore', () => {
  it('creates store with correct initial tab', () => {
    const ctx = createMockContext();
    const store = createAppStore(ctx);

    expect(store.getState().activeTab).toBe('skills');
    expect(store.getState().focusedSkillIndex).toBe(0);
    expect(store.getState().selectedSkillNames).toEqual(new Set());
    expect(store.getState().showSearch).toBe(false);
    expect(store.getState().showHelp).toBe(false);
  });

  it('creates store with correct initial completion modal state', () => {
    const ctx = createMockContext();
    const store = createAppStore(ctx);

    expect(store.getState().completionModalOpen).toBeNull();
  });

  it('has setCompletionModalOpen action', () => {
    const ctx = createMockContext();
    const store = createAppStore(ctx);

    store.getState().setCompletionModalOpen(true);
    expect(store.getState().completionModalOpen).toBe(true);

    store.getState().setCompletionModalOpen(false);
    expect(store.getState().completionModalOpen).toBe(false);

    store.getState().setCompletionModalOpen(null);
    expect(store.getState().completionModalOpen).toBeNull();
  });
});
