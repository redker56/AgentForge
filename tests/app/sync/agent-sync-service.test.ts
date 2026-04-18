/**
 * AgentSyncService Tests
 *
 * Tests full lifecycle operations: sync, unsync, resync, and checkSyncStatus.
 */

import os from 'os';
import path from 'path';

import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { AgentSyncService } from '../../../src/app/sync/agent-sync-service.js';
import type { Agent, SkillMeta } from '../../../src/types.js';

const TEST_DIR = path.join(os.tmpdir(), 'agentforge-agent-sync-test');

interface StorageMock {
  listAgents: () => Agent[];
  getAgent: (id: string) => Agent | undefined;
  getSkill: (name: string) => SkillMeta | undefined;
  getSkillPath: (name: string) => string;
  updateSkillSync: ReturnType<typeof vi.fn>;
}

function createStorageMock(skillDir: string, claudeDir: string, codexDir: string): StorageMock {
  const agents: Agent[] = [
    {
      id: 'claude',
      name: 'Claude Code',
      basePath: claudeDir,
    },
    {
      id: 'codex',
      name: 'Codex',
      basePath: codexDir,
    },
  ];

  const skillMeta: SkillMeta = {
    name: 'test-skill',
    source: { type: 'local' },
    createdAt: new Date().toISOString(),
    syncedTo: [],
  };

  return {
    listAgents: () => agents,
    getAgent: (id: string) => agents.find((a) => a.id === id),
    getSkill: (name: string) => (name === 'test-skill' ? skillMeta : undefined),
    getSkillPath: (name: string) => path.join(skillDir, name),
    updateSkillSync: vi.fn(
      (name: string, records: { agentId: string; mode: 'copy' | 'symlink' }[]) => {
        if (name === 'test-skill') {
          skillMeta.syncedTo = records;
        }
      }
    ),
  };
}

function requireAgent(storage: StorageMock, id: string): Agent {
  const agent = storage.getAgent(id);
  if (!agent) {
    throw new Error(`Missing test agent: ${id}`);
  }
  return agent;
}

describe('AgentSyncService', () => {
  describe('Target path calculation', () => {
    it('should correctly calculate Agent target path', () => {
      const agent = {
        id: 'claude',
        name: 'Claude',
        basePath: path.join(TEST_DIR, '.claude', 'skills'),
      };
      const skillName = 'my-skill';
      const targetPath = path.join(agent.basePath, skillName);

      expect(targetPath).toBe(path.join(TEST_DIR, '.claude', 'skills', 'my-skill'));
    });
  });

  describe('Record merging', () => {
    it('should merge old and new records', () => {
      const existing = [
        { agentId: 'claude', mode: 'copy' as const },
        { agentId: 'codex', mode: 'symlink' as const },
      ];
      const newRecords = [
        { agentId: 'claude', mode: 'symlink' as const },
        { agentId: 'gemini', mode: 'copy' as const },
      ];

      const merged = new Map<string, (typeof existing)[0]>();
      existing.forEach((r) => merged.set(r.agentId, r));
      newRecords.forEach((r) => merged.set(r.agentId, r));

      const result = Array.from(merged.values());
      expect(result).toHaveLength(3);
      expect(result.find((r) => r.agentId === 'claude')?.mode).toBe('symlink');
    });
  });
});

