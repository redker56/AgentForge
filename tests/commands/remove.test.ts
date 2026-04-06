import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CommandContext } from '../../src/commands/index.js';
import { register, removeAgent, removeProject, removeSkill } from '../../src/commands/remove.js';
import type { SkillMeta } from '../../src/types.js';
import { createMockFileOps } from '../helpers/mock-context.js';

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

const mockFileOps = createMockFileOps();

describe('remove command helpers', () => {
  it('removeSkill clears both agent and project syncs before deleting the skill', async () => {
    const meta = createSkillMeta({
      syncedTo: [
        { agentId: 'claude', mode: 'copy' },
        { agentId: 'codex', mode: 'symlink' },
      ],
      syncedProjects: [
        { projectId: 'proj-a', agentType: 'claude', mode: 'copy' },
        { projectId: 'proj-b', agentType: 'codex', mode: 'symlink' },
      ],
    });

    const ctx = {
      skills: {
        exists: vi.fn(() => true),
        delete: vi.fn(() => Promise.resolve()),
      },
      storage: {
        getSkill: vi.fn(() => meta),
      },
      sync: {
        unsync: vi.fn(() => Promise.resolve()),
      },
      projectSync: {
        unsync: vi.fn(() => Promise.resolve()),
      },
    } as unknown as CommandContext;

    await removeSkill(ctx, 'test-skill', { yes: true });

    expect(ctx.sync.unsync).toHaveBeenCalledWith('test-skill', ['claude', 'codex']);
    expect(ctx.projectSync.unsync).toHaveBeenCalledWith('test-skill', [
      'proj-a:claude',
      'proj-b:codex',
    ]);
    expect(ctx.skills.delete).toHaveBeenCalledWith('test-skill');
  });

  it('removeProject clears recorded project sync references without deleting project files', async () => {
    const remainingRecord = { projectId: 'proj-b', agentType: 'claude', mode: 'copy' as const };
    const ctx = {
      storage: {
        getProject: vi.fn(() => ({
          id: 'proj-a',
          path: '/tmp/project-a',
          addedAt: '2026-03-28T00:00:00.000Z',
        })),
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
          {
            id: 'custom-agent',
            name: 'Custom Agent',
            basePath: '/tmp/custom-agent',
            skillsDirName: 'custom-agent',
          },
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

describe('remove command register', () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;
  let processExit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    processExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit mocked');
    });
  });

  afterEach(() => {
    consoleLog.mockRestore();
    consoleError.mockRestore();
    processExit.mockRestore();
  });

  it('removes skill via register function', async () => {
    const program = new Command();

    register(program, {
      skills: {
        exists: vi.fn(() => true),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      storage: {
        getSkill: vi.fn(() =>
          createSkillMeta({
            name: 'test-skill',
            syncedTo: [],
            syncedProjects: [],
          })
        ),
      },
      sync: {
        unsync: vi.fn().mockResolvedValue(undefined),
      },
      projectSync: {
        unsync: vi.fn().mockResolvedValue(undefined),
      },
      fileOps: mockFileOps,
    } as never);

    await program.parseAsync(['remove', 'skills', 'test-skill', '--yes'], { from: 'user' });

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('Skill deleted'));
  });

  it('shows error when skill not found', async () => {
    const program = new Command();

    register(program, {
      skills: {
        exists: vi.fn(() => false),
        list: vi.fn(() => []),
      },
      storage: {
        listSkills: vi.fn(() => []),
        listAgents: vi.fn(() => []),
      },
      fileOps: mockFileOps,
    } as never);

    await expect(
      program.parseAsync(['remove', 'skills', 'nonexistent'], { from: 'user' })
    ).rejects.toThrow('process.exit mocked');

    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Skill not found'));
  });

  it('removes project via register function', async () => {
    const program = new Command();

    register(program, {
      storage: {
        getProject: vi.fn(() => ({
          id: 'test-project',
          path: '/tmp/test-project',
          addedAt: '2026-03-28T00:00:00.000Z',
        })),
        listSkills: vi.fn(() => []),
        removeProject: vi.fn(() => true),
      },
      fileOps: mockFileOps,
    } as never);

    await program.parseAsync(['remove', 'projects', 'test-project', '--yes'], { from: 'user' });

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('Project removed'));
  });

  it('shows error when project not found', async () => {
    const program = new Command();

    register(program, {
      storage: {
        getProject: vi.fn(() => undefined),
      },
      fileOps: mockFileOps,
    } as never);

    await expect(
      program.parseAsync(['remove', 'projects', 'nonexistent'], { from: 'user' })
    ).rejects.toThrow('process.exit mocked');

    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Project not found'));
  });

  it('removes agent via register function', async () => {
    const program = new Command();

    register(program, {
      storage: {
        listAllDefinedAgents: vi.fn(() => [
          {
            id: 'custom-agent',
            name: 'Custom Agent',
            basePath: '/tmp/custom',
            skillsDirName: 'custom',
          },
        ]),
        getAgent: vi.fn(() => ({
          id: 'custom-agent',
          name: 'Custom Agent',
          basePath: '/tmp/custom',
          skillsDirName: 'custom',
        })),
        listSkills: vi.fn(() => []),
        removeAgent: vi.fn(() => true),
      },
      fileOps: mockFileOps,
    } as never);

    await program.parseAsync(['remove', 'agents', 'custom-agent', '--yes'], { from: 'user' });

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('custom-agent'));
  });

  it('shows error when agent not found', async () => {
    const program = new Command();

    register(program, {
      storage: {
        getAgent: vi.fn(() => undefined),
        listAgents: vi.fn(() => []),
        listAllDefinedAgents: vi.fn(() => []),
      },
      fileOps: mockFileOps,
    } as never);

    await expect(
      program.parseAsync(['remove', 'agents', 'nonexistent'], { from: 'user' })
    ).rejects.toThrow('process.exit mocked');

    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('configuration not found'));
  });

  it('shows error for invalid target', async () => {
    const program = new Command();

    register(program, {
      storage: {},
      fileOps: mockFileOps,
    } as never);

    await program.parseAsync(['remove', 'invalid', 'something'], { from: 'user' });

    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Invalid target'));
  });
});
