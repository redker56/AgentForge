/**
 * syncActions.test.ts -- behavioral tests for sync action creators
 */

import path from 'path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getTuiText } from '../../../../src/tui/i18n.js';
import {
  createSyncActions,
  doImportFromProject,
  doImportFromAgent,
} from '../../../../src/tui/store/actions/syncActions.js';
import { createAppStore } from '../../../../src/tui/store/index.js';
import { withLegacyUiState } from '../../helpers/legacyUiState.js';

import {
  createMockServiceContext,
  createMockSkill,
  createMockAgent,
  createMockProject,
  createMockSyncResult,
  type MockWorkbenchContext,
} from './mockContext.js';

describe('createSyncActions', () => {
  let mockCtx: MockWorkbenchContext;
  let store: ReturnType<typeof createAppStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx = createMockServiceContext();
    store = createAppStore(mockCtx);
    withLegacyUiState(store.getState() as unknown as Record<string, unknown>);
  });

  async function refreshSkills(skills: Array<ReturnType<typeof createMockSkill>>): Promise<void> {
    vi.mocked(mockCtx.storage.listSkills).mockReturnValue(skills);
    await store.getState().refreshSkills();
  }

  async function loadSkillDetails(
    skills: Array<ReturnType<typeof createMockSkill>>
  ): Promise<void> {
    const skillMap = new Map(skills.map((skill) => [skill.name, skill]));
    vi.mocked(mockCtx.storage.getSkill).mockImplementation((skillName: string) =>
      skillMap.get(skillName)
    );
    for (const skill of skills) {
      await store.getState().loadSkillDetail(skill.name);
    }
  }

  describe('syncSkillsToAgents', () => {
    it('calls syncService.sync for each skill-agent pair with correct mode', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockAgent = createMockAgent({ id: 'claude', name: 'Claude' });

      vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);
      vi.mocked(mockCtx.syncService.sync).mockResolvedValue([createMockSyncResult('claude', true)]);

      await actions.syncSkillsToAgents(['skill1'], ['claude'], 'copy');

      expect(mockCtx.syncService.sync).toHaveBeenCalledWith('skill1', [mockAgent], 'copy');
    });

    it('builds correct progress items for sync', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockAgent = createMockAgent({ id: 'claude', name: 'Claude' });

      vi.mocked(mockCtx.syncService.sync).mockImplementation(() => Promise.resolve([]));
      vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);

      // Set up store state before calling
      store.getState().setSyncFormSelectedSkillNames(new Set(['skill1', 'skill2']));
      store.getState().setSyncFormSelectedTargetIds(new Set(['claude']));

      const promise = actions.syncSkillsToAgents(['skill1', 'skill2'], ['claude'], 'copy');

      // After action starts, step should be executing
      const stateDuring = store.getState();
      expect(stateDuring.syncWorkflowState.step).toBe('executing');
      expect(stateDuring.shellState.updateProgressItems).toHaveLength(2);
      expect(stateDuring.shellState.updateProgressItems[0].id).toBe('sync-skill1-claude');

      await promise;
    });

    it('pushes success toast when all syncs succeed', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockAgent = createMockAgent({ id: 'claude', name: 'Claude' });

      vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);
      vi.mocked(mockCtx.syncService.sync).mockResolvedValue([createMockSyncResult('claude', true)]);

      await actions.syncSkillsToAgents(['skill1'], ['claude'], 'copy');

      const state = store.getState();
      expect(state.shellState.activeToast).not.toBeNull();
      expect(state.shellState.activeToast?.message).toContain('synced');
      expect(state.shellState.activeToast?.variant).toBe('success');
    });

    it('pushes error toast when some syncs fail', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockAgent = createMockAgent({ id: 'claude', name: 'Claude' });

      vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);
      vi.mocked(mockCtx.syncService.sync).mockRejectedValue(new Error('Sync failed'));

      await actions.syncSkillsToAgents(['skill1'], ['claude'], 'copy');

      const state = store.getState();
      expect(state.shellState.activeToast?.message).toContain('failed');
      expect(state.shellState.activeToast?.variant).toBe('error');
    });

    it('sets syncFormStep to results after completion', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockAgent = createMockAgent({ id: 'claude', name: 'Claude' });

      vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);
      vi.mocked(mockCtx.syncService.sync).mockResolvedValue([]);

      await actions.syncSkillsToAgents(['skill1'], ['claude'], 'copy');

      expect(store.getState().syncWorkflowState.step).toBe('results');
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

      const promise = actions.syncSkillsToProjects(
        ['skill1'],
        ['proj1', 'proj2'],
        ['claude'],
        'copy'
      );

      const stateDuring = store.getState();
      expect(stateDuring.shellState.updateProgressItems).toHaveLength(2);

      await promise;
    });

    it('pushes success toast when all project syncs succeed', async () => {
      const actions = createSyncActions(store, mockCtx);

      vi.mocked(mockCtx.projectSyncService.syncToProject).mockResolvedValue([]);

      await actions.syncSkillsToProjects(['skill1'], ['proj1'], ['claude'], 'copy');

      expect(store.getState().shellState.activeToast?.message).toContain('synced');
    });

    it('pushes error toast when some project syncs fail', async () => {
      const actions = createSyncActions(store, mockCtx);

      vi.mocked(mockCtx.projectSyncService.syncToProject).mockRejectedValue(
        new Error('Project sync failed')
      );

      await actions.syncSkillsToProjects(['skill1'], ['proj1'], ['claude'], 'copy');

      expect(store.getState().shellState.activeToast?.message).toContain('failed');
      expect(store.getState().shellState.activeToast?.variant).toBe('error');
    });
  });

  describe('unsyncFromAgents', () => {
    it('calls syncService.unsync for each skill-agent pair', async () => {
      const actions = createSyncActions(store, mockCtx);
      await loadSkillDetails([
        createMockSkill({
          name: 'skill1',
          syncedTo: [
            { agentId: 'claude', mode: 'copy' },
            { agentId: 'codex', mode: 'copy' },
          ],
        }),
        createMockSkill({
          name: 'skill2',
          syncedTo: [
            { agentId: 'claude', mode: 'copy' },
            { agentId: 'codex', mode: 'copy' },
          ],
        }),
      ]);

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
      await loadSkillDetails([
        createMockSkill({
          name: 'skill1',
          syncedTo: [{ agentId: 'claude', mode: 'copy' }],
        }),
      ]);

      vi.mocked(mockCtx.syncService.unsync).mockResolvedValue();

      await actions.unsyncFromAgents(['skill1'], ['claude']);

      expect(store.getState().shellState.activeToast?.message).toContain('unsynced');
      expect(store.getState().shellState.activeToast?.variant).toBe('success');
    });

    it('uses localized copy for Chinese unsync progress, skipped reasons, and toast', async () => {
      store.setState((state) => ({
        shellState: {
          ...state.shellState,
          locale: 'zh',
        },
      }));
      const actions = createSyncActions(store, mockCtx);
      await loadSkillDetails([
        createMockSkill({
          name: 'skill1',
          syncedTo: [{ agentId: 'claude', mode: 'copy' }],
        }),
      ]);

      vi.mocked(mockCtx.syncService.unsync).mockResolvedValue();

      await actions.unsyncFromAgents(['skill1'], ['claude', 'codex']);

      expect(store.getState().shellState.updateProgressItems[0]?.label).toBe(
        '从 claude 取消同步 skill1'
      );
      expect(store.getState().syncWorkflowState.results).toContainEqual({
        target: 'skill1 -> codex',
        success: false,
        error: '未同步到此 Agent',
        outcome: 'skipped',
      });
      expect(store.getState().shellState.activeToast?.message).toBe('1 个已取消同步，1 个已跳过');
    });

    it('pushes error toast when unsync fails', async () => {
      const actions = createSyncActions(store, mockCtx);
      await loadSkillDetails([
        createMockSkill({
          name: 'skill1',
          syncedTo: [{ agentId: 'claude', mode: 'copy' }],
        }),
      ]);

      vi.mocked(mockCtx.syncService.unsync).mockRejectedValue(new Error('Unsync failed'));

      await actions.unsyncFromAgents(['skill1'], ['claude']);

      expect(store.getState().shellState.activeToast?.variant).toBe('error');
    });
  });

  describe('unsyncFromProjects', () => {
    it('calls projectSyncService.unsyncFromProject for each skill-project pair in all mode', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockSkill = createMockSkill({
        name: 'skill1',
        syncedProjects: [{ projectId: 'proj1', agentType: 'claude', mode: 'copy' }],
      });

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(mockSkill);
      vi.mocked(mockCtx.scanService.getSkillProjectDistributionWithStatus).mockResolvedValue([]);
      vi.mocked(mockCtx.projectSyncService.unsyncFromProject).mockResolvedValue();

      await actions.unsyncFromProjects(['skill1'], ['proj1'], { mode: 'all' });

      expect(mockCtx.projectSyncService.unsyncFromProject).toHaveBeenCalledTimes(1);
      expect(mockCtx.projectSyncService.unsyncFromProject).toHaveBeenCalledWith('skill1', 'proj1');
    });

    it('calls projectSyncService.unsync for matched agent types in specific mode', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockSkill = createMockSkill({
        name: 'skill1',
        syncedProjects: [{ projectId: 'proj1', agentType: 'claude', mode: 'copy' }],
      });

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(mockSkill);
      vi.mocked(mockCtx.scanService.getSkillProjectDistributionWithStatus).mockResolvedValue([]);
      vi.mocked(mockCtx.projectSyncService.unsync).mockResolvedValue();

      await actions.unsyncFromProjects(['skill1'], ['proj1'], {
        mode: 'specific',
        agentTypes: ['claude', 'codex'],
      });

      expect(mockCtx.projectSyncService.unsync).toHaveBeenCalledTimes(1);
      expect(mockCtx.projectSyncService.unsync).toHaveBeenCalledWith('skill1', ['proj1:claude']);
    });

    it('pushes success toast when project unsync succeeds', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockSkill = createMockSkill({
        name: 'skill1',
        syncedProjects: [{ projectId: 'proj1', agentType: 'claude', mode: 'copy' }],
      });

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(mockSkill);
      vi.mocked(mockCtx.scanService.getSkillProjectDistributionWithStatus).mockResolvedValue([]);
      vi.mocked(mockCtx.projectSyncService.unsyncFromProject).mockResolvedValue();

      await actions.unsyncFromProjects(['skill1'], ['proj1'], { mode: 'all' });

      expect(store.getState().shellState.activeToast?.message).toContain('unsynced');
    });
  });

  describe('updateSkills', () => {
    it('calls skillService.update and resyncs git-backed skills', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockSkill = createMockSkill({
        name: 'skill1',
        source: { type: 'git', url: 'https://example.com/repo' },
      });

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(mockSkill);
      await refreshSkills([mockSkill]);
      vi.mocked(mockCtx.skillService.update).mockResolvedValue(true);
      vi.mocked(mockCtx.syncService.resync).mockResolvedValue();
      vi.mocked(mockCtx.projectSyncService.resync).mockResolvedValue();

      const results = await actions.updateSkills(['skill1']);

      expect(mockCtx.skillService.update).toHaveBeenCalledWith('skill1');
      expect(mockCtx.syncService.resync).toHaveBeenCalledWith('skill1');
      expect(mockCtx.projectSyncService.resync).toHaveBeenCalledWith('skill1');
      expect(results).toEqual([{ skillName: 'skill1', sourceType: 'git', outcome: 'updated' }]);
    });

    it('skips non-git skills and does not call update for them', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockSkill = createMockSkill({ name: 'skill1', source: { type: 'local' } });

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(mockSkill);
      await refreshSkills([mockSkill]);

      const results = await actions.updateSkills(['skill1']);

      expect(mockCtx.skillService.update).not.toHaveBeenCalled();
      expect(mockCtx.syncService.resync).not.toHaveBeenCalled();
      expect(mockCtx.projectSyncService.resync).not.toHaveBeenCalled();
      expect(results).toEqual([
        {
          skillName: 'skill1',
          sourceType: 'local',
          outcome: 'skipped',
          detail: 'Not git-backed',
        },
      ]);
    });

    it('returns skipped outcome when git update returns false', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockSkill = createMockSkill({
        name: 'skill1',
        source: { type: 'git', url: 'https://example.com/repo' },
      });

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(mockSkill);
      await refreshSkills([mockSkill]);
      vi.mocked(mockCtx.skillService.update).mockResolvedValue(false);

      const results = await actions.updateSkills(['skill1']);

      expect(results).toEqual([
        {
          skillName: 'skill1',
          sourceType: 'git',
          outcome: 'skipped',
          detail: 'Repository could not be updated',
        },
      ]);
    });

    it('pushes success toast on successful update', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockSkill = createMockSkill({
        name: 'skill1',
        source: { type: 'git', url: 'https://example.com/repo' },
      });

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(mockSkill);
      await refreshSkills([mockSkill]);
      vi.mocked(mockCtx.skillService.update).mockResolvedValue(true);
      vi.mocked(mockCtx.syncService.resync).mockResolvedValue();
      vi.mocked(mockCtx.projectSyncService.resync).mockResolvedValue();

      await actions.updateSkills(['skill1']);

      expect(store.getState().shellState.activeToast?.message).toContain('updated');
      expect(store.getState().shellState.activeToast?.variant).toBe('success');
    });

    it('marks the current skill as running before the update command resolves', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockSkill = createMockSkill({
        name: 'skill1',
        source: { type: 'git', url: 'https://example.com/repo' },
      });

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(mockSkill);
      await refreshSkills([mockSkill]);

      let resolveUpdate:
        | ((value: Array<{ skillName: string; sourceType: 'git'; outcome: 'updated' }>) => void)
        | undefined;
      vi.mocked(mockCtx.commands.updateSkills).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveUpdate = resolve;
          })
      );

      const promise = actions.updateSkills(['skill1']);

      expect(store.getState().shellState.updateProgressItems).toEqual([
        expect.objectContaining({
          id: 'update-skill1',
          label: 'Updating skill1',
          status: 'running',
          progress: 30,
        }),
      ]);

      resolveUpdate?.([{ skillName: 'skill1', sourceType: 'git', outcome: 'updated' }]);
      await promise;

      expect(store.getState().shellState.activeToast?.message).toContain('updated');
    });

    it('uses localized copy for Chinese update progress and toast', async () => {
      const text = getTuiText('zh').updateForm;
      store.setState((state) => ({
        shellState: {
          ...state.shellState,
          locale: 'zh',
        },
      }));
      const actions = createSyncActions(store, mockCtx);
      const mockSkill = createMockSkill({
        name: 'skill1',
        source: { type: 'git', url: 'https://example.com/repo' },
      });

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(mockSkill);
      await refreshSkills([mockSkill]);

      let resolveUpdate:
        | ((value: Array<{ skillName: string; sourceType: 'git'; outcome: 'updated' }>) => void)
        | undefined;
      vi.mocked(mockCtx.commands.updateSkills).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveUpdate = resolve;
          })
      );

      const promise = actions.updateSkills(['skill1']);

      expect(store.getState().shellState.updateProgressItems).toEqual([
        expect.objectContaining({
          id: 'update-skill1',
          label: text.updatingProgress('skill1'),
          status: 'running',
          progress: 30,
        }),
      ]);
      expect(store.getState().shellState.updateProgressItems[0]?.label).not.toBe('Updating skill1');

      resolveUpdate?.([{ skillName: 'skill1', sourceType: 'git', outcome: 'updated' }]);
      await promise;

      expect(store.getState().shellState.updateProgressItems[0]?.label).toBe(
        text.updatedProgress('skill1')
      );
      expect(store.getState().shellState.activeToast?.message).toBe(text.toastUpdated(1, 0));
    });

    it('pushes error toast on update failure', async () => {
      const actions = createSyncActions(store, mockCtx);
      const mockSkill = createMockSkill({
        name: 'skill1',
        source: { type: 'git', url: 'https://example.com/repo' },
      });

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(mockSkill);
      await refreshSkills([mockSkill]);
      vi.mocked(mockCtx.skillService.update).mockRejectedValue(new Error('Update failed'));

      const results = await actions.updateSkills(['skill1']);

      expect(store.getState().shellState.activeToast?.message).toContain('failed');
      expect(store.getState().shellState.activeToast?.variant).toBe('error');
      expect(results[0]).toEqual({
        skillName: 'skill1',
        sourceType: 'git',
        outcome: 'error',
        detail: 'Update failed',
      });
    });

    it('returns error result when skill is missing', async () => {
      const actions = createSyncActions(store, mockCtx);

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(undefined);

      const results = await actions.updateSkills(['missing-skill']);

      expect(results).toEqual([
        {
          skillName: 'missing-skill',
          sourceType: 'unknown',
          outcome: 'error',
          detail: 'Skill not found',
        },
      ]);
    });
  });
});

