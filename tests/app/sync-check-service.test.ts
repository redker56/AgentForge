/**
 * SyncCheckService Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SyncCheckService } from '../../src/app/sync-check-service.js';
import type { SkillMeta, SyncRecord } from '../../src/types.js';

describe('SyncCheckService', () => {
  let skill: SkillMeta;
  let consoleLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    skill = {
      name: 'demo-skill',
      source: { type: 'local' },
      createdAt: new Date().toISOString(),
      syncedTo: [],
    };
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLog.mockRestore();
  });

  it('records detected links together with seed Agent ids', async () => {
    const updateSkillSync = vi.fn((_: string, records: SyncRecord[]) => {
      skill.syncedTo = [...records];
    });
    const storage = {
      getSkill: (name: string) => (name === skill.name ? skill : undefined),
      getAgent: (agentId: string) => ({ id: agentId, name: agentId, basePath: '' }),
      updateSkillSync,
    };
    const sync = {
      checkSyncStatus: () => [
        { target: 'codex', exists: true, sameContent: true, isSymlink: false, linkTarget: null },
      ],
    };

    const service = new SyncCheckService(storage as never, sync as never);
    const linkedAgents = await service.resolveAndRecordSyncLinks(skill.name, ['claude']);

    expect(linkedAgents).toEqual(['claude', 'codex']);
    expect(skill.syncedTo).toEqual([
      { agentId: 'claude', mode: 'copy' },
      { agentId: 'codex', mode: 'copy' },
    ]);
    expect(updateSkillSync).toHaveBeenCalledOnce();
  });

  it('preserves existing sync records while adding new links', async () => {
    skill.syncedTo = [{ agentId: 'gemini', mode: 'symlink' }];

    const storage = {
      getSkill: () => skill,
      getAgent: (agentId: string) => ({ id: agentId, name: agentId, basePath: '' }),
      updateSkillSync: vi.fn((_: string, records: SyncRecord[]) => {
        skill.syncedTo = [...records];
      }),
    };
    const sync = {
      checkSyncStatus: () => [
        { target: 'codex', exists: true, sameContent: true, isSymlink: false, linkTarget: null },
      ],
    };

    const service = new SyncCheckService(storage as never, sync as never);
    await service.resolveAndRecordSyncLinks(skill.name, ['claude']);

    expect(skill.syncedTo).toEqual([
      { agentId: 'gemini', mode: 'symlink' },
      { agentId: 'claude', mode: 'copy' },
      { agentId: 'codex', mode: 'copy' },
    ]);
  });
});
