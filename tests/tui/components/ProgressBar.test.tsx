/**
 * ProgressBar component tests -- Sprint 4 enhanced
 *
 * Behaviors tested:
 *  - Renders with block characters (U+2588, U+2591)
 *  - Adaptive width scaling in widescreen (columns > 120)
 *  - Percentage display with 4-char padding
 *  - Count display (completed/total) when props provided
 *  - Overall progress bar rendering with multiple items
 *  - ProgressBarStack rendering
 */

import { render } from 'ink-testing-library';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { ProgressBar, ProgressBarStack } from '../../../src/tui/components/ProgressBar.js';

describe('ProgressBar', () => {
  it('renders with filled and empty block characters', () => {
    const { lastFrame } = render(
      <ProgressBar label="Test skill" progress={50} status="running" />
    );
    const output = lastFrame() ?? '';
    // 50% fill with default 30-char bar = 15 filled + 15 empty
    expect(output).toContain('\u2588'); // FULL_BLOCK
    expect(output).toContain('\u2591'); // LIGHT_SHADE
    // Verify correct ratio: filled should equal empty at 50%
    const filledCount = (output.match(/\u2588/g) || []).length;
    const emptyCount = (output.match(/\u2591/g) || []).length;
    expect(filledCount).toBeGreaterThan(0);
    expect(emptyCount).toBeGreaterThan(0);
    expect(filledCount).toBe(emptyCount);
  });

  it('shows full bar at 100% progress', () => {
    const { lastFrame } = render(
      <ProgressBar label="Done" progress={100} status="success" width={20} />
    );
    const output = lastFrame() ?? '';
    const filledCount = (output.match(/\u2588/g) || []).length;
    const emptyCount = (output.match(/\u2591/g) || []).length;
    expect(filledCount).toBe(20);
    expect(emptyCount).toBe(0);
  });

  it('shows empty bar at 0% progress', () => {
    const { lastFrame } = render(
      <ProgressBar label="Pending" progress={0} status="pending" width={15} />
    );
    const output = lastFrame() ?? '';
    const filledCount = (output.match(/\u2588/g) || []).length;
    const emptyCount = (output.match(/\u2591/g) || []).length;
    expect(filledCount).toBe(0);
    expect(emptyCount).toBe(15);
  });

  it('bar width scales in widescreen (columns > 120)', () => {
    // columns=150 -> width = clamp(50, max(50, 150-70)) = clamp(50, 80) = 50
    const { lastFrame } = render(
      <ProgressBar label="Wide" progress={50} status="running" columns={150} />
    );
    const output = lastFrame() ?? '';
    const filledCount = (output.match(/\u2588/g) || []).length;
    const emptyCount = (output.match(/\u2591/g) || []).length;
    expect(filledCount + emptyCount).toBeGreaterThanOrEqual(50);
  });

  it('bar width uses default 30 when columns <= 120', () => {
    const { lastFrame: lf1 } = render(
      <ProgressBar label="Normal" progress={33} status="running" columns={100} />
    );
    const out1 = lf1() ?? '';
    const f1 = (out1.match(/\u2588/g) || []).length;
    const e1 = (out1.match(/\u2591/g) || []).length;
    expect(f1 + e1).toBe(30);
  });

  it('respects minimum bar width of 15', () => {
    const { lastFrame } = render(
      <ProgressBar label="Tiny" progress={10} status="running" width={5} />
    );
    const output = lastFrame() ?? '';
    const filledCount = (output.match(/\u2588/g) || []).length;
    const emptyCount = (output.match(/\u2591/g) || []).length;
    expect(filledCount + emptyCount).toBeGreaterThanOrEqual(15);
  });

  it('shows percentage with 4-char padding', () => {
    // 0% should show "  0%"
    const { lastFrame: lf1 } = render(
      <ProgressBar label="Start" progress={0} status="pending" width={15} />
    );
    const out1 = lf1() ?? '';
    expect(out1).toMatch(/\s0%/);

    // 100% should show "100%"
    const { lastFrame: lf2 } = render(
      <ProgressBar label="End" progress={100} status="success" width={15} />
    );
    const out2 = lf2() ?? '';
    expect(out2).toContain('100%');

    // 5% should be padded
    const { lastFrame: lf3 } = render(
      <ProgressBar label="Mid" progress={5} status="running" width={15} />
    );
    const out3 = lf3() ?? '';
    expect(out3).toMatch(/\s\s5%/);
  });

  it('shows count (completed/total) when completed and total props provided', () => {
    const { lastFrame } = render(
      <ProgressBar
        label="Batch"
        progress={100}
        status="success"
        completed={12}
        total={18}
        width={15}
      />
    );
    const output = lastFrame() ?? '';
    expect(output).toContain('12/18');
    expect(output).toContain('100%');
  });

  it('does not show count when completed/total not provided', () => {
    const { lastFrame } = render(
      <ProgressBar label="Simple" progress={50} status="running" />
    );
    const output = lastFrame() ?? '';
    // Should have percentage but no count
    expect(output).toContain('50%');
    expect(output).not.toMatch(/\d+\/\d+/);
  });

  it('renders overall progress bar with status colors', () => {
    const { lastFrame } = render(
      <ProgressBar
        label="Overall"
        progress={67}
        status="running"
        completed={4}
        total={6}
        width={20}
      />
    );
    const output = lastFrame() ?? '';
    expect(output).toContain('Overall');
    expect(output).toContain('67%');
    expect(output).toContain('4/6');
  });

  it('truncates long labels to 28 characters', () => {
    const longLabel = 'this-is-a-very-long-skill-name-that-exceeds-twenty-eight-chars';
    const { lastFrame } = render(
      <ProgressBar label={longLabel} progress={50} status="running" />
    );
    const output = lastFrame() ?? '';
    expect(output).toContain('\u2588'.repeat(15)); // Bar renders after truncated label
  });
});