describe('doImportFromProject', () => {
  let mockCtx: MockWorkbenchContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx = createMockServiceContext();
  });

  it('returns success for valid import', async () => {
    const mockProject = createMockProject({ id: 'proj1', path: '/test/project' });

    vi.mocked(mockCtx.storage.getProject).mockReturnValue(mockProject);
    vi.mocked(mockCtx.scanService.scanProject).mockReturnValue([
      {
        name: 'skill1',
        path: '/test/project/skill1',
        agentId: 'claude',
        agentName: 'Claude',
        hasSkillMd: true,
        subPath: '',
      },
    ]);
    vi.mocked(mockCtx.skillService.exists).mockReturnValue(false);
    vi.mocked(mockCtx.skillService.importFromPath).mockResolvedValue();

    const results = await doImportFromProject(mockCtx, 'proj1', ['skill1']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ target: 'skill1', success: true, outcome: 'success' });
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
      {
        name: 'skill1',
        path: '/test/project/skill1',
        agentId: 'claude',
        agentName: 'Claude',
        hasSkillMd: true,
        subPath: '',
      },
    ]);
    vi.mocked(mockCtx.skillService.exists).mockReturnValue(true);

    const results = await doImportFromProject(mockCtx, 'proj1', ['skill1']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      target: 'skill1',
      success: false,
      error: 'Already exists',
      outcome: 'error',
    });
    expect(mockCtx.skillService.importFromPath).not.toHaveBeenCalled();
  });

  it('returns error when project not found', async () => {
    vi.mocked(mockCtx.storage.getProject).mockReturnValue(undefined);

    const results = await doImportFromProject(mockCtx, 'nonexistent', ['skill1']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      target: 'nonexistent',
      success: false,
      error: 'Project not found',
      outcome: 'error',
    });
  });

  it('returns error when skill not found in project', async () => {
    const mockProject = createMockProject({ id: 'proj1', path: '/test/project' });

    vi.mocked(mockCtx.storage.getProject).mockReturnValue(mockProject);
    vi.mocked(mockCtx.scanService.scanProject).mockReturnValue([]);

    const results = await doImportFromProject(mockCtx, 'proj1', ['missing-skill']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      target: 'missing-skill',
      success: false,
      error: 'Not found in project',
      outcome: 'error',
    });
  });

  it('handles import errors gracefully', async () => {
    const mockProject = createMockProject({ id: 'proj1', path: '/test/project' });

    vi.mocked(mockCtx.storage.getProject).mockReturnValue(mockProject);
    vi.mocked(mockCtx.scanService.scanProject).mockReturnValue([
      {
        name: 'skill1',
        path: '/test/project/skill1',
        agentId: 'claude',
        agentName: 'Claude',
        hasSkillMd: true,
        subPath: '',
      },
    ]);
    vi.mocked(mockCtx.skillService.exists).mockReturnValue(false);
    vi.mocked(mockCtx.skillService.importFromPath).mockRejectedValue(new Error('Import failed'));

    const results = await doImportFromProject(mockCtx, 'proj1', ['skill1']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      target: 'skill1',
      success: false,
      error: 'Import failed',
      outcome: 'error',
    });
  });
});

