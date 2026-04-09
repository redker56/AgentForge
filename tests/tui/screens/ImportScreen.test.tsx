/**
 * ImportScreen component tests.
 * Verifies rendering, title display, and progress bar behavior.
 */

import { render, cleanup } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('ImportScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();

    // Mock ink to provide stable stdout
    vi.doMock('ink', async (importOriginal) => {
      const actual = await importOriginal<typeof import('ink')>();
      return {
        ...actual,
        useStdout: () => ({
          stdout: { columns: 120, rows: 30 },
        }),
      };
    });
  });

  afterEach(() => {
    vi.doUnmock('ink');
    vi.useRealTimers();
    cleanup();
  });

  function makeMockStore(overrides?: Partial<Record<string, unknown>>) {
    const state = {
      importTabStep: 'select-source-type',
      importTabSourceType: 'project',
      importTabSourceId: null,
      importTabSelectedSkillNames: new Set<string>(),
      importTabResults: [],
      importTabFocusedIndex: 0,
      updateProgressItems: [],
      agents: [],
      projects: [],
      activeTab: 'import',
      showSearch: false,
      showHelp: false,
      confirmState: null,
      formState: null,
      conflictState: null,
      ...overrides,
    };
    return {
      getState: () => state,
      subscribe: vi.fn(() => () => {}),
    };
  }

  function makeMockCtx() {
    return {
      storage: {
        getProject: vi.fn(),
        getAgent: vi.fn(),
      },
      scanService: {
        scanProject: vi.fn().mockReturnValue([]),
      },
      skillService: {
        exists: vi.fn().mockReturnValue(false),
      },
      fileOps: {
        listSubdirectories: vi.fn().mockReturnValue([]),
        fileExists: vi.fn().mockReturnValue(false),
      },
    } as unknown as import('../../../src/tui/store/dataSlice.js').ServiceContext;
  }

  it('exports ImportScreen component', async () => {
    const { ImportScreen } = await import('../../../src/tui/screens/ImportScreen.js');
    expect(ImportScreen).toBeDefined();
    expect(typeof ImportScreen).toBe('function');
  });

  it('renders title "Import Skills"', async () => {
    const { ImportScreen } = await import('../../../src/tui/screens/ImportScreen.js');
    const store = makeMockStore();
    const ctx = makeMockCtx();
    const { lastFrame } = render(
      React.createElement(ImportScreen, { store, ctx })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).toContain('Import Skills');
  });

  it('renders ImportFormTab content', async () => {
    const { ImportScreen } = await import('../../../src/tui/screens/ImportScreen.js');
    const store = makeMockStore();
    const ctx = makeMockCtx();
    const { lastFrame } = render(
      React.createElement(ImportScreen, { store, ctx })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    // ImportFormTab shows "Choose source" at the select-source-type step
    expect(frame).toContain('Choose source');
  });

  it('displays progress bar when updateProgressItems has items', async () => {
    const { ImportScreen } = await import('../../../src/tui/screens/ImportScreen.js');
    const store = makeMockStore({
      importTabStep: 'executing',
      updateProgressItems: [
        { id: 'import-skill1', label: 'Importing skill1...', progress: 50, status: 'running' },
      ],
    });
    const ctx = makeMockCtx();
    const { lastFrame } = render(
      React.createElement(ImportScreen, { store, ctx })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    // Progress bar should show when items exist
    expect(frame).toContain('Importing skill1...');
  });

  it('displays no progress bar when updateProgressItems is empty', async () => {
    const { ImportScreen } = await import('../../../src/tui/screens/ImportScreen.js');
    const store = makeMockStore({
      importTabStep: 'select-source-type',
      updateProgressItems: [],
    });
    const ctx = makeMockCtx();
    const { lastFrame } = render(
      React.createElement(ImportScreen, { store, ctx })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    // Should show the import form content, not progress bar
    expect(frame).toContain('Choose source');
    // Progress-related labels should not appear
    expect(frame).not.toContain('Importing');
  });
});
