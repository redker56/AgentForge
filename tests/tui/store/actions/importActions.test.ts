/**
 * importActions.test.ts -- behavioral tests for import action creators
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createImportActions } from '../../../../src/tui/store/actions/importActions.js';
import type { ServiceContext } from '../../../../src/tui/store/dataSlice.js';
import { createAppStore } from '../../../../src/tui/store/index.js';

import { createMockServiceContext, createMockAgent, createMockProject } from './mockContext.js';

describe('createImportActions', () => {
  let mockCtx: ServiceContext;
  let store: ReturnType<typeof createAppStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx = createMockServiceContext();
    store = createAppStore(mockCtx);
  });

  describe('scanProjectSkills', () => {
    it('returns discovered skills with alreadyExists flag', () => {
      const actions = createImportActions(store, mockCtx);
      const mockProject = createMockProject({ id: 'proj1', path: '/test/project' });

      vi.mocked(mockCtx.storage.getProject).mockReturnValue(mockProject);
      vi.mocked(mockCtx.scanService.scanProject).mockReturnValue([
        {
          name: 'skill1',
          path: '/test/project/.claude/skills/skill1',
          agentId: 'claude',
          agentName: 'Claude',
          hasSkillMd: true,
          subPath: '.claude/skills/skill1',
        },
        {
          name: 'skill2',
          path: '/test/project/.claude/skills/skill2',
          agentId: 'claude',
          agentName: 'Claude',
          hasSkillMd: true,
          subPath: '.claude/skills/skill2',
        },
      ]);
      vi.mocked(mockCtx.skillService.exists).mockImplementation((name) => name === 'skill1');

      const results = actions.scanProjectSkills('proj1');

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        name: 'skill1',
        path: '/test/project/.claude/skills/skill1',
        alreadyExists: true,
      });
      expect(results[1]).toEqual({
        name: 'skill2',
        path: '/test/project/.claude/skills/skill2',
        alreadyExists: false,
      });
    });

    it('returns empty array for non-existent project', () => {
      const actions = createImportActions(store, mockCtx);

      vi.mocked(mockCtx.storage.getProject).mockReturnValue(undefined);

      const results = actions.scanProjectSkills('nonexistent');

      expect(results).toEqual([]);
      expect(mockCtx.scanService.scanProject).not.toHaveBeenCalled();
    });

    it('calls scanProject with project path', () => {
      const actions = createImportActions(store, mockCtx);
      const mockProject = createMockProject({ id: 'proj1', path: '/test/project' });

      vi.mocked(mockCtx.storage.getProject).mockReturnValue(mockProject);
      vi.mocked(mockCtx.scanService.scanProject).mockReturnValue([]);

      actions.scanProjectSkills('proj1');

      expect(mockCtx.scanService.scanProject).toHaveBeenCalledWith('/test/project');
    });
  });

  describe('scanAgentSkills', () => {
    it('returns skills with hasSkillMd=true', () => {
      const actions = createImportActions(store, mockCtx);
      const mockAgent = createMockAgent({ id: 'claude', basePath: '/test/.claude' });

      vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);
      vi.mocked(mockCtx.fileOps.listSubdirectories).mockReturnValue([
        'skill1',
        'skill2',
        'notaskill',
      ]);
      vi.mocked(mockCtx.fileOps.fileExists).mockImplementation((p) => {
        if (p.includes('skill1') || p.includes('skill2')) return true;
        return false;
      });
      vi.mocked(mockCtx.skillService.exists).mockImplementation((name) => name === 'skill1');

      const results = actions.scanAgentSkills('claude');

      // Should only return directories with SKILL.md
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.name)).toEqual(['skill1', 'skill2']);
      expect(results[0].hasSkillMd).toBe(true);
      expect(results[0].alreadyExists).toBe(true);
      expect(results[1].alreadyExists).toBe(false);
    });

    it('filters out directories without SKILL.md', () => {
      const actions = createImportActions(store, mockCtx);
      const mockAgent = createMockAgent({ id: 'claude', basePath: '/test/.claude' });

      vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);
      vi.mocked(mockCtx.fileOps.listSubdirectories).mockReturnValue(['skill1', 'notaskill']);
      vi.mocked(mockCtx.fileOps.fileExists).mockImplementation((p) => p.includes('skill1'));

      const results = actions.scanAgentSkills('claude');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('skill1');
    });

    it('returns empty array for non-existent agent', () => {
      const actions = createImportActions(store, mockCtx);

      vi.mocked(mockCtx.storage.getAgent).mockReturnValue(undefined);

      const results = actions.scanAgentSkills('nonexistent');

      expect(results).toEqual([]);
      expect(mockCtx.fileOps.listSubdirectories).not.toHaveBeenCalled();
    });

    it('checks both SKILL.md and skill.md case variations', () => {
      const actions = createImportActions(store, mockCtx);
      const mockAgent = createMockAgent({ id: 'claude', basePath: '/test/.claude' });

      vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);
      vi.mocked(mockCtx.fileOps.listSubdirectories).mockReturnValue(['skill1', 'skill2']);
      vi.mocked(mockCtx.fileOps.fileExists).mockImplementation((p) => {
        // skill1 has SKILL.md, skill2 has skill.md (lowercase)
        if (p.includes('skill1') && p.includes('SKILL.md')) return true;
        if (p.includes('skill2') && p.includes('skill.md')) return true;
        return false;
      });

      const results = actions.scanAgentSkills('claude');

      expect(results).toHaveLength(2);
    });
  });

  describe('importFromProject', () => {
    it('imports selected skills and refreshes store', async () => {
      const actions = createImportActions(store, mockCtx);
      const mockProject = createMockProject({ id: 'proj1', path: '/test/project' });

      vi.mocked(mockCtx.storage.getProject).mockReturnValue(mockProject);
      vi.mocked(mockCtx.scanService.scanProject).mockReturnValue([
        {
          name: 'skill1',
          path: '/test/project/.claude/skills/skill1',
          agentId: 'claude',
          agentName: 'Claude',
          hasSkillMd: true,
          subPath: '',
        },
      ]);
      vi.mocked(mockCtx.skillService.exists).mockReturnValue(false);
      vi.mocked(mockCtx.skillService.importFromPath).mockResolvedValue();
      vi.mocked(mockCtx.syncCheck.detectConflicts).mockReturnValue([]);
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      await actions.importFromProject('proj1', ['skill1']);

      expect(mockCtx.skillService.importFromPath).toHaveBeenCalledWith(
        '/test/project/.claude/skills/skill1',
        'skill1',
        { type: 'project', projectId: 'proj1' }
      );
    });

    it('triggers conflict detection on success', async () => {
      const actions = createImportActions(store, mockCtx);
      const mockProject = createMockProject({ id: 'proj1', path: '/test/project' });

      vi.mocked(mockCtx.storage.getProject).mockReturnValue(mockProject);
      vi.mocked(mockCtx.scanService.scanProject).mockReturnValue([
        {
          name: 'skill1',
          path: '/test/project/.claude/skills/skill1',
          agentId: 'claude',
          agentName: 'Claude',
          hasSkillMd: true,
          subPath: '',
        },
      ]);
      vi.mocked(mockCtx.skillService.exists).mockReturnValue(false);
      vi.mocked(mockCtx.skillService.importFromPath).mockResolvedValue();
      vi.mocked(mockCtx.syncCheck.detectConflicts).mockReturnValue([
        { agentId: 'claude', agentName: 'Claude', sameContent: false },
      ]);
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      await actions.importFromProject('proj1', ['skill1']);

      // Conflict detection is called for the imported skill
      expect(mockCtx.syncCheck.detectConflicts).toHaveBeenCalledWith('skill1');
    });

    it('clears form state after import', async () => {
      const actions = createImportActions(store, mockCtx);
      const mockProject = createMockProject({ id: 'proj1', path: '/test/project' });

      // Set form state first
      store.getState().setFormState({ formType: 'importProject', data: {} });

      vi.mocked(mockCtx.storage.getProject).mockReturnValue(mockProject);
      vi.mocked(mockCtx.scanService.scanProject).mockReturnValue([]);
      vi.mocked(mockCtx.skillService.exists).mockReturnValue(false);
      vi.mocked(mockCtx.syncCheck.detectConflicts).mockReturnValue([]);
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      await actions.importFromProject('proj1', []);

      expect(store.getState().formState).toBeNull();
    });

    it('calls detectConflicts when sameContent is true', async () => {
      const actions = createImportActions(store, mockCtx);
      const mockProject = createMockProject({ id: 'proj1', path: '/test/project' });

      vi.mocked(mockCtx.storage.getProject).mockReturnValue(mockProject);
      vi.mocked(mockCtx.scanService.scanProject).mockReturnValue([
        {
          name: 'conflict-skill',
          path: '/test/project/.claude/skills/conflict-skill',
          agentId: 'claude',
          agentName: 'Claude',
          hasSkillMd: true,
          subPath: '',
        },
      ]);
      vi.mocked(mockCtx.skillService.exists).mockReturnValue(false);
      vi.mocked(mockCtx.skillService.importFromPath).mockResolvedValue();
      vi.mocked(mockCtx.syncCheck.detectConflicts).mockReturnValue([
        { agentId: 'claude', agentName: 'Claude', sameContent: true },
      ]);
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      await actions.importFromProject('proj1', ['conflict-skill']);

      // Verify conflict detection was called
      expect(mockCtx.syncCheck.detectConflicts).toHaveBeenCalledWith('conflict-skill');
    });
  });

  describe('importFromAgent', () => {
    it('imports selected skills from agent directory', async () => {
      const actions = createImportActions(store, mockCtx);
      const mockAgent = createMockAgent({ id: 'claude', basePath: '/test/.claude' });

      vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);
      vi.mocked(mockCtx.skillService.exists).mockReturnValue(false);
      vi.mocked(mockCtx.skillService.importFromPath).mockResolvedValue();
      vi.mocked(mockCtx.syncCheck.detectConflicts).mockReturnValue([]);
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      await actions.importFromAgent('claude', ['skill1', 'skill2']);

      expect(mockCtx.skillService.importFromPath).toHaveBeenCalledTimes(2);
      expect(mockCtx.skillService.importFromPath).toHaveBeenCalledWith(
        '/test/.claude/skill1',
        'skill1',
        { type: 'local', importedFrom: { agent: 'claude', path: '/test/.claude/skill1' } }
      );
      expect(mockCtx.skillService.importFromPath).toHaveBeenCalledWith(
        '/test/.claude/skill2',
        'skill2',
        { type: 'local', importedFrom: { agent: 'claude', path: '/test/.claude/skill2' } }
      );
    });

    it('clears form state after import', async () => {
      const actions = createImportActions(store, mockCtx);
      const mockAgent = createMockAgent({ id: 'claude', basePath: '/test/.claude' });

      store.getState().setFormState({ formType: 'importAgent', data: {} });

      vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);
      vi.mocked(mockCtx.skillService.exists).mockReturnValue(false);
      vi.mocked(mockCtx.skillService.importFromPath).mockResolvedValue();
      vi.mocked(mockCtx.syncCheck.detectConflicts).mockReturnValue([]);
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      await actions.importFromAgent('claude', ['skill1']);

      expect(store.getState().formState).toBeNull();
    });

    it('triggers conflict detection for last imported skill', async () => {
      const actions = createImportActions(store, mockCtx);
      const mockAgent = createMockAgent({ id: 'claude', basePath: '/test/.claude' });

      vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);
      vi.mocked(mockCtx.skillService.exists).mockReturnValue(false);
      vi.mocked(mockCtx.skillService.importFromPath).mockResolvedValue();
      vi.mocked(mockCtx.syncCheck.detectConflicts).mockReturnValue([]);
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      await actions.importFromAgent('claude', ['skill1', 'skill2']);

      // Should only call conflict detection for the last skill
      expect(mockCtx.syncCheck.detectConflicts).toHaveBeenCalledTimes(1);
      expect(mockCtx.syncCheck.detectConflicts).toHaveBeenCalledWith('skill2');
    });

    it('refreshes skills after import', async () => {
      const actions = createImportActions(store, mockCtx);
      const mockAgent = createMockAgent({ id: 'claude', basePath: '/test/.claude' });

      vi.mocked(mockCtx.storage.getAgent).mockReturnValue(mockAgent);
      vi.mocked(mockCtx.skillService.exists).mockReturnValue(false);
      vi.mocked(mockCtx.skillService.importFromPath).mockResolvedValue();
      vi.mocked(mockCtx.syncCheck.detectConflicts).mockReturnValue([]);
      vi.mocked(mockCtx.skillService.list).mockReturnValue([]);

      await actions.importFromAgent('claude', ['skill1']);

      expect(mockCtx.skillService.list).toHaveBeenCalled();
    });
  });
});
