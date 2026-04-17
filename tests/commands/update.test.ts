/**
 * update command tests
 */

import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { register } from '../../src/commands/update.js';

describe('update command', () => {
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

  it('updates a specific git skill and resyncs', async () => {
    const update = vi.fn().mockResolvedValue(true);
    const resync = vi.fn().mockResolvedValue(undefined);
    const projectResync = vi.fn().mockResolvedValue(undefined);

    const program = new Command();

    register(program, {
      skills: {
        get: vi.fn(() => ({
          name: 'git-skill',
          path: '/tmp/skills/git-skill',
          source: { type: 'git', url: 'https://github.com/example/skill' },
        })),
        list: vi.fn(() => []),
        update,
      },
      sync: {
        resync,
      },
      projectSync: {
        resync: projectResync,
      },
    } as never);

    await program.parseAsync(['update', 'git-skill'], { from: 'user' });

    expect(update).toHaveBeenCalledWith('git-skill');
    expect(resync).toHaveBeenCalledWith('git-skill');
    expect(projectResync).toHaveBeenCalledWith('git-skill');
  });

  it('shows message for local skills', async () => {
    const program = new Command();

    register(program, {
      skills: {
        get: vi.fn(() => ({
          name: 'local-skill',
          path: '/tmp/skills/local-skill',
          source: { type: 'local' },
        })),
        list: vi.fn(() => []),
        update: vi.fn(),
      },
      sync: {
        resync: vi.fn(),
      },
      projectSync: {
        resync: vi.fn(),
      },
    } as never);

    await program.parseAsync(['update', 'local-skill'], { from: 'user' });

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('do not need updating'));
  });

  it('shows error when skill not found', async () => {
    const program = new Command();
    const getMock = vi.fn(() => undefined);

    register(program, {
      skills: {
        get: getMock,
        list: vi.fn(() => []),
        update: vi.fn(),
      },
      sync: {
        resync: vi.fn(),
      },
      projectSync: {
        resync: vi.fn(),
      },
    } as never);

    await expect(program.parseAsync(['update', 'unknown-skill'], { from: 'user' })).rejects.toThrow(
      'process.exit mocked'
    );

    expect(getMock).toHaveBeenCalledWith('unknown-skill');
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Skill not found'));
  });

  it('updates all git skills when no skill name specified', async () => {
    const update = vi.fn().mockResolvedValue(true);
    const resync = vi.fn().mockResolvedValue(undefined);
    const projectResync = vi.fn().mockResolvedValue(undefined);

    const program = new Command();

    register(program, {
      skills: {
        list: vi.fn(() => [
          {
            name: 'git-skill-1',
            path: '/tmp/skills/git-skill-1',
            source: { type: 'git', url: 'https://github.com/example/skill1' },
          },
          {
            name: 'git-skill-2',
            path: '/tmp/skills/git-skill-2',
            source: { type: 'git', url: 'https://github.com/example/skill2' },
          },
        ]),
        update,
      },
      sync: {
        resync,
      },
      projectSync: {
        resync: projectResync,
      },
    } as never);

    await program.parseAsync(['update'], { from: 'user' });

    expect(update).toHaveBeenCalledWith('git-skill-1');
    expect(update).toHaveBeenCalledWith('git-skill-2');
    expect(resync).toHaveBeenCalledWith('git-skill-1');
    expect(resync).toHaveBeenCalledWith('git-skill-2');
    expect(projectResync).toHaveBeenCalledWith('git-skill-1');
    expect(projectResync).toHaveBeenCalledWith('git-skill-2');
  });

  it('shows message when no git skills available', async () => {
    const program = new Command();

    register(program, {
      skills: {
        list: vi.fn(() => [
          {
            name: 'local-skill',
            path: '/tmp/skills/local-skill',
            source: { type: 'local' },
          },
        ]),
        update: vi.fn(),
      },
      sync: {
        resync: vi.fn(),
      },
      projectSync: {
        resync: vi.fn(),
      },
    } as never);

    await program.parseAsync(['update'], { from: 'user' });

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No skills from Git sources'));
  });

  it('shows message when no skills at all', async () => {
    const program = new Command();

    register(program, {
      skills: {
        list: vi.fn(() => []),
        update: vi.fn(),
      },
      sync: {
        resync: vi.fn(),
      },
      projectSync: {
        resync: vi.fn(),
      },
    } as never);

    await program.parseAsync(['update'], { from: 'user' });

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No skills from Git sources'));
  });

  it('filters out non-git skills when updating all', async () => {
    const update = vi.fn().mockResolvedValue(true);
    const resync = vi.fn().mockResolvedValue(undefined);
    const projectResync = vi.fn().mockResolvedValue(undefined);

    const program = new Command();

    register(program, {
      skills: {
        list: vi.fn(() => [
          {
            name: 'git-skill',
            path: '/tmp/skills/git-skill',
            source: { type: 'git', url: 'https://github.com/example/skill' },
          },
          {
            name: 'local-skill',
            path: '/tmp/skills/local-skill',
            source: { type: 'local' },
          },
          {
            name: 'project-skill',
            path: '/tmp/skills/project-skill',
            source: { type: 'project', projectId: 'demo-project' },
          },
        ]),
        update,
      },
      sync: {
        resync,
      },
      projectSync: {
        resync: projectResync,
      },
    } as never);

    await program.parseAsync(['update'], { from: 'user' });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith('git-skill');
    expect(resync).toHaveBeenCalledTimes(1);
    expect(projectResync).toHaveBeenCalledTimes(1);
  });
});
