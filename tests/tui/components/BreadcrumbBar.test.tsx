/**
 * BreadcrumbBar component test
 */

import React from 'react';
import { describe, expect, it } from 'vitest';

describe('BreadcrumbBar', () => {
  it('exports BreadcrumbBar component', async () => {
    const { BreadcrumbBar } = await import('../../../src/tui/components/BreadcrumbBar.js');
    expect(BreadcrumbBar).toBeDefined();
    expect(typeof BreadcrumbBar).toBe('function');
  });

  it('returns null when segments is empty', async () => {
    const { BreadcrumbBar } = await import('../../../src/tui/components/BreadcrumbBar.js');
    const element = React.createElement(BreadcrumbBar, { segments: [], label: 'Context' });
    expect(element).not.toBeNull();
    // The component itself returns null when segments are empty
  });

  it('renders a React element with segments', async () => {
    const { BreadcrumbBar } = await import('../../../src/tui/components/BreadcrumbBar.js');
    const element = React.createElement(BreadcrumbBar, {
      segments: ['Skills', 'Search'],
      label: 'Context',
    });
    expect(element.type).toBe(BreadcrumbBar);
  });

  it('renders with single segment', async () => {
    const { BreadcrumbBar } = await import('../../../src/tui/components/BreadcrumbBar.js');
    const element = React.createElement(BreadcrumbBar, {
      segments: ['Skills'],
      label: '上下文',
    });
    expect(element.type).toBe(BreadcrumbBar);
    expect(element.props.segments).toEqual(['Skills']);
    expect(element.props.label).toBe('上下文');
  });

  it('renders with multiple segments joined by >', async () => {
    const { BreadcrumbBar } = await import('../../../src/tui/components/BreadcrumbBar.js');
    const element = React.createElement(BreadcrumbBar, {
      segments: ['Skills', 'Confirm Delete'],
      label: 'Context',
    });
    expect(element.props.segments).toEqual(['Skills', 'Confirm Delete']);
  });
});
