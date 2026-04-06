/**
 * import command tests
 */

import os from 'os';
import path from 'path';

import { checkbox as checkboxMock } from '@inquirer/prompts';
import { Command } from 'commander';
import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { register } from '../../src/commands/import.js';
import { createMockFileOps } from '../helpers/mock-context.js';

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  select: vi.fn(),
  input: vi.fn(),
  confirm: vi.fn(),
}));

const TEST_DIR = path.join(os.tmpdir(), 'agentforge-import-command-test');

describe('import command', () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;
  let processExit: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    processExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit mocked');
    });
  });

  afterEach(async () => {
    consoleLog.mockRestore();
    consoleError.mockRestore();
    processExit.mockRestore();
    await fs.remove(TEST_DIR);
  });

  describe('invalid source', () => {
    it('shows error for invalid source', async () => {
      const program = new Command();

      register(program, {
        storage: {},
        skills: { exists: vi.fn() },
        scan: {},
        syncCheck: {},
        fileOps: createMockFileOps(),
      } as never);

      // In non-interactive mode with id provided, the source switch default triggers (no exit)
      await program.parseAsync(['import', 'invalid', 'some-id'], { from: 'user' });

      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Invalid source'));
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Available sources: projects, agents')
      );
    });
  });

  describe('import from projects', () => {
    it('shows no projects message', async () => {
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

      try {
        const program = new Command();

        register(program, {
          storage: {
            listProjects: vi.fn(() => []),
          },
          skills: { exists: vi.fn() },
          scan: {},
          syncCheck: {},
          fileOps: createMockFileOps(),
        } as never);

        await program.parseAsync(['import', 'projects'], { from: 'user' });

        expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No registered projects'));
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
      }
    });

    it('shows no skills found in project', async () => {
      const project = { id: 'test-proj', path: '/tmp/test', addedAt: '2026-01-01' };
      const program = new Command();

      register(program, {
        storage: {
          listProjects: vi.fn(() => [project]),
          getProject: vi.fn(() => project),
        },
        skills: { exists: vi.fn() },
        scan: {
          scanProject: vi.fn(() => []),
        },
        syncCheck: {},
        fileOps: createMockFileOps(),
      } as never);

      await program.parseAsync(['import', 'projects', 'test-proj'], { from: 'user' });

      expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No skills found'));
    });

    it('shows error when skill not found by name', async () => {
      const project = { id: 'test-proj', path: '/tmp/test', addedAt: '2026-01-01' };
      const program = new Command();

      register(program, {
        storage: {
          listProjects: vi.fn(() => [project]),
          getProject: vi.fn(() => project),
        },
        skills: { exists: vi.fn() },
        scan: {
          scanProject: vi.fn(() => [
            {
              name: 'real-skill',
              path: '/tmp/test/.agents/skills/real-skill',
              agentId: 'codex',
              agentName: 'Codex',
              hasSkillMd: true,
              subPath: '.agents/skills',
            },
          ]),
        },
        syncCheck: {},
        fileOps: createMockFileOps(),
      } as never);

      await expect(
        program.parseAsync(['import', 'projects', 'test-proj', 'fake-skill'], { from: 'user' })
      ).rejects.toThrow('process.exit mocked');

      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Skill not found'));
    });

    it('shows error when project not found', async () => {
      const program = new Command();

      register(program, {
        storage: {
          listProjects: vi.fn(() => [
            { id: 'other-proj', path: '/tmp/other', addedAt: '2026-01-01' },
          ]),
          getProject: vi.fn(() => undefined),
        },
        skills: { exists: vi.fn() },
        scan: {},
        syncCheck: {},
        fileOps: createMockFileOps(),
      } as never);

      await expect(
        program.parseAsync(['import', 'projects', 'nonexistent'], { from: 'user' })
      ).rejects.toThrow('process.exit mocked');

      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Project not found'));
    });

    it('shows error in non-interactive mode without skill name', async () => {
      const project = { id: 'test-proj', path: '/tmp/test', addedAt: '2026-01-01' };
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });

      try {
        const program = new Command();

        register(program, {
          storage: {
            listProjects: vi.fn(() => [project]),
          },
          skills: { exists: vi.fn() },
          scan: {},
          syncCheck: {},
          fileOps: createMockFileOps(),
        } as never);

        await expect(program.parseAsync(['import', 'projects'], { from: 'user' })).rejects.toThrow(
          'process.exit mocked'
        );

        expect(consoleError).toHaveBeenCalledWith(
          expect.stringContaining('ID must be specified in non-interactive mode')
        );
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
      }
    });

    it('shows already imported skills message in interactive mode', async () => {
      const project = { id: 'test-proj', path: '/tmp/test', addedAt: '2026-01-01' };
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

      try {
        (checkboxMock as ReturnType<typeof vi.fn>).mockResolvedValue([]);

        const program = new Command();

        register(program, {
          storage: {
            listProjects: vi.fn(() => [project]),
            getProject: vi.fn(() => project),
          },
          skills: {
            exists: vi.fn(() => true),
            importFromPath: vi.fn(),
          },
          scan: {
            scanProject: vi.fn(() => [
              {
                name: 'existing-skill',
                path: '/tmp/test/.agents/skills/existing-skill',
                agentId: 'codex',
                agentName: 'Codex',
                hasSkillMd: true,
                subPath: '.agents/skills',
              },
            ]),
          },
          syncCheck: {},
          fileOps: createMockFileOps(),
        } as never);

        await program.parseAsync(['import', 'projects', 'test-proj'], { from: 'user' });

        expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('All skills from project'));
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
        (checkboxMock as ReturnType<typeof vi.fn>).mockReset();
      }
    });

    it('reports import errors gracefully', async () => {
      const project = { id: 'test-proj', path: '/tmp/test', addedAt: '2026-01-01' };
      const program = new Command();

      register(program, {
        storage: {
          listProjects: vi.fn(() => [project]),
          getProject: vi.fn(() => project),
          getSkillsDir: vi.fn(() => '/tmp/skills'),
          getSkillPath: vi.fn((name: string) => `/tmp/skills/${name}`),
          saveSkill: vi.fn(),
        },
        skills: {
          exists: vi.fn(() => false),
          importFromPath: vi.fn().mockRejectedValue(new Error('disk full')),
        },
        scan: {
          scanProject: vi.fn(() => [
            {
              name: 'fail-skill',
              path: '/tmp/test/.agents/skills/fail-skill',
              agentId: 'codex',
              agentName: 'Codex',
              hasSkillMd: true,
              subPath: '.agents/skills',
            },
          ]),
        },
        syncCheck: {
          resolveAndRecordSyncLinks: vi.fn().mockResolvedValue([]),
        },
        fileOps: createMockFileOps(),
      } as never);

      await program.parseAsync(['import', 'projects', 'test-proj', 'fail-skill'], { from: 'user' });

      const loggedText = consoleLog.mock.calls.flat().join('\n');
      expect(loggedText).toContain('[FAIL]');
      expect(loggedText).toContain('disk full');
    });

    it('imports multiple skills', async () => {
      const project = { id: 'test-proj', path: '/tmp/test', addedAt: '2026-01-01' };
      const importFromPath = vi.fn().mockResolvedValue(undefined);
      const resolveAndRecordSyncLinks = vi.fn().mockResolvedValue([]);

      const program = new Command();

      register(program, {
        storage: {
          listProjects: vi.fn(() => [project]),
          getProject: vi.fn(() => project),
          getSkillsDir: vi.fn(() => '/tmp/skills'),
          getSkillPath: vi.fn((name: string) => `/tmp/skills/${name}`),
          saveSkill: vi.fn(),
        },
        skills: {
          exists: vi.fn(() => false),
          importFromPath,
        },
        scan: {
          scanProject: vi.fn(() => [
            {
              name: 'alpha',
              path: '/tmp/test/alpha',
              agentId: 'codex',
              agentName: 'Codex',
              hasSkillMd: true,
              subPath: 'alpha',
            },
            {
              name: 'beta',
              path: '/tmp/test/beta',
              agentId: 'claude',
              agentName: 'Claude Code',
              hasSkillMd: true,
              subPath: 'beta',
            },
          ]),
        },
        syncCheck: {
          resolveAndRecordSyncLinks,
        },
        fileOps: createMockFileOps(),
      } as never);

      // With project id and no skill name in non-interactive mode, it exits
      // So we must specify the skill name to trigger the import
      await program.parseAsync(['import', 'projects', 'test-proj', 'alpha'], { from: 'user' });
      await program.parseAsync(['import', 'projects', 'test-proj', 'beta'], { from: 'user' });

      expect(importFromPath).toHaveBeenCalledTimes(2);
    });

    it('shows no skills selected', async () => {
      const project = { id: 'test-proj', path: '/tmp/test', addedAt: '2026-01-01' };
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

      try {
        (checkboxMock as ReturnType<typeof vi.fn>).mockResolvedValue([]);

        const program = new Command();

        register(program, {
          storage: {
            listProjects: vi.fn(() => [project]),
            getProject: vi.fn(() => project),
          },
          skills: {
            exists: vi.fn(() => false),
            importFromPath: vi.fn(),
          },
          scan: {
            scanProject: vi.fn(() => [
              {
                name: 'good-skill',
                path: '/tmp/test/.agents/skills/good-skill',
                agentId: 'codex',
                agentName: 'Codex',
                hasSkillMd: true,
                subPath: '.agents/skills',
              },
            ]),
          },
          syncCheck: {},
          fileOps: createMockFileOps(),
        } as never);

        await program.parseAsync(['import', 'projects', 'test-proj'], { from: 'user' });

        expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No skills selected'));
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
        (checkboxMock as ReturnType<typeof vi.fn>).mockReset();
      }
    });
  });

  describe('import from agents', () => {
    it('shows no agents message', async () => {
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

      try {
        const program = new Command();

        register(program, {
          storage: {
            listAgents: vi.fn(() => []),
          },
          skills: { exists: vi.fn() },
          fileOps: createMockFileOps(),
          syncCheck: {},
        } as never);

        await program.parseAsync(['import', 'agents'], { from: 'user' });

        expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No Agents available'));
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
      }
    });

    it('shows no skills message for agent', async () => {
      const agent = {
        id: 'claude',
        name: 'Claude Code',
        basePath: '/tmp/claude',
        skillsDirName: 'claude',
      };
      const program = new Command();

      register(program, {
        storage: {
          listAgents: vi.fn(() => [agent]),
          getAgent: vi.fn(() => agent),
        },
        skills: { exists: vi.fn() },
        fileOps: createMockFileOps({
          listSubdirectories: vi.fn(() => []),
        }),
        syncCheck: {},
      } as never);

      await program.parseAsync(['import', 'agents', 'claude'], { from: 'user' });

      expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('has no skills installed'));
    });

    it('shows error when skill not found by name', async () => {
      const agent = {
        id: 'claude',
        name: 'Claude Code',
        basePath: '/tmp/claude',
        skillsDirName: 'claude',
      };
      const program = new Command();

      register(program, {
        storage: {
          listAgents: vi.fn(() => [agent]),
          getAgent: vi.fn(() => agent),
        },
        skills: { exists: vi.fn() },
        fileOps: createMockFileOps({
          listSubdirectories: vi.fn(() => ['existing-skill']),
        }),
        syncCheck: {},
      } as never);

      await expect(
        program.parseAsync(['import', 'agents', 'claude', 'unknown'], { from: 'user' })
      ).rejects.toThrow('process.exit mocked');

      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Skill not found'));
    });

    it('shows error when agent not found', async () => {
      const agent = {
        id: 'claude',
        name: 'Claude Code',
        basePath: '/tmp/claude',
        skillsDirName: 'claude',
      };
      const program = new Command();

      register(program, {
        storage: {
          listAgents: vi.fn(() => [agent]),
          getAgent: vi.fn(() => undefined),
        },
        skills: { exists: vi.fn() },
        fileOps: createMockFileOps({
          listSubdirectories: vi.fn(() => []),
        }),
        syncCheck: {},
      } as never);

      await expect(
        program.parseAsync(['import', 'agents', 'unknown'], { from: 'user' })
      ).rejects.toThrow('process.exit mocked');

      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Agent not found'));
    });

    it('shows no skills selected in interactive mode', async () => {
      const agent = {
        id: 'claude',
        name: 'Claude Code',
        basePath: '/tmp/claude',
        skillsDirName: 'claude',
      };
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

      try {
        (checkboxMock as ReturnType<typeof vi.fn>).mockResolvedValue([]);

        const program = new Command();

        register(program, {
          storage: {
            listAgents: vi.fn(() => [agent]),
            getAgent: vi.fn(() => agent),
          },
          skills: { exists: vi.fn(() => false), importFromPath: vi.fn() },
          fileOps: createMockFileOps({
            listSubdirectories: vi.fn(() => ['skill-a']),
            fileExists: vi.fn(() => true),
          }),
          syncCheck: {},
        } as never);

        await program.parseAsync(['import', 'agents', 'claude'], { from: 'user' });

        expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No skills selected'));
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
        (checkboxMock as ReturnType<typeof vi.fn>).mockReset();
      }
    });

    it('shows all imported skills message in interactive mode', async () => {
      const agent = {
        id: 'claude',
        name: 'Claude Code',
        basePath: '/tmp/claude',
        skillsDirName: 'claude',
      };
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

      try {
        (checkboxMock as ReturnType<typeof vi.fn>).mockResolvedValue([]);

        const program = new Command();

        register(program, {
          storage: {
            listAgents: vi.fn(() => [agent]),
            getAgent: vi.fn(() => agent),
          },
          skills: { exists: vi.fn(() => true), importFromPath: vi.fn() },
          fileOps: createMockFileOps({
            listSubdirectories: vi.fn(() => ['existing-skill']),
            fileExists: vi.fn(() => true),
          }),
          syncCheck: {},
        } as never);

        await program.parseAsync(['import', 'agents', 'claude'], { from: 'user' });

        expect(consoleLog).toHaveBeenCalledWith(
          expect.stringContaining('has no new skills to import')
        );
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
        (checkboxMock as ReturnType<typeof vi.fn>).mockReset();
      }
    });

    it('shows error for missing skill name in non-interactive mode', async () => {
      const agent = {
        id: 'claude',
        name: 'Claude Code',
        basePath: '/tmp/claude',
        skillsDirName: 'claude',
      };
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });

      try {
        const program = new Command();

        register(program, {
          storage: {
            listAgents: vi.fn(() => [agent]),
          },
          skills: { exists: vi.fn() },
          fileOps: createMockFileOps(),
          syncCheck: {},
        } as never);

        await expect(program.parseAsync(['import', 'agents'], { from: 'user' })).rejects.toThrow(
          'process.exit mocked'
        );

        expect(consoleError).toHaveBeenCalledWith(
          expect.stringContaining('ID must be specified in non-interactive mode')
        );
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
      }
    });

    it('shows already exists errors during import', async () => {
      const agent = {
        id: 'claude',
        name: 'Claude Code',
        basePath: '/tmp/claude',
        skillsDirName: 'claude',
      };
      const program = new Command();

      register(program, {
        storage: {
          listAgents: vi.fn(() => [agent]),
          getAgent: vi.fn(() => agent),
          getSkillsDir: vi.fn(() => '/tmp/skills'),
          getSkillPath: vi.fn((name: string) => `/tmp/skills/${name}`),
          saveSkill: vi.fn(),
        },
        skills: {
          exists: vi.fn(() => true),
          importFromPath: vi.fn(),
        },
        fileOps: createMockFileOps({
          listSubdirectories: vi.fn(() => ['my-skill']),
          fileExists: vi.fn(() => true),
        }),
        syncCheck: {
          resolveAndRecordSyncLinks: vi.fn().mockResolvedValue([]),
        },
      } as never);

      await program.parseAsync(['import', 'agents', 'claude', 'my-skill'], { from: 'user' });

      const loggedText = consoleLog.mock.calls.flat().join('\n');
      expect(loggedText).toContain('[FAIL]');
    });

    it('handles import errors gracefully', async () => {
      const agent = {
        id: 'claude',
        name: 'Claude Code',
        basePath: '/tmp/claude',
        skillsDirName: 'claude',
      };
      const program = new Command();

      register(program, {
        storage: {
          listAgents: vi.fn(() => [agent]),
          getAgent: vi.fn(() => agent),
          getSkillsDir: vi.fn(() => '/tmp/skills'),
          getSkillPath: vi.fn((name: string) => `/tmp/skills/${name}`),
          saveSkill: vi.fn(),
        },
        skills: {
          exists: vi.fn(() => false),
          importFromPath: vi.fn().mockRejectedValue(new Error('disk error')),
        },
        fileOps: createMockFileOps({
          listSubdirectories: vi.fn(() => ['fail-skill']),
          fileExists: vi.fn(() => true),
        }),
        syncCheck: {
          resolveAndRecordSyncLinks: vi.fn().mockRejectedValue(new Error('sync error')),
        },
      } as never);

      await program.parseAsync(['import', 'agents', 'claude', 'fail-skill'], { from: 'user' });

      const loggedText = consoleLog.mock.calls.flat().join('\n');
      expect(loggedText).toContain('[FAIL]');
    });
  });

  describe('runs conflict resolution after importing a skill from a project', () => {
    it('successfully imports from project with sync resolution', async () => {
      const projectPath = path.join(TEST_DIR, 'project');
      const sourceSkillPath = path.join(projectPath, '.agents', 'skills', 'demo-skill');
      const destinationSkillPath = path.join(TEST_DIR, '.agentforge', 'skills', 'demo-skill');
      const project = { id: 'demo-project', path: projectPath, addedAt: new Date().toISOString() };

      await fs.ensureDir(sourceSkillPath);
      await fs.writeFile(path.join(sourceSkillPath, 'SKILL.md'), '# Demo Skill');

      const importFromPath = vi.fn().mockResolvedValue(undefined);
      const saveSkill = vi.fn();
      const resolveAndRecordSyncLinks = vi.fn().mockResolvedValue(['codex']);
      const program = new Command();

      register(program, {
        scan: {
          scanProject: vi.fn().mockReturnValue([
            {
              name: 'demo-skill',
              path: sourceSkillPath,
              agentId: 'codex',
              agentName: 'Codex',
              hasSkillMd: true,
              subPath: '.agents/skills',
            },
          ]),
        },
        skills: {
          exists: vi.fn().mockReturnValue(false),
          importFromPath,
        },
        storage: {
          listProjects: vi.fn().mockReturnValue([project]),
          getProject: vi.fn().mockReturnValue(project),
          getSkillPath: vi.fn().mockReturnValue(destinationSkillPath),
          saveSkill,
        },
        syncCheck: {
          resolveAndRecordSyncLinks,
        },
        fileOps: createMockFileOps({
          pathExists: vi.fn(() => true),
        }),
      } as never);

      await program.parseAsync(['import', 'projects', 'demo-project', 'demo-skill'], {
        from: 'user',
      });

      expect(importFromPath).toHaveBeenCalledWith(sourceSkillPath, 'demo-skill', {
        type: 'project',
        projectId: 'demo-project',
      });
      expect(resolveAndRecordSyncLinks).toHaveBeenCalledWith('demo-skill', []);
      expect(importFromPath.mock.invocationCallOrder[0]).toBeLessThan(
        resolveAndRecordSyncLinks.mock.invocationCallOrder[0]
      );
    });
  });

  describe('disables already imported agent skills in interactive selection', () => {
    it('shows existing skills as disabled', async () => {
      const agentPath = path.join(TEST_DIR, 'codex-skills');
      const existingSkillPath = path.join(agentPath, 'existing-skill');
      const newSkillPath = path.join(agentPath, 'new-skill');
      const agent = { id: 'codex', name: 'Codex', basePath: agentPath, skillsDirName: 'agents' };
      const originalIsTTY = process.stdin.isTTY;

      await fs.ensureDir(existingSkillPath);
      await fs.ensureDir(newSkillPath);
      await fs.writeFile(path.join(existingSkillPath, 'SKILL.md'), '# Existing Skill');
      await fs.writeFile(path.join(newSkillPath, 'SKILL.md'), '# New Skill');

      const importFromPath = vi.fn().mockResolvedValue(undefined);
      const getSkill = vi.fn().mockReturnValue({
        name: 'new-skill',
        source: { type: 'local', importedFrom: { agent: 'codex', path: newSkillPath } },
        createdAt: new Date().toISOString(),
        syncedTo: [],
        syncedProjects: [],
      });
      const saveSkill = vi.fn();
      const resolveAndRecordSyncLinks = vi.fn().mockResolvedValue(['codex']);
      const program = new Command();
      let choices: Array<{ name: string; value: string; disabled?: string }> = [];

      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

      try {
        (checkboxMock as ReturnType<typeof vi.fn>).mockResolvedValue(['new-skill']);

        register(program, {
          skills: {
            exists: vi.fn((name: string) => name === 'existing-skill'),
            importFromPath,
          },
          storage: {
            listAgents: vi.fn().mockReturnValue([agent]),
            getAgent: vi.fn().mockReturnValue(agent),
            getSkillsDir: vi.fn().mockReturnValue(path.join(TEST_DIR, '.agentforge', 'skills')),
            getSkillPath: vi.fn((name: string) =>
              path.join(TEST_DIR, '.agentforge', 'skills', name)
            ),
            getSkill,
            saveSkill,
          },
          syncCheck: {
            resolveAndRecordSyncLinks,
          },
          fileOps: createMockFileOps({
            pathExists: vi.fn(() => true),
            listSubdirectories: vi.fn(() => ['existing-skill', 'new-skill']),
            fileExists: vi.fn((p: string) => p.includes('SKILL.md') || p.includes('skill.md')),
          }),
        } as never);

        await program.parseAsync(['import', 'agents', 'codex'], { from: 'user' });
        choices = (checkboxMock as ReturnType<typeof vi.fn>).mock.calls[0][0].choices as Array<{
          name: string;
          value: string;
          disabled?: string;
        }>;
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
        (checkboxMock as ReturnType<typeof vi.fn>).mockReset();
      }

      expect(choices).toEqual([
        { name: 'existing-skill', value: 'existing-skill', disabled: 'already in AgentForge' },
        { name: 'new-skill', value: 'new-skill', disabled: undefined },
      ]);
      expect(importFromPath).toHaveBeenCalledWith(newSkillPath, 'new-skill', {
        type: 'local',
        importedFrom: { agent: 'codex', path: newSkillPath },
      });
      expect(resolveAndRecordSyncLinks).toHaveBeenCalledWith('new-skill', ['codex']);
    });
  });
});
