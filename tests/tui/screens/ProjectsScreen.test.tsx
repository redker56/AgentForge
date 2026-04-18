/**
 * ProjectsScreen component tests.
 * Verifies rendering, detail loading, and compact band handling.
 */

import { render, cleanup } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { withLegacyUiState } from '../helpers/legacyUiState.js';

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
      projectSummaries: {
        'proj-1': { skillCount: 2 },
        'proj-2': { skillCount: 1 },
      },
      projectViewMode: 'master',
      focusedProjectSkillIndex: 0,
      selectedProjectSkillRowIds: new Set<string>(),
      activeProjectSkillFilter: 'all',
      detailOverlayVisible: false,
      detailSkillName: null,
      loading: { projects: false },
      loadProjectDetail: vi.fn(),
      clearProjectSkillSelection: vi.fn(),
      setFocusedProjectSkillIndex: vi.fn(),
      ...overrides,
    };
    withLegacyUiState(state);
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

  it('renders ProjectTable in compact band', async () => {
    const { ProjectsScreen } = await import('../../../src/tui/screens/ProjectsScreen.js');
    const store = makeMockStore();
    const { lastFrame } = render(
      React.createElement(ProjectsScreen, { store, band: 'compact' as const, columns: 60 })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).toContain('proj-1');
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

  it('renders context browse filters in widescreen band', async () => {
    const { ProjectsScreen } = await import('../../../src/tui/screens/ProjectsScreen.js');
    const store = makeMockStore({
      projectDetails: {
        'proj-1': {
          projectId: 'proj-1',
          projectPath: '/home/user/projects/proj-1',
          skillsByAgent: [],
          sections: [
            {
              id: 'project:proj-1:agent:claude',
              title: 'Claude Code',
              rows: [
                {
                  rowId: 'project:proj-1:claude:defuddle',
                  name: 'defuddle',
                  path: '/home/user/projects/proj-1/.claude/skills/defuddle',
                  projectId: 'proj-1',
                  agentId: 'claude',
                  agentName: 'Claude Code',
                  isImported: false,
                  isDifferentVersion: false,
                  sourceType: 'project',
                },
              ],
            },
          ],
        },
      },
    });
    const { lastFrame } = render(
      React.createElement(ProjectsScreen, { store, band: 'widescreen' as const, columns: 120 })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).toContain('Browse:');
    expect(frame).toContain('Imported:0');
    expect(frame).toContain('Unimported:1');
  });
});
