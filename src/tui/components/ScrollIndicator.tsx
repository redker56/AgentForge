/**
 * Scroll edge indicator component.
 * Renders "^ N more" above a scrollable list when items are hidden above,
 * and "v N more" below the list when items are hidden below.
 */

import React from 'react';
import { Text } from 'ink';

interface ScrollIndicatorProps {
  hiddenAbove: number;
  hiddenBelow: number;
  columns: number;
  position: 'above' | 'below';
}

export function ScrollIndicator({
  hiddenAbove,
  hiddenBelow,
  columns,
  position,
}: ScrollIndicatorProps): React.ReactElement | null {
  const count = position === 'above' ? hiddenAbove : hiddenBelow;
  if (count <= 0) return null;

  const arrow = position === 'above' ? '^' : 'v';
  const maxWidth = Math.max(columns - 2, 4);
  const text = `${arrow} ${count} more`.padEnd(maxWidth).slice(0, maxWidth);

  return (
    <Text dimColor>{text}</Text>
  );
}
