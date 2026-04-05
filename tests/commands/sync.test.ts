/**
 * sync command tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { register } from '../../src/commands/sync.js';

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  select: vi.fn(),
  input: vi.fn(),
  confirm: vi.fn(),
}));

import { checkbox as checkboxMock } from '@inquirer/prompts';

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

describe('sync command', () => {
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

  describe('sync to agents', () => {
    it('syncs skill to specified agents', async () => {
      const sync = vi.fn().mockResolvedValue([
        { success: true, target: 'claude', path: '/tmp/claude/test-skill', mode: 'copy' },
      ]);

      const program = new Command();

      register(program, {
        skills: {
          exists: vi.fn(() => true),
        },
        storage: {
          listAgents: vi.fn(() => [
            { id: 'claude', name: 'Claude Code', basePath: '/tmp/claude', skillsDirName: 'claude' },
          ]),
        },
        sync: {
          sync,
        },
        fileOps: createMockFileOps(),
      } as never);

      await program.parseAsync(
        ['sync', 'agents', 'test-skill', 'claude'],
        { from: 'user' }
      );

      expect(sync).toHaveBeenCalledWith('test-skill', expect.any(Array), 'copy');
    });

    it('exits with error when skill not found', async () => {
      const program = new Command();

      register(program, {
        skills: {
          exists: vi.fn(() => false),
          list: vi.fn(() => [{ name: 'test-skill' }]),
        },
        storage: {
          listAgents: vi.fn(() => []),
        },
        sync: {
          sync: vi.fn(),
        },
        fileOps: createMockFileOps(),
      } as never);

      await expect(program.parseAsync(
        ['sync', 'agents', 'unknown-skill'],
        { from: 'user' }
      )).rejects.toThrow('process.exit mocked');

      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Skill not found'));
    });

    it('shows no skills available message when no skills exist', async () => {
      (checkboxMock as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const program = new Command();
      const originalIsTTY = process.stdin.isTTY;

      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

      try {
        register(program, {
          skills: {
            list: vi.fn(() => []),
          },
          storage: {
            listAgents: vi.fn(() => []),
          },
          sync: {
            sync: vi.fn(),
          },
          fileOps: createMockFileOps(),
        } as never);

        await program.parseAsync(['sync', 'agents'], { from: 'user' });

        expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No skills available'));
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
        (checkboxMock as ReturnType<typeof vi.fn>).mockReset();
      }
    });

    it('exits with error for invalid target', async () => {
      const program = new Command();

      register(program, {
        storage: {
          listAgents: vi.fn(() => []),
        },
        fileOps: createMockFileOps(),
      } as never);

      await expect(program.parseAsync(['sync', 'invalid'], { from: 'user' }))
        .rejects.toThrow('process.exit mocked');

      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Invalid target'));
    });
  });

  describe('sync to projects', () => {
    it('syncs skill to specified projects', async () => {
      const syncToProject = vi.fn().mockResolvedValue([
        { success: true, target: 'proj-a:claude', path: '/tmp/proj/.claude/skills/test-skill', mode: 'copy' },
      ]);

      const program = new Command();

      register(program, {
        skills: {
          exists: vi.fn(() => true),
        },
        storage: {
          listProjects: vi.fn(() => [
            { id: 'proj-a', path: '/tmp/proj', addedAt: '2026-03-30T00:00:00.000Z' },
          ]),
          listAgents: vi.fn(() => []),
        },
        projectSync: {
          syncToProject: syncToProject,
        },
        fileOps: createMockFileOps(),
      } as never);

      await program.parseAsync(
        ['sync', 'projects', 'test-skill', 'proj-a'],
        { from: 'user' }
      );

      expect(syncToProject).toHaveBeenCalledWith('test-skill', 'proj-a', undefined, 'copy');
    });

    it('validates agent types before syncing', async () => {
      const program = new Command();

      register(program, {
        skills: {
          exists: vi.fn(() => true),
          list: vi.fn(() => [{ name: 'test-skill' }]),
        },
        storage: {
          listProjects: vi.fn(() => [
            { id: 'proj-a', path: '/tmp/proj', addedAt: '2026-03-30T00:00:00.000Z' },
          ]),
          listAgents: vi.fn(() => [
            { id: 'claude', name: 'Claude Code', basePath: '/tmp/claude', skillsDirName: 'claude' },
          ]),
        },
        projectSync: {
          syncToProject: vi.fn(),
        },
        fileOps: createMockFileOps({ pathExists: vi.fn(() => true) }),
      } as never);

      await expect(program.parseAsync(
        ['sync', 'projects', 'test-skill', 'proj-a', '--agent-types', 'invalid-agent'],
        { from: 'user' }
      )).rejects.toThrow('process.exit mocked');
    });

    it('exits with error when skill not found for project sync', async () => {
      const program = new Command();

      register(program, {
        skills: {
          exists: vi.fn(() => false),
        },
        storage: {
          listProjects: vi.fn(() => []),
          listAgents: vi.fn(() => []),
        },
        projectSync: {
          syncToProject: vi.fn(),
        },
        fileOps: createMockFileOps(),
      } as never);

      await expect(program.parseAsync(
        ['sync', 'projects', 'unknown-skill'],
        { from: 'user' }
      )).rejects.toThrow('process.exit mocked');

      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Skill not found'));
    });

    it('handles sync failures gracefully', async () => {
      const syncToProject = vi.fn().mockRejectedValue(new Error('Sync failed'));

      const program = new Command();

      register(program, {
        skills: {
          exists: vi.fn(() => true),
        },
        storage: {
          listProjects: vi.fn(() => [
            { id: 'proj-a', path: '/tmp/proj', addedAt: '2026-03-30T00:00:00.000Z' },
          ]),
          listAgents: vi.fn(() => []),
        },
        projectSync: {
          syncToProject: syncToProject,
        },
        fileOps: createMockFileOps(),
      } as never);

      await expect(program.parseAsync(
        ['sync', 'projects', 'test-skill', 'proj-a'],
        { from: 'user' }
      )).rejects.toThrow('process.exit mocked');

      expect(syncToProject).toHaveBeenCalled();
    });
  });
});
