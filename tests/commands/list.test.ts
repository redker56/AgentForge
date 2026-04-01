/**
 * list command tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { register } from '../../src/commands/list.js';

describe('list command', () => {
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
          syncedTo: [],
        })),
      },
      scan: {
        getSkillProjectDistributionWithStatus: vi.fn().mockResolvedValue([]),
      },
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
});
