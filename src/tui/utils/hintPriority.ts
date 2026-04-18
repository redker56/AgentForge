/**
 * StatusBar hint ranking and truncation utility.
 *
 * Accepts typed hint specs, sorts by priority, truncates by band and available
 * width, and returns HintSegment[] with per-segment color hints for Ink rendering.
 */

import type { WidthBand } from '../hooks/useTerminalDimensions.js';

export interface HintSpec {
  key: string;
  label: string;
  priority: number;
  /** 'destructive' | 'creation' | 'utility' -- drives default color */
  category?: 'destructive' | 'creation' | 'utility';
}

export interface HintSegment {
  key: string;
  label: string;
  color?: string;
}

export interface HintResult {
  segments: HintSegment[];
}

/**
 * Global hints that are always shown (subject to band truncation).
 */
export const GLOBAL_CONTEXT_HINTS: HintSpec[] = [
  { key: '/', label: 'Search', priority: 10, category: 'utility' },
  { key: '?', label: 'Help', priority: 11, category: 'utility' },
  { key: 'q', label: 'Quit', priority: 1, category: 'utility' },
];

export function dedupeHints(hints: HintSpec[]): HintSpec[] {
  const seen = new Set<string>();
  return hints.filter((hint) => {
    const key = `${hint.key}::${hint.label}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function defaultSegmentColor(hint: HintSpec): string {
  if (hint.category === 'destructive') return 'yellow';
  if (hint.category === 'creation') return 'cyan';
  return 'gray';
}

/**
 * Rank hints by priority, truncate by band, then filter by available width.
 */
export function rankAndTruncateHints(
  contextHints: HintSpec[],
  band: WidthBand,
  availableWidth: number
): HintResult {
  // Sort context hints by priority (lower = more important)
  const sortedContext = dedupeHints(contextHints).sort((a, b) => a.priority - b.priority);

  // Determine allowed context hints and global hints by band
  let contextLimit: number;
  let includeSearch: boolean;
  let includeHelp: boolean;
  // Quit (q) is always included

  if (band === 'compact') {
    contextLimit = 1;
    includeSearch = false;
    includeHelp = false;
  } else if (band === 'standard') {
    contextLimit = 2;
    includeSearch = true;
    includeHelp = false;
  } else {
    // widescreen
    contextLimit = sortedContext.length;
    includeSearch = true;
    includeHelp = true;
  }

  const selectedContext = sortedContext.slice(0, contextLimit);

  // Build global hints
  const selectedGlobal: HintSpec[] = [];
  if (includeSearch) {
    const searchHint = GLOBAL_CONTEXT_HINTS.find((h) => h.key === '/');
    if (searchHint) selectedGlobal.push(searchHint);
  }
  if (includeHelp) {
    const helpHint = GLOBAL_CONTEXT_HINTS.find((h) => h.key === '?');
    if (helpHint) selectedGlobal.push(helpHint);
  }
  const quitHint = GLOBAL_CONTEXT_HINTS.find((h) => h.key === 'q');
  if (quitHint) selectedGlobal.push(quitHint);

  // Combine: context hints first, then global hints
  const allHints = [...selectedContext, ...selectedGlobal];

  if (availableWidth <= 0) {
    return { segments: [] };
  }

  let totalWidth = 0;
  const finalHints: HintSpec[] = [];
  const ordered = [...allHints].sort((a, b) => a.priority - b.priority);
  for (const hint of ordered) {
    const baseWidth = hint.key.length + 1 + hint.label.length; // "k:label"
    const separatorWidth = finalHints.length === 0 ? 0 : 4; // " / "
    if (totalWidth + separatorWidth + baseWidth <= availableWidth) {
      totalWidth += separatorWidth + baseWidth;
      finalHints.push(hint);
    }
  }

  // Convert to segments with colors
  const segments: HintSegment[] = finalHints.map((hint) => ({
    key: hint.key,
    label: hint.label,
    color: defaultSegmentColor(hint),
  }));

  return { segments };
}
