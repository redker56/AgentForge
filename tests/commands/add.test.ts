/**
 * add command tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { register } from '../../src/commands/add.js';

describe('add command', () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLog.mockRestore();
    consoleError.mockRestore();
  });

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

    await program.parseAsync(
      ['add', 'skills', 'https://example.com/repo.git', 'demo-skill'],
      { from: 'user' }
    );

    expect(resolveAndRecordSyncLinks).toHaveBeenCalledWith('demo-skill');
  });

  it('reuses the scanned repository when installing a discovered root-level skill', async () => {
    const resolveAndRecordSyncLinks = vi.fn().mockResolvedValue([]);
    const cloneRepoToTemp = vi.fn().mockResolvedValue('C:/temp/repo');
    const discoverSkillsInDirectory = vi.fn().mockReturnValue([{ name: 'deep-recon', subPath: '' }]);
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

    await program.parseAsync(
      ['add', 'skills', 'https://github.com/kvarnelis/deep-recon'],
      { from: 'user' }
    );

    expect(cloneRepoToTemp).toHaveBeenCalledWith('https://github.com/kvarnelis/deep-recon');
    expect(detectSkillsCalls(discoverSkillsInDirectory)).toEqual([
      ['C:/temp/repo', 'https://github.com/kvarnelis/deep-recon'],
    ]);
    expect(installFromDirectory).toHaveBeenCalledWith(
      'https://github.com/kvarnelis/deep-recon',
      'deep-recon',
      'C:/temp/repo'
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
      ['add', 'skills', 'https://github.com/zai-org/GLM-skills/tree/main/skills/glmv-stock-analyst'],
      { from: 'user' }
    );

    expect(install).toHaveBeenCalledWith(
      'https://github.com/zai-org/GLM-skills',
      undefined,
      'skills/glmv-stock-analyst'
    );
    expect(resolveAndRecordSyncLinks).toHaveBeenCalledWith('glmv-stock-analyst');
  });
});

function detectSkillsCalls(mockFn: ReturnType<typeof vi.fn>): unknown[][] {
  return mockFn.mock.calls;
}
