/**
 * sync command tests
 */

import { checkbox as checkboxMock, select as selectMock } from '@inquirer/prompts';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { register } from '../../src/commands/sync.js';
import { createMockFileOps } from '../helpers/mock-context.js';

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  select: vi.fn(),
  input: vi.fn(),
  confirm: vi.fn(),
}));

describe('sync command', () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;
  let processExit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    processExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('Command exited with code 1');
    });
  });

  afterEach(() => {
    consoleLog.mockRestore();
    consoleError.mockRestore();
    processExit.mockRestore();
  });

  describe('sync to agents', () => {
    it('syncs skill to specified agents', async () => {
      const sync = vi
        .fn()
        .mockResolvedValue([
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

      await program.parseAsync(['sync', 'agents', 'test-skill', 'claude'], { from: 'user' });

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

      await expect(
        program.parseAsync(['sync', 'agents', 'unknown-skill'], { from: 'user' })
      ).rejects.toThrow('Command exited with code 1');

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

      await expect(program.parseAsync(['sync', 'invalid'], { from: 'user' })).rejects.toThrow(
        'Command exited with code 1'
      );

      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Invalid target'));
    });
  });

  describe('sync to projects', () => {
    it('syncs skill to specified projects', async () => {
      const syncToProject = vi.fn().mockResolvedValue([
        {
          success: true,
          target: 'proj-a:claude',
          path: '/tmp/proj/.claude/skills/test-skill',
          mode: 'copy',
        },
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

      await program.parseAsync(['sync', 'projects', 'test-skill', 'proj-a'], { from: 'user' });

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

      await expect(
        program.parseAsync(
          ['sync', 'projects', 'test-skill', 'proj-a', '--agent-types', 'invalid-agent'],
          { from: 'user' }
        )
      ).rejects.toThrow('Command exited with code 1');
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

      await expect(
        program.parseAsync(['sync', 'projects', 'unknown-skill'], { from: 'user' })
      ).rejects.toThrow('Command exited with code 1');

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

      await expect(
        program.parseAsync(['sync', 'projects', 'test-skill', 'proj-a'], { from: 'user' })
      ).rejects.toThrow('Command exited with code 1');

      expect(syncToProject).toHaveBeenCalled();
    });

    it('shows error when skill name missing in non-interactive mode', async () => {
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });

      try {
        const program = new Command();
        register(program, {
          skills: { list: vi.fn(() => []), exists: vi.fn() },
          storage: { listProjects: vi.fn(() => []), listAgents: vi.fn(() => []) },
          projectSync: { syncToProject: vi.fn() },
          fileOps: createMockFileOps(),
        } as never);

        await expect(program.parseAsync(['sync', 'projects'], { from: 'user' })).rejects.toThrow(
          'Command exited with code 1'
        );

        expect(consoleError).toHaveBeenCalledWith(
          expect.stringContaining('Please specify skill name')
        );
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
      }
    });

    it('shows no skills selected message (projects)', async () => {
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

      try {
        (checkboxMock as ReturnType<typeof vi.fn>).mockResolvedValue([]);

        const program = new Command();
        register(program, {
          skills: { list: vi.fn(() => [{ name: 'test-skill' }]), exists: vi.fn(() => true) },
          storage: {
            listProjects: vi.fn(() => [
              { id: 'proj-a', path: '/tmp/proj', addedAt: '2026-03-30T00:00:00.000Z' },
            ]),
            listAgents: vi.fn(() => []),
          },
          projectSync: { syncToProject: vi.fn() },
          fileOps: createMockFileOps(),
        } as never);

        await program.parseAsync(['sync', 'projects'], { from: 'user' });

        expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No skills selected'));
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
        (checkboxMock as ReturnType<typeof vi.fn>).mockReset();
      }
    });

    it('uses valid mode from --mode option', async () => {
      const syncToProject = vi.fn().mockResolvedValue([
        {
          success: true,
          target: 'proj-a:claude',
          path: '/tmp/proj/.claude/skills/test-skill',
          mode: 'symlink',
        },
      ]);

      const program = new Command();
      register(program, {
        skills: { exists: vi.fn(() => true) },
        storage: {
          listProjects: vi.fn(() => [
            { id: 'proj-a', path: '/tmp/proj', addedAt: '2026-03-30T00:00:00.000Z' },
          ]),
          listAgents: vi.fn(() => []),
        },
        projectSync: { syncToProject },
        fileOps: createMockFileOps(),
      } as never);

      await program.parseAsync(['sync', 'projects', 'test-skill', 'proj-a', '--mode', 'symlink'], {
        from: 'user',
      });

      expect(syncToProject).toHaveBeenCalledWith('test-skill', 'proj-a', undefined, 'symlink');
    });

    it('exits with error for invalid sync mode', async () => {
      const program = new Command();
      register(program, {
        skills: { exists: vi.fn(() => true) },
        storage: {
          listProjects: vi.fn(() => [
            { id: 'proj-a', path: '/tmp/proj', addedAt: '2026-03-30T00:00:00.000Z' },
          ]),
          listAgents: vi.fn(() => []),
        },
        projectSync: { syncToProject: vi.fn() },
        fileOps: createMockFileOps(),
      } as never);

      await expect(
        program.parseAsync(['sync', 'projects', 'test-skill', 'proj-a', '--mode', 'invalid'], {
          from: 'user',
        })
      ).rejects.toThrow('Command exited with code 1');

      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Invalid sync mode'));
    });

    it('shows no agents available for project sync', async () => {
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

      try {
        (selectMock as ReturnType<typeof vi.fn>).mockResolvedValue('copy');
        (checkboxMock as ReturnType<typeof vi.fn>).mockResolvedValue([]);

        const program = new Command();
        register(program, {
          skills: { list: vi.fn(() => [{ name: 'x' }]), exists: vi.fn(() => true) },
          storage: {
            listProjects: vi.fn(() => [
              { id: 'proj-a', path: '/tmp/proj', addedAt: '2026-03-30T00:00:00.000Z' },
            ]),
            listAgents: vi.fn(() => []),
          },
          projectSync: { syncToProject: vi.fn() },
          fileOps: createMockFileOps({ pathExists: vi.fn(() => false) }),
        } as never);

        await program.parseAsync(['sync', 'projects', 'x', 'proj-a'], { from: 'user' });

        expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No Agents available'));
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
        (checkboxMock as ReturnType<typeof vi.fn>).mockReset();
        (selectMock as ReturnType<typeof vi.fn>).mockReset();
      }
    });

    it('validates invalid mode for agents sync', async () => {
      const program = new Command();
      register(program, {
        skills: { exists: vi.fn(() => true) },
        storage: { listAgents: vi.fn(() => []) },
        sync: { sync: vi.fn() },
        fileOps: createMockFileOps(),
      } as never);

      await expect(
        program.parseAsync(['sync', 'agents', 'test-skill', 'claude', '--mode', 'bad'], {
          from: 'user',
        })
      ).rejects.toThrow('Command exited with code 1');

      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Invalid sync mode'));
    });

    it('shows no skills available for agents interactive', async () => {
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

      try {
        (checkboxMock as ReturnType<typeof vi.fn>).mockResolvedValue([]);

        const program = new Command();
        register(program, {
          skills: { list: vi.fn(() => []), exists: vi.fn() },
          storage: { listAgents: vi.fn(() => []) },
          sync: { sync: vi.fn() },
          fileOps: createMockFileOps(),
        } as never);

        await program.parseAsync(['sync', 'agents'], { from: 'user' });

        expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No skills available'));
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
        (checkboxMock as ReturnType<typeof vi.fn>).mockReset();
      }
    });

    it('shows no agents selected for sync', async () => {
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

      try {
        (checkboxMock as ReturnType<typeof vi.fn>)
          .mockResolvedValueOnce(['test-skill'])
          .mockResolvedValueOnce([]);

        const program = new Command();
        register(program, {
          skills: { list: vi.fn(() => [{ name: 'test-skill' }]), exists: vi.fn(() => true) },
          storage: {
            listAgents: vi.fn(() => [
              { id: 'claude', name: 'Claude', basePath: '/tmp/c', skillsDirName: 'c' },
            ]),
          },
          sync: { sync: vi.fn() },
          fileOps: createMockFileOps(),
        } as never);

        await program.parseAsync(['sync', 'agents'], { from: 'user' });

        expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No Agents selected'));
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
        (checkboxMock as ReturnType<typeof vi.fn>).mockReset();
      }
    });

    it('sync agents without interactive mode selection (name provided)', async () => {
      const syncFn = vi
        .fn()
        .mockResolvedValue([
          { success: true, target: 'claude', path: '/tmp/claude/test', mode: 'copy' },
        ]);

      const program = new Command();
      register(program, {
        skills: { exists: vi.fn(() => true) },
        storage: {
          listAgents: vi.fn(() => [
            { id: 'claude', name: 'Claude', basePath: '/tmp/claude', skillsDirName: 'c' },
          ]),
        },
        sync: { sync: syncFn },
        fileOps: createMockFileOps(),
      } as never);

      await program.parseAsync(['sync', 'agents', 'my-skill', 'claude'], { from: 'user' });

      expect(syncFn).toHaveBeenCalled();
    });

    it('sync agents shows failed sync result', async () => {
      const syncFn = vi.fn().mockResolvedValue([
        {
          success: false,
          target: 'claude',
          path: '/tmp/claude/test',
          mode: 'copy',
          error: 'fail',
        },
      ]);

      const program = new Command();
      register(program, {
        skills: { exists: vi.fn(() => true) },
        storage: {
          listAgents: vi.fn(() => [
            { id: 'claude', name: 'Claude', basePath: '/tmp/claude', skillsDirName: 'c' },
          ]),
        },
        sync: { sync: syncFn },
        fileOps: createMockFileOps(),
      } as never);

      await program.parseAsync(['sync', 'agents', 'my-skill', 'claude'], { from: 'user' });

      const loggedText = consoleLog.mock.calls.flat().join('\n');
      expect(loggedText).toContain('Failed');
    });

    it('sync agents catches sync exception', async () => {
      const program = new Command();
      register(program, {
        skills: { exists: vi.fn(() => true) },
        storage: {
          listAgents: vi.fn(() => [
            { id: 'claude', name: 'Claude', basePath: '/tmp/claude', skillsDirName: 'c' },
          ]),
        },
        sync: { sync: vi.fn().mockRejectedValue(new Error('boom')) },
        fileOps: createMockFileOps(),
      } as never);

      await expect(
        program.parseAsync(['sync', 'agents', 'my-skill', 'claude'], { from: 'user' })
      ).rejects.toThrow('Command exited with code 1');

      expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('boom'));
    });
  });
});
