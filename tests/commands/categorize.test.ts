/**
 * categorize command tests
 */

import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { register } from '../../src/commands/categorize.js';

describe('categorize command', () => {
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

  it('sets categories by default', async () => {
    const program = new Command();
    const updateCategories = vi.fn(() => ({
      name: 'frontend-design',
      source: { type: 'local' as const },
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
      categories: ['design', 'frontend'],
      syncedTo: [],
      syncedProjects: [],
    }));

    register(program, {
      skills: {
        updateCategories,
      },
    } as never);

    await program.parseAsync(
      ['categorize', 'skills', 'frontend-design', 'design', 'frontend'],
      { from: 'user' }
    );

    expect(updateCategories).toHaveBeenCalledWith(
      'frontend-design',
      ['design', 'frontend'],
      'set'
    );
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('Updated categories'));
  });

  it('supports add mode', async () => {
    const program = new Command();
    const updateCategories = vi.fn(() => ({
      name: 'docx',
      source: { type: 'local' as const },
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
      categories: ['documents', 'office'],
      syncedTo: [],
      syncedProjects: [],
    }));

    register(program, {
      skills: {
        updateCategories,
      },
    } as never);

    await program.parseAsync(
      ['categorize', 'skills', 'docx', 'documents', '--add'],
      { from: 'user' }
    );

    expect(updateCategories).toHaveBeenCalledWith('docx', ['documents'], 'add');
  });

  it('supports batch categorize through --skills and --categories', async () => {
    const program = new Command();
    const updateCategories = vi.fn((name: string) => ({
      name,
      source: { type: 'local' as const },
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
      categories: ['office', 'files'],
      syncedTo: [],
      syncedProjects: [],
    }));

    register(program, {
      skills: {
        updateCategories,
      },
    } as never);

    await program.parseAsync(
      [
        'categorize',
        'skills',
        '--skills',
        'docx',
        'xlsx',
        'pptx',
        '--categories',
        'office',
        'files',
      ],
      { from: 'user' }
    );

    expect(updateCategories).toHaveBeenCalledTimes(3);
    expect(updateCategories).toHaveBeenNthCalledWith(1, 'docx', ['office', 'files'], 'set');
    expect(updateCategories).toHaveBeenNthCalledWith(2, 'xlsx', ['office', 'files'], 'set');
    expect(updateCategories).toHaveBeenNthCalledWith(3, 'pptx', ['office', 'files'], 'set');
  });

  it('rejects category args with clear mode', async () => {
    const program = new Command();

    register(program, {
      skills: {
        updateCategories: vi.fn(),
      },
    } as never);

    await expect(
      program.parseAsync(['categorize', 'skills', 'docx', 'documents', '--clear'], {
        from: 'user',
      })
    ).rejects.toThrow('process.exit mocked');

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('--clear does not accept category arguments')
    );
  });

  it('rejects batch mode without --categories', async () => {
    const program = new Command();

    register(program, {
      skills: {
        updateCategories: vi.fn(),
      },
    } as never);

    await expect(
      program.parseAsync(['categorize', 'skills', '--skills', 'docx', 'xlsx'], {
        from: 'user',
      })
    ).rejects.toThrow('process.exit mocked');

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Batch categorize requires --categories')
    );
  });
});
