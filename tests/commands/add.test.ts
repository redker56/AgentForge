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
});
