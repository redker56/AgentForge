/**
 * show command tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { register } from '../../src/commands/show.js';
import type { SkillMeta } from '../../src/types.js';

function createSkillMeta(overrides: Partial<SkillMeta> = {}): SkillMeta {
  return {
    name: 'test-skill',
    source: { type: 'local' },
    createdAt: '2026-03-30T00:00:00.000Z',
    syncedTo: [],
    syncedProjects: [],
    ...overrides,
  };
}

// Create a mock fileOps with all required methods
function createMockFileOps(overrides = {}) {
  return {
    listSubdirectories: vi.fn(() => []),
    fileExists: vi.fn(() => false),
    readFile: vi.fn(() => null),
    ...overrides,
  };
}

describe('show command', () => {
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

  it('shows agent details with user-level and project-level skills', async () => {
    const agent = {
      id: 'claude',
      name: 'Claude Code',
      basePath: '/tmp/claude',
      skillsDirName: 'claude',
    };

    const program = new Command();

    register(program, {
      storage: {
        getAgent: vi.fn(() => agent),
        listAgents: vi.fn(() => [agent]),
      },
      fileOps: createMockFileOps({
        listSubdirectories: vi.fn(() => ['skill-a', 'skill-b']),
        fileExists: vi.fn(() => true),
      }),
      scan: {
        getAgentProjectSkills: vi.fn().mockResolvedValue([
          {
            name: 'project-skill',
            projectId: 'demo-project',
            isImported: true,
            isDifferentVersion: false,
          },
        ]),
      },
    } as never);

    await program.parseAsync(['show', 'agents', 'claude'], { from: 'user' });

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('Claude Code'));
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('/tmp/claude'));
  });

  it('shows project details with skills', async () => {
    const project = {
      id: 'demo-project',
      path: '/tmp/project',
      addedAt: '2026-03-30T00:00:00.000Z',
    };

    const program = new Command();

    register(program, {
      storage: {
        getProject: vi.fn(() => project),
      },
      fileOps: createMockFileOps(),
      scan: {
        getProjectSkillsWithStatus: vi.fn().mockResolvedValue([
          {
            name: 'test-skill',
            path: '/tmp/project/.claude/skills/test-skill',
            agentId: 'claude',
            hasSkillMd: true,
            subPath: '.claude/skills',
            isImported: true,
            isDifferentVersion: false,
          },
        ]),
      },
    } as never);

    await program.parseAsync(['show', 'projects', 'demo-project'], { from: 'user' });

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('demo-project'));
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('/tmp/project'));
  });

  it('shows skill details with git source', async () => {
    const skill = {
      name: 'git-skill',
      path: '/tmp/skills/git-skill',
    };

    const meta = createSkillMeta({
      name: 'git-skill',
      source: { type: 'git', url: 'https://github.com/example/skill' },
      syncedTo: [{ agentId: 'claude', mode: 'copy' }],
    });

    const program = new Command();

    register(program, {
      storage: {
        getSkill: vi.fn(() => meta),
        getAgent: vi.fn((id: string) => ({ id, name: id === 'claude' ? 'Claude Code' : id })),
      },
      fileOps: createMockFileOps({
        readFile: vi.fn(() => '# Git Skill\n\nThis is a test skill.'),
      }),
      skills: {
        get: vi.fn(() => skill),
      },
      scan: {
        getSkillProjectDistribution: vi.fn(() => []),
      },
    } as never);

    await program.parseAsync(['show', 'skills', 'git-skill'], { from: 'user' });

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('git-skill'));
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('https://github.com/example/skill'));
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('Claude Code'));
  });

  it('shows skill details with project source', async () => {
    const skill = {
      name: 'project-skill',
      path: '/tmp/skills/project-skill',
    };

    const meta = createSkillMeta({
      name: 'project-skill',
      source: { type: 'project', projectId: 'demo-project' },
    });

    const program = new Command();

    register(program, {
      storage: {
        getSkill: vi.fn(() => meta),
      },
      fileOps: createMockFileOps(),
      skills: {
        get: vi.fn(() => skill),
      },
      scan: {
        getSkillProjectDistribution: vi.fn(() => []),
      },
    } as never);

    await program.parseAsync(['show', 'skills', 'project-skill'], { from: 'user' });

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('demo-project'));
  });

  it('shows skill project distribution', async () => {
    const skill = {
      name: 'multi-project-skill',
      path: '/tmp/skills/multi-project-skill',
    };

    const meta = createSkillMeta({
      name: 'multi-project-skill',
      source: { type: 'git', url: 'https://github.com/example/skill' },
    });

    const program = new Command();

    register(program, {
      storage: {
        getSkill: vi.fn(() => meta),
      },
      fileOps: createMockFileOps(),
      skills: {
        get: vi.fn(() => skill),
      },
      scan: {
        getSkillProjectDistribution: vi.fn(() => [
          {
            projectId: 'proj-a',
            agents: [{ id: 'claude', name: 'Claude Code' }],
          },
          {
            projectId: 'proj-b',
            agents: [{ id: 'codex', name: 'Codex' }],
          },
        ]),
      },
    } as never);

    await program.parseAsync(['show', 'skills', 'multi-project-skill'], { from: 'user' });

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('proj-a'));
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('proj-b'));
  });

  it('shows error for invalid target', async () => {
    const program = new Command();

    register(program, {
      storage: {},
      fileOps: createMockFileOps(),
    } as never);

    await expect(program.parseAsync(['show', 'invalid', 'target'], { from: 'user' }))
      .rejects.toThrow('process.exit mocked');

    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Invalid target'));
  });

  it('shows error when agent not found', async () => {
    const program = new Command();
    const getAgentMock = vi.fn(() => undefined);

    register(program, {
      storage: {
        getAgent: getAgentMock,
        listAgents: vi.fn(() => []),
      },
      fileOps: createMockFileOps(),
      scan: {
        getAgentProjectSkills: vi.fn().mockResolvedValue([]),
      },
    } as never);

    await expect(program.parseAsync(['show', 'agents', 'unknown'], { from: 'user' }))
      .rejects.toThrow('process.exit mocked');

    expect(getAgentMock).toHaveBeenCalledWith('unknown');
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Agent not found'));
  });

  it('shows error when project not found', async () => {
    const program = new Command();
    const getProjectMock = vi.fn(() => undefined);

    register(program, {
      storage: {
        getProject: getProjectMock,
      },
      fileOps: createMockFileOps(),
      scan: {
        getProjectSkillsWithStatus: vi.fn().mockResolvedValue([]),
      },
    } as never);

    await expect(program.parseAsync(['show', 'projects', 'unknown'], { from: 'user' }))
      .rejects.toThrow('process.exit mocked');

    expect(getProjectMock).toHaveBeenCalledWith('unknown');
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Project not found'));
  });

  it('shows error when skill not found', async () => {
    const program = new Command();

    register(program, {
      storage: {
        getSkill: vi.fn(() => undefined),
      },
      fileOps: createMockFileOps(),
      skills: {
        get: vi.fn(() => undefined),
      },
      scan: {
        getSkillProjectDistribution: vi.fn(() => []),
      },
    } as never);

    await expect(program.parseAsync(['show', 'skills', 'unknown'], { from: 'user' }))
      .rejects.toThrow('process.exit mocked');

    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Skill not found'));
  });
});
