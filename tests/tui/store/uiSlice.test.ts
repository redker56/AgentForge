/**
 * uiSlice unit tests -- verifies state transitions against the nested UI state model.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createUISlice } from '../../../src/tui/store/uiSlice.js';
import type { StoreState } from '../../../src/tui/store/uiSlice.js';

function createHarness(overrides: Partial<StoreState> = {}) {
  let state = {
    skills: [],
    restoreSkill: vi.fn(),
    restoreAgent: vi.fn(),
    restoreProject: vi.fn(),
    ...overrides,
  } as StoreState;

  const set = vi.fn((update: Partial<StoreState> | ((current: StoreState) => Partial<StoreState>)) => {
    const patch = typeof update === 'function' ? update(state) : update;
    state = { ...state, ...patch };
  });
  const get = vi.fn(() => state);

  state = {
    ...state,
    ...createUISlice(set, get, undefined as never),
  } as StoreState;

  return {
    getState: () => state,
    set,
  };
}

describe('createUISlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes nested shell, browser, and workflow state', () => {
    const { getState } = createHarness();
    const state = getState();

    expect(state.shellState.activeTab).toBe('skills');
    expect(state.shellState.searchQuery).toBe('');
    expect(state.shellState.showSearch).toBe(false);
    expect(state.shellState.showHelp).toBe(false);
    expect(state.shellState.showCommandPalette).toBe(false);
    expect(state.shellState.confirmState).toBeNull();
    expect(state.shellState.formState).toBeNull();
    expect(state.shellState.conflictState).toBeNull();
    expect(state.shellState.activeToast).toBeNull();
    expect(state.shellState.toastQueue).toEqual([]);
    expect(state.skillsBrowserState.focusedIndex).toBe(0);
    expect(state.skillsBrowserState.selectedNames).toEqual(new Set());
    expect(state.agentsBrowserState.viewMode).toBe('master');
    expect(state.projectsBrowserState.viewMode).toBe('master');
    expect(state.syncWorkflowState.step).toBe('select-op');
    expect(state.syncWorkflowState.operation).toBe('sync-agents');
    expect(state.importWorkflowState.step).toBe('select-source-type');
    expect(state.importWorkflowState.sourceType).toBe('project');
  });

  it('setActiveTab resets cross-tab selection and transient overlays', () => {
    const { getState } = createHarness();
    const state = getState();

    state.setFormState({ formType: 'addSkill', data: {} });
    state.setConfirmState({ title: 'Confirm', message: 'msg', onConfirm: () => undefined });
    state.setConflictState({
      skillName: 'demo',
      conflicts: [],
      onComplete: () => undefined,
    });
    state.toggleSkillSelection('skill-a');
    state.toggleAgentSkillSelection('agent-row');
    state.toggleProjectSkillSelection('project-row');

    getState().setActiveTab('agents');
    const next = getState();

    expect(next.shellState.activeTab).toBe('agents');
    expect(next.shellState.confirmState).toBeNull();
    expect(next.shellState.formState).toBeNull();
    expect(next.shellState.conflictState).toBeNull();
    expect(next.skillsBrowserState.selectedNames).toEqual(new Set());
    expect(next.agentsBrowserState.viewMode).toBe('master');
    expect(next.agentsBrowserState.selectedSkillRowIds).toEqual(new Set());
    expect(next.projectsBrowserState.viewMode).toBe('master');
    expect(next.projectsBrowserState.selectedSkillRowIds).toEqual(new Set());
  });

  it('updates search and overlay state through shell setters', () => {
    const { getState } = createHarness();

    getState().setSearchQuery('term');
    expect(getState().shellState.searchQuery).toBe('term');

    getState().setShowSearch(true);
    expect(getState().shellState.showSearch).toBe(true);
    expect(getState().shellState.showHelp).toBe(false);
    expect(getState().shellState.showCommandPalette).toBe(false);
    expect(getState().shellState.searchQuery).toBe('');
    expect(getState().shellState.searchResultIndex).toBe(0);

    getState().setShowHelp(true);
    expect(getState().shellState.showHelp).toBe(true);
    expect(getState().shellState.showSearch).toBe(false);

    getState().setShowCommandPalette(true);
    expect(getState().shellState.showCommandPalette).toBe(true);
    expect(getState().shellState.showSearch).toBe(false);
    expect(getState().shellState.showHelp).toBe(false);
    expect(getState().shellState.formState).toBeNull();
    expect(getState().shellState.confirmState).toBeNull();
    expect(getState().shellState.conflictState).toBeNull();
  });

  it('tracks browser selection state independently per surface', () => {
    const { getState } = createHarness();

    getState().toggleSkillSelection('skill-a');
    expect(getState().skillsBrowserState.selectedNames).toEqual(new Set(['skill-a']));
    getState().toggleSkillSelection('skill-a');
    expect(getState().skillsBrowserState.selectedNames).toEqual(new Set());

    getState().toggleAgentSkillSelection('agent-row');
    expect(getState().agentsBrowserState.selectedSkillRowIds).toEqual(new Set(['agent-row']));

    getState().toggleProjectSkillSelection('project-row');
    expect(getState().projectsBrowserState.selectedSkillRowIds).toEqual(
      new Set(['project-row'])
    );
  });

  it('resets sync workflow state to its initial shape', () => {
    const { getState } = createHarness();
    const state = getState();

    state.setSyncFormStep('confirm');
    state.setSyncFormOperation('unsync');
    state.setSyncFormSelectedSkillNames(new Set(['skill-a']));
    state.setSyncFormSelectedTargetIds(new Set(['claude']));
    state.setSyncWorkflowPreview({ targets: [], agentTypes: [] }, 'preview error');

    getState().resetSyncForm();
    expect(getState().syncWorkflowState).toEqual({
      step: 'select-op',
      operation: 'sync-agents',
      selectedSkillNames: new Set(),
      unsyncScope: null,
      selectedTargetIds: new Set(),
      projectUnsyncMode: null,
      selectedAgentTypes: new Set(),
      loadingTargets: false,
      mode: 'copy',
      results: [],
      focusedIndex: 0,
      preview: null,
      previewError: null,
    });
  });

  it('resets import workflow state to its initial shape', () => {
    const { getState } = createHarness();
    const state = getState();

    state.setImportTabStep('confirm');
    state.setImportTabSourceType('agent');
    state.setImportTabSourceId('claude');
    state.setImportTabSourceLabel('Claude');
    state.setImportTabSelectedSkillNames(new Set(['skill-a']));
    state.setImportDiscoveredSkills([
      { name: 'skill-a', path: '/tmp/skill-a', alreadyExists: false, hasSkillMd: true },
    ]);

    getState().resetImportTab();
    expect(getState().importWorkflowState).toEqual({
      step: 'select-source-type',
      sourceType: 'project',
      sourceId: null,
      sourceLabel: null,
      selectedSkillNames: new Set(),
      results: [],
      focusedIndex: 0,
      discoveredSkills: [],
    });
  });

  it('stores detail overlay and modal state inside shellState', () => {
    const { getState } = createHarness();

    getState().setCompletionModalOpen(true);
    getState().setTabSwitchPending('projects');
    getState().setDirtyConfirmActive(true);
    getState().setFormDirty(true);
    getState().setDetailSkillName('skill-a');
    getState().setDetailOverlayVisible(true);

    expect(getState().shellState.completionModalOpen).toBe(true);
    expect(getState().shellState.tabSwitchPending).toBe('projects');
    expect(getState().shellState.dirtyConfirmActive).toBe(true);
    expect(getState().shellState.formDirty).toBe(true);
    expect(getState().shellState.detailSkillName).toBe('skill-a');
    expect(getState().shellState.detailOverlayVisible).toBe(true);

    getState().setDetailOverlayVisible(false);
    expect(getState().shellState.detailOverlayVisible).toBe(false);
    expect(getState().shellState.detailSkillName).toBeNull();
  });

  it('replaces and updates progress items in shellState', () => {
    const { getState } = createHarness();

    getState().setUpdateProgressItems([
      { id: 'p1', label: 'Item 1', progress: 0, status: 'pending' },
    ]);
    getState().updateProgressItem('p1', { progress: 75, status: 'running' });

    expect(getState().shellState.updateProgressItems).toEqual([
      { id: 'p1', label: 'Item 1', progress: 75, status: 'running' },
    ]);
  });

  it('creates and clears undo state', () => {
    const { getState } = createHarness();

    vi.useFakeTimers();
    try {
      getState().pushUndo('delete-skill', { name: 'test-skill' });
      expect(getState().shellState.undoActive).toBe(true);
      expect(getState().shellState.undoBuffer?.action).toBe('delete-skill');
      expect(getState().shellState.undoBuffer?.snapshot).toEqual({ name: 'test-skill' });

      getState().clearUndo();
      expect(getState().shellState.undoActive).toBe(false);
      expect(getState().shellState.undoBuffer).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('pushToast activates the first toast and queues later ones', () => {
    const { getState } = createHarness();

    vi.useFakeTimers();
    try {
      getState().pushToast('First', 'success');
      expect(getState().shellState.activeToast?.message).toBe('First');
      expect(getState().shellState.activeToast?.variant).toBe('success');
      expect(getState().shellState.toastQueue).toEqual([]);

      getState().pushToast('Second', 'info');
      expect(getState().shellState.activeToast?.message).toBe('First');
      expect(getState().shellState.toastQueue).toHaveLength(1);
      expect(getState().shellState.toastQueue[0]?.message).toBe('Second');

      getState().dismissActiveToast();
      expect(getState().shellState.activeToast?.message).toBe('Second');
      expect(getState().shellState.toastQueue).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });
});
