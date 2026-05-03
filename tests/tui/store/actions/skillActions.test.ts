/**
 * skillActions.test.ts -- behavioral tests for skill action creators
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createSkillActions } from '../../../../src/tui/store/actions/skillActions.js';
import { createAppStore } from '../../../../src/tui/store/index.js';
import { withLegacyUiState } from '../../helpers/legacyUiState.js';

import {
  createMockServiceContext,
  createMockSkill,
  type MockWorkbenchContext,
} from './mockContext.js';

describe('createSkillActions', () => {
  let mockCtx: MockWorkbenchContext;
  let store: ReturnType<typeof createAppStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx = createMockServiceContext();
    store = createAppStore(mockCtx);
    withLegacyUiState(store.getState() as unknown as Record<string, unknown>);
  });

  describe('addSkillFromUrl', () => {
    it('installs skill from git URL with explicit name', async () => {
      const actions = createSkillActions(store, mockCtx);

      vi.mocked(mockCtx.skillService.install).mockResolvedValue('my-skill');
      vi.mocked(mockCtx.syncCheck.detectConflicts).mockReturnValue([]);
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      await actions.addSkillFromUrl('https://github.com/example/repo.git', 'my-skill');

      expect(mockCtx.skillService.install).toHaveBeenCalledWith(
        'https://github.com/example/repo.git',
        'my-skill'
      );
    });

    it('installs single skill directly when repo has one skill', async () => {
      const actions = createSkillActions(store, mockCtx);

      // When no name is provided and no /tree/ pattern, it clones to temp
      vi.mocked(mockCtx.skillService.cloneRepoToTemp).mockResolvedValue('/tmp/repo');
      // Return single skill - should install directly
      vi.mocked(mockCtx.skillService.discoverSkillsInDirectory).mockReturnValue([
        { name: 'auto-skill', subPath: '' },
      ]);
      vi.mocked(mockCtx.skillService.installFromDirectory).mockResolvedValue();
      vi.mocked(mockCtx.skillService.removeTempRepo).mockResolvedValue();
      vi.mocked(mockCtx.syncCheck.detectConflicts).mockReturnValue([]);
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      await actions.addSkillFromUrl('https://github.com/example/repo.git');

      // Should call installFromDirectory for single-skill repos
      expect(mockCtx.skillService.installFromDirectory).toHaveBeenCalledWith(
        'https://github.com/example/repo.git',
        'auto-skill',
        '/tmp/repo',
        ''
      );
    });

    it('enters discovery phase for multi-skill repo', async () => {
      const actions = createSkillActions(store, mockCtx);

      vi.mocked(mockCtx.skillService.cloneRepoToTemp).mockResolvedValue('/tmp/repo');
      vi.mocked(mockCtx.skillService.discoverSkillsInDirectory).mockReturnValue([
        { name: 'skill1', subPath: 'skills/skill1' },
        { name: 'skill2', subPath: 'skills/skill2' },
      ]);

      await actions.addSkillFromUrl('https://github.com/example/repo.git');

      // Should set form state for discovery
      const state = store.getState();
      expect(state.shellState.formState).not.toBeNull();
      expect(state.shellState.formState?.formType).toBe('addSkill');
      expect(state.shellState.formState?.data.phase).toBe('discover');
      expect(state.shellState.formState?.data.discoveredSkills).toBe(
        JSON.stringify([
          { name: 'skill1', subPath: 'skills/skill1' },
          { name: 'skill2', subPath: 'skills/skill2' },
        ])
      );
    });

    it('handles /tree/ sub-path pattern in URL', async () => {
      const actions = createSkillActions(store, mockCtx);

      vi.mocked(mockCtx.skillService.install).mockResolvedValue('sub-skill');
      vi.mocked(mockCtx.syncCheck.detectConflicts).mockReturnValue([]);
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      await actions.addSkillFromUrl('https://github.com/example/repo/tree/main/skills/sub-skill');

      // Should extract subPath and call install with it
      expect(mockCtx.skillService.install).toHaveBeenCalledWith(
        'https://github.com/example/repo',
        undefined,
        'skills/sub-skill'
      );
    });

    it('sets form error on failure', async () => {
      const actions = createSkillActions(store, mockCtx);

      vi.mocked(mockCtx.skillService.install).mockRejectedValue(new Error('Git clone failed'));

      await actions.addSkillFromUrl('https://github.com/example/repo.git', 'my-skill');

      const state = store.getState();
      expect(state.shellState.formState).not.toBeNull();
      expect(state.shellState.formState?.data.error).toBe('Git clone failed');
    });

    it('throws error when no skills found in repo', async () => {
      const actions = createSkillActions(store, mockCtx);

      vi.mocked(mockCtx.skillService.cloneRepoToTemp).mockResolvedValue('/tmp/repo');
      vi.mocked(mockCtx.skillService.discoverSkillsInDirectory).mockReturnValue([]);

      await actions.addSkillFromUrl('https://github.com/example/repo.git');

      const state = store.getState();
      expect(state.shellState.formState?.data.error).toBe('No skills found in repository');
    });

    it('runs conflict detection after successful install', async () => {
      const actions = createSkillActions(store, mockCtx);

      vi.mocked(mockCtx.skillService.install).mockResolvedValue('new-skill');
      vi.mocked(mockCtx.syncCheck.detectConflicts).mockReturnValue([]);
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      await actions.addSkillFromUrl('https://github.com/example/repo.git', 'new-skill');

      expect(mockCtx.syncCheck.detectConflicts).toHaveBeenCalledWith('new-skill');
    });

    it('shows conflict panel when conflicts detected', async () => {
      const actions = createSkillActions(store, mockCtx);

      vi.mocked(mockCtx.skillService.install).mockResolvedValue('conflict-skill');
      vi.mocked(mockCtx.syncCheck.detectConflicts).mockReturnValue([
        { agentId: 'claude', agentName: 'Claude', sameContent: false },
      ]);
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      await actions.addSkillFromUrl('https://github.com/example/repo.git', 'conflict-skill');

      const state = store.getState();
      expect(state.shellState.conflictState).not.toBeNull();
      expect(state.shellState.conflictState?.skillName).toBe('conflict-skill');
      expect(state.shellState.conflictState?.conflicts).toHaveLength(1);
      // sameContent=false should default to 'pending'
      expect(state.shellState.conflictState?.conflicts[0].resolution).toBe('pending');
    });

    it('pushes success toast after install', async () => {
      const actions = createSkillActions(store, mockCtx);

      vi.mocked(mockCtx.skillService.install).mockResolvedValue('success-skill');
      vi.mocked(mockCtx.syncCheck.detectConflicts).mockReturnValue([]);
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      await actions.addSkillFromUrl('https://github.com/example/repo.git', 'success-skill');

      const state = store.getState();
      expect(state.shellState.activeToast).not.toBeNull();
      expect(state.shellState.activeToast?.message).toContain('success-skill');
      expect(state.shellState.activeToast?.variant).toBe('success');
    });

    it('localizes install toast in Chinese mode', async () => {
      store.setState((state) => ({
        shellState: {
          ...state.shellState,
          locale: 'zh',
        },
      }));
      const actions = createSkillActions(store, mockCtx);

      vi.mocked(mockCtx.skillService.install).mockResolvedValue('success-skill');
      vi.mocked(mockCtx.syncCheck.detectConflicts).mockReturnValue([]);
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      await actions.addSkillFromUrl('https://github.com/example/repo.git', 'success-skill');

      expect(store.getState().shellState.activeToast?.message).toBe("Skill 'success-skill' 已安装");
    });
  });

  describe('addSkillFromDiscovery', () => {
    it('installs multiple selected skills from temp directory', async () => {
      const actions = createSkillActions(store, mockCtx);

      vi.mocked(mockCtx.skillService.installFromDirectory).mockResolvedValue();
      vi.mocked(mockCtx.skillService.removeTempRepo).mockResolvedValue();
      vi.mocked(mockCtx.syncCheck.detectConflicts).mockReturnValue([]);
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      const selectedSkills = [
        { name: 'skill1', subPath: 'skills/skill1' },
        { name: 'skill2', subPath: 'skills/skill2' },
      ];

      await actions.addSkillFromDiscovery(
        'https://github.com/example/repo.git',
        selectedSkills,
        '/tmp/repo'
      );

      expect(mockCtx.skillService.installFromDirectory).toHaveBeenCalledTimes(2);
      expect(mockCtx.skillService.removeTempRepo).toHaveBeenCalledWith('/tmp/repo');
    });

    it('cleans up temp repo after install', async () => {
      const actions = createSkillActions(store, mockCtx);

      vi.mocked(mockCtx.skillService.installFromDirectory).mockResolvedValue();
      vi.mocked(mockCtx.skillService.removeTempRepo).mockResolvedValue();
      vi.mocked(mockCtx.syncCheck.detectConflicts).mockReturnValue([]);
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      await actions.addSkillFromDiscovery(
        'https://github.com/example/repo.git',
        [{ name: 'skill1', subPath: 'skills/skill1' }],
        '/tmp/repo'
      );

      expect(mockCtx.skillService.removeTempRepo).toHaveBeenCalledWith('/tmp/repo');
    });

    it('sets form error on failure', async () => {
      const actions = createSkillActions(store, mockCtx);

      vi.mocked(mockCtx.skillService.installFromDirectory).mockRejectedValue(
        new Error('Install failed')
      );

      await actions.addSkillFromDiscovery(
        'https://github.com/example/repo.git',
        [{ name: 'skill1', subPath: 'skills/skill1' }],
        '/tmp/repo'
      );

      const state = store.getState();
      expect(state.shellState.formState?.data.error).toBe('Install failed');
    });

    it('clears form state on success', async () => {
      const actions = createSkillActions(store, mockCtx);

      vi.mocked(mockCtx.skillService.installFromDirectory).mockResolvedValue();
      vi.mocked(mockCtx.skillService.removeTempRepo).mockResolvedValue();
      vi.mocked(mockCtx.syncCheck.detectConflicts).mockReturnValue([]);
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      await actions.addSkillFromDiscovery(
        'https://github.com/example/repo.git',
        [{ name: 'skill1', subPath: 'skills/skill1' }],
        '/tmp/repo'
      );

      const state = store.getState();
      expect(state.shellState.formState).toBeNull();
    });
  });

  describe('removeSkill', () => {
    it('unsyncs from all agents before deleting', async () => {
      const actions = createSkillActions(store, mockCtx);
      const mockSkill = createMockSkill({
        name: 'test-skill',
        syncedTo: [
          { agentId: 'claude', mode: 'copy' },
          { agentId: 'codex', mode: 'symlink' },
        ],
      });

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(mockSkill);
      vi.mocked(mockCtx.syncService.unsync).mockResolvedValue();
      vi.mocked(mockCtx.projectSyncService.unsync).mockResolvedValue();
      vi.mocked(mockCtx.skillService.delete).mockResolvedValue();
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      await actions.removeSkill('test-skill');

      expect(mockCtx.syncService.unsync).toHaveBeenCalledWith('test-skill', ['claude', 'codex']);
    });

    it('unsyncs from all projects before deleting', async () => {
      const actions = createSkillActions(store, mockCtx);
      const mockSkill = createMockSkill({
        name: 'test-skill',
        syncedTo: [],
        syncedProjects: [
          { projectId: 'proj1', agentType: 'claude', mode: 'copy' },
          { projectId: 'proj2', agentType: 'codex', mode: 'symlink' },
        ],
      });

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(mockSkill);
      vi.mocked(mockCtx.syncService.unsync).mockResolvedValue();
      vi.mocked(mockCtx.projectSyncService.unsync).mockResolvedValue();
      vi.mocked(mockCtx.skillService.delete).mockResolvedValue();
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      await actions.removeSkill('test-skill');

      expect(mockCtx.projectSyncService.unsync).toHaveBeenCalledWith('test-skill', [
        'proj1:claude',
        'proj2:codex',
      ]);
    });

    it('calls skillService.delete after unsync', async () => {
      const actions = createSkillActions(store, mockCtx);
      const mockSkill = createMockSkill({ name: 'test-skill' });

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(mockSkill);
      vi.mocked(mockCtx.syncService.unsync).mockResolvedValue();
      vi.mocked(mockCtx.projectSyncService.unsync).mockResolvedValue();
      vi.mocked(mockCtx.skillService.delete).mockResolvedValue();
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      await actions.removeSkill('test-skill');

      expect(mockCtx.skillService.delete).toHaveBeenCalledWith('test-skill');
    });

    it('does nothing if skill not found', async () => {
      const actions = createSkillActions(store, mockCtx);

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(undefined);

      await actions.removeSkill('nonexistent');

      expect(mockCtx.skillService.delete).not.toHaveBeenCalled();
      expect(mockCtx.syncService.unsync).not.toHaveBeenCalled();
    });

    it('refreshes skills after deletion', async () => {
      const actions = createSkillActions(store, mockCtx);
      const mockSkill = createMockSkill({ name: 'test-skill' });

      vi.mocked(mockCtx.storage.getSkill).mockReturnValue(mockSkill);
      vi.mocked(mockCtx.syncService.unsync).mockResolvedValue();
      vi.mocked(mockCtx.projectSyncService.unsync).mockResolvedValue();
      vi.mocked(mockCtx.skillService.delete).mockResolvedValue();
      vi.mocked(mockCtx.storage.listSkills).mockReturnValue([]);

      await actions.removeSkill('test-skill');

      expect(mockCtx.storage.listSkills).toHaveBeenCalled();
    });
  });

  describe('categorizeSkills', () => {
    it('updates categories for selected skills', async () => {
      const actions = createSkillActions(store, mockCtx);

      vi.mocked(mockCtx.skillService.updateCategories)
        .mockReturnValueOnce(
          createMockSkill({ name: 'alpha', categories: ['research', 'writing'] })
        )
        .mockReturnValueOnce(
          createMockSkill({ name: 'beta', categories: ['research', 'writing'] })
        );
      vi.mocked(mockCtx.skillService.list).mockReturnValue([
        createMockSkill({ name: 'alpha', categories: ['research', 'writing'] }),
        createMockSkill({ name: 'beta', categories: ['research', 'writing'] }),
      ]);

      const results = await actions.categorizeSkills(['alpha', 'beta'], 'set', [
        'research',
        'writing',
      ]);

      expect(mockCtx.skillService.updateCategories).toHaveBeenCalledTimes(2);
      expect(mockCtx.skillService.updateCategories).toHaveBeenNthCalledWith(
        1,
        'alpha',
        ['research', 'writing'],
        'set'
      );
      expect(results).toEqual([
        { skillName: 'alpha', success: true, categories: ['research', 'writing'] },
        { skillName: 'beta', success: true, categories: ['research', 'writing'] },
      ]);
    });
  });

  describe('restoreSkill', () => {
    it('writes skill metadata back to storage', () => {
      const actions = createSkillActions(store, mockCtx);

      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      actions.restoreSkill({
        name: 'restored-skill',
        source: { type: 'git', url: 'https://example.com/repo.git' },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-02-01T00:00:00.000Z',
        syncedTo: [{ agentId: 'claude', mode: 'copy' }],
      });

      expect(mockCtx.storage.saveSkillMeta).toHaveBeenCalledWith('restored-skill', {
        name: 'restored-skill',
        source: { type: 'git', url: 'https://example.com/repo.git' },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-02-01T00:00:00.000Z',
        categories: [],
        syncedTo: [{ agentId: 'claude', mode: 'copy' }],
        syncedProjects: undefined,
      });
    });

    it('does nothing if name is missing', () => {
      const actions = createSkillActions(store, mockCtx);

      actions.restoreSkill({ source: { type: 'local' } });

      expect(mockCtx.storage.saveSkillMeta).not.toHaveBeenCalled();
    });

    it('uses defaults for missing optional fields', () => {
      const actions = createSkillActions(store, mockCtx);

      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      actions.restoreSkill({ name: 'minimal-skill' });

      expect(mockCtx.storage.saveSkillMeta).toHaveBeenCalledWith('minimal-skill', {
        name: 'minimal-skill',
        source: { type: 'local' },
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        categories: [],
        syncedTo: [],
        syncedProjects: undefined,
      });
    });

    it('preserves syncedProjects in restoration', () => {
      const actions = createSkillActions(store, mockCtx);

      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      actions.restoreSkill({
        name: 'skill-with-projects',
        syncedProjects: [{ projectId: 'proj1', agentType: 'claude', mode: 'copy' }],
      });

      expect(mockCtx.storage.saveSkillMeta).toHaveBeenCalledWith('skill-with-projects', {
        name: 'skill-with-projects',
        source: { type: 'local' },
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        categories: [],
        syncedTo: [],
        syncedProjects: [{ projectId: 'proj1', agentType: 'claude', mode: 'copy' }],
      });
    });
  });
});
