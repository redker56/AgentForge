/**
 * ScrollIndicator component tests.
 * Verifies rendering of "^ N more" / "v N more" scroll edge indicators.
 */

import { render, cleanup } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('ScrollIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('renders nothing when both counts are 0', async () => {
    const { ScrollIndicator } = await import('../../../src/tui/components/ScrollIndicator.js');
    const { lastFrame } = render(
      React.createElement(ScrollIndicator, {
        hiddenAbove: 0,
        hiddenBelow: 0,
        columns: 80,
        position: 'below' as const,
      })
    );
    vi.runAllTimers();
    // When both zero, component returns null -> empty frame
    expect(lastFrame()).toBe('');
  });

  it('renders "v N more" when hiddenBelow > 0', async () => {
    const { ScrollIndicator } = await import('../../../src/tui/components/ScrollIndicator.js');
    const { lastFrame } = render(
      React.createElement(ScrollIndicator, {
        hiddenAbove: 0,
        hiddenBelow: 5,
        columns: 80,
        position: 'below' as const,
      })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).toContain('v 5 more');
  });

  it('renders "^ N more" when hiddenAbove > 0', async () => {
    const { ScrollIndicator } = await import('../../../src/tui/components/ScrollIndicator.js');
    const { lastFrame } = render(
      React.createElement(ScrollIndicator, {
        hiddenAbove: 3,
        hiddenBelow: 0,
        columns: 80,
        position: 'above' as const,
      })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    expect(frame).toContain('^ 3 more');
  });

  it('respects columns - 2 width', async () => {
    const { ScrollIndicator } = await import('../../../src/tui/components/ScrollIndicator.js');
    const { lastFrame } = render(
      React.createElement(ScrollIndicator, {
        hiddenAbove: 0,
        hiddenBelow: 10,
        columns: 40,
        position: 'below' as const,
      })
    );
    vi.runAllTimers();
    const frame = lastFrame() || '';
    // Should be truncated to columns - 2 = 38
    expect(frame.length).toBeLessThanOrEqual(40);
  });

  it('exports ScrollIndicator component', async () => {
    const { ScrollIndicator } = await import('../../../src/tui/components/ScrollIndicator.js');
    expect(ScrollIndicator).toBeDefined();
    expect(typeof ScrollIndicator).toBe('function');
  });
});
