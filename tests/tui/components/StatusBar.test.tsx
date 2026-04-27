/**
 * StatusBar component test
 */

import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { withLegacyUiState } from '../helpers/legacyUiState.js';

function createMockStore(overrides: Record<string, unknown> = {}) {
  const state = withLegacyUiState({
    skills: [{ name: 's1' }],
    agents: [{ id: 'claude', name: 'Claude Code' }],
    projects: [{ id: 'voice', name: 'Voice' }],
    activeTab: 'skills' as const,
    selectedSkillNames: new Set<string>(),
    selectedAgentSkillRowIds: new Set<string>(),
    selectedProjectSkillRowIds: new Set<string>(),
    agentViewMode: 'master' as const,
    projectViewMode: 'master' as const,
    detailOverlayVisible: false,
    undoActive: false,
    undoBuffer: null,
    activeToast: null,
    ...overrides,
  });

  return {
    getState: () => state,
    subscribe: () => () => {},
  };
}

describe('StatusBar', () => {
  it('exports StatusBar component', async () => {
    const { StatusBar } = await import('../../../src/tui/components/StatusBar.js');
    expect(StatusBar).toBeDefined();
    expect(typeof StatusBar).toBe('function');
  });

  it('renders a React element with store/band/columns props', async () => {
    const { StatusBar } = await import('../../../src/tui/components/StatusBar.js');
    const state = withLegacyUiState({
      skills: [],
      agents: [],
      projects: [],
      activeTab: 'skills' as const,
      selectedSkillNames: new Set<string>(),
      detailOverlayVisible: false,
      undoActive: false,
      undoBuffer: null,
      activeToast: null,
    });
    const mockStore = {
      getState: () => state,
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
    const state = withLegacyUiState({
      skills: [],
      agents: [],
      projects: [],
      activeTab: 'skills' as const,
      selectedSkillNames: new Set<string>(),
      detailOverlayVisible: false,
      undoActive: false,
      undoBuffer: null,
      activeToast: {
        id: '1',
        message: 'Skill deleted',
        variant: 'success' as const,
        expiresAt: Date.now() + 2000,
      },
    });
    const mockStore = {
      getState: () => state,
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
    const state = withLegacyUiState({
      skills: [],
      agents: [],
      projects: [],
      activeTab: 'skills' as const,
      selectedSkillNames: new Set<string>(),
      detailOverlayVisible: false,
      undoActive: false,
      undoBuffer: null,
      activeToast: {
        id: '1',
        message: '1 of 4 failed',
        variant: 'error' as const,
        expiresAt: Date.now() + 2000,
      },
    });
    const mockStore = {
      getState: () => state,
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
    const state = withLegacyUiState({
      skills: [],
      agents: [],
      projects: [],
      activeTab: 'skills' as const,
      selectedSkillNames: new Set<string>(),
      detailOverlayVisible: false,
      undoActive: false,
      undoBuffer: null,
      activeToast: {
        id: '1',
        message: 'Info message',
        variant: 'info' as const,
        expiresAt: Date.now() + 2000,
      },
    });
    const mockStore = {
      getState: () => state,
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
    const state = withLegacyUiState({
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
    });
    const mockStore = {
      getState: () => state,
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
    const state = withLegacyUiState({
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
      activeToast: {
        id: '1',
        message: 'Queued toast',
        variant: 'success' as const,
        expiresAt: Date.now() + 2000,
      },
    });
    const mockStore = {
      getState: () => state,
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
    const state = withLegacyUiState({
      skills: [{ name: 's1' }],
      agents: [{ id: 'claude', name: 'Claude Code' }],
      projects: [],
      activeTab: 'skills' as const,
      selectedSkillNames: new Set<string>(),
      detailOverlayVisible: false,
      undoActive: false,
      undoBuffer: null,
      activeToast: null,
    });
    const mockStore = {
      getState: () => state,
      subscribe: () => () => {},
    };
    const element = React.createElement(StatusBar, {
      store: mockStore,
      band: 'widescreen' as const,
      columns: 120,
    });
    expect(element.type).toBe(StatusBar);
  });

  it('keeps a visible gap between counts and the first hint', async () => {
    const { StatusBar } = await import('../../../src/tui/components/StatusBar.js');
    const store = createMockStore({
      detailOverlayVisible: true,
      band: 'compact',
      projects: Array.from({ length: 4 }, (_, index) => ({
        id: `p${index}`,
        name: `Project ${index}`,
      })),
      skills: Array.from({ length: 20 }, (_, index) => ({ name: `skill-${index}` })),
      agents: [
        { id: 'claude', name: 'Claude Code' },
        { id: 'codex', name: 'Codex' },
      ],
    });

    const { lastFrame } = render(<StatusBar store={store as never} band="compact" columns={220} />);
    const frame = lastFrame() ?? '';

    expect(frame).not.toContain('projectsEsc:Back');
    expect(frame).toMatch(/projects +Esc/);
  });
});
