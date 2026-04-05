/**
 * Shared navigation hook for table/list components.
 * Encapsulates focus tracking and virtual scrolling.
 */

import { useState, useEffect } from 'react';
import { useStdout } from 'ink';

interface NavigationOptions<T> {
  items: T[];
  focusedIndex: number;
  visibleHeight?: number;
}

export interface NavigationResult<T> {
  focusedItem: T | null;
  visibleItems: T[];
  scrollTop: number;
  hiddenAbove: number;
  hiddenBelow: number;
}

export function useNavigation<T>(opts: NavigationOptions<T>): NavigationResult<T> {
  const { items, focusedIndex, visibleHeight: explicitHeight } = opts;
  const { stdout } = useStdout();

  const terminalHeight = stdout?.rows ?? 24;
  const visibleHeight = explicitHeight ?? Math.max(terminalHeight - 6, 3);

  const [scrollTop, setScrollTop] = useState(0);

  // Auto-adjust scrollTop to keep focused item visible
  useEffect(() => {
    if (focusedIndex < scrollTop) {
      setScrollTop(focusedIndex);
    } else if (focusedIndex >= scrollTop + visibleHeight) {
      setScrollTop(focusedIndex - visibleHeight + 1);
    }
  }, [focusedIndex, visibleHeight, scrollTop]);

  const focusedItem = items[focusedIndex] ?? null;
  const visibleItems = items.slice(scrollTop, scrollTop + visibleHeight);
  const hiddenAbove = scrollTop;
  const hiddenBelow = Math.max(items.length - scrollTop - visibleItems.length, 0);

  return { focusedItem, visibleItems, scrollTop, hiddenAbove, hiddenBelow };
}
