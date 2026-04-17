/**
 * AddForm component test
 */

import { render } from 'ink-testing-library';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const capturedBlurProps: Array<Record<string, unknown>> = [];

vi.mock('../../../src/tui/components/BlurValidatedInput.js', async () => {
  const ReactModule = await import('react');

  return {
    BlurValidatedInput: (props: Record<string, unknown>) => {
      capturedBlurProps.push(props);
      return ReactModule.createElement('span');
    },
  };
});

describe('AddForm', () => {
  afterEach(() => {
    capturedBlurProps.length = 0;
  });

  it('exports AddForm component', async () => {
    const { AddForm } = await import('../../../src/tui/components/AddForm.js');
    expect(AddForm).toBeDefined();
    expect(typeof AddForm).toBe('function');
  });

  it('renders a React element', async () => {
    const { AddForm } = await import('../../../src/tui/components/AddForm.js');
    const state = {
      formState: { formType: 'addSkill' as const, data: {} },
      setFormState: vi.fn(),
    };
    const mockStore = {
      getState: () => state,
      subscribe: vi.fn(() => () => {}),
    };

    const element = React.createElement(AddForm, { store: mockStore });
    expect(element.type).toBe(AddForm);
  });

  it('passes submit handlers to validated add-skill inputs', async () => {
    const { AddForm } = await import('../../../src/tui/components/AddForm.js');
    const state = {
      formState: { formType: 'addSkill' as const, data: {} },
      setFormState: vi.fn(),
      addSkillFromUrl: vi.fn().mockResolvedValue(undefined),
    };
    const mockStore = {
      getState: () => state,
      subscribe: vi.fn(() => () => {}),
    };

    render(React.createElement(AddForm, { store: mockStore as never }));

    expect(capturedBlurProps).toHaveLength(2);
    expect(capturedBlurProps[0].onSubmit).toBeTypeOf('function');
    expect(capturedBlurProps[1].onSubmit).toBeTypeOf('function');
  });
});
