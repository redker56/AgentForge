/**
 * AgentTable component tests.
 * Verifies dynamic column widths, focus highlight, separator length.
 */

import { render, cleanup } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { withLegacyUiState } from '../helpers/legacyUiState.js';

describe('AgentTable', () => {
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

  const mockAgents = [
    { id: 'claude', name: 'Claude Code', basePath: '/home/user/.claude' },
    { id: 'codex', name: 'Codex', basePath: '/home/user/.codex' },
  ];

  function makeMockStore(overrides?: Partial<Record<string, unknown>>) {
    // Cache state object to satisfy zustand's getSnapshot stability requirement
    const state = {
      agents: mockAgents,
      focusedAgentIndex: 0,
      expandedAgentIds: new Set<string>(),
      agentDetails: {
        claude: { userLevelSkills: [], projectLevelSkills: [] },
        codex: { userLevelSkills: [], projectLevelSkills: [] },
      },
      agentSummaries: {
        claude: { userLevelSkillCount: 3, projectLevelSkillCount: 5 },
        codex: { userLevelSkillCount: 2, projectLevelSkillCount: 4 },
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

  it('exports AgentTable component', async () => {
    const { AgentTable } = await import('../../../src/tui/components/AgentTable.js');
    expect(AgentTable).toBeDefined();
    expect(typeof AgentTable).toBe('function');
  });

  it('renders agent names', async () => {
    const { AgentTable } = await import('../../../src/tui/components/AgentTable.js');
    const store = makeMockStore();
    const { lastFrame } = render(React.createElement(AgentTable, { store, columns: 100 }));
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).toContain('claude');
    expect(frame).toContain('codex');
  });

  it('renders separator line based on dynamic width', async () => {
    const { AgentTable } = await import('../../../src/tui/components/AgentTable.js');
    const store = makeMockStore();
    const { lastFrame } = render(React.createElement(AgentTable, { store, columns: 80 }));
    vi.runAllTimers();
    const frame = lastFrame() || '';
    // The separator character is U+2500
    expect(frame).toContain('\u2500');
  });

  it('rendered separator is shorter at narrow columns', async () => {
    const { AgentTable } = await import('../../../src/tui/components/AgentTable.js');
    const storeWide = makeMockStore();
    const storeNarrow = makeMockStore();
    const { lastFrame: lastFrameWide } = render(
      React.createElement(AgentTable, { store: storeWide, columns: 150 })
    );
    vi.runAllTimers();
    const { lastFrame: lastFrameNarrow } = render(
      React.createElement(AgentTable, { store: storeNarrow, columns: 80 })
    );
    vi.runAllTimers();
    const wide = lastFrameWide() || '';
    const narrow = lastFrameNarrow() || '';
    // Wide frame should be longer than narrow
    expect(wide.length).toBeGreaterThan(narrow.length);
  });

  it('focused row has the vertical bar indicator', async () => {
    const { AgentTable } = await import('../../../src/tui/components/AgentTable.js');
    const store = makeMockStore({ focusedAgentIndex: 0 });
    const { lastFrame } = render(React.createElement(AgentTable, { store, columns: 100 }));
    vi.runAllTimers();
    const frame = lastFrame() || '';
    // U+258E is the vertical bar indicator used for focus highlight
    expect(frame).toContain('\u258E');
  });

  it('renders header row', async () => {
    const { AgentTable } = await import('../../../src/tui/components/AgentTable.js');
    const store = makeMockStore();
    const { lastFrame } = render(React.createElement(AgentTable, { store, columns: 100 }));
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).toContain('ID');
    expect(frame).toContain('Name');
    expect(frame).toContain('Path');
  });

  it('shows resolved counts instead of placeholder question marks', async () => {
    const { AgentTable } = await import('../../../src/tui/components/AgentTable.js');
    const store = makeMockStore();
    const { lastFrame } = render(React.createElement(AgentTable, { store, columns: 100 }));
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).not.toContain('?');
  });
});
