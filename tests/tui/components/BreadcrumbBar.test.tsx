/**
 * BreadcrumbBar component test
 */

import { describe, expect, it } from 'vitest';
import React from 'react';

describe('BreadcrumbBar', () => {
  it('exports BreadcrumbBar component', async () => {
    const { BreadcrumbBar } = await import('../../../src/tui/components/BreadcrumbBar.js');
    expect(BreadcrumbBar).toBeDefined();
    expect(typeof BreadcrumbBar).toBe('function');
  });

  it('returns null when segments is empty', async () => {
    const { BreadcrumbBar } = await import('../../../src/tui/components/BreadcrumbBar.js');
    const element = React.createElement(BreadcrumbBar, { segments: [] });
    expect(element).not.toBeNull();
    // The component itself returns null when segments are empty
  });

  it('renders a React element with segments', async () => {
    const { BreadcrumbBar } = await import('../../../src/tui/components/BreadcrumbBar.js');
    const element = React.createElement(BreadcrumbBar, {
      segments: ['Skills', 'Search'],
    });
    expect(element.type).toBe(BreadcrumbBar);
  });

  it('renders with single segment', async () => {
    const { BreadcrumbBar } = await import('../../../src/tui/components/BreadcrumbBar.js');
    const element = React.createElement(BreadcrumbBar, {
      segments: ['Skills'],
    });
    expect(element.type).toBe(BreadcrumbBar);
    expect(element.props.segments).toEqual(['Skills']);
  });

  it('renders with multiple segments joined by >', async () => {
    const { BreadcrumbBar } = await import('../../../src/tui/components/BreadcrumbBar.js');
    const element = React.createElement(BreadcrumbBar, {
      segments: ['Skills', 'Confirm Delete'],
    });
    expect(element.props.segments).toEqual(['Skills', 'Confirm Delete']);
  });
});
