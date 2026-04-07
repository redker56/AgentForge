/**
 * SkillList component tests.
 * Verifies focus highlight, checkbox display, scroll indicators, empty state.
 */

import { render, cleanup } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('SkillList', () => {
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
    { name: 'gamma', syncedTo: ['codex'], source: { type: 'local' as const }, exists: true, createdAt: '2025-03-01' },
  ];

  function makeMockStore(overrides?: Partial<Record<string, unknown>>) {
    // Cache state object to satisfy zustand's getSnapshot stability requirement
    const state = {
      skills: mockSkills,
      focusedSkillIndex: 0,
      selectedSkillNames: new Set<string>(),
      detailOverlayVisible: false,
      skillDetails: {},
      loadSkillDetail: vi.fn(),
      ...overrides,
    };
    return {
      getState: () => state,
      subscribe: vi.fn(() => () => {}),
    };
  }

  it('exports SkillList component', async () => {
    const { SkillList } = await import('../../../src/tui/components/SkillList.js');
    expect(SkillList).toBeDefined();
    expect(typeof SkillList).toBe('function');
  });

  it('renders empty state when no skills', async () => {
    const { SkillList } = await import('../../../src/tui/components/SkillList.js');
    const store = makeMockStore({ skills: [] });
    const { lastFrame } = render(
      React.createElement(SkillList, { store, columns: 100 })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).toContain('No skills installed');
  });

  it('renders skill names', async () => {
    const { SkillList } = await import('../../../src/tui/components/SkillList.js');
    const store = makeMockStore();
    const { lastFrame } = render(
      React.createElement(SkillList, { store, columns: 100 })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).toContain('alpha');
    expect(frame).toContain('beta');
    expect(frame).toContain('gamma');
  });

  it('focused row has background highlight indicator', async () => {
    const { SkillList } = await import('../../../src/tui/components/SkillList.js');
    const store = makeMockStore({ focusedSkillIndex: 0 });
    const { lastFrame } = render(
      React.createElement(SkillList, { store, columns: 100 })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    // The focused row should contain the vertical bar character (U+258E)
    expect(frame).toContain('\u258E');
  });

  it('unselected skills have no checkbox marker', async () => {
    const { SkillList } = await import('../../../src/tui/components/SkillList.js');
    const store = makeMockStore({ selectedSkillNames: new Set<string>() });
    const { lastFrame } = render(
      React.createElement(SkillList, { store, columns: 100 })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    // No [+] markers when no skills are selected
    expect(frame).not.toContain('[+]');
  });

  it('selected skills show [+] checkbox', async () => {
    const { SkillList } = await import('../../../src/tui/components/SkillList.js');
    const store = makeMockStore({ selectedSkillNames: new Set(['alpha']) });
    const { lastFrame } = render(
      React.createElement(SkillList, { store, columns: 100 })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    // Updated to use [+] selection marker
    expect(frame).toContain('[+]');
  });

  it('renders status dots correctly', async () => {
    // alpha has syncedTo=['claude'], exists=true -> filled green dot (U+25CF)
    // beta has syncedTo=[], exists=true -> hollow gray dot (U+25CB)
    const { SkillList } = await import('../../../src/tui/components/SkillList.js');
    const store = makeMockStore();
    const { lastFrame } = render(
      React.createElement(SkillList, { store, columns: 100 })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    // alpha should have filled circle (U+25CF)
    expect(frame).toContain('\u25CF');
  });

  it('renders source types correctly', async () => {
    const { SkillList } = await import('../../../src/tui/components/SkillList.js');
    const store = makeMockStore();
    const { lastFrame } = render(
      React.createElement(SkillList, { store, columns: 100 })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).toContain('[git]');
    expect(frame).toContain('[local]');
  });
});
