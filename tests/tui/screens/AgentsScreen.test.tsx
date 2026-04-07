/**
 * AgentsScreen component tests.
 * Verifies rendering, detail loading, and compact band handling.
 */

import { render, cleanup } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('AgentsScreen', () => {
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
    { id: 'claude', name: 'Claude Code', basePath: '/home/user/.claude/skills' },
    { id: 'codex', name: 'Codex', basePath: '/home/user/.codex/skills' },
  ];

  function makeMockStore(overrides?: Partial<Record<string, unknown>>) {
    const state = {
      agents: mockAgents,
      focusedAgentIndex: 0,
      agentDetails: {},
      expandedAgentIds: new Set<string>(),
      loading: { agents: false },
      loadAgentDetail: vi.fn(),
      ...overrides,
    };
    return {
      getState: () => state,
      subscribe: vi.fn(() => () => {}),
    };
  }

  it('exports AgentsScreen component', async () => {
    const { AgentsScreen } = await import('../../../src/tui/screens/AgentsScreen.js');
    expect(AgentsScreen).toBeDefined();
    expect(typeof AgentsScreen).toBe('function');
  });

  it('renders AgentTable in standard band', async () => {
    const { AgentsScreen } = await import('../../../src/tui/screens/AgentsScreen.js');
    const store = makeMockStore();
    const { lastFrame } = render(
      React.createElement(AgentsScreen, { store, band: 'standard' as const, columns: 100 })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).toContain('Claude Code');
  });

  it('returns null in compact band', async () => {
    const { AgentsScreen } = await import('../../../src/tui/screens/AgentsScreen.js');
    const store = makeMockStore();
    const { lastFrame } = render(
      React.createElement(AgentsScreen, { store, band: 'compact' as const, columns: 60 })
    );
    vi.runAllTimers();
    expect(lastFrame()).toBe('');
  });

  it('loads agent detail when focused agent changes', async () => {
    const loadAgentDetail = vi.fn();
    const { AgentsScreen } = await import('../../../src/tui/screens/AgentsScreen.js');
    const store = makeMockStore({ focusedAgentIndex: 0, loadAgentDetail });
    render(
      React.createElement(AgentsScreen, { store, band: 'standard' as const, columns: 100 })
    );
    vi.runAllTimers();
    // useEffect triggers loadAgentDetail when focused agent changes and detail not loaded
    expect(loadAgentDetail).toHaveBeenCalledWith('claude');
  });

  it('does not load agent detail if already loaded', async () => {
    const loadAgentDetail = vi.fn();
    const { AgentsScreen } = await import('../../../src/tui/screens/AgentsScreen.js');
    const store = makeMockStore({
      focusedAgentIndex: 0,
      loadAgentDetail,
      agentDetails: {
        claude: {
          userLevelSkills: [],
          projectLevelSkills: [],
        },
      },
    });
    render(
      React.createElement(AgentsScreen, { store, band: 'standard' as const, columns: 100 })
    );
    vi.runAllTimers();
    // Should not call loadAgentDetail since detail already exists
    expect(loadAgentDetail).not.toHaveBeenCalled();
  });
});