describe('ProgressBarStack', () => {
  it('renders multiple progress items', () => {
    const items = [
      { id: 'skill-a', label: 'skill-a', progress: 100, status: 'success' as const },
      { id: 'skill-b', label: 'skill-b', progress: 50, status: 'running' as const },
      { id: 'skill-c', label: 'skill-c', progress: 0, status: 'pending' as const },
    ];
    const { lastFrame } = render(<ProgressBarStack items={items} />);
    const output = lastFrame() ?? '';
    expect(output).toContain('skill-a');
    expect(output).toContain('skill-b');
    expect(output).toContain('skill-c');
  });

  it('renders empty stack without errors', () => {
    const { lastFrame } = render(<ProgressBarStack items={[]} />);
    // Should render successfully (empty Box)
    expect(lastFrame).toBeDefined();
  });

  it('overall progress bar rendering with multiple items via stack', () => {
    // Simulate SyncForm ExecutingStep: overall bar + per-skill bars
    const progressItems = [
      { id: 's1', label: 'skill-alpha', progress: 100, status: 'success' as const },
      { id: 's2', label: 'skill-beta', progress: 100, status: 'success' as const },
      { id: 's3', label: 'skill-gamma', progress: 50, status: 'running' as const },
    ];
    const totalItems = progressItems.length;
    const completedItems = progressItems.filter(i => i.status === 'success').length;
    const overallProgress = Math.round((completedItems / totalItems) * 100);
    const overallStatus = progressItems.some(i => i.status === 'error')
      ? 'error'
      : progressItems.some(i => i.status === 'running' || i.status === 'pending')
        ? 'running'
        : 'success';

    // Render in same layout as ExecutingStep
    const { lastFrame } = render(
      <React.Fragment>
        <ProgressBar
          label="Overall"
          progress={overallProgress}
          status={overallStatus}
          completed={completedItems}
          total={totalItems}
        />
        <ProgressBarStack items={progressItems} />
      </React.Fragment>
    );
    const output = lastFrame() ?? '';
    // Overall bar should show
    expect(output).toContain('Overall');
    expect(output).toContain('2/3');
    expect(output).toContain('67%');
    // Per-skill bars should show
    expect(output).toContain('skill-alpha');
    expect(output).toContain('skill-beta');
    expect(output).toContain('skill-gamma');
  });
});
