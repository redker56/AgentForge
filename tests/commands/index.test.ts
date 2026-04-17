/**
 * command index tests - registers all commands and verifies structure
 */

import { Command } from 'commander';
import { describe, expect, it, vi } from 'vitest';

import { registerAll, type CommandContext } from '../../src/commands/index.js';

function makeMockFileOps() {
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
  };
}

describe('command registry', () => {
  it('registers all commands', () => {
    const program = new Command();
    const mockCtx: CommandContext = {
      skills: {} as never,
      sync: {} as never,
      syncCheck: {} as never,
      storage: {} as never,
      scan: {} as never,
      projectSync: {} as never,
      fileOps: makeMockFileOps(),
    };

    registerAll(program, mockCtx);

    const commandNames = program.commands.map((c) => c.name()).sort();
    expect(commandNames).toContain('list');
    expect(commandNames).toContain('show');
    expect(commandNames).toContain('import');
    expect(commandNames).toContain('remove');
    expect(commandNames).toContain('sync');
    expect(commandNames).toContain('add');
    expect(commandNames).toContain('categorize');
    expect(commandNames).toContain('completion');
    expect(commandNames).toContain('__complete');
    expect(commandNames).toContain('unsync');
    expect(commandNames).toContain('update');
  });

  it('hides internal commands from help', () => {
    const program = new Command();
    const mockCtx: CommandContext = {
      skills: {} as never,
      sync: {} as never,
      syncCheck: {} as never,
      storage: {} as never,
      scan: {} as never,
      projectSync: {} as never,
      fileOps: makeMockFileOps(),
    };

    registerAll(program, mockCtx);

    const completeCmd = program.commands.find((c) => c.name() === '__complete');
    expect(completeCmd).toBeDefined();
    expect((completeCmd as Command & { _hidden: boolean })._hidden).toBe(true);
  });
});
