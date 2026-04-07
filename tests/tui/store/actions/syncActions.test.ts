/**
 * syncActions.test.ts -- behavioral tests for sync action creators
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppStore } from '../../../../src/tui/store/index.js';
import type { ServiceContext } from '../../../../src/tui/store/dataSlice.js';
import {
  createSyncActions,
  doImportFromProject,
  doImportFromAgent,
} from '../../../../src/tui/store/actions/syncActions.js';
import { createMockServiceContext, createMockSkill, createMockAgent, createMockProject } from './mockContext.js';

describe('createSyncActions', () => {
  let mockCtx: ServiceContext;
  let store: ReturnType<typeof createAppStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx = createMockServiceContext();
    store = createAppStore(mockCtx);
  });

  describe('syncSkillsToAgents', () => {
    it('calls syncService.sync for each skill-agent pair with correct mode', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockAgent = createMockAgent({ id: 'claude', name: 'Claude' });

      vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);
      vi.mocked(mockCtx.syncService.sync).mockResolvedValue([]);

      await actions.syncSkillsToAgents(['skill1'], ['claude'], 'copy');

      expect(mockCtx.syncService.sync).toHaveBeenCalledWith('skill1', [mockAgent], 'copy');
    });

    it('builds correct progress items for sync', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockAgent = createMockAgent({ id: 'claude', name: 'Claude' });

      vi.mocked(mockCtx.syncService.sync).mockImplementation(async () => {
        // Delay to allow checking state during execution
        return [];
      });
      vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);

      // Set up store state before calling
      store.getState().setSyncFormSelectedSkillNames(new Set(['skill1', 'skill2']));
      store.getState().setSyncFormSelectedTargetIds(new Set(['claude']));

      const promise = actions.syncSkillsToAgents(['skill1', 'skill2'], ['claude'], 'copy');

      // After action starts, step should be executing
      const stateDuring = store.getState();
      expect(stateDuring.syncFormStep).toBe('executing');
      expect(stateDuring.updateProgressItems).toHaveLength(2);
      expect(stateDuring.updateProgressItems[0].id).toBe('sync-skill1-claude');

      await promise;
    });

    it('pushes success toast when all syncs succeed', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockAgent = createMockAgent({ id: 'claude', name: 'Claude' });

      vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);
      vi.mocked(mockCtx.syncService.sync).mockResolvedValue([]);

      await actions.syncSkillsToAgents(['skill1'], ['claude'], 'copy');

      const state = store.getState();
      expect(state.activeToast).not.toBeNull();
      expect(state.activeToast?.message).toContain('synced');
      expect(state.activeToast?.variant).toBe('success');
    });

    it('pushes error toast when some syncs fail', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockAgent = createMockAgent({ id: 'claude', name: 'Claude' });

      vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);
      vi.mocked(mockCtx.syncService.sync).mockRejectedValue(new Error('Sync failed'));

      await actions.syncSkillsToAgents(['skill1'], ['claude'], 'copy');

      const state = store.getState();
      expect(state.activeToast?.message).toContain('failed');
      expect(state.activeToast?.variant).toBe('error');
    });

    it('sets syncFormStep to results after completion', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockAgent = createMockAgent({ id: 'claude', name: 'Claude' });

      vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);
      vi.mocked(mockCtx.syncService.sync).mockResolvedValue([]);

      await actions.syncSkillsToAgents(['skill1'], ['claude'], 'copy');

      expect(store.getState().syncFormStep).toBe('results');
    });
  });

  describe('syncSkillsToProjects', () => {
    it('calls projectSyncService.syncToProject for each skill-project pair', async () => {
      const actions = createSyncActions(store, mockCtx);

      vi.mocked(mockCtx.projectSyncService.syncToProject).mockResolvedValue([]);

      await actions.syncSkillsToProjects(['skill1'], ['proj1'], ['claude'], 'symlink');

      expect(mockCtx.projectSyncService.syncToProject).toHaveBeenCalledWith(
        'skill1',
        'proj1',
        ['claude'],
        'symlink'
      );
    });

    it('builds correct progress items for project sync', async () => {
      const actions = createSyncActions(store, mockCtx);

      vi.mocked(mockCtx.projectSyncService.syncToProject).mockResolvedValue([]);

      const promise = actions.syncSkillsToProjects(['skill1'], ['proj1', 'proj2'], ['claude'], 'copy');

      const stateDuring = store.getState();
      expect(stateDuring.updateProgressItems).toHaveLength(2);

      await promise;
    });

    it('pushes success toast when all project syncs succeed', async () => {
      const actions = createSyncActions(store, mockCtx);

      vi.mocked(mockCtx.projectSyncService.syncToProject).mockResolvedValue([]);

      await actions.syncSkillsToProjects(['skill1'], ['proj1'], ['claude'], 'copy');

      expect(store.getState().activeToast?.message).toContain('synced');
    });

    it('pushes error toast when some project syncs fail', async () => {
      const actions = createSyncActions(store, mockCtx);

      vi.mocked(mockCtx.projectSyncService.syncToProject).mockRejectedValue(new Error('Project sync failed'));

      await actions.syncSkillsToProjects(['skill1'], ['proj1'], ['claude'], 'copy');

      expect(store.getState().activeToast?.message).toContain('failed');
      expect(store.getState().activeToast?.variant).toBe('error');
    });
  });

  describe('unsyncFromAgents', () => {
    it('calls syncService.unsync for each skill-agent pair', async () => {
      const actions = createSyncActions(store, mockCtx);

      vi.mocked(mockCtx.syncService.unsync).mockResolvedValue();

      await actions.unsyncFromAgents(['skill1', 'skill2'], ['claude', 'codex']);

      // unsync is called per skill-agent pair (2 skills x 2 agents = 4 calls)
      expect(mockCtx.syncService.unsync).toHaveBeenCalledTimes(4);
      // Each call has one agentId
      expect(mockCtx.syncService.unsync).toHaveBeenCalledWith('skill1', ['claude']);
      expect(mockCtx.syncService.unsync).toHaveBeenCalledWith('skill1', ['codex']);
      expect(mockCtx.syncService.unsync).toHaveBeenCalledWith('skill2', ['claude']);
      expect(mockCtx.syncService.unsync).toHaveBeenCalledWith('skill2', ['codex']);
    });

    it('pushes success toast when unsync succeeds', async () => {
      const actions = createSyncActions(store, mockCtx);

      vi.mocked(mockCtx.syncService.unsync).mockResolvedValue();

      await actions.unsyncFromAgents(['skill1'], ['claude']);

      expect(store.getState().activeToast?.message).toContain('unsynced');
      expect(store.getState().activeToast?.variant).toBe('success');
    });

    it('pushes error toast when unsync fails', async () => {
      const actions = createSyncActions(store, mockCtx);

      vi.mocked(mockCtx.syncService.unsync).mockRejectedValue(new Error('Unsync failed'));

      await actions.unsyncFromAgents(['skill1'], ['claude']);

      expect(store.getState().activeToast?.variant).toBe('error');
    });
  });

  describe('unsyncFromProjects', () => {
    it('calls projectSyncService.unsync for each skill-target pair', async () => {
      const actions = createSyncActions(store, mockCtx);

      vi.mocked(mockCtx.projectSyncService.unsync).mockResolvedValue();

      await actions.unsyncFromProjects(['skill1'], ['proj1:claude', 'proj2:codex']);

      // unsync is called per skill-target pair (1 skill x 2 targets = 2 calls)
      expect(mockCtx.projectSyncService.unsync).toHaveBeenCalledTimes(2);
      expect(mockCtx.projectSyncService.unsync).toHaveBeenCalledWith('skill1', ['proj1:claude']);
      expect(mockCtx.projectSyncService.unsync).toHaveBeenCalledWith('skill1', ['proj2:codex']);
    });

    it('pushes success toast when project unsync succeeds', async () => {
      const actions = createSyncActions(store, mockCtx);

      vi.mocked(mockCtx.projectSyncService.unsync).mockResolvedValue();

      await actions.unsyncFromProjects(['skill1'], ['proj1:claude']);

      expect(store.getState().activeToast?.message).toContain('unsynced');
    });
  });

  describe('updateSkill', () => {
    it('calls skillService.update and syncService.resync', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockSkill = createMockSkill({ name: 'skill1', source: { type: 'git', url: 'https://example.com/repo' } });

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(mockSkill);
      vi.mocked(mockCtx.skillService.update).mockResolvedValue(true);
      vi.mocked(mockCtx.syncService.resync).mockResolvedValue();
      vi.mocked(mockCtx.projectSyncService.resync).mockResolvedValue();

      await actions.updateSkill('skill1');

      expect(mockCtx.skillService.update).toHaveBeenCalledWith('skill1');
      expect(mockCtx.syncService.resync).toHaveBeenCalledWith('skill1');
      expect(mockCtx.projectSyncService.resync).toHaveBeenCalledWith('skill1');
    });

    it('skips resync if update returns false', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockSkill = createMockSkill({ name: 'skill1' });

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(mockSkill);
      vi.mocked(mockCtx.skillService.update).mockResolvedValue(false);

      await actions.updateSkill('skill1');

      expect(mockCtx.skillService.update).toHaveBeenCalledWith('skill1');
      expect(mockCtx.syncService.resync).not.toHaveBeenCalled();
      expect(mockCtx.projectSyncService.resync).not.toHaveBeenCalled();
    });

    it('pushes success toast on successful update', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockSkill = createMockSkill({ name: 'skill1' });

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(mockSkill);
      vi.mocked(mockCtx.skillService.update).mockResolvedValue(true);
      vi.mocked(mockCtx.syncService.resync).mockResolvedValue();
      vi.mocked(mockCtx.projectSyncService.resync).mockResolvedValue();

      await actions.updateSkill('skill1');

      expect(store.getState().activeToast?.message).toContain('updated');
      expect(store.getState().activeToast?.variant).toBe('success');
    });

    it('pushes error toast on update failure', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockSkill = createMockSkill({ name: 'skill1' });

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(mockSkill);
      vi.mocked(mockCtx.skillService.update).mockRejectedValue(new Error('Update failed'));

      await actions.updateSkill('skill1');

      expect(store.getState().activeToast?.message).toContain('Update failed');
      expect(store.getState().activeToast?.variant).toBe('error');
    });

    it('does nothing if skill not found', async () => {
      const actions = createSyncActions(store, mockCtx);

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(undefined);

      await actions.updateSkill('nonexistent');

      expect(mockCtx.skillService.update).not.toHaveBeenCalled();
    });
  });

  describe('updateAllSkills', () => {
    it('filters to git-sourced skills only', async () => {
      const actions = createSyncActions(store, mockCtx);

      const mockSkills = [
        createMockSkill({ name: 'git-skill', source: { type: 'git', url: 'https://example.com/repo' } }),
        createMockSkill({ name: 'local-skill', source: { type: 'local' } }),
        createMockSkill({ name: 'another-git-skill', source: { type: 'git', url: 'https://example.com/repo2' } }),
      ];

      vi.mocked(mockCtx.skillService.list).mockReturnValue(mockSkills);
      vi.mocked(mockCtx.skillService.update).mockResolvedValue(true);
      vi.mocked(mockCtx.syncService.resync).mockResolvedValue();
      vi.mocked(mockCtx.projectSyncService.resync).mockResolvedValue();

      await actions.updateAllSkills();

      // Only git-sourced skills should be updated
      expect(mockCtx.skillService.update).toHaveBeenCalledWith('git-skill');
      expect(mockCtx.skillService.update).toHaveBeenCalledWith('another-git-skill');
      expect(mockCtx.skillService.update).not.toHaveBeenCalledWith('local-skill');
    });

    it('does nothing if no git-sourced skills', async () => {
      const actions = createSyncActions(store, mockCtx);

      const mockSkills = [
        createMockSkill({ name: 'local-skill', source: { type: 'local' } }),
      ];

      vi.mocked(mockCtx.skillService.list).mockReturnValue(mockSkills);

      await actions.updateAllSkills();

      expect(mockCtx.skillService.update).not.toHaveBeenCalled();
    });
  });
});

describe('doImportFromProject', () => {
  let mockCtx: ServiceContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx = createMockServiceContext();
  });

  it('returns success for valid import', async () => {
    const mockProject = createMockProject({ id: 'proj1', path: '/test/project' });

    vi.mocked(mockCtx.storage.getProject).mockReturnValue(mockProject);
    vi.mocked(mockCtx.scanService.scanProject).mockReturnValue([
      { name: 'skill1', path: '/test/project/skill1', agentId: 'claude', agentName: 'Claude', hasSkillMd: true, subPath: '' },
    ]);
    vi.mocked(mockCtx.skillService.exists).mockReturnValue(false);
    vi.mocked(mockCtx.skillService.importFromPath).mockResolvedValue();

    const results = await doImportFromProject(mockCtx, 'proj1', ['skill1']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ target: 'skill1', success: true });
    expect(mockCtx.skillService.importFromPath).toHaveBeenCalledWith(
      '/test/project/skill1',
      'skill1',
      { type: 'project', projectId: 'proj1' }
    );
  });

  it('returns error when skill already exists', async () => {
    const mockProject = createMockProject({ id: 'proj1', path: '/test/project' });

    vi.mocked(mockCtx.storage.getProject).mockReturnValue(mockProject);
    vi.mocked(mockCtx.scanService.scanProject).mockReturnValue([
      { name: 'skill1', path: '/test/project/skill1', agentId: 'claude', agentName: 'Claude', hasSkillMd: true, subPath: '' },
    ]);
    vi.mocked(mockCtx.skillService.exists).mockReturnValue(true);

    const results = await doImportFromProject(mockCtx, 'proj1', ['skill1']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ target: 'skill1', success: false, error: 'Already exists' });
    expect(mockCtx.skillService.importFromPath).not.toHaveBeenCalled();
  });

  it('returns error when project not found', async () => {
    vi.mocked(mockCtx.storage.getProject).mockReturnValue(undefined);

    const results = await doImportFromProject(mockCtx, 'nonexistent', ['skill1']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ target: 'nonexistent', success: false, error: 'Project not found' });
  });

  it('returns error when skill not found in project', async () => {
    const mockProject = createMockProject({ id: 'proj1', path: '/test/project' });

    vi.mocked(mockCtx.storage.getProject).mockReturnValue(mockProject);
    vi.mocked(mockCtx.scanService.scanProject).mockReturnValue([]);

    const results = await doImportFromProject(mockCtx, 'proj1', ['missing-skill']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ target: 'missing-skill', success: false, error: 'Not found in project' });
  });

  it('handles import errors gracefully', async () => {
    const mockProject = createMockProject({ id: 'proj1', path: '/test/project' });

    vi.mocked(mockCtx.storage.getProject).mockReturnValue(mockProject);
    vi.mocked(mockCtx.scanService.scanProject).mockReturnValue([
      { name: 'skill1', path: '/test/project/skill1', agentId: 'claude', agentName: 'Claude', hasSkillMd: true, subPath: '' },
    ]);
    vi.mocked(mockCtx.skillService.exists).mockReturnValue(false);
    vi.mocked(mockCtx.skillService.importFromPath).mockRejectedValue(new Error('Import failed'));

    const results = await doImportFromProject(mockCtx, 'proj1', ['skill1']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ target: 'skill1', success: false, error: 'Import failed' });
  });
});

describe('doImportFromAgent', () => {
  let mockCtx: ServiceContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx = createMockServiceContext();
  });

  it('imports from agent basePath', async () => {
    const mockAgent = createMockAgent({ id: 'claude', basePath: '/test/.claude' });

    vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);
    vi.mocked(mockCtx.skillService.exists).mockReturnValue(false);
    vi.mocked(mockCtx.skillService.importFromPath).mockResolvedValue();

    const results = await doImportFromAgent(mockCtx, 'claude', ['skill1']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ target: 'skill1', success: true });
    expect(mockCtx.skillService.importFromPath).toHaveBeenCalledWith(
      '/test/.claude/skill1',
      'skill1',
      { type: 'local', importedFrom: { agent: 'claude', path: '/test/.claude/skill1' } }
    );
  });

  it('returns error when agent not found', async () => {
    vi.mocked(mockCtx.storage.getAgent).mockReturnValue(undefined);

    const results = await doImportFromAgent(mockCtx, 'nonexistent', ['skill1']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ target: 'nonexistent', success: false, error: 'Agent not found' });
  });

  it('returns error when skill already exists', async () => {
    const mockAgent = createMockAgent({ id: 'claude', basePath: '/test/.claude' });

    vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);
    vi.mocked(mockCtx.skillService.exists).mockReturnValue(true);

    const results = await doImportFromAgent(mockCtx, 'claude', ['skill1']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ target: 'skill1', success: false, error: 'Already exists' });
  });

  it('handles import errors gracefully', async () => {
    const mockAgent = createMockAgent({ id: 'claude', basePath: '/test/.claude' });

    vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);
    vi.mocked(mockCtx.skillService.exists).mockReturnValue(false);
    vi.mocked(mockCtx.skillService.importFromPath).mockRejectedValue(new Error('Copy failed'));

    const results = await doImportFromAgent(mockCtx, 'claude', ['skill1']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ target: 'skill1', success: false, error: 'Copy failed' });
  });
});
