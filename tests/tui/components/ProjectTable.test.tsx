/**
 * ProjectTable component tests.
 * Verifies dynamic column widths, focus highlight, separator length.
 */

import { render, cleanup } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { withLegacyUiState } from '../helpers/legacyUiState.js';

describe('ProjectTable', () => {
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
    { id: 'proj1', path: '/some/path', addedAt: '2025-01-01T00:00:00Z' },
    { id: 'proj2', path: '/another/path', addedAt: '2025-02-01T00:00:00Z' },
  ];

  function makeMockStore(overrides?: Partial<Record<string, unknown>>) {
    // Cache state object to satisfy zustand's getSnapshot stability requirement
    const state = {
      projects: mockProjects,
      focusedProjectIndex: 0,
      expandedProjectIds: new Set<string>(),
      projectDetails: {
        proj1: { skillsByAgent: [] },
        proj2: { skillsByAgent: [] },
      },
      projectSummaries: {
        proj1: { skillCount: 4 },
        proj2: { skillCount: 2 },
      },
      loadAgentDetail: vi.fn(),
      loadProjectDetail: vi.fn(),
      ...overrides,
    };
    withLegacyUiState(state);
    return {
      getState: () => state,
      subscribe: vi.fn(() => () => {}),
    };
  }

  it('exports ProjectTable component', async () => {
    const { ProjectTable } = await import('../../../src/tui/components/ProjectTable.js');
    expect(ProjectTable).toBeDefined();
    expect(typeof ProjectTable).toBe('function');
  });

  it('renders project names', async () => {
    const { ProjectTable } = await import('../../../src/tui/components/ProjectTable.js');
    const store = makeMockStore();
    const { lastFrame } = render(React.createElement(ProjectTable, { store, columns: 100 }));
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).toContain('proj1');
    expect(frame).toContain('proj2');
  });

  it('renders separator line based on dynamic width', async () => {
    const { ProjectTable } = await import('../../../src/tui/components/ProjectTable.js');
    const store = makeMockStore();
    const { lastFrame } = render(React.createElement(ProjectTable, { store, columns: 80 }));
    vi.runAllTimers();
    const frame = lastFrame() || '';
    // The separator character is U+2500
    expect(frame).toContain('\u2500');
  });

  it('rendered separator is shorter at narrow columns', async () => {
    const { ProjectTable } = await import('../../../src/tui/components/ProjectTable.js');
    const storeWide = makeMockStore();
    const storeNarrow = makeMockStore();
    const { lastFrame: lastFrameWide } = render(
      React.createElement(ProjectTable, { store: storeWide, columns: 150 })
    );
    vi.runAllTimers();
    const { lastFrame: lastFrameNarrow } = render(
      React.createElement(ProjectTable, { store: storeNarrow, columns: 80 })
    );
    vi.runAllTimers();
    const wide = lastFrameWide() || '';
    const narrow = lastFrameNarrow() || '';
    expect(wide.length).toBeGreaterThan(narrow.length);
  });

  it('focused row has the vertical bar indicator', async () => {
    const { ProjectTable } = await import('../../../src/tui/components/ProjectTable.js');
    const store = makeMockStore({ focusedProjectIndex: 0 });
    const { lastFrame } = render(React.createElement(ProjectTable, { store, columns: 100 }));
    vi.runAllTimers();
    const frame = lastFrame() || '';
    // U+258E is the vertical bar indicator used for focus highlight
    expect(frame).toContain('\u258E');
  });

  it('renders header row', async () => {
    const { ProjectTable } = await import('../../../src/tui/components/ProjectTable.js');
    const store = makeMockStore();
    const { lastFrame } = render(React.createElement(ProjectTable, { store, columns: 100 }));
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).toContain('ID');
    expect(frame).toContain('Path');
    expect(frame).toContain('Added');
    expect(frame).toContain('Skills');
  });

  it('shows resolved skill counts instead of placeholder question marks', async () => {
    const { ProjectTable } = await import('../../../src/tui/components/ProjectTable.js');
    const store = makeMockStore();
    const { lastFrame } = render(React.createElement(ProjectTable, { store, columns: 100 }));
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).not.toContain('?');
  });
});
