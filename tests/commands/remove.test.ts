import { describe, expect, it, vi } from 'vitest';
import { removeAgent, removeProject, removeSkill } from '../../src/commands/remove.js';
import type { CommandContext } from '../../src/commands/index.js';
import type { SkillMeta } from '../../src/types.js';

function createSkillMeta(overrides: Partial<SkillMeta> = {}): SkillMeta {
  return {
    name: 'test-skill',
    source: { type: 'local' },
    createdAt: '2026-03-28T00:00:00.000Z',
    syncedTo: [],
    syncedProjects: [],
    ...overrides,
  };
}

describe('remove command helpers', () => {
  it('removeSkill clears both agent and project syncs before deleting the skill', async () => {
    const meta = createSkillMeta({
      syncedTo: [{ agentId: 'claude', mode: 'copy' }, { agentId: 'codex', mode: 'symlink' }],
      syncedProjects: [
        { projectId: 'proj-a', agentType: 'claude', mode: 'copy' },
        { projectId: 'proj-b', agentType: 'codex', mode: 'symlink' },
      ],
    });

    const ctx = {
      skills: {
        exists: vi.fn(() => true),
        delete: vi.fn(async () => undefined),
      },
      storage: {
        getSkill: vi.fn(() => meta),
      },
      sync: {
        unsync: vi.fn(async () => undefined),
      },
      projectSync: {
        unsync: vi.fn(async () => undefined),
      },
    } as unknown as CommandContext;

    await removeSkill(ctx, 'test-skill', { yes: true });

    expect(ctx.sync.unsync).toHaveBeenCalledWith('test-skill', ['claude', 'codex']);
    expect(ctx.projectSync.unsync).toHaveBeenCalledWith('test-skill', ['proj-a:claude', 'proj-b:codex']);
    expect(ctx.skills.delete).toHaveBeenCalledWith('test-skill');
  });

  it('removeProject clears recorded project sync references without deleting project files', async () => {
    const remainingRecord = { projectId: 'proj-b', agentType: 'claude', mode: 'copy' as const };
    const ctx = {
      storage: {
        getProject: vi.fn(() => ({ id: 'proj-a', path: '/tmp/project-a', addedAt: '2026-03-28T00:00:00.000Z' })),
        listSkills: vi.fn(() => [
          createSkillMeta({
            name: 'skill-a',
            syncedProjects: [
              { projectId: 'proj-a', agentType: 'claude', mode: 'copy' },
              remainingRecord,
            ],
          }),
          createSkillMeta({ name: 'skill-b', syncedProjects: [] }),
        ]),
        updateSkillProjectSync: vi.fn(),
        removeProject: vi.fn(() => true),
      },
    } as unknown as CommandContext;

    await removeProject(ctx, 'proj-a', { yes: true });

    expect(ctx.storage.updateSkillProjectSync).toHaveBeenCalledWith('skill-a', [remainingRecord]);
    expect(ctx.storage.removeProject).toHaveBeenCalledWith('proj-a');
  });

  it('removeAgent forgets both user-level and project-level sync references before deleting the custom agent config', async () => {
    const ctx = {
      storage: {
        listAllDefinedAgents: vi.fn(() => [
          { id: 'custom-agent', name: 'Custom Agent', basePath: '/tmp/custom-agent', skillsDirName: 'custom-agent' },
        ]),
        listSkills: vi.fn(() => [
          createSkillMeta({
            name: 'skill-a',
            syncedTo: [{ agentId: 'custom-agent', mode: 'copy' }],
            syncedProjects: [{ projectId: 'proj-a', agentType: 'custom-agent', mode: 'copy' }],
          }),
          createSkillMeta({
            name: 'skill-b',
            syncedTo: [],
            syncedProjects: [
              { projectId: 'proj-b', agentType: 'custom-agent', mode: 'symlink' },
              { projectId: 'proj-c', agentType: 'claude', mode: 'copy' },
            ],
          }),
        ]),
        updateSkillSync: vi.fn(),
        updateSkillProjectSync: vi.fn(),
        removeAgent: vi.fn(() => true),
      },
    } as unknown as CommandContext;

    await removeAgent(ctx, 'custom-agent', { yes: true });

    expect(ctx.storage.updateSkillSync).toHaveBeenCalledWith('skill-a', []);
    expect(ctx.storage.updateSkillProjectSync).toHaveBeenCalledWith('skill-a', []);
    expect(ctx.storage.updateSkillProjectSync).toHaveBeenCalledWith('skill-b', [
      { projectId: 'proj-c', agentType: 'claude', mode: 'copy' },
    ]);
    expect(ctx.storage.removeAgent).toHaveBeenCalledWith('custom-agent');
  });
});
