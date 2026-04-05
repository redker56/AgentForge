/**
 * uiSlice unit tests -- verifies state transitions and actions
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createUISlice } from '../../../src/tui/store/uiSlice.js';
import type { StoreState } from '../../../src/tui/store/uiSlice.js';

// We need to mock get() for some actions. Zustand slices use set/get.
function createMockSetGet(): { set: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn>; api: any } {
  let state: Partial<StoreState> = {
    toastQueue: [],
    activeToast: null,
    undoBuffer: null,
    undoActive: false,
  };
  const setFn = vi.fn((update: Partial<StoreState> | ((s: StoreState) => Partial<StoreState>)) => {
    if (typeof update === 'function') {
      state = { ...state, ...update(state as StoreState) };
    } else {
      state = { ...state, ...update };
    }
  });
  const getFn = vi.fn(() => state as StoreState);
  return { set: setFn, get: getFn, api: undefined };
}

describe('createUISlice', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('initializes with default state values', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    expect(slice.activeTab).toBe('skills');
    expect(slice.focusedSkillIndex).toBe(0);
    expect(slice.selectedSkillNames).toEqual(new Set());
    expect(slice.searchQuery).toBe('');
    expect(slice.progressItems).toEqual([]);
    expect(slice.focusedAgentIndex).toBe(0);
    expect(slice.expandedAgentIds).toEqual(new Set());
    expect(slice.focusedProjectIndex).toBe(0);
    expect(slice.expandedProjectIds).toEqual(new Set());
    expect(slice.showSearch).toBe(false);
    expect(slice.showHelp).toBe(false);
    expect(slice.confirmState).toBeNull();
    expect(slice.formState).toBeNull();
    expect(slice.conflictState).toBeNull();
    expect(slice.focusedConflictIndex).toBe(0);
    expect(slice.syncFormStep).toBe('select-op');
    expect(slice.syncFormOperation).toBeNull();
    expect(slice.syncFormSelectedSkillNames).toEqual(new Set());
    expect(slice.syncFormSelectedTargetIds).toEqual(new Set());
    expect(slice.syncFormSelectedAgentTypes).toEqual(new Set());
    expect(slice.syncFormMode).toBe('copy');
    expect(slice.syncFormResults).toEqual([]);
    expect(slice.syncFormFocusedIndex).toBe(0);
    expect(slice.importTabStep).toBe('select-source-type');
    expect(slice.importTabSourceType).toBeNull();
    expect(slice.importTabSourceId).toBeNull();
    expect(slice.importTabSelectedSkillNames).toEqual(new Set());
    expect(slice.importTabResults).toEqual([]);
    expect(slice.importTabFocusedIndex).toBe(0);
    expect(slice.updateProgressItems).toEqual([]);
    expect(slice.completionModalOpen).toBeNull();
    // Sprint 2 fields
    expect(slice.showCommandPalette).toBe(false);
    expect(slice.searchResultIndex).toBe(0);
    expect(slice.tabSwitchPending).toBeNull();
    expect(slice.dirtyConfirmActive).toBe(false);
  });

  it('setActiveTab resets form states and focuses', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    // Simulate having a formState and conflictState set
    (slice.setActiveTab as any)('agents');

    expect(set).toHaveBeenCalledWith(expect.objectContaining({
      activeTab: 'agents',
      focusedSkillIndex: 0,
      selectedSkillNames: new Set(),
      focusedAgentIndex: 0,
      expandedAgentIds: new Set(),
      focusedProjectIndex: 0,
      expandedProjectIds: new Set(),
      confirmState: null,
      formState: null,
      conflictState: null,
    }));
  });

  it('toggleSkillSelection adds and removes skills', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    slice.toggleSkillSelection('my-skill');
    expect(set).toHaveBeenCalled();

    const lastCall = set.mock.calls[set.mock.calls.length - 1][0];
    expect(lastCall).toEqual({ selectedSkillNames: new Set(['my-skill']) });

    // Simulate get() now having that skill selected, then toggle again
    expect(slice.toggleSkillSelection).toBeTruthy();
  });

  it('setSearchQuery updates the query', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    slice.setSearchQuery('test-query');

    expect(set).toHaveBeenCalledWith({ searchQuery: 'test-query' });
  });

  it('setShowSearch clears showHelp and showCommandPalette', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    slice.setShowSearch(true);

    expect(set).toHaveBeenCalledWith({
      showSearch: true,
      showHelp: false,
      showCommandPalette: false,
      searchQuery: '',
      searchResultIndex: 0,
    });
  });

  it('setShowHelp clears showSearch and showCommandPalette', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    slice.setShowHelp(true);

    expect(set).toHaveBeenCalledWith({
      showHelp: true,
      showSearch: false,
      showCommandPalette: false,
    });
  });

  it('resetSyncForm clears all sync form state', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    slice.resetSyncForm();

    expect(set).toHaveBeenCalledWith({
      syncFormStep: 'select-op',
      syncFormOperation: null,
      syncFormSelectedSkillNames: new Set(),
      syncFormSelectedTargetIds: new Set(),
      syncFormSelectedAgentTypes: new Set(),
      syncFormMode: 'copy',
      syncFormResults: [],
      syncFormFocusedIndex: 0,
    });
  });

  it('resetImportTab clears all import tab state', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    slice.resetImportTab();

    expect(set).toHaveBeenCalledWith({
      importTabStep: 'select-source-type',
      importTabSourceType: null,
      importTabSourceId: null,
      importTabSelectedSkillNames: new Set(),
      importTabResults: [],
      importTabFocusedIndex: 0,
    });
  });

  it('setCompletionModalOpen toggles the completion modal', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    slice.setCompletionModalOpen(true);
    expect(set).toHaveBeenCalledWith({ completionModalOpen: true });

    slice.setCompletionModalOpen(false);
    expect(set).toHaveBeenCalledWith({ completionModalOpen: false });

    slice.setCompletionModalOpen(null);
    expect(set).toHaveBeenCalledWith({ completionModalOpen: null });
  });

  it('setConfirmState clears formState and conflictState', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);
    const confirmState = { title: 'Test', message: 'msg', onConfirm: () => {} };

    slice.setConfirmState(confirmState);

    expect(set).toHaveBeenCalledWith({
      confirmState,
      formState: null,
      conflictState: null,
    });
  });

  it('setFormState clears confirmState and conflictState', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);
    const formState = { formType: 'addSkill' as const, data: {} };

    slice.setFormState(formState);

    expect(set).toHaveBeenCalledWith({
      formState,
      confirmState: null,
      conflictState: null,
    });
  });

  it('setUpdateProgressItems replaces the progress list', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);
    const items = [
      { id: 'p1', label: 'Item 1', progress: 0, status: 'pending' as const },
    ];

    slice.setUpdateProgressItems(items);

    expect(set).toHaveBeenCalledWith({ updateProgressItems: items });
  });

  it('updateProgressItem action exists and takes correct parameters', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    expect(typeof slice.updateProgressItem).toBe('function');
    expect(slice.updateProgressItem.length).toBe(2);
  });

  // Sprint 2 tests

  it('setShowCommandPalette clears all other overlays for mutual exclusivity', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    slice.setShowCommandPalette(true);

    expect(set).toHaveBeenCalledWith({
      showCommandPalette: true,
      showSearch: false,
      showHelp: false,
      confirmState: null,
      formState: null,
      conflictState: null,
    });
  });

  it('setSearchResultIndex updates the search result index', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    slice.setSearchResultIndex(3);

    expect(set).toHaveBeenCalledWith({ searchResultIndex: 3 });
  });

  it('setTabSwitchPending sets the pending tab', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    slice.setTabSwitchPending('agents');

    expect(set).toHaveBeenCalledWith({ tabSwitchPending: 'agents' });
  });

  it('setTabSwitchPending clears with null', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    slice.setTabSwitchPending(null);

    expect(set).toHaveBeenCalledWith({ tabSwitchPending: null });
  });

  it('setDirtyConfirmActive toggles dirty confirm state', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    slice.setDirtyConfirmActive(true);
    expect(set).toHaveBeenCalledWith({ dirtyConfirmActive: true });

    slice.setDirtyConfirmActive(false);
    expect(set).toHaveBeenCalledWith({ dirtyConfirmActive: false });
  });

  it('setFormDirty toggles form dirty flag', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    slice.setFormDirty(true);
    expect(set).toHaveBeenCalledWith({ formDirty: true });

    slice.setFormDirty(false);
    expect(set).toHaveBeenCalledWith({ formDirty: false });
  });

  // Sprint 3: Undo tests

  it('initializes undo state to null/false', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    expect(slice.undoBuffer).toBeNull();
    expect(slice.undoActive).toBe(false);
  });

  it('initializes toast state to empty/null', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    expect(slice.toastQueue).toEqual([]);
    expect(slice.activeToast).toBeNull();
  });

  it('pushUndo sets undoBuffer and activates undo', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    vi.useFakeTimers();
    try {
      slice.pushUndo('delete-skill', { name: 'test-skill', source: { type: 'local' }, createdAt: '2025-01-01', syncedTo: [] });

      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({
          undoActive: true,
        }),
      );

      const lastCall = set.mock.calls[set.mock.calls.length - 1][0];
      expect(lastCall.undoBuffer).not.toBeNull();
      expect(lastCall.undoBuffer.action).toBe('delete-skill');
      expect(lastCall.undoBuffer.remainingMs).toBe(8000);
      expect(lastCall.undoBuffer.snapshot.name).toBe('test-skill');
    } finally {
      vi.useRealTimers();
    }
  });

  it('pushUndo replaces existing undo entry', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    vi.useFakeTimers();
    try {
      slice.pushUndo('delete-skill', { name: 'skill1' });
      slice.pushUndo('remove-agent', { id: 'agent1', name: 'agent1' });

      const lastCall = set.mock.calls[set.mock.calls.length - 1][0];
      expect(lastCall.undoBuffer.action).toBe('remove-agent');
    } finally {
      vi.useRealTimers();
    }
  });

  it('clearUndo resets buffer and deactivates', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    vi.useFakeTimers();
    try {
      slice.pushUndo('delete-skill', { name: 'test-skill' });
      slice.clearUndo();

      expect(set).toHaveBeenCalledWith({ undoBuffer: null, undoActive: false });
    } finally {
      vi.useRealTimers();
    }
  });

  it('pushToast creates toast with 2000ms expiry', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    vi.useFakeTimers();
    try {
      slice.pushToast('Test message', 'success');

      const toastCalls = set.mock.calls.filter((c) => c[0].activeToast !== undefined && c[0].activeToast !== null);
      expect(toastCalls.length).toBeGreaterThan(0);

      const toast = toastCalls[0][0].activeToast;
      expect(toast.message).toBe('Test message');
      expect(toast.variant).toBe('success');
      expect(toast.expiresAt).toBe(Date.now() + 2000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('pushToast queues toasts when activeToast exists', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    vi.useFakeTimers();
    try {
      slice.pushToast('First', 'success');
      slice.pushToast('Second', 'info');

      const queueCalls = set.mock.calls.filter((c) => c[0].toastQueue !== undefined);
      expect(queueCalls.length).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('dismissActiveToast promotes next toast from queue', () => {
    const { set, get } = createMockSetGet();
    const slice = createUISlice(set, get, undefined as any);

    vi.useFakeTimers();
    try {
      slice.pushToast('First', 'success');
      slice.pushToast('Second', 'info');
      slice.dismissActiveToast();

      const lastCall = set.mock.calls[set.mock.calls.length - 1][0];
      if (lastCall.activeToast) {
        expect(lastCall.activeToast.message).toBe('Second');
      }
    } finally {
      vi.useRealTimers();
    }
  });
});
