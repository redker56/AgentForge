/**
 * completion command tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { Command } from 'commander';
import { register } from '../../src/commands/completion.js';

const TEST_DIR = path.join(os.tmpdir(), 'agentforge-completion-command-test');

// Create a mock fileOps with all required methods
function createMockFileOps(overrides = {}) {
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

describe('completion command', () => {
  let originalProfile: string | undefined;
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
    originalProfile = process.env.PROFILE;
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    if (originalProfile === undefined) {
      delete process.env.PROFILE;
    } else {
      process.env.PROFILE = originalProfile;
    }
    consoleLog.mockRestore();
    consoleError.mockRestore();
    await fs.remove(TEST_DIR);
  });

  it('installs PowerShell completion into the configured profile', async () => {
    const profilePath = path.join(TEST_DIR, 'Microsoft.PowerShell_profile.ps1');
    process.env.PROFILE = profilePath;
    const program = new Command();

    const mockFileOps = createMockFileOps({
      pathExists: vi.fn(() => false),
      readFileSync: vi.fn(() => null),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
    });

    register(program, { fileOps: mockFileOps } as never);

    await program.parseAsync(['completion', 'powershell', '--install'], { from: 'user' });

    expect(mockFileOps.writeFileSync).toHaveBeenCalled();
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('Completion installed to:'));
  });

  it('updates an existing legacy PowerShell completion block in place', async () => {
    const profilePath = path.join(TEST_DIR, 'Microsoft.PowerShell_profile.ps1');
    process.env.PROFILE = profilePath;
    const existingContent = [
      '# user profile header',
      '',
      '# af completion (auto-generated)',
      '# af completion for PowerShell',
      'Register-ArgumentCompleter -Native -CommandName af -ScriptBlock {',
      '  param($wordToComplete, $commandAst, $cursorPosition)',
      "  $commands = @('list', 'config')",
      '}',
      '',
      "Write-Host 'keep me'",
      '',
    ].join('\n');

    const mockFileOps = createMockFileOps({
      pathExists: vi.fn(() => true),
      readFileSync: vi.fn(() => existingContent),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
    });

    const program = new Command();
    register(program, { fileOps: mockFileOps } as never);

    await program.parseAsync(['completion', 'powershell', '--install'], { from: 'user' });

    expect(mockFileOps.writeFileSync).toHaveBeenCalled();
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('Completion updated to:'));
  });
});
