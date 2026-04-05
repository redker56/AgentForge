/**
 * SkillsScreen component tests.
 * Verifies responsive layout variants and summary bar rendering.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from 'ink-testing-library';

describe('SkillsScreen', () => {
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

  const mockSkills = [
    { name: 'alpha', syncedTo: ['claude'], source: { type: 'git' as const }, exists: true, createdAt: '2025-01-01' },
    { name: 'beta', syncedTo: [], source: { type: 'git' as const }, exists: true, createdAt: '2025-02-01' },
  ];

  function makeMockStore(overrides?: Partial<Record<string, unknown>>) {
    // Cache state object to satisfy zustand's getSnapshot stability requirement
    const state = {
      skills: mockSkills,
      focusedSkillIndex: 0,
      selectedSkillNames: new Set<string>(),
      detailOverlayVisible: false,
      skillDetails: {},
      agentDetails: {},
      projectDetails: {},
      loading: { skills: false },
      activeTab: 'skills' as const,
      loadSkillDetail: vi.fn(),
      loadAgentDetail: vi.fn(),
      loadProjectDetail: vi.fn(),
      ...overrides,
    };
    return {
      getState: () => state,
      subscribe: vi.fn(() => () => {}),
    };
  }

  it('exports SkillsScreen component', async () => {
    const { SkillsScreen } = await import('../../../src/tui/screens/SkillsScreen.js');
    expect(SkillsScreen).toBeDefined();
    expect(typeof SkillsScreen).toBe('function');
  });

  it('renders summary bar in widescreen', async () => {
    const { SkillsScreen } = await import('../../../src/tui/screens/SkillsScreen.js');
    const store = makeMockStore();
    const { lastFrame } = render(
      React.createElement(SkillsScreen, { store, band: 'widescreen' as const, columns: 150 })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).toContain('skills total');
    expect(frame).toContain('synced to agents');
    expect(frame).toContain('Last update');
  });

  it('renders full list in standard band', async () => {
    const { SkillsScreen } = await import('../../../src/tui/screens/SkillsScreen.js');
    const store = makeMockStore();
    const { lastFrame } = render(
      React.createElement(SkillsScreen, { store, band: 'standard' as const, columns: 100 })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).toContain('alpha');
    expect(frame).toContain('skills total');
  });

  it('returns null in compact band', async () => {
    const { SkillsScreen } = await import('../../../src/tui/screens/SkillsScreen.js');
    const store = makeMockStore();
    const { lastFrame } = render(
      React.createElement(SkillsScreen, { store, band: 'compact' as const, columns: 60 })
    );
    vi.runAllTimers();
    // Should render nothing (compact is handled at App level)
    expect(lastFrame()).toBe('');
  });

  it('renders split-pane layout in widescreen', async () => {
    const { SkillsScreen } = await import('../../../src/tui/screens/SkillsScreen.js');
    const store = makeMockStore({ detailOverlayVisible: false });
    const { lastFrame } = render(
      React.createElement(SkillsScreen, { store, band: 'widescreen' as const, columns: 150 })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    // In widescreen, both list and detail render side by side
    expect(frame).toContain('alpha');
  });
});
