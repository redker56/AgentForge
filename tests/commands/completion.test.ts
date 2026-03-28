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

    register(program, {} as never);

    await program.parseAsync(['completion', 'powershell', '--install'], { from: 'user' });

    const content = await fs.readFile(profilePath, 'utf-8');
    expect(content).toContain('# af completion (auto-generated)');
    expect(content).toContain('# /af completion (auto-generated)');
    expect(content).toContain('Register-ArgumentCompleter -Native -CommandName af');
    expect(content).toContain("if ($tokenCount -eq 3 -and $target -in 'agents', 'projects', 'skills' -and [string]::IsNullOrEmpty($wordToComplete))");
    expect(content).toContain("No more arguments");
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('Completion installed to:'));
  });

  it('updates an existing legacy PowerShell completion block in place', async () => {
    const profilePath = path.join(TEST_DIR, 'Microsoft.PowerShell_profile.ps1');
    process.env.PROFILE = profilePath;
    await fs.writeFile(
      profilePath,
      [
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
      ].join('\n'),
      'utf-8'
    );

    const program = new Command();
    register(program, {} as never);

    await program.parseAsync(['completion', 'powershell', '--install'], { from: 'user' });

    const content = await fs.readFile(profilePath, 'utf-8');
    expect(content).toContain('# user profile header');
    expect(content).toContain("Write-Host 'keep me'");
    expect(content).toContain('# /af completion (auto-generated)');
    expect(content).not.toContain("'config'");
    expect(content.match(/# af completion \(auto-generated\)/g)).toHaveLength(1);
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('Completion updated to:'));
  });
});
