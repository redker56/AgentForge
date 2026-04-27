import { describe, expect, it } from 'vitest';

import {
  getDisplayWidth,
  padDisplayText,
  truncateDisplayText,
} from '../../../src/tui/utils/displayWidth.js';

describe('displayWidth utils', () => {
  it('truncates wide text without exceeding the target display width', () => {
    const truncated = truncateDisplayText('\u4e2d\u6587\u6280\u80fd\u540d\u79f0', 7);

    expect(getDisplayWidth(truncated)).toBeLessThanOrEqual(7);
    expect(truncated).toMatch(/\.\.\.$/);
  });

  it('pads wide text by display width instead of string length', () => {
    const padded = padDisplayText('\u4e2d\u6587', 6);

    expect(getDisplayWidth(padded)).toBe(6);
    expect(padded.endsWith('  ')).toBe(true);
  });
});
