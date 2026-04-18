/**
 * projectActions.test.ts -- behavioral tests for project action creators
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectActions } from '../../../../src/tui/store/actions/projectActions.js';
import type { ServiceContext } from '../../../../src/tui/store/dataSlice.js';
import { createAppStore } from '../../../../src/tui/store/index.js';

import { createMockServiceContext, createMockProject, createMockSkill } from './mockContext.js';

describe('createProjectActions', () => {
  let mockCtx: ServiceContext;
  let store: ReturnType<typeof createAppStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx = createMockServiceContext();
    store = createAppStore(mockCtx);
  });

  describe('addProject', () => {
    it('validates project ID format (letters, numbers, hyphens, underscores only)', async () => {
      const actions = createProjectActions(store, mockCtx);

      await expect(actions.addProject('invalid id!', '/path')).rejects.toThrow(
        'Project ID must contain only letters, numbers, hyphens, and underscores'
      );
    });

    it('rejects empty ID', async () => {
      const actions = createProjectActions(store, mockCtx);

      await expect(actions.addProject('', '/path')).rejects.toThrow('Project ID is required');
    });

    it('rejects whitespace-only ID', async () => {
      const actions = createProjectActions(store, mockCtx);

      await expect(actions.addProject('   ', '/path')).rejects.toThrow('Project ID is required');
    });

    it('rejects duplicate project IDs', async () => {
      const actions = createProjectActions(store, mockCtx);
      const existingProject = createMockProject({ id: 'existing-project' });

      vi.mocked(mockCtx.storage.listProjects).mockReturnValue([existingProject]);

      await expect(actions.addProject('existing-project', '/new/path')).rejects.toThrow(
        'Project "existing-project" already exists'
      );
    });

    it('accepts valid IDs with hyphens and underscores', async () => {
      const actions = createProjectActions(store, mockCtx);

      vi.mocked(mockCtx.storage.listProjects).mockReturnValue([]);
      vi.mocked(mockCtx.fileOps.pathExists).mockReturnValue(true);

      await actions.addProject('my-project_123', '/path');

      // Verify addProject was called with correct ID and path
      expect(mockCtx.storage.addProject).toHaveBeenCalled();
      const call = vi.mocked(mockCtx.storage.addProject).mock.calls[0];
      expect(call[0]).toBe('my-project_123');
      expect(call[1]).toBe('/path');
    });

    it('validates path exists', async () => {
      const actions = createProjectActions(store, mockCtx);

      vi.mocked(mockCtx.storage.listProjects).mockReturnValue([]);
      vi.mocked(mockCtx.fileOps.pathExists).mockReturnValue(false);

      await expect(actions.addProject('new-project', '/nonexistent/path')).rejects.toThrow(
        'Path does not exist: /nonexistent/path'
      );

      expect(mockCtx.storage.addProject).not.toHaveBeenCalled();
    });

    it('expands ~ in projectPath', async () => {
      const actions = createProjectActions(store, mockCtx);

      vi.mocked(mockCtx.storage.listProjects).mockReturnValue([]);
      vi.mocked(mockCtx.fileOps.pathExists).mockReturnValue(true);

      await actions.addProject('my-project', '~/projects/my-project');

      // Should expand ~ to homedir - verify the path doesn't start with ~
      expect(mockCtx.storage.addProject).toHaveBeenCalled();
      const call = vi.mocked(mockCtx.storage.addProject).mock.calls[0];
      expect(call[0]).toBe('my-project');
      expect(call[1]).not.toMatch(/^~/);
    });

    it('adds project to storage when validation passes', async () => {
      const actions = createProjectActions(store, mockCtx);

      vi.mocked(mockCtx.storage.listProjects).mockReturnValue([]);
      vi.mocked(mockCtx.fileOps.pathExists).mockReturnValue(true);

      await actions.addProject('new-project', '/valid/path');

      expect(mockCtx.storage.addProject).toHaveBeenCalled();
      const call = vi.mocked(mockCtx.storage.addProject).mock.calls[0];
      expect(call[0]).toBe('new-project');
      expect(call[1]).toBe('/valid/path');
    });

    it('refreshes projects after adding', async () => {
      const actions = createProjectActions(store, mockCtx);

      vi.mocked(mockCtx.storage.listProjects).mockReturnValue([]);
      vi.mocked(mockCtx.fileOps.pathExists).mockReturnValue(true);

      await actions.addProject('new-project', '/path');

      expect(mockCtx.storage.listProjects).toHaveBeenCalled();
    });
  });

  describe('removeProject', () => {
    it('cleans up sync references from all skills', async () => {
      const actions = createProjectActions(store, mockCtx);
      const skills = [
        createMockSkill({
          name: 'skill1',
          syncedProjects: [
            { projectId: 'proj1', agentType: 'claude', mode: 'copy' },
            { projectId: 'proj2', agentType: 'claude', mode: 'copy' },
          ],
        }),
        createMockSkill({
          name: 'skill2',
          syncedProjects: [{ projectId: 'proj1', agentType: 'codex', mode: 'symlink' }],
        }),
        createMockSkill({
          name: 'skill3',
          syncedProjects: [],
        }),
      ];

      vi.mocked(mockCtx.storage.listSkills).mockReturnValue(skills);
      vi.mocked(mockCtx.storage.listProjects).mockReturnValue([]);

      await actions.removeProject('proj1');

      // skill1 should have proj1 removed
      expect(mockCtx.storage.updateSkillProjectSync).toHaveBeenCalledWith('skill1', [
        { projectId: 'proj2', agentType: 'claude', mode: 'copy' },
      ]);
      // skill2 should have empty syncedProjects
      expect(mockCtx.storage.updateSkillProjectSync).toHaveBeenCalledWith('skill2', []);
    });

    it('removes project from storage', async () => {
      const actions = createProjectActions(store, mockCtx);

      vi.mocked(mockCtx.storage.listSkills).mockReturnValue([]);
      vi.mocked(mockCtx.storage.listProjects).mockReturnValue([]);

      await actions.removeProject('proj1');

      expect(mockCtx.storage.removeProject).toHaveBeenCalledWith('proj1');
    });

    it('refreshes projects and skills after removal', async () => {
      const actions = createProjectActions(store, mockCtx);

      vi.mocked(mockCtx.storage.listSkills).mockReturnValue([]);
      vi.mocked(mockCtx.storage.listProjects).mockReturnValue([]);

      await actions.removeProject('proj1');

      expect(mockCtx.storage.listProjects).toHaveBeenCalled();
      expect(mockCtx.storage.listSkills).toHaveBeenCalled();
    });
  });

  describe('restoreProject', () => {
    it('adds project back with original properties', () => {
      const actions = createProjectActions(store, mockCtx);

      vi.mocked(mockCtx.storage.listProjects).mockReturnValue([]);
      vi.mocked(mockCtx.storage.listSkills).mockReturnValue([]);

      actions.restoreProject({
        id: 'restored-project',
        path: '/test/restored',
        addedAt: '2024-01-01T00:00:00.000Z',
      });

      expect(mockCtx.storage.addProject).toHaveBeenCalledWith(
        'restored-project',
        '/test/restored',
        '2024-01-01T00:00:00.000Z'
      );
    });

    it('does nothing if id is missing', () => {
      const actions = createProjectActions(store, mockCtx);

      actions.restoreProject({ path: '/path' });

      expect(mockCtx.storage.addProject).not.toHaveBeenCalled();
    });

    it('does nothing if path is missing', () => {
      const actions = createProjectActions(store, mockCtx);

      actions.restoreProject({ id: 'no-path' });

      expect(mockCtx.storage.addProject).not.toHaveBeenCalled();
    });

    it('handles missing optional addedAt', () => {
      const actions = createProjectActions(store, mockCtx);

      vi.mocked(mockCtx.storage.listProjects).mockReturnValue([]);
      vi.mocked(mockCtx.storage.listSkills).mockReturnValue([]);

      actions.restoreProject({
        id: 'no-addedat',
        path: '/path',
      });

      expect(mockCtx.storage.addProject).toHaveBeenCalledWith('no-addedat', '/path', undefined);
    });

    it('refreshes projects and skills after restoration', () => {
      const actions = createProjectActions(store, mockCtx);

      vi.mocked(mockCtx.storage.listProjects).mockReturnValue([]);
      vi.mocked(mockCtx.storage.listSkills).mockReturnValue([]);

      actions.restoreProject({
        id: 'restored',
        path: '/path',
      });

      // restoreProject calls addProject and then refreshProjects/refreshSkills
      expect(mockCtx.storage.addProject).toHaveBeenCalledWith('restored', '/path', undefined);
    });
  });
});
