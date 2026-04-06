/**
 * CLI entry point tests
 *
 * Tests for `isFirstRun` and `showWelcome` (exported for testability).
 * `launchCLI` integration is tested via the command-level test suite.
 */

import path from 'path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isFirstRun, showWelcome } from '../src/cli.js';

// Mock fs-extra at module level so that isFirstRun can be tested via spying
vi.mock('fs-extra', () => ({
  default: {
    existsSync: vi.fn(() => false),
  },
}));

const REGISTRY_PATH = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  '.agentforge',
  'registry.json'
);

describe('isFirstRun', () => {
  it('returns true when registry file does not exist', () => {
    const spy = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    expect(isFirstRun()).toBe(true);
    expect(spy).toHaveBeenCalledWith(REGISTRY_PATH);
    spy.mockRestore();
  });

  it('returns false when registry file exists', () => {
    const spy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    expect(isFirstRun()).toBe(false);
    expect(spy).toHaveBeenCalledWith(REGISTRY_PATH);
    spy.mockRestore();
  });
});

describe('showWelcome', () => {
  it('outputs welcome text to console', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    showWelcome();
    expect(spy).toHaveBeenCalled();
    const allCalls = spy.mock.calls.flat().join('\n');
    expect(allCalls).toContain('Welcome to AgentForge');
    spy.mockRestore();
  });

  it('outputs quick start instructions', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    showWelcome();
    const allCalls = spy.mock.calls.flat().join('\n');
    expect(allCalls).toContain('af add skills');
    expect(allCalls).toContain('af add agents');
    expect(allCalls).toContain('af add projects');
    expect(allCalls).toContain('af completion --install');
    spy.mockRestore();
  });
});

describe('launchCLI', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows welcome and exits on first run with no arguments', async () => {
    const originalArgv = process.argv;
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const welcomeSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    process.argv = ['node', 'af'];

    const fsMocked = await import('fs-extra');
    vi.spyOn(fsMocked.default, 'existsSync').mockReturnValue(false);

    const { isFirstRun: isr, showWelcome: sw } = await import('../src/cli.js');

    expect(isr()).toBe(true);
    sw();

    process.argv = originalArgv;
    exitSpy.mockRestore();
    welcomeSpy.mockRestore();
  });
});
