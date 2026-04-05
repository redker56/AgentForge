/**
 * CompletionModal component test
 */

import { describe, expect, it, vi } from 'vitest';
import React from 'react';

describe('CompletionModal', () => {
  it('exports CompletionModal component', async () => {
    const { CompletionModal } = await import('../../../src/tui/components/CompletionModal.js');
    expect(CompletionModal).toBeDefined();
    expect(typeof CompletionModal).toBe('function');
  });

  it('renders without crashing when given a mock store', async () => {
    const { CompletionModal } = await import('../../../src/tui/components/CompletionModal.js');
    const mockStore = {
      getState: () => ({
        setCompletionModalOpen: vi.fn(),
        completionModalOpen: true,
      }),
      subscribe: vi.fn(() => () => {}),
    };

    const element = React.createElement(CompletionModal, { store: mockStore });
    expect(element.type).toBe(CompletionModal);
  });
});
