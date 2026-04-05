/**
 * Inline progress bar component showing a labeled bar with percentage fill.
 * Used during sync, unsync, and update operations.
 *
 * Pure display component -- no state, no input handling.
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { ProgressItem } from '../store/uiSlice.js';

interface ProgressBarProps {
  label: string;
  progress: number; // 0-100
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
  width?: number; // Bar width in characters, defaults to 30
  columns?: number; // Terminal columns for adaptive width
  completed?: number; // Completed count for display
  total?: number; // Total count for display
}

const FULL_BLOCK = '\u2588';
const LIGHT_SHADE = '\u2591';
const BAR_WIDTH = 30;

const STATUS_COLOR: Record<string, string> = {
  running: 'cyan',
  success: 'green',
  error: 'red',
  pending: 'gray',
};

export function ProgressBar({ label, progress, status, error, width, columns, completed, total }: ProgressBarProps): React.ReactElement {
  // Adaptive width: columns > 120 -> scale up, otherwise 30, min 15
  const baseWidth = typeof width === 'number' ? width :
    typeof columns === 'number' && columns > 120 ? Math.max(50, Math.min(60, columns - 70)) : 30;
  const barWidth = Math.max(15, baseWidth);

  const filled = Math.round((progress / 100) * barWidth);
  const empty = barWidth - filled;
  const color = STATUS_COLOR[status] || 'gray';

  const bar = FULL_BLOCK.repeat(Math.max(0, filled)) + LIGHT_SHADE.repeat(Math.max(0, empty));

  return (
    <Box flexDirection="row" flexWrap="wrap">
      <Text>{truncate(label, 28).padEnd(28)}</Text>
      <Text>{' ['}</Text>
      <Text color={color}>{bar}</Text>
      <Text>{'] '}</Text>
      <Text>{String(progress).padStart(3)}%</Text>
      {typeof completed === 'number' && typeof total === 'number' && (
        <Text> ({completed}/{total})</Text>
      )}
    </Box>
  );
}

export function ProgressBarStack({ items }: { items: ProgressItem[] }): React.ReactElement {
  return (
    <Box flexDirection="column">
      {items.map((item) => (
        <ProgressBar
          key={item.id}
          label={item.label}
          progress={item.progress}
          status={item.status}
          error={item.error}
        />
      ))}
    </Box>
  );
}

function truncate(s: string, maxLen: number): string {
  return s.length > maxLen ? s.slice(0, maxLen - 1) + '…' : s;
}
