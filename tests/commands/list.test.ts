/**
 * list command tests
 */

import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { register } from '../../src/commands/list.js';
import { createMockFileOps } from '../helpers/mock-context.js';

const mockFileOps = createMockFileOps();

describe('list command', () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLog.mockRestore();
    consoleError.mockRestore();
  });

  describe('list skills', () => {
    it('lists skills in alphabetical order', async () => {
      const program = new Command();

      register(program, {
        skills: {
          list: vi.fn().mockReturnValue([
            { name: 'zeta-skill', exists: true },
            { name: 'Alpha-skill', exists: true },
            { name: 'beta-skill', exists: true },
          ]),
        },
        storage: {
          getSkill: vi.fn((name: string) => ({
            name,
            source: { type: 'local' },
            createdAt: '2026-03-30T00:00:00.000Z',
            categories: [],
            syncedTo: [],
            syncedProjects: [],
          })),
          listProjects: vi.fn(() => []),
        },
        scan: {
          getSkillProjectDistributionWithStatus: vi.fn().mockResolvedValue([]),
        },
        fileOps: mockFileOps,
      } as never);

      await program.parseAsync(['list', 'skills'], { from: 'user' });

      const loggedText = consoleLog.mock.calls.flat().join('\n');
      const alphaIndex = loggedText.indexOf('Alpha-skill');
      const betaIndex = loggedText.indexOf('beta-skill');
      const zetaIndex = loggedText.indexOf('zeta-skill');

      expect(alphaIndex).toBeGreaterThanOrEqual(0);
      expect(betaIndex).toBeGreaterThan(alphaIndex);
      expect(zetaIndex).toBeGreaterThan(betaIndex);
    });

    it('shows no skills message when empty', async () => {
      const program = new Command();

      register(program, {
        skills: {
          list: vi.fn().mockReturnValue([]),
        },
        storage: {
          getSkill: vi.fn(),
        },
        fileOps: mockFileOps,
      } as never);

      await program.parseAsync(['list', 'skills'], { from: 'user' });

      const loggedText = consoleLog.mock.calls.flat().join('\n');
      expect(loggedText).toContain('No skills yet');
    });

    it('shows not synced status for unlinked skills', async () => {
      const program = new Command();

      register(program, {
        skills: {
          list: vi.fn().mockReturnValue([{ name: 'lonely-skill', exists: true }]),
        },
        storage: {
          getSkill: vi.fn(() => ({
            name: 'lonely-skill',
            source: { type: 'local' },
            createdAt: '2026-03-30T00:00:00.000Z',
            categories: [],
            syncedTo: [],
            syncedProjects: [],
          })),
        },
        scan: {
          getSkillProjectDistributionWithStatus: vi.fn().mockResolvedValue([]),
        },
        fileOps: mockFileOps,
      } as never);

      await program.parseAsync(['list', 'skills'], { from: 'user' });

      const loggedText = consoleLog.mock.calls.flat().join('\n');
      expect(loggedText).toContain('Not synced to any Agent');
    });

    it('shows user-level sync status for synced skills', async () => {
      const program = new Command();

      register(program, {
        skills: {
          list: vi.fn().mockReturnValue([{ name: 'synced-skill', exists: true }]),
        },
        storage: {
          getSkill: vi.fn(() => ({
            name: 'synced-skill',
            source: { type: 'local' },
            createdAt: '2026-03-30T00:00:00.000Z',
            categories: [],
            syncedTo: [{ agentId: 'claude', mode: 'copy' }],
            syncedProjects: [],
          })),
          getAgent: vi.fn(() => ({
            id: 'claude',
            name: 'Claude Code',
            basePath: '/tmp/claude',
            skillsDirName: 'claude',
          })),
          getSkillPath: vi.fn(() => '/tmp/skills/synced-skill'),
        },
        scan: {
          getSkillProjectDistributionWithStatus: vi.fn().mockResolvedValue([]),
        },
        fileOps: { ...mockFileOps, pathExists: vi.fn(() => true) },
      } as never);

      await program.parseAsync(['list', 'skills'], { from: 'user' });

      const loggedText = consoleLog.mock.calls.flat().join('\n');
      expect(loggedText).toContain('User-level');
    });

    it('filters skills by category', async () => {
      const program = new Command();

      register(program, {
        skills: {
          list: vi.fn().mockReturnValue([
            { name: 'frontend-design', exists: true, categories: ['design'] },
            { name: 'docx', exists: true, categories: ['documents'] },
          ]),
        },
        storage: {
          getSkill: vi.fn((name: string) => ({
            name,
            source: { type: 'local' },
            createdAt: '2026-03-30T00:00:00.000Z',
            categories: name === 'frontend-design' ? ['design'] : ['documents'],
            syncedTo: [],
            syncedProjects: [],
          })),
        },
        scan: {
          getSkillProjectDistributionWithStatus: vi.fn().mockResolvedValue([]),
        },
        fileOps: mockFileOps,
      } as never);

      await program.parseAsync(['list', 'skills', '--category', 'design'], { from: 'user' });

      const loggedText = consoleLog.mock.calls.flat().join('\n');
      expect(loggedText).toContain('frontend-design');
      expect(loggedText).toContain('Categories: design');
      expect(loggedText).not.toContain('docx');
    });
  });

  describe('list agents', () => {
    it('shows no agents message when empty', async () => {
      const program = new Command();

      register(program, {
        storage: {
          listAgents: vi.fn(() => []),
        },
        fileOps: mockFileOps,
      } as never);

      await program.parseAsync(['list', 'agents'], { from: 'user' });

      const loggedText = consoleLog.mock.calls.flat().join('\n');
      expect(loggedText).toContain('No Agents available');
    });

    it('lists agents with sync status', async () => {
      const program = new Command();

      register(program, {
        storage: {
          listAgents: vi.fn(() => [
            { id: 'claude', name: 'Claude Code', basePath: '/tmp/claude', skillsDirName: 'claude' },
          ]),
          listSkills: vi.fn(() => []),
          listProjects: vi.fn(() => []),
        },
        fileOps: mockFileOps,
      } as never);

      await program.parseAsync(['list', 'agents'], { from: 'user' });

      const loggedText = consoleLog.mock.calls.flat().join('\n');
      expect(loggedText).toContain('Claude Code');
    });
  });

  describe('list projects', () => {
    it('shows no registered projects when empty', async () => {
      const program = new Command();

      register(program, {
        storage: {
          listProjects: vi.fn(() => []),
        },
        fileOps: mockFileOps,
      } as never);

      await program.parseAsync(['list', 'projects'], { from: 'user' });

      const loggedText = consoleLog.mock.calls.flat().join('\n');
      expect(loggedText).toContain('No registered projects');
    });

    it('lists projects with skills', async () => {
      const program = new Command();

      register(program, {
        storage: {
          listProjects: vi.fn(() => [
            { id: 'demo-project', path: '/tmp/project', addedAt: '2026-03-30' },
          ]),
        },
        scan: {
          getProjectSkillsWithStatus: vi.fn().mockResolvedValue([
            {
              name: 'project-skill',
              path: '/tmp/project/.claude/skills/project-skill',
              agentId: 'claude',
              agentName: 'Claude Code',
              hasSkillMd: true,
              subPath: '.claude/skills',
              isImported: true,
              isDifferentVersion: false,
            },
          ]),
        },
        fileOps: mockFileOps,
      } as never);

      await program.parseAsync(['list', 'projects'], { from: 'user' });

      const loggedText = consoleLog.mock.calls.flat().join('\n');
      expect(loggedText).toContain('demo-project');
      expect(loggedText).toContain('project-skill');
    });
  });

  describe('invalid target', () => {
    it('shows error for invalid target', async () => {
      const program = new Command();

      register(program, {
        storage: {},
        fileOps: mockFileOps,
      } as never);

      await program.parseAsync(['list', 'invalid'], { from: 'user' });

      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Invalid target'));
    });
  });

  describe('list categories', () => {
    it('shows category counts and uncategorized totals', async () => {
      const program = new Command();

      register(program, {
        skills: {
          list: vi.fn().mockReturnValue([
            { name: 'frontend-design', exists: true, categories: ['design'] },
            { name: 'docx', exists: true, categories: ['documents'] },
            { name: 'misc-skill', exists: true, categories: [] },
          ]),
        },
        fileOps: mockFileOps,
      } as never);

      await program.parseAsync(['list', 'categories'], { from: 'user' });

      const loggedText = consoleLog.mock.calls.flat().join('\n');
      expect(loggedText).toContain('Category List');
      expect(loggedText).toContain('design');
      expect(loggedText).toContain('documents');
      expect(loggedText).toContain('Uncategorized');
    });
  });

  describe('list agents with skills', () => {
    it('lists agents with user-level synced and different skills', async () => {
      const program = new Command();

      register(program, {
        storage: {
          listAgents: vi.fn(() => [
            { id: 'claude', name: 'Claude Code', basePath: '/tmp/claude', skillsDirName: 'claude' },
          ]),
          listSkills: vi.fn(() => [
            {
              name: 'synced-skill',
              syncedTo: [{ agentId: 'claude', mode: 'copy' }],
              syncedProjects: [],
            },
            {
              name: 'different-skill',
              syncedTo: [{ agentId: 'claude', mode: 'copy' }],
              syncedProjects: [],
            },
          ]),
          getAgent: vi.fn(() => ({ id: 'claude', name: 'Claude Code', basePath: '/tmp/claude' })),
          getSkillPath: vi.fn((name: string) => `/tmp/skills/${name}`),
          listProjects: vi.fn(() => []),
        },
        scan: {
          getSkillProjectDistributionWithStatus: vi.fn().mockResolvedValue([]),
        },
        fileOps: {
          ...mockFileOps,
          pathExists: vi.fn(() => true),
          getDirectoryHash: vi.fn().mockResolvedValue('abc123'),
          scanSkillsInDirectory: vi.fn(() => []),
        },
      } as never);

      await program.parseAsync(['list', 'agents'], { from: 'user' });

      expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('claude'));
      expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('User-level'));
      expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('Project-level'));
    });

    it('lists agents with project-level skills', async () => {
      const program = new Command();

      register(program, {
        storage: {
          listAgents: vi.fn(() => [
            { id: 'claude', name: 'Claude Code', basePath: '/tmp/claude', skillsDirName: 'claude' },
          ]),
          listSkills: vi.fn(() => []),
          getAgent: vi.fn(() => undefined),
          listProjects: vi.fn(() => [{ id: 'my-proj', path: '/tmp/proj', addedAt: '2026-01-01' }]),
        },
        scan: {
          getSkillProjectDistributionWithStatus: vi.fn().mockResolvedValue([]),
        },
        fileOps: {
          ...mockFileOps,
          pathExists: vi.fn(() => false),
          scanSkillsInDirectory: vi.fn(() => ['project-skill']),
        },
      } as never);

      await program.parseAsync(['list', 'agents'], { from: 'user' });

      expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('project-skill'));
    });
  });
});
