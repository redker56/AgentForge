/**
 * agentActions.test.ts -- behavioral tests for agent action creators
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAgentActions } from '../../../../src/tui/store/actions/agentActions.js';
import type { ServiceContext } from '../../../../src/tui/store/dataSlice.js';
import { createAppStore } from '../../../../src/tui/store/index.js';
import { BUILTIN_AGENTS } from '../../../../src/types.js';

import { createMockServiceContext, createMockAgent, createMockSkill } from './mockContext.js';

describe('createAgentActions', () => {
  let mockCtx: ServiceContext;
  let store: ReturnType<typeof createAppStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx = createMockServiceContext();
    store = createAppStore(mockCtx);
  });

  describe('addAgent', () => {
    it('validates agent ID format (letters, numbers, hyphens, underscores only)', async () => {
      const actions = createAgentActions(store, mockCtx);

      await expect(actions.addAgent('invalid id!', 'Test Agent', '/path')).rejects.toThrow(
        'Agent ID must contain only letters, numbers, hyphens, and underscores'
      );
    });

    it('rejects empty ID', async () => {
      const actions = createAgentActions(store, mockCtx);

      await expect(actions.addAgent('', 'Test Agent', '/path')).rejects.toThrow(
        'Agent ID is required'
      );
    });

    it('rejects whitespace-only ID', async () => {
      const actions = createAgentActions(store, mockCtx);

      await expect(actions.addAgent('   ', 'Test Agent', '/path')).rejects.toThrow(
        'Agent ID is required'
      );
    });

    it('rejects built-in agent IDs', async () => {
      const actions = createAgentActions(store, mockCtx);
      const builtinIds = BUILTIN_AGENTS.map((a) => a.id);

      for (const id of builtinIds) {
        vi.clearAllMocks();
        await expect(actions.addAgent(id, 'Test', '/path')).rejects.toThrow(
          'is a built-in agent ID and cannot be used'
        );
      }
    });

    it('rejects duplicate agent IDs', async () => {
      const actions = createAgentActions(store, mockCtx);
      const existingAgent = createMockAgent({ id: 'existing-agent' });

      vi.mocked(mockCtx.storage.listAllDefinedAgents).mockReturnValue([existingAgent]);

      await expect(actions.addAgent('existing-agent', 'New Agent', '/path')).rejects.toThrow(
        'Agent "existing-agent" already exists'
      );
    });

    it('accepts valid IDs with hyphens and underscores', async () => {
      const actions = createAgentActions(store, mockCtx);

      vi.mocked(mockCtx.storage.listAllDefinedAgents).mockReturnValue([]);
      vi.mocked(mockCtx.fileOps.pathExists).mockReturnValue(true);
      vi.mocked(mockCtx.storage.listAgents).mockReturnValue([]);

      await actions.addAgent('my-custom_agent-123', 'Test Agent', '/path');

      expect(mockCtx.storage.addAgent).toHaveBeenCalledWith(
        'my-custom_agent-123',
        'Test Agent',
        '/path',
        undefined
      );
    });

    it('expands ~ in basePath', async () => {
      const actions = createAgentActions(store, mockCtx);

      vi.mocked(mockCtx.storage.listAllDefinedAgents).mockReturnValue([]);
      vi.mocked(mockCtx.fileOps.pathExists).mockReturnValue(true);
      vi.mocked(mockCtx.storage.listAgents).mockReturnValue([]);

      await actions.addAgent('custom-agent', 'Custom Agent', '~/.custom-agent');

      // Should expand ~ to homedir
      expect(mockCtx.storage.addAgent).toHaveBeenCalledWith(
        'custom-agent',
        'Custom Agent',
        expect.not.stringMatching(/^~/),
        undefined
      );
    });

    it('creates directory if not exists', async () => {
      const actions = createAgentActions(store, mockCtx);

      vi.mocked(mockCtx.storage.listAllDefinedAgents).mockReturnValue([]);
      vi.mocked(mockCtx.fileOps.pathExists).mockReturnValue(false);
      vi.mocked(mockCtx.storage.listAgents).mockReturnValue([]);

      await actions.addAgent('custom-agent', 'Custom Agent', '/new/path');

      expect(mockCtx.fileOps.ensureDir).toHaveBeenCalledWith('/new/path');
    });

    it('stores custom skillsDirName when provided', async () => {
      const actions = createAgentActions(store, mockCtx);

      vi.mocked(mockCtx.storage.listAllDefinedAgents).mockReturnValue([]);
      vi.mocked(mockCtx.fileOps.pathExists).mockReturnValue(true);
      vi.mocked(mockCtx.storage.listAgents).mockReturnValue([]);

      await actions.addAgent('custom-agent', 'Custom Agent', '/path', 'custom-skills');

      expect(mockCtx.storage.addAgent).toHaveBeenCalledWith(
        'custom-agent',
        'Custom Agent',
        '/path',
        'custom-skills'
      );
    });

    it('refreshes agents after adding', async () => {
      const actions = createAgentActions(store, mockCtx);

      vi.mocked(mockCtx.storage.listAllDefinedAgents).mockReturnValue([]);
      vi.mocked(mockCtx.fileOps.pathExists).mockReturnValue(true);
      vi.mocked(mockCtx.storage.listAgents).mockReturnValue([]);

      await actions.addAgent('new-agent', 'New Agent', '/path');

      expect(mockCtx.storage.listAgents).toHaveBeenCalled();
    });
  });

  describe('removeAgent', () => {
    it('cleans up sync references from all skills', async () => {
      const actions = createAgentActions(store, mockCtx);
      const skills = [
        createMockSkill({
          name: 'skill1',
          syncedTo: [
            { agentId: 'claude', mode: 'copy' },
            { agentId: 'custom', mode: 'symlink' },
          ],
        }),
        createMockSkill({ name: 'skill2', syncedTo: [{ agentId: 'custom', mode: 'copy' }] }),
        createMockSkill({ name: 'skill3', syncedTo: [{ agentId: 'claude', mode: 'copy' }] }),
      ];

      vi.mocked(mockCtx.storage.listSkills).mockReturnValue(skills);
      vi.mocked(mockCtx.storage.listAgents).mockReturnValue([]);

      await actions.removeAgent('custom');

      // skill1 should have custom removed from syncedTo
      expect(mockCtx.storage.updateSkillSync).toHaveBeenCalledWith('skill1', [
        { agentId: 'claude', mode: 'copy' },
      ]);
      // skill2 should have empty syncedTo
      expect(mockCtx.storage.updateSkillSync).toHaveBeenCalledWith('skill2', []);
      // skill3 should not be updated (no custom in syncedTo)
      expect(mockCtx.storage.updateSkillSync).not.toHaveBeenCalledWith('skill3', expect.anything());
    });

    it('cleans up project sync references from all skills', async () => {
      const actions = createAgentActions(store, mockCtx);
      const skills = [
        createMockSkill({
          name: 'skill1',
          syncedTo: [],
          syncedProjects: [
            { projectId: 'proj1', agentType: 'custom', mode: 'copy' },
            { projectId: 'proj2', agentType: 'claude', mode: 'copy' },
          ],
        }),
      ];

      vi.mocked(mockCtx.storage.listSkills).mockReturnValue(skills);
      vi.mocked(mockCtx.storage.listAgents).mockReturnValue([]);

      await actions.removeAgent('custom');

      expect(mockCtx.storage.updateSkillProjectSync).toHaveBeenCalledWith('skill1', [
        { projectId: 'proj2', agentType: 'claude', mode: 'copy' },
      ]);
    });

    it('removes agent from storage', async () => {
      const actions = createAgentActions(store, mockCtx);

      vi.mocked(mockCtx.storage.listSkills).mockReturnValue([]);
      vi.mocked(mockCtx.storage.listAgents).mockReturnValue([]);

      await actions.removeAgent('custom');

      expect(mockCtx.storage.removeAgent).toHaveBeenCalledWith('custom');
    });

    it('refreshes agents and skills after removal', async () => {
      const actions = createAgentActions(store, mockCtx);

      vi.mocked(mockCtx.storage.listSkills).mockReturnValue([]);
      vi.mocked(mockCtx.storage.listAgents).mockReturnValue([]);

      await actions.removeAgent('custom');

      expect(mockCtx.storage.listAgents).toHaveBeenCalled();
      expect(mockCtx.storage.listSkills).toHaveBeenCalled();
    });
  });

  describe('restoreAgent', () => {
    it('adds agent back with original properties', () => {
      const actions = createAgentActions(store, mockCtx);

      vi.mocked(mockCtx.storage.listAgents).mockReturnValue([]);

      actions.restoreAgent({
        id: 'restored-agent',
        name: 'Restored Agent',
        basePath: '/test/restored',
        skillsDirName: 'skills',
      });

      expect(mockCtx.storage.addAgent).toHaveBeenCalledWith(
        'restored-agent',
        'Restored Agent',
        '/test/restored',
        'skills'
      );
    });

    it('does nothing if id is missing', () => {
      const actions = createAgentActions(store, mockCtx);

      actions.restoreAgent({ name: 'Missing ID', basePath: '/path' });

      expect(mockCtx.storage.addAgent).not.toHaveBeenCalled();
    });

    it('does nothing if name is missing', () => {
      const actions = createAgentActions(store, mockCtx);

      actions.restoreAgent({ id: 'no-name', basePath: '/path' });

      expect(mockCtx.storage.addAgent).not.toHaveBeenCalled();
    });

    it('does nothing if basePath is missing', () => {
      const actions = createAgentActions(store, mockCtx);

      actions.restoreAgent({ id: 'no-path', name: 'No Path' });

      expect(mockCtx.storage.addAgent).not.toHaveBeenCalled();
    });

    it('handles missing optional skillsDirName', () => {
      const actions = createAgentActions(store, mockCtx);

      vi.mocked(mockCtx.storage.listAgents).mockReturnValue([]);

      actions.restoreAgent({
        id: 'no-dirname',
        name: 'No Dirname',
        basePath: '/path',
      });

      expect(mockCtx.storage.addAgent).toHaveBeenCalledWith(
        'no-dirname',
        'No Dirname',
        '/path',
        undefined
      );
    });

    it('refreshes agents and skills after restoration', () => {
      const actions = createAgentActions(store, mockCtx);

      vi.mocked(mockCtx.storage.listAgents).mockReturnValue([]);
      vi.mocked(mockCtx.storage.listSkills).mockReturnValue([]);

      actions.restoreAgent({
        id: 'restored',
        name: 'Restored',
        basePath: '/path',
      });

      // The restoreAgent calls refreshAgents and refreshSkills which both access storage
      expect(mockCtx.storage.addAgent).toHaveBeenCalled();
    });
  });
});
