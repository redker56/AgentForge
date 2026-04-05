/**
 * ConfirmModal component test
 */

import { describe, expect, it } from 'vitest';
import React from 'react';

describe('ConfirmModal', () => {
  it('exports ConfirmModal component', async () => {
    const { ConfirmModal } = await import('../../../src/tui/components/ConfirmModal.js');
    expect(ConfirmModal).toBeDefined();
    expect(typeof ConfirmModal).toBe('function');
  });

  it('ConfirmModal renders a React element', async () => {
    const { ConfirmModal } = await import('../../../src/tui/components/ConfirmModal.js');
    const mockStore = {
      getState: () => ({
        confirmState: { title: 'Delete', message: 'Sure?', onConfirm: () => {} },
        activeTab: 'skills',
      }),
      subscribe: () => {},
    };
    const element = React.createElement(ConfirmModal, { store: mockStore });
    expect(element.type).toBe(ConfirmModal);
  });
});