describe('AgentSyncService full lifecycle', () => {
  let testDir: string;
  let skillDir: string;
  let claudeDir: string;
  let codexDir: string;
  let storage: StorageMock;
  let service: AgentSyncService;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), 'agentforge-agent-sync-lifecycle', Date.now().toString());
    skillDir = path.join(testDir, '.agentforge', 'skills');
    claudeDir = path.join(testDir, '.claude', 'skills');
    codexDir = path.join(testDir, '.codex', 'skills');

    await fs.remove(testDir);
    await fs.ensureDir(path.join(skillDir, 'test-skill'));
    await fs.ensureDir(claudeDir);
    await fs.ensureDir(codexDir);
    await fs.writeFile(path.join(skillDir, 'test-skill', 'SKILL.md'), '# Test Skill');

    storage = createStorageMock(skillDir, claudeDir, codexDir);
    service = new AgentSyncService(storage as never);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('sync', () => {
    it('syncs skill to single agent with copy mode', async () => {
      const agents = [requireAgent(storage, 'claude')];
      const results = await service.sync('test-skill', agents, 'copy');

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].target).toBe('claude');
      expect(results[0].mode).toBe('copy');
      expect(await fs.pathExists(path.join(claudeDir, 'test-skill', 'SKILL.md'))).toBe(true);
    });

    it('syncs skill to multiple agents', async () => {
      const agents = [requireAgent(storage, 'claude'), requireAgent(storage, 'codex')];
      const results = await service.sync('test-skill', agents, 'copy');

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
      expect(await fs.pathExists(path.join(claudeDir, 'test-skill', 'SKILL.md'))).toBe(true);
      expect(await fs.pathExists(path.join(codexDir, 'test-skill', 'SKILL.md'))).toBe(true);
    });

    it('creates symlink when mode is symlink', async () => {
      const agents = [requireAgent(storage, 'claude')];
      const results = await service.sync('test-skill', agents, 'symlink');

      expect(results[0].success).toBe(true);
      // Symlink may fall back to copy on Windows without admin rights
      const targetPath = path.join(claudeDir, 'test-skill');
      if (results[0].mode === 'symlink') {
        const stats = await fs.lstat(targetPath);
        expect(stats.isSymbolicLink()).toBe(true);
      } else {
        // Copy fallback
        expect(await fs.pathExists(targetPath)).toBe(true);
      }
    });

    it('throws error when skill does not exist', async () => {
      const agents = [requireAgent(storage, 'claude')];
      await expect(service.sync('nonexistent-skill', agents, 'copy')).rejects.toThrow(
        'Skill not found'
      );
    });

    it('updates registry after sync', async () => {
      const agents = [requireAgent(storage, 'claude')];
      await service.sync('test-skill', agents, 'copy');

      expect(storage.updateSkillSync).toHaveBeenCalledWith(
        'test-skill',
        expect.arrayContaining([expect.objectContaining({ agentId: 'claude', mode: 'copy' })])
      );
    });
  });

  describe('unsync', () => {
    it('removes skill from agent directory', async () => {
      // First sync
      const agents = [requireAgent(storage, 'claude')];
      await service.sync('test-skill', agents, 'copy');

      // Then unsync
      await service.unsync('test-skill', ['claude']);

      expect(await fs.pathExists(path.join(claudeDir, 'test-skill'))).toBe(false);
    });

    it('updates registry after unsync', async () => {
      // First sync
      const agents = [requireAgent(storage, 'claude')];
      await service.sync('test-skill', agents, 'copy');

      // Then unsync
      await service.unsync('test-skill', ['claude']);

      expect(storage.updateSkillSync).toHaveBeenCalledWith('test-skill', []);
    });

    it('unsyncs only specified agents', async () => {
      const agents = [requireAgent(storage, 'claude'), requireAgent(storage, 'codex')];
      await service.sync('test-skill', agents, 'copy');

      // Unsync only claude
      await service.unsync('test-skill', ['claude']);

      expect(await fs.pathExists(path.join(claudeDir, 'test-skill'))).toBe(false);
      expect(await fs.pathExists(path.join(codexDir, 'test-skill'))).toBe(true);
      expect(storage.updateSkillSync).toHaveBeenCalledWith(
        'test-skill',
        expect.arrayContaining([expect.objectContaining({ agentId: 'codex', mode: 'copy' })])
      );
    });
  });

  describe('resync', () => {
    it('updates content from source', async () => {
      // First sync
      const agents = [requireAgent(storage, 'claude')];
      await service.sync('test-skill', agents, 'copy');

      // Modify skill content
      await fs.appendFile(path.join(skillDir, 'test-skill', 'SKILL.md'), '\n\nMore content');

      // Resync
      await service.resync('test-skill');

      const targetContent = await fs.readFile(
        path.join(claudeDir, 'test-skill', 'SKILL.md'),
        'utf-8'
      );
      expect(targetContent).toContain('More content');
    });

    it('does nothing when no sync records exist', async () => {
      // Resync without any prior sync
      await expect(service.resync('test-skill')).resolves.not.toThrow();
    });
  });

  describe('checkSyncStatus', () => {
    it('returns exists=false for non-existent target', () => {
      const status = service.checkSyncStatus('test-skill');
      expect(status.length).toBe(2); // claude and codex
      expect(status[0].exists).toBe(false);
      expect(status[1].exists).toBe(false);
    });

    it('returns exists=true, sameContent=true for matching directories', async () => {
      // Sync first
      const agents = [requireAgent(storage, 'claude')];
      await service.sync('test-skill', agents, 'copy');

      const status = service.checkSyncStatus('test-skill');
      const claudeStatus = status.find((s) => s.target === 'claude');
      expect(claudeStatus?.exists).toBe(true);
      expect(claudeStatus?.sameContent).toBe(true);
    });

    it('returns exists=true, sameContent=false for differing directories', async () => {
      // Sync first
      const agents = [requireAgent(storage, 'claude')];
      await service.sync('test-skill', agents, 'copy');

      // Modify target content
      await fs.appendFile(path.join(claudeDir, 'test-skill', 'SKILL.md'), '\n\nModified');

      const status = service.checkSyncStatus('test-skill');
      const claudeStatus = status.find((s) => s.target === 'claude');
      expect(claudeStatus?.exists).toBe(true);
      expect(claudeStatus?.sameContent).toBe(false);
    });

    it('returns isSymlink=true when target is symlink', async () => {
      const agents = [requireAgent(storage, 'claude')];
      const results = await service.sync('test-skill', agents, 'symlink');

      // Only check symlink if it succeeded
      if (results[0].mode === 'symlink') {
        const status = service.checkSyncStatus('test-skill');
        const claudeStatus = status.find((s) => s.target === 'claude');
        expect(claudeStatus?.isSymlink).toBe(true);
        expect(claudeStatus?.linkTarget).not.toBeNull();
      }
    });
  });

  describe('getSyncedAgents', () => {
    it('returns agents from sync records', async () => {
      const agents = [requireAgent(storage, 'claude')];
      await service.sync('test-skill', agents, 'copy');

      const syncedAgents = service.getSyncedAgents('test-skill');
      expect(syncedAgents).toHaveLength(1);
      expect(syncedAgents[0].id).toBe('claude');
    });

    it('returns empty array when no sync records', () => {
      const syncedAgents = service.getSyncedAgents('test-skill');
      expect(syncedAgents).toHaveLength(0);
    });
  });
});