describe('doImportFromAgent', () => {
  let mockCtx: MockWorkbenchContext;

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
    expect(results[0]).toEqual({ target: 'skill1', success: true, outcome: 'success' });
    expect(mockCtx.skillService.importFromPath).toHaveBeenCalledWith(
      path.join('/test/.claude', 'skill1'),
      'skill1',
      {
        type: 'local',
        importedFrom: { agent: 'claude', path: path.join('/test/.claude', 'skill1') },
      }
    );
  });

  it('returns error when agent not found', async () => {
    vi.mocked(mockCtx.storage.getAgent).mockReturnValue(undefined);

    const results = await doImportFromAgent(mockCtx, 'nonexistent', ['skill1']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      target: 'nonexistent',
      success: false,
      error: 'Agent not found',
      outcome: 'error',
    });
  });

  it('returns error when skill already exists', async () => {
    const mockAgent = createMockAgent({ id: 'claude', basePath: '/test/.claude' });

    vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);
    vi.mocked(mockCtx.skillService.exists).mockReturnValue(true);

    const results = await doImportFromAgent(mockCtx, 'claude', ['skill1']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      target: 'skill1',
      success: false,
      error: 'Already exists',
      outcome: 'error',
    });
  });

  it('handles import errors gracefully', async () => {
    const mockAgent = createMockAgent({ id: 'claude', basePath: '/test/.claude' });

    vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);
    vi.mocked(mockCtx.skillService.exists).mockReturnValue(false);
    vi.mocked(mockCtx.skillService.importFromPath).mockRejectedValue(new Error('Copy failed'));

    const results = await doImportFromAgent(mockCtx, 'claude', ['skill1']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      target: 'skill1',
      success: false,
      error: 'Copy failed',
      outcome: 'error',
    });
  });
});
