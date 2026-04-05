/**
 * import command tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { Command } from 'commander';
import { register } from '../../src/commands/import.js';

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  select: vi.fn(),
  input: vi.fn(),
  confirm: vi.fn(),
}));

// Import the mocked module so we can reference the mock functions
import { checkbox as checkboxMock } from '@inquirer/prompts';

const TEST_DIR = path.join(os.tmpdir(), 'agentforge-import-command-test');

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

describe('import command', () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    consoleLog.mockRestore();
    consoleError.mockRestore();
    await fs.remove(TEST_DIR);
  });

  it('runs conflict resolution after importing a skill from a project', async () => {
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

    await program.parseAsync(
      ['import', 'projects', 'demo-project', 'demo-skill'],
      { from: 'user' }
    );

    expect(importFromPath).toHaveBeenCalledWith(sourceSkillPath, 'demo-skill', { type: 'project', projectId: 'demo-project' });
    expect(resolveAndRecordSyncLinks).toHaveBeenCalledWith('demo-skill', []);
    expect(importFromPath.mock.invocationCallOrder[0]).toBeLessThan(resolveAndRecordSyncLinks.mock.invocationCallOrder[0]);
  });

  it('disables already imported agent skills in interactive selection', async () => {
    const agentPath = path.join(TEST_DIR, 'codex-skills');
    const existingSkillPath = path.join(agentPath, 'existing-skill');
    const newSkillPath = path.join(agentPath, 'new-skill');
    const destinationSkillPath = path.join(TEST_DIR, '.agentforge', 'skills', 'new-skill');
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
          getSkillPath: vi.fn((name: string) => path.join(TEST_DIR, '.agentforge', 'skills', name)),
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
      choices = (checkboxMock as ReturnType<typeof vi.fn>).mock.calls[0][0].choices as Array<{ name: string; value: string; disabled?: string }>;
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
