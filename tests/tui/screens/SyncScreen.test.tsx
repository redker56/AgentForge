/**
 * SyncScreen component tests.
 * Verifies rendering, title display, and progress bar behavior.
 */

import { render, cleanup } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('SyncScreen', () => {
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
      syncFormStep: 'select-op',
      syncFormOperation: 'sync-agents',
      syncFormSelectedSkillNames: new Set<string>(),
      syncFormSelectedTargetIds: new Set<string>(),
      syncFormSelectedAgentTypes: new Set<string>(),
      syncFormMode: 'copy' as const,
      syncFormResults: [],
      syncFormFocusedIndex: 0,
      updateProgressItems: [],
      skills: [],
      agents: [],
      projects: [],
      activeTab: 'sync',
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

  it('exports SyncScreen component', async () => {
    const { SyncScreen } = await import('../../../src/tui/screens/SyncScreen.js');
    expect(SyncScreen).toBeDefined();
    expect(typeof SyncScreen).toBe('function');
  });

  it('renders title "Sync Skills"', async () => {
    const { SyncScreen } = await import('../../../src/tui/screens/SyncScreen.js');
    const store = makeMockStore();
    const { lastFrame } = render(
      React.createElement(SyncScreen, { store })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).toContain('Sync Skills');
  });

  it('renders SyncForm content', async () => {
    const { SyncScreen } = await import('../../../src/tui/screens/SyncScreen.js');
    const store = makeMockStore();
    const { lastFrame } = render(
      React.createElement(SyncScreen, { store })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    // SyncForm shows "Choose operation" at the select-op step
    expect(frame).toContain('Choose operation');
  });

  it('displays progress bar when updateProgressItems has items', async () => {
    const { SyncScreen } = await import('../../../src/tui/screens/SyncScreen.js');
    const store = makeMockStore({
      syncFormStep: 'executing',
      updateProgressItems: [
        { id: 'sync-skill1', label: 'Syncing skill1...', progress: 50, status: 'running' },
      ],
    });
    const { lastFrame } = render(
      React.createElement(SyncScreen, { store })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    // Progress bar should show when items exist
    expect(frame).toContain('Syncing skill1...');
  });

  it('displays no progress bar when updateProgressItems is empty', async () => {
    const { SyncScreen } = await import('../../../src/tui/screens/SyncScreen.js');
    const store = makeMockStore({
      syncFormStep: 'select-op',
      updateProgressItems: [],
    });
    const { lastFrame } = render(
      React.createElement(SyncScreen, { store })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    // Should show the sync form content, not progress bar
    expect(frame).toContain('Choose operation');
    // Progress-related labels should not appear
    expect(frame).not.toContain('Syncing');
  });
});
