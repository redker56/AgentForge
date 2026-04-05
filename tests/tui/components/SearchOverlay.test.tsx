/**
 * SearchOverlay component test
 */

import { describe, expect, it } from 'vitest';
import React from 'react';

describe('SearchOverlay', () => {
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
});
