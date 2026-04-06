/**
 * __complete command tests
 */

import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { register } from '../../src/commands/complete.js';

describe('complete command', () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLog.mockRestore();
  });

  it('lists available commands', async () => {
    const program = new Command();

    register(program, {} as never);

    await program.parseAsync(['__complete', 'commands'], { from: 'user' });

    const loggedText = consoleLog.mock.calls.flat();
    expect(loggedText).toContain('list');
    expect(loggedText).toContain('show');
    expect(loggedText).toContain('import');
    expect(loggedText).toContain('remove');
    expect(loggedText).toContain('sync');
    expect(loggedText).toContain('add');
    expect(loggedText).toContain('unsync');
    expect(loggedText).toContain('update');
    expect(loggedText).toContain('completion');
  });

  it('lists targets for list command', async () => {
    const program = new Command();

    register(program, {} as never);

    await program.parseAsync(['__complete', 'list-targets'], { from: 'user' });

    const loggedText = consoleLog.mock.calls.flat();
    expect(loggedText).toContain('agents');
    expect(loggedText).toContain('projects');
    expect(loggedText).toContain('skills');
  });

  it('lists targets for show command', async () => {
    const program = new Command();

    register(program, {} as never);

    await program.parseAsync(['__complete', 'show-targets'], { from: 'user' });

    const loggedText = consoleLog.mock.calls.flat();
    expect(loggedText).toContain('agents');
    expect(loggedText).toContain('projects');
    expect(loggedText).toContain('skills');
  });

  it('lists targets for import command', async () => {
    const program = new Command();

    register(program, {} as never);

    await program.parseAsync(['__complete', 'import-targets'], { from: 'user' });

    const loggedText = consoleLog.mock.calls.flat();
    expect(loggedText).toContain('agents');
    expect(loggedText).toContain('projects');
  });

  it('lists targets for remove command in correct order', async () => {
    const program = new Command();

    register(program, {} as never);

    await program.parseAsync(['__complete', 'remove-targets'], { from: 'user' });

    const loggedText = consoleLog.mock.calls.flat();
    expect(loggedText).toContain('skills');
    expect(loggedText).toContain('projects');
    expect(loggedText).toContain('agents');
  });

  it('lists targets for add command', async () => {
    const program = new Command();

    register(program, {} as never);

    await program.parseAsync(['__complete', 'add-targets'], { from: 'user' });

    const loggedText = consoleLog.mock.calls.flat();
    expect(loggedText).toContain('skills');
    expect(loggedText).toContain('agents');
    expect(loggedText).toContain('projects');
  });

  it('lists targets for sync command', async () => {
    const program = new Command();

    register(program, {} as never);

    await program.parseAsync(['__complete', 'sync-targets'], { from: 'user' });

    const loggedText = consoleLog.mock.calls.flat();
    expect(loggedText).toContain('agents');
    expect(loggedText).toContain('projects');
  });

  it('lists targets for unsync command', async () => {
    const program = new Command();

    register(program, {} as never);

    await program.parseAsync(['__complete', 'unsync-targets'], { from: 'user' });

    const loggedText = consoleLog.mock.calls.flat();
    expect(loggedText).toContain('agents');
    expect(loggedText).toContain('projects');
  });

  it('lists all skills', async () => {
    const program = new Command();

    register(program, {
      skills: {
        list: vi.fn(() => [{ name: 'skill-a' }, { name: 'skill-b' }, { name: 'skill-c' }]),
      },
    } as never);

    await program.parseAsync(['__complete', 'skills'], { from: 'user' });

    const loggedText = consoleLog.mock.calls.flat();
    expect(loggedText).toContain('skill-a');
    expect(loggedText).toContain('skill-b');
    expect(loggedText).toContain('skill-c');
  });

  it('lists only skills synced to agents', async () => {
    const program = new Command();

    register(program, {
      skills: {
        list: vi.fn(() => [
          { name: 'synced-skill', syncedTo: [{ agentId: 'claude', mode: 'copy' }] },
          { name: 'unsynced-skill', syncedTo: [] },
        ]),
      },
    } as never);

    await program.parseAsync(['__complete', 'synced-skills'], { from: 'user' });

    const loggedText = consoleLog.mock.calls.flat();
    expect(loggedText).toContain('synced-skill');
    expect(loggedText).not.toContain('unsynced-skill');
  });

  it('lists skills synced to projects', async () => {
    const program = new Command();

    register(program, {
      skills: {
        list: vi.fn(() => [
          {
            name: 'project-skill',
            syncedProjects: [{ projectId: 'proj-a', agentType: 'claude', mode: 'copy' }],
          },
          { name: 'no-project-skill', syncedProjects: [] },
        ]),
      },
    } as never);

    await program.parseAsync(['__complete', 'synced-projects-skills'], { from: 'user' });

    const loggedText = consoleLog.mock.calls.flat();
    expect(loggedText).toContain('project-skill');
    expect(loggedText).not.toContain('no-project-skill');
  });

  it('lists all agents', async () => {
    const program = new Command();

    register(program, {
      storage: {
        listAgents: vi.fn(() => [
          { id: 'claude', name: 'Claude Code', basePath: '/tmp/claude', skillsDirName: 'claude' },
          { id: 'codex', name: 'Codex', basePath: '/tmp/codex', skillsDirName: 'agents' },
        ]),
      },
    } as never);

    await program.parseAsync(['__complete', 'agents'], { from: 'user' });

    const loggedText = consoleLog.mock.calls.flat();
    expect(loggedText).toContain('claude');
    expect(loggedText).toContain('codex');
  });

  it('lists all projects', async () => {
    const program = new Command();

    register(program, {
      storage: {
        listProjects: vi.fn(() => [
          { id: 'proj-a', path: '/tmp/proj-a', addedAt: '2026-03-30T00:00:00.000Z' },
          { id: 'proj-b', path: '/tmp/proj-b', addedAt: '2026-03-30T00:00:00.000Z' },
        ]),
      },
    } as never);

    await program.parseAsync(['__complete', 'projects'], { from: 'user' });

    const loggedText = consoleLog.mock.calls.flat();
    expect(loggedText).toContain('proj-a');
    expect(loggedText).toContain('proj-b');
  });

  it('lists agents synced to a specific skill', async () => {
    const program = new Command();

    register(program, {
      skills: {
        get: vi.fn((name: string) => {
          if (name === 'test-skill') {
            return {
              name: 'test-skill',
              syncedTo: [
                { agentId: 'claude', mode: 'copy' },
                { agentId: 'codex', mode: 'symlink' },
              ],
            };
          }
          return undefined;
        }),
      },
    } as never);

    await program.parseAsync(['__complete', 'synced-agents:test-skill'], { from: 'user' });

    const loggedText = consoleLog.mock.calls.flat();
    expect(loggedText).toContain('claude');
    expect(loggedText).toContain('codex');
  });

  it('lists project sync targets for a specific skill', async () => {
    const program = new Command();

    register(program, {
      skills: {
        get: vi.fn((name: string) => {
          if (name === 'test-skill') {
            return {
              name: 'test-skill',
              syncedProjects: [
                { projectId: 'proj-a', agentType: 'claude', mode: 'copy' },
                { projectId: 'proj-b', agentType: 'codex', mode: 'symlink' },
              ],
            };
          }
          return undefined;
        }),
      },
    } as never);

    await program.parseAsync(['__complete', 'synced-projects:test-skill'], { from: 'user' });

    const loggedText = consoleLog.mock.calls.flat();
    expect(loggedText).toContain('proj-a:claude');
    expect(loggedText).toContain('proj-b:codex');
  });

  it('does not error for unknown skill in synced-agents', async () => {
    const program = new Command();

    register(program, {
      skills: {
        get: vi.fn(() => undefined),
      },
    } as never);

    await program.parseAsync(['__complete', 'synced-agents:unknown-skill'], { from: 'user' });

    const loggedText = consoleLog.mock.calls.flat();
    expect(loggedText.length).toBe(0);
  });

  it('does not error for unknown skill in synced-projects', async () => {
    const program = new Command();

    register(program, {
      skills: {
        get: vi.fn(() => undefined),
      },
    } as never);

    await program.parseAsync(['__complete', 'synced-projects:unknown-skill'], { from: 'user' });

    const loggedText = consoleLog.mock.calls.flat();
    expect(loggedText.length).toBe(0);
  });
});
