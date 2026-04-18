/**
 * TabBar component tests.
 * Verifies active tab styling and symbol fallback at narrow widths.
 */

import { render, cleanup } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { withLegacyUiState } from '../helpers/legacyUiState.js';

describe('TabBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
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
    const state = withLegacyUiState({
      activeTab: 'skills',
      ...overrides,
    });
    return {
      getState: () => state,
      subscribe: vi.fn(() => () => {}),
    };
  }

  it('exports TabBar component', async () => {
    const { TabBar } = await import('../../../src/tui/components/TabBar.js');
    expect(TabBar).toBeDefined();
    expect(typeof TabBar).toBe('function');
  });

  it('renders AgentForge title', async () => {
    const { TabBar } = await import('../../../src/tui/components/TabBar.js');
    const store = makeMockStore();
    const { lastFrame } = render(
      React.createElement(TabBar, { store, band: 'widescreen', columns: 120 })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).toContain('AgentForge');
  });

  it('renders full tab labels at widescreen', async () => {
    const { TabBar } = await import('../../../src/tui/components/TabBar.js');
    const store = makeMockStore();
    const { lastFrame } = render(
      React.createElement(TabBar, { store, band: 'widescreen', columns: 150 })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    // Active tab has brackets, inactive tabs just show label
    expect(frame).toContain('[Skills]');
    expect(frame).toContain('Agents');
    expect(frame).toContain('Projects');
    expect(frame).toContain('Sync');
    expect(frame).toContain('Import');
  });

  it('renders symbol fallback at compact band', async () => {
    const { TabBar } = await import('../../../src/tui/components/TabBar.js');
    const store = makeMockStore();
    const { lastFrame } = render(
      React.createElement(TabBar, { store, band: 'compact', columns: 60 })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    // Symbol fallback uses [S] for active tab, just letters for inactive
    expect(frame).toContain('[S]');
    expect(frame).toContain('A');
    expect(frame).toContain('P');
    expect(frame).toContain('Sy');
    expect(frame).toContain('I');
  });

  it('renders symbol fallback when columns < 60', async () => {
    const { TabBar } = await import('../../../src/tui/components/TabBar.js');
    const store = makeMockStore();
    const { lastFrame } = render(
      React.createElement(TabBar, { store, band: 'standard', columns: 50 })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).toContain('[S]');
    expect(frame).toContain('A');
    expect(frame).toContain('P');
  });
});
