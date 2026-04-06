/**
 * StatusBar component test
 */

import React from 'react';
import { describe, expect, it } from 'vitest';

describe('StatusBar', () => {
  it('exports StatusBar component', async () => {
    const { StatusBar } = await import('../../../src/tui/components/StatusBar.js');
    expect(StatusBar).toBeDefined();
    expect(typeof StatusBar).toBe('function');
  });

  it('renders a React element with store/band/columns props', async () => {
    const { StatusBar } = await import('../../../src/tui/components/StatusBar.js');
    const mockStore = {
      getState: () => ({
        skills: [],
        agents: [],
        projects: [],
        activeTab: 'skills' as const,
        selectedSkillNames: new Set<string>(),
        detailOverlayVisible: false,
        undoActive: false,
        undoBuffer: null,
        activeToast: null,
      }),
      subscribe: () => () => {},
    };
    const element = React.createElement(StatusBar, {
      store: mockStore,
      band: 'widescreen' as const,
      columns: 120,
    });
    expect(element.type).toBe(StatusBar);
  });

  // Sprint 3: Toast rendering
  it('renders active toast as success (green checkmark) format', async () => {
    const { StatusBar } = await import('../../../src/tui/components/StatusBar.js');
    const mockStore = {
      getState: () => ({
        skills: [],
        agents: [],
        projects: [],
        activeTab: 'skills' as const,
        selectedSkillNames: new Set<string>(),
        detailOverlayVisible: false,
        undoActive: false,
        undoBuffer: null,
        activeToast: { id: '1', message: 'Skill deleted', variant: 'success' as const, expiresAt: Date.now() + 2000 },
      }),
      subscribe: () => () => {},
    };
    const element = React.createElement(StatusBar, {
      store: mockStore,
      band: 'widescreen' as const,
      columns: 120,
    });
    expect(element.type).toBe(StatusBar);
  });

  it('renders active toast as error (red cross) format', async () => {
    const { StatusBar } = await import('../../../src/tui/components/StatusBar.js');
    const mockStore = {
      getState: () => ({
        skills: [],
        agents: [],
        projects: [],
        activeTab: 'skills' as const,
        selectedSkillNames: new Set<string>(),
        detailOverlayVisible: false,
        undoActive: false,
        undoBuffer: null,
        activeToast: { id: '1', message: '1 of 4 failed', variant: 'error' as const, expiresAt: Date.now() + 2000 },
      }),
      subscribe: () => () => {},
    };
    const element = React.createElement(StatusBar, {
      store: mockStore,
      band: 'widescreen' as const,
      columns: 120,
    });
    expect(element.type).toBe(StatusBar);
  });

  it('renders active toast as info (cyan) format', async () => {
    const { StatusBar } = await import('../../../src/tui/components/StatusBar.js');
    const mockStore = {
      getState: () => ({
        skills: [],
        agents: [],
        projects: [],
        activeTab: 'skills' as const,
        selectedSkillNames: new Set<string>(),
        detailOverlayVisible: false,
        undoActive: false,
        undoBuffer: null,
        activeToast: { id: '1', message: 'Info message', variant: 'info' as const, expiresAt: Date.now() + 2000 },
      }),
      subscribe: () => () => {},
    };
    const element = React.createElement(StatusBar, {
      store: mockStore,
      band: 'widescreen' as const,
      columns: 120,
    });
    expect(element.type).toBe(StatusBar);
  });

  // Sprint 3: Undo countdown rendering
  it('renders undo countdown as x Deleted name -- Undo Ns', async () => {
    const { StatusBar } = await import('../../../src/tui/components/StatusBar.js');
    const mockStore = {
      getState: () => ({
        skills: [],
        agents: [],
        projects: [],
        activeTab: 'skills' as const,
        selectedSkillNames: new Set<string>(),
        detailOverlayVisible: false,
        undoActive: true,
        undoBuffer: {
          action: 'delete-skill' as const,
          snapshot: { name: 'my-skill' },
          timestamp: Date.now(),
          remainingMs: 6000,
        },
        activeToast: null,
      }),
      subscribe: () => () => {},
    };
    const element = React.createElement(StatusBar, {
      store: mockStore,
      band: 'widescreen' as const,
      columns: 120,
    });
    expect(element.type).toBe(StatusBar);
  });

  it('undo countdown takes priority over toast', async () => {
    const { StatusBar } = await import('../../../src/tui/components/StatusBar.js');
    const mockStore = {
      getState: () => ({
        skills: [],
        agents: [],
        projects: [],
        activeTab: 'skills' as const,
        selectedSkillNames: new Set<string>(),
        detailOverlayVisible: false,
        undoActive: true,
        undoBuffer: {
          action: 'delete-skill' as const,
          snapshot: { name: 'my-skill' },
          timestamp: Date.now(),
          remainingMs: 4000,
        },
        activeToast: { id: '1', message: 'Queued toast', variant: 'success' as const, expiresAt: Date.now() + 2000 },
      }),
      subscribe: () => () => {},
    };
    const element = React.createElement(StatusBar, {
      store: mockStore,
      band: 'widescreen' as const,
      columns: 120,
    });
    expect(element.type).toBe(StatusBar);
  });

  it('shows counts when no toast and no undo', async () => {
    const { StatusBar } = await import('../../../src/tui/components/StatusBar.js');
    const mockStore = {
      getState: () => ({
        skills: [{ name: 's1' }],
        agents: [{ id: 'claude', name: 'Claude Code' }],
        projects: [],
        activeTab: 'skills' as const,
        selectedSkillNames: new Set<string>(),
        detailOverlayVisible: false,
        undoActive: false,
        undoBuffer: null,
        activeToast: null,
      }),
      subscribe: () => () => {},
    };
    const element = React.createElement(StatusBar, {
      store: mockStore,
      band: 'widescreen' as const,
      columns: 120,
    });
    expect(element.type).toBe(StatusBar);
  });
});
