/**
 * SearchOverlay component test
 */

import { render, cleanup } from 'ink-testing-library';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('SearchOverlay', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('ink', async (importOriginal) => {
      const actual = await importOriginal<typeof import('ink')>();
      return {
        ...actual,
        useStdout: () => ({
          stdout: { columns: 100, rows: 30 },
        }),
      };
    });
  });

  afterEach(() => {
    vi.doUnmock('ink');
    cleanup();
  });

  it('exports SearchOverlay component', async () => {
    const { SearchOverlay } = await import('../../../src/tui/components/SearchOverlay.js');
    expect(SearchOverlay).toBeDefined();
    expect(typeof SearchOverlay).toBe('function');
  });

  it('no longer exports module-level searchResultIndex functions', async () => {
    // After Sprint 2 rewrite, module-level state is removed
    const module = await import('../../../src/tui/components/SearchOverlay.js');
    expect((module as Record<string, unknown>).searchResultIndex).toBeUndefined();
    expect((module as Record<string, unknown>).resetSearchResultIndex).toBeUndefined();
    expect((module as Record<string, unknown>).incrementSearchResultIndex).toBeUndefined();
    expect((module as Record<string, unknown>).decrementSearchResultIndex).toBeUndefined();
    expect((module as Record<string, unknown>).getSearchResultIndex).toBeUndefined();
    expect((module as Record<string, unknown>).setSearchResultIndex).toBeUndefined();
  });

  it('renders a React element with store prop', async () => {
    const { SearchOverlay } = await import('../../../src/tui/components/SearchOverlay.js');
    const mockStore = {
      getState: () => ({
        searchQuery: 'test',
        searchResultIndex: 0,
        skills: [{ name: 'test-skill' }],
        agents: [],
        projects: [],
        showSearch: true,
      }),
      subscribe: () => () => {},
    };
    const element = React.createElement(SearchOverlay, { store: mockStore });
    expect(element.type).toBe(SearchOverlay);
  });

  it('uses static cursor in source', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/tui/components/SearchOverlay.tsx'),
      'utf-8',
    );

    // Static cursor (no blinking to avoid Ink re-render flicker)
    expect(source).toContain('\\u2588');
    expect(source).not.toContain('cursorVisible');
    expect(source).not.toContain('setInterval');
  });

  it('uses bold accent color match highlighting in source', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/tui/components/SearchOverlay.tsx'),
      'utf-8',
    );

    // Should have HighlightedText component using bold + accent color
    expect(source).toContain('HighlightedText');
    expect(source).toContain('bold');
    expect(source).toContain('inkColors.accent');
    expect(source).toContain('matchIndices');
  });

  it('shows result count in source', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/tui/components/SearchOverlay.tsx'),
      'utf-8',
    );

    // Should display result count text
    expect(source).toContain('result');
  });

  it('keeps a stable result area height when result counts change', async () => {
    const { SearchOverlay } = await import('../../../src/tui/components/SearchOverlay.js');
    const oneResultState = {
      searchQuery: 'obsi',
      searchResultIndex: 0,
      skills: [{ name: 'obsidian-cli' }],
      agents: [],
      projects: [],
      activeTab: 'skills',
      showSearch: true,
      setShowSearch: vi.fn(),
      setActiveTab: vi.fn(),
      setFocusedSkillIndex: vi.fn(),
      setFocusedAgentIndex: vi.fn(),
      setFocusedProjectIndex: vi.fn(),
      setSearchResultIndex: vi.fn(),
      setSearchQuery: vi.fn(),
    };
    const oneResultStore = {
      getState: () => oneResultState,
      subscribe: () => () => {},
    };
    const threeResultState = {
      searchQuery: 'obsi',
      searchResultIndex: 0,
      skills: [{ name: 'obsidian-cli' }, { name: 'obsidian-bases' }, { name: 'obsidian-markdown' }],
      agents: [],
      projects: [],
      activeTab: 'skills',
      showSearch: true,
      setShowSearch: vi.fn(),
      setActiveTab: vi.fn(),
      setFocusedSkillIndex: vi.fn(),
      setFocusedAgentIndex: vi.fn(),
      setFocusedProjectIndex: vi.fn(),
      setSearchResultIndex: vi.fn(),
      setSearchQuery: vi.fn(),
    };
    const threeResultStore = {
      getState: () => threeResultState,
      subscribe: () => () => {},
    };

    const oneFrame = render(React.createElement(SearchOverlay, { store: oneResultStore })).lastFrame() ?? '';
    const threeFrame = render(React.createElement(SearchOverlay, { store: threeResultStore })).lastFrame() ?? '';

    expect(oneFrame.split('\n').length).toBe(threeFrame.split('\n').length);
  });
});
