/**
 * hintPriority.ts unit tests.
 * Verifies hint ranking, truncation per band, and segment color output.
 */

import { describe, expect, it } from 'vitest';

import {
  dedupeHints,
  rankAndTruncateHints,
  type HintSpec,
} from '../../../src/tui/utils/hintPriority.js';

const sampleContextHints: HintSpec[] = [
  { key: 'a', label: 'Add', priority: 3, category: 'creation' },
  { key: 'd', label: 'Delete', priority: 1, category: 'destructive' },
  { key: 's', label: 'Sync', priority: 5, category: 'utility' },
  { key: 'i', label: 'Import', priority: 4, category: 'creation' },
];

describe('rankAndTruncateHints', () => {
  it('deduplicates identical hints before ranking', () => {
    const result = dedupeHints([
      { key: 'Esc', label: 'Back', priority: 0, category: 'utility' },
      { key: 'Esc', label: 'Back', priority: 10, category: 'utility' },
      { key: 'q', label: 'Quit', priority: 1, category: 'utility' },
    ]);

    expect(result).toHaveLength(2);
    expect(result.filter((hint) => hint.key === 'Esc')).toHaveLength(1);
  });

  it('compact band returns 1 context hint + q:Quit', () => {
    const result = rankAndTruncateHints(sampleContextHints, 'compact', 80);
    const keys = result.segments.map((s) => s.key);

    expect(keys).toContain('q');
    expect(keys).toContain('d'); // highest priority context hint
    expect(keys.length).toBe(2); // d + q only
  });

  it('standard band returns 2 context hints + / + q', () => {
    const result = rankAndTruncateHints(sampleContextHints, 'standard', 100);
    const keys = result.segments.map((s) => s.key);

    expect(keys).toContain('d'); // priority 1
    expect(keys).toContain('a'); // priority 3 (next highest)
    expect(keys).toContain('/'); // search
    expect(keys).toContain('q'); // quit
    expect(keys.length).toBe(4);
  });

  it('widescreen band returns all context + global hints', () => {
    const result = rankAndTruncateHints(sampleContextHints, 'widescreen', 200);
    const keys = result.segments.map((s) => s.key);

    expect(keys).toContain('d');
    expect(keys).toContain('a');
    expect(keys).toContain('i');
    expect(keys).toContain('s');
    expect(keys).toContain('/');
    expect(keys).toContain('?');
    expect(keys).toContain('q');
  });

  it('hints are sorted by priority (lower = first)', () => {
    const result = rankAndTruncateHints(sampleContextHints, 'widescreen', 200);
    const contextKeys = result.segments.filter(
      (s) => s.key !== '/' && s.key !== '?' && s.key !== 'q'
    );

    // d(1), a(3), i(4), s(5) should come before global hints
    expect(contextKeys[0].key).toBe('d');
    expect(contextKeys[1].key).toBe('a');
  });

  it('destructive hints get yellow color', () => {
    const result = rankAndTruncateHints(sampleContextHints, 'widescreen', 200);
    const deleteSeg = result.segments.find((s) => s.key === 'd');
    expect(deleteSeg).toBeDefined();
    if (deleteSeg) {
      expect(deleteSeg.color).toBe('yellow');
    }
  });

  it('creation hints get cyan color', () => {
    const result = rankAndTruncateHints(sampleContextHints, 'widescreen', 200);
    const addSeg = result.segments.find((s) => s.key === 'a');
    expect(addSeg).toBeDefined();
    if (addSeg) {
      expect(addSeg.color).toBe('cyan');
    }
  });

  it('width truncation drops lowest priority hints', () => {
    const result = rankAndTruncateHints(sampleContextHints, 'widescreen', 30);
    const keys = result.segments.map((s) => s.key);

    // With only 30 chars width, only the highest priority hints fit
    expect(keys).toContain('q'); // q:Quit = 6 chars, always included since priority 1
    expect(result.segments.length).toBeLessThan(7); // should be truncated
  });

  it('empty context hints still returns global hints', () => {
    const result = rankAndTruncateHints([], 'widescreen', 200);
    const keys = result.segments.map((s) => s.key);

    expect(keys).toContain('/');
    expect(keys).toContain('?');
    expect(keys).toContain('q');
  });

  it('non-positive available width returns no segments', () => {
    const result = rankAndTruncateHints(sampleContextHints, 'widescreen', 0);
    expect(result.segments).toHaveLength(0);
  });
});
