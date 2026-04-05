/**
 * ErrorMessage component test
 */

import { describe, expect, it } from 'vitest';
import React from 'react';

describe('ErrorMessage', () => {
  it('exports ErrorMessage component', async () => {
    const { ErrorMessage } = await import('../../../src/tui/components/ErrorMessage.js');
    expect(ErrorMessage).toBeDefined();
    expect(typeof ErrorMessage).toBe('function');
  });

  it('ErrorMessage renders a React element', async () => {
    const { ErrorMessage } = await import('../../../src/tui/components/ErrorMessage.js');
    const element = React.createElement(ErrorMessage, { message: 'Test error' });
    expect(element.type).toBe(ErrorMessage);
  });
});
