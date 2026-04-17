/**
 * add command tests
 */

import {
  checkbox as checkboxMock,
  confirm as confirmMock,
  input as inputMock,
} from '@inquirer/prompts';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { register } from '../../src/commands/add.js';

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  input: vi.fn(),
  confirm: vi.fn(),
}));

describe('add command', () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;
  let processExit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    processExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit mocked');
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLog.mockRestore();
    consoleError.mockRestore();
    processExit.mockRestore();
  });

  describe('add skills', () => {
    it('records linked Agents after installing a skill from git', async () => {
      const resolveAndRecordSyncLinks = vi.fn().mockResolvedValue(['codex']);
      const program = new Command();

      register(program, {
        skills: {
          install: vi.fn().mockResolvedValue('demo-skill'),
        },
        syncCheck: {
          resolveAndRecordSyncLinks,
        },
        storage: {
          getAgent: vi.fn().mockReturnValue({ name: 'Codex' }),
        },
      } as never);

      await program.parseAsync(['add', 'skills', 'https://example.com/repo.git', 'demo-skill'], {
        from: 'user',
      });

      expect(resolveAndRecordSyncLinks).toHaveBeenCalledWith('demo-skill');
    });

    it('reuses the scanned repository when installing a discovered root-level skill', async () => {
      const resolveAndRecordSyncLinks = vi.fn().mockResolvedValue([]);
      const cloneRepoToTemp = vi.fn().mockResolvedValue('C:/temp/repo');
      const discoverSkillsInDirectory = vi
        .fn()
        .mockReturnValue([{ name: 'deep-recon', subPath: '' }]);
      const installFromDirectory = vi.fn().mockResolvedValue('deep-recon');
      const removeTempRepo = vi.fn().mockResolvedValue(undefined);
      const program = new Command();

      register(program, {
        skills: {
          cloneRepoToTemp,
          discoverSkillsInDirectory,
          installFromDirectory,
          removeTempRepo,
        },
        syncCheck: {
          resolveAndRecordSyncLinks,
        },
        storage: {
          getAgent: vi.fn(),
        },
      } as never);

      await program.parseAsync(['add', 'skills', 'https://github.com/kvarnelis/deep-recon'], {
        from: 'user',
      });

      expect(cloneRepoToTemp).toHaveBeenCalledWith('https://github.com/kvarnelis/deep-recon');
      expect(detectSkillsCalls(discoverSkillsInDirectory)).toEqual([
        ['C:/temp/repo', 'https://github.com/kvarnelis/deep-recon'],
      ]);
      expect(installFromDirectory).toHaveBeenCalledWith(
        'https://github.com/kvarnelis/deep-recon',
        'deep-recon',
        'C:/temp/repo',
        ''
      );
      expect(removeTempRepo).toHaveBeenCalledWith('C:/temp/repo');
      expect(resolveAndRecordSyncLinks).toHaveBeenCalledWith('deep-recon');
    });

    it('passes tree URL subdirectories as subPath instead of skill name', async () => {
      const resolveAndRecordSyncLinks = vi.fn().mockResolvedValue([]);
      const install = vi.fn().mockResolvedValue('glmv-stock-analyst');
      const program = new Command();

      register(program, {
        skills: {
          install,
        },
        syncCheck: {
          resolveAndRecordSyncLinks,
        },
        storage: {
          getAgent: vi.fn(),
        },
      } as never);

      await program.parseAsync(
        [
          'add',
          'skills',
          'https://github.com/zai-org/GLM-skills/tree/main/skills/glmv-stock-analyst',
        ],
        { from: 'user' }
      );

      expect(install).toHaveBeenCalledWith(
        'https://github.com/zai-org/GLM-skills',
        undefined,
        'skills/glmv-stock-analyst'
      );
      expect(resolveAndRecordSyncLinks).toHaveBeenCalledWith('glmv-stock-analyst');
    });

    it('shows error when no skills found in repo', async () => {
      const cloneRepoToTemp = vi.fn().mockResolvedValue('/tmp/repo');
      const discoverSkillsInDirectory = vi.fn().mockReturnValue([]);
      const removeTempRepo = vi.fn().mockResolvedValue(undefined);
      const program = new Command();

      register(program, {
        skills: {
          cloneRepoToTemp,
          discoverSkillsInDirectory,
          removeTempRepo,
        },
      } as never);

      await expect(
        program.parseAsync(['add', 'skills', 'https://example.com/empty.git'], { from: 'user' })
      ).rejects.toThrow('process.exit mocked');

      // process.exit throws before console output is reached
      expect(processExit).toHaveBeenCalled();
    });

    it('installs multiple skills when user selects them', async () => {
      const resolveAndRecordSyncLinks = vi.fn().mockResolvedValue([]);
      const cloneRepoToTemp = vi.fn().mockResolvedValue('/tmp/multi-repo');
      const discoverSkillsInDirectory = vi.fn().mockReturnValue([
        { name: 'skill-a', subPath: '' },
        { name: 'skill-b', subPath: '' },
      ]);
      const installFromDirectory = vi
        .fn()
        .mockImplementation((_u: string, n: string) => Promise.resolve(n));
      const removeTempRepo = vi.fn().mockResolvedValue(undefined);
      const program = new Command();
      const originalIsTTY = process.stdin.isTTY;

      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
      (checkboxMock as ReturnType<typeof vi.fn>).mockResolvedValue([
        { name: 'skill-a', subPath: '' },
      ]);

      try {
        register(program, {
          skills: {
            cloneRepoToTemp,
            discoverSkillsInDirectory,
            installFromDirectory,
            removeTempRepo,
          },
          syncCheck: { resolveAndRecordSyncLinks },
          storage: { getAgent: vi.fn() },
        } as never);

        await program.parseAsync(['add', 'skills', 'https://example.com/repo.git'], {
          from: 'user',
        });

        expect(installFromDirectory).toHaveBeenCalled();
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
        (checkboxMock as ReturnType<typeof vi.fn>).mockReset();
      }
    });
  });

  describe('add agents', () => {
    it('adds custom agent with interactive prompts', async () => {
      const program = new Command();
      const addAgent = vi.fn();

      (inputMock as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce('my-agent')
        .mockResolvedValueOnce('My Agent')
        .mockResolvedValueOnce('/tmp/my-agent/skills')
        .mockResolvedValueOnce('custom');
      (confirmMock as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const mockFileOps = {
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
      };

      register(program, {
        storage: {
          getAgent: vi.fn(),
          addAgent,
        },
        fileOps: mockFileOps,
      } as never);

      await program.parseAsync(['add', 'agents'], { from: 'user' });

      expect(addAgent).toHaveBeenCalledWith(
        'my-agent',
        'My Agent',
        '/tmp/my-agent/skills',
        'custom'
      );
    });

    it('creates directory for agent when path does not exist', async () => {
      const program = new Command();
      const addAgent = vi.fn();

      (inputMock as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce('new-agent')
        .mockResolvedValueOnce('New Agent')
        .mockResolvedValueOnce('/tmp/new-agent/skills')
        .mockResolvedValueOnce(undefined);
      (confirmMock as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const mockFileOps = {
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
      };

      register(program, {
        storage: {
          getAgent: vi.fn(),
          addAgent,
        },
        fileOps: mockFileOps,
      } as never);

      await program.parseAsync(['add', 'agents'], { from: 'user' });

      expect(mockFileOps.ensureDir).toHaveBeenCalledWith('/tmp/new-agent/skills');
    });
  });

  describe('add projects', () => {
    it('adds project with interactive prompts', async () => {
      const program = new Command();
      const addProject = vi.fn();

      (inputMock as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce('my-project')
        .mockResolvedValueOnce('/tmp/my-project');

      const mockFileOps = {
        pathExists: vi.fn(() => true),
        fileExists: vi.fn(() => false),
        readFile: vi.fn(() => null),
        readFileSync: vi.fn(() => null),
        writeFileSync: vi.fn(),
        mkdirSync: vi.fn(),
        ensureDir: vi.fn().mockResolvedValue(undefined),
        listSubdirectories: vi.fn(() => []),
        scanSkillsInDirectory: vi.fn(() => []),
        getDirectoryHash: vi.fn().mockResolvedValue(null),
      };

      register(program, {
        storage: {
          getProject: vi.fn(),
          addProject,
        },
        fileOps: mockFileOps,
      } as never);

      await program.parseAsync(['add', 'projects'], { from: 'user' });

      expect(addProject).toHaveBeenCalledWith('my-project', '/tmp/my-project');
    });
  });
});

function detectSkillsCalls(mockFn: ReturnType<typeof vi.fn>): unknown[][] {
  return mockFn.mock.calls;
}
