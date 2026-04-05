/**
 * unsync command tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { register } from '../../src/commands/unsync.js';

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  select: vi.fn(),
  input: vi.fn(),
  confirm: vi.fn(),
}));

import { select as selectMock } from '@inquirer/prompts';

// Create a mock fileOps with all required methods
function createMockFileOps(overrides: Record<string, unknown> = {}) {
  return {
    pathExists: vi.fn(() => false),
    fileExists: vi.fn(() => false),
    readFile: vi.fn(() => null),
    readFileSync: vi.fn(() => null),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    ensureDir: vi.fn().mockResolvedValue(undefined),
    listSubdirectories: vi.fn(() => []),
    scanSkillsInDirectory: vi.fn(() => []),
    getDirectoryHash: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe('unsync command', () => {
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

  describe('unsync from agents', () => {
    it('unsyncs skill from specified agents', async () => {
      const unsync = vi.fn().mockResolvedValue(undefined);

      const program = new Command();

      register(program, {
        skills: {
          get: vi.fn(() => ({
            name: 'test-skill',
            path: '/tmp/skills/test-skill',
            syncedTo: [{ agentId: 'claude', mode: 'copy' }],
            syncedProjects: [],
          })),
          list: vi.fn(() => [
            {
              name: 'test-skill',
              syncedTo: [{ agentId: 'claude', mode: 'copy' }],
              syncedProjects: [],
            },
          ]),
        },
        storage: {
          getAgent: vi.fn((id: string) => ({ id, name: id === 'claude' ? 'Claude Code' : id })),
        },
        sync: {
          unsync,
        },
        fileOps: createMockFileOps(),
      } as never);

      await program.parseAsync(
        ['unsync', 'agents', 'test-skill', 'claude'],
        { from: 'user' }
      );

      expect(unsync).toHaveBeenCalledWith('test-skill', ['claude']);
      expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('Sync removed'));
    });

    it('shows error when skill not found', async () => {
      const program = new Command();
      const getMock = vi.fn(() => undefined);

      register(program, {
        skills: {
          get: getMock,
        },
        storage: {
          getAgent: vi.fn(() => undefined),
        },
        sync: {
          unsync: vi.fn(),
        },
        fileOps: createMockFileOps(),
      } as never);

      await expect(program.parseAsync(
        ['unsync', 'agents', 'unknown-skill'],
        { from: 'user' }
      )).rejects.toThrow('process.exit mocked');

      expect(getMock).toHaveBeenCalledWith('unknown-skill');
      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Skill not found'));
    });

    it('shows message when skill not synced to any agent', async () => {
      const program = new Command();

      register(program, {
        skills: {
          get: vi.fn(() => ({
            name: 'test-skill',
            path: '/tmp/skills/test-skill',
            syncedTo: [],
            syncedProjects: [],
          })),
        },
        storage: {
          getAgent: vi.fn(() => undefined),
        },
        sync: {
          unsync: vi.fn(),
        },
        fileOps: createMockFileOps(),
      } as never);

      await program.parseAsync(
        ['unsync', 'agents', 'test-skill'],
        { from: 'user' }
      );

      expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('not synced to any Agent'));
    });

    it('shows no skills synced message when no synced skills exist', async () => {
      (selectMock as ReturnType<typeof vi.fn>).mockResolvedValue('');

      const program = new Command();
      const originalIsTTY = process.stdin.isTTY;

      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

      try {
        register(program, {
          skills: {
            list: vi.fn(() => []),
          },
          storage: {
            getAgent: vi.fn(() => undefined),
          },
          sync: {
            unsync: vi.fn(),
          },
          fileOps: createMockFileOps(),
        } as never);

        await program.parseAsync(['unsync', 'agents'], { from: 'user' });

        expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No skills synced to Agents'));
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
        (selectMock as ReturnType<typeof vi.fn>).mockReset();
      }
    });
  });

  describe('unsync from projects', () => {
    it('unsyncs skill from specified projects using projectId:agentType format', async () => {
      const unsync = vi.fn().mockResolvedValue(undefined);

      const program = new Command();

      register(program, {
        skills: {
          get: vi.fn(() => ({
            name: 'test-skill',
            path: '/tmp/skills/test-skill',
            syncedTo: [],
            syncedProjects: [{ projectId: 'proj-a', agentType: 'claude', mode: 'copy' }],
          })),
          list: vi.fn(() => [
            {
              name: 'test-skill',
              syncedTo: [],
              syncedProjects: [{ projectId: 'proj-a', agentType: 'claude', mode: 'copy' }],
            },
          ]),
        },
        storage: {
          getProject: vi.fn(() => ({
            id: 'proj-a',
            path: '/tmp/proj-a',
            addedAt: '2026-03-30T00:00:00.000Z',
          })),
        },
        scan: {
          getSkillProjectDistributionWithStatus: vi.fn().mockResolvedValue([]),
        },
        projectSync: {
          unsync,
        },
        fileOps: createMockFileOps(),
      } as never);

      await program.parseAsync(
        ['unsync', 'projects', 'test-skill', 'proj-a:claude'],
        { from: 'user' }
      );

      expect(unsync).toHaveBeenCalledWith('test-skill', ['proj-a:claude']);
    });

    it('unsyncs skill from project using agent types option', async () => {
      const unsyncFromProject = vi.fn().mockResolvedValue(undefined);

      const program = new Command();

      register(program, {
        skills: {
          get: vi.fn(() => ({
            name: 'test-skill',
            path: '/tmp/skills/test-skill',
            syncedTo: [],
            syncedProjects: [],
          })),
          list: vi.fn(() => [
            {
              name: 'test-skill',
              syncedTo: [],
              syncedProjects: [],
            },
          ]),
        },
        storage: {
          getProject: vi.fn(() => ({
            id: 'proj-a',
            path: '/tmp/proj-a',
            addedAt: '2026-03-30T00:00:00.000Z',
          })),
        },
        scan: {
          getSkillProjectDistributionWithStatus: vi.fn().mockResolvedValue([
            { projectId: 'proj-a', agents: [{ id: 'claude', name: 'Claude Code' }] },
          ]),
        },
        projectSync: {
          unsyncFromProject,
          unsync: vi.fn(),
        },
        fileOps: createMockFileOps(),
      } as never);

      await program.parseAsync(
        ['unsync', 'projects', 'test-skill', 'proj-a', '--agent-types', 'claude'],
        { from: 'user' }
      );

      expect(unsyncFromProject).toHaveBeenCalledWith('test-skill', 'proj-a', ['claude']);
    });

    it('shows error when skill not found for project unsync', async () => {
      const program = new Command();
      const getMock = vi.fn(() => undefined);

      register(program, {
        skills: {
          get: getMock,
          list: vi.fn(() => []),
        },
        storage: {
          getProject: vi.fn(() => undefined),
        },
        scan: {
          getSkillProjectDistributionWithStatus: vi.fn().mockResolvedValue([]),
        },
        projectSync: {
          unsync: vi.fn(),
        },
        fileOps: createMockFileOps(),
      } as never);

      await expect(program.parseAsync(
        ['unsync', 'projects', 'unknown-skill'],
        { from: 'user' }
      )).rejects.toThrow('process.exit mocked');

      expect(getMock).toHaveBeenCalledWith('unknown-skill');
      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Skill not found'));
    });

    it('shows available projects when no projects specified in non-interactive mode', async () => {
      const program = new Command();

      register(program, {
        skills: {
          get: vi.fn(() => ({
            name: 'test-skill',
            path: '/tmp/skills/test-skill',
            syncedTo: [],
            syncedProjects: [{ projectId: 'proj-a', agentType: 'claude', mode: 'copy' }],
          })),
          list: vi.fn(() => [
            {
              name: 'test-skill',
              syncedTo: [],
              syncedProjects: [{ projectId: 'proj-a', agentType: 'claude', mode: 'copy' }],
            },
          ]),
        },
        storage: {
          getProject: vi.fn(() => ({
            id: 'proj-a',
            path: '/tmp/proj-a',
            addedAt: '2026-03-30T00:00:00.000Z',
          })),
        },
        scan: {
          getSkillProjectDistributionWithStatus: vi.fn().mockResolvedValue([]),
        },
        projectSync: {
          unsync: vi.fn(),
        },
        fileOps: createMockFileOps(),
      } as never);

      await program.parseAsync(
        ['unsync', 'projects', 'test-skill'],
        { from: 'user' }
      );

      expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('This skill is synced to the following projects'));
    });

    it('shows no skills available message when no skills exist', async () => {
      (selectMock as ReturnType<typeof vi.fn>).mockResolvedValue('');

      const program = new Command();
      const originalIsTTY = process.stdin.isTTY;

      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

      try {
        register(program, {
          skills: {
            list: vi.fn(() => []),
          },
          storage: {
            getProject: vi.fn(() => undefined),
          },
          scan: {
            getSkillProjectDistributionWithStatus: vi.fn().mockResolvedValue([]),
          },
          projectSync: {
            unsync: vi.fn(),
          },
          fileOps: createMockFileOps(),
        } as never);

        await program.parseAsync(['unsync', 'projects'], { from: 'user' });

        expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No skills available'));
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
        (selectMock as ReturnType<typeof vi.fn>).mockReset();
      }
    });
  });

  describe('invalid target', () => {
    it('shows error for invalid target', async () => {
      const program = new Command();

      register(program, { fileOps: createMockFileOps() } as never);

      await expect(program.parseAsync(['unsync', 'invalid'], { from: 'user' }))
        .rejects.toThrow('process.exit mocked');

      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Invalid target'));
    });
  });
});
