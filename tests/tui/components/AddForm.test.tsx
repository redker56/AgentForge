/**
 * AddForm component test
 */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';

describe('AddForm', () => {
  it('exports AddForm component', async () => {
    const { AddForm } = await import('../../../src/tui/components/AddForm.js');
    expect(AddForm).toBeDefined();
    expect(typeof AddForm).toBe('function');
  });

  it('renders a React element', async () => {
    const { AddForm } = await import('../../../src/tui/components/AddForm.js');
    const mockStore = {
      getState: () => ({
        formState: { formType: 'addSkill' as const, data: {} },
        setFormState: vi.fn(),
      }),
      subscribe: vi.fn(() => () => {}),
    };

    const element = React.createElement(AddForm, { store: mockStore });
    expect(element.type).toBe(AddForm);
  });
});
