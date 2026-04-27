import { Box, Text } from 'ink';
import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { FixedText, fixedWidthText } from '../../../src/tui/components/FixedText.js';
import { getDisplayWidth } from '../../../src/tui/utils/displayWidth.js';

describe('FixedText', () => {
  it('renders a fixed display-width text cell for wide characters', () => {
    const { lastFrame } = render(
      <Box flexDirection="row">
        <FixedText width={6}>{'\u4e2d\u6587\u6280\u80fd'}</FixedText>
        <Text>|</Text>
      </Box>
    );
    const output = lastFrame() ?? '';
    const cell = output.split('|')[0] ?? '';

    expect(getDisplayWidth(cell)).toBe(6);
  });

  it('can truncate without right padding', () => {
    const output = fixedWidthText('\u4e2d\u6587\u6280\u80fd', 5, false);

    expect(getDisplayWidth(output)).toBeLessThanOrEqual(5);
    expect(output.endsWith(' ')).toBe(false);
  });
});
