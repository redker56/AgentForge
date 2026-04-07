/**
 * ProjectsScreen component tests.
 * Verifies rendering, detail loading, and compact band handling.
 */

import { render, cleanup } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('ProjectsScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();

    // Mock useNavigation to avoid useStdout/useEffect infinite loop
    vi.doMock('../../../src/tui/hooks/useNavigation.js', () => ({
      useNavigation: (opts: { items: unknown[]; focusedIndex: number }) => ({
        focusedItem: opts.items[opts.focusedIndex] ?? null,
        visibleItems: opts.items,
        scrollTop: 0,
        hiddenAbove: 0,
        hiddenBelow: 0,
      }),
    }));

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
    vi.doUnmock('../../../src/tui/hooks/useNavigation.js');
    vi.useRealTimers();
    cleanup();
  });

  const mockProjects = [
    { id: 'proj-1', path: '/home/user/projects/proj-1', addedAt: '2025-01-01' },
    { id: 'proj-2', path: '/home/user/projects/proj-2', addedAt: '2025-02-01' },
  ];

  function makeMockStore(overrides?: Partial<Record<string, unknown>>) {
    const state = {
      projects: mockProjects,
      focusedProjectIndex: 0,
      projectDetails: {},
      expandedProjectIds: new Set<string>(),
      loading: { projects: false },
      loadProjectDetail: vi.fn(),
      ...overrides,
    };
    return {
      getState: () => state,
      subscribe: vi.fn(() => () => {}),
    };
  }

  it('exports ProjectsScreen component', async () => {
    const { ProjectsScreen } = await import('../../../src/tui/screens/ProjectsScreen.js');
    expect(ProjectsScreen).toBeDefined();
    expect(typeof ProjectsScreen).toBe('function');
  });

  it('renders ProjectTable in standard band', async () => {
    const { ProjectsScreen } = await import('../../../src/tui/screens/ProjectsScreen.js');
    const store = makeMockStore();
    const { lastFrame } = render(
      React.createElement(ProjectsScreen, { store, band: 'standard' as const, columns: 100 })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).toContain('proj-1');
  });

  it('returns null in compact band', async () => {
    const { ProjectsScreen } = await import('../../../src/tui/screens/ProjectsScreen.js');
    const store = makeMockStore();
    const { lastFrame } = render(
      React.createElement(ProjectsScreen, { store, band: 'compact' as const, columns: 60 })
    );
    vi.runAllTimers();
    expect(lastFrame()).toBe('');
  });

  it('loads project detail when focused project changes', async () => {
    const loadProjectDetail = vi.fn();
    const { ProjectsScreen } = await import('../../../src/tui/screens/ProjectsScreen.js');
    const store = makeMockStore({ focusedProjectIndex: 0, loadProjectDetail });
    render(
      React.createElement(ProjectsScreen, { store, band: 'standard' as const, columns: 100 })
    );
    vi.runAllTimers();
    // useEffect triggers loadProjectDetail when focused project changes and detail not loaded
    expect(loadProjectDetail).toHaveBeenCalledWith('proj-1');
  });

  it('does not load project detail if already loaded', async () => {
    const loadProjectDetail = vi.fn();
    const { ProjectsScreen } = await import('../../../src/tui/screens/ProjectsScreen.js');
    const store = makeMockStore({
      focusedProjectIndex: 0,
      loadProjectDetail,
      projectDetails: {
        'proj-1': {
          skillsByAgent: [],
        },
      },
    });
    render(
      React.createElement(ProjectsScreen, { store, band: 'standard' as const, columns: 100 })
    );
    vi.runAllTimers();
    // Should not call loadProjectDetail since detail already exists
    expect(loadProjectDetail).not.toHaveBeenCalled();
  });
});
