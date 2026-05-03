/**
 * TUI Zustand store test -- verifies basic store creation against the nested UI model.
 */

import { describe, expect, it } from 'vitest';

import { createAppStore } from '../../src/tui/store/index.js';

import { createMockServiceContext } from './store/actions/mockContext.js';

describe('createAppStore', () => {
  it('creates store with the expected initial shell state', () => {
    const store = createAppStore(createMockServiceContext());
    const state = store.getState();

    expect(state.shellState.activeTab).toBe('skills');
    expect(state.shellState.locale).toBe('en');
    expect(state.shellState.languagePreference).toBe('auto');
    expect(state.shellState.showSearch).toBe(false);
    expect(state.shellState.showHelp).toBe(false);
    expect(state.loading).toEqual({ skills: true, agents: true, projects: true });
    expect(state.skillsBrowserState.focusedIndex).toBe(0);
    expect(state.skillsBrowserState.selectedNames).toEqual(new Set());
  });

  it('accepts an explicit locale for the TUI shell state', () => {
    const store = createAppStore(createMockServiceContext(), 'zh', 'zh');
    expect(store.getState().shellState.locale).toBe('zh');
    expect(store.getState().shellState.languagePreference).toBe('zh');
  });

  it('persists a selected language preference through WorkbenchCommands', () => {
    const ctx = createMockServiceContext();
    const store = createAppStore(ctx, 'zh', 'auto');

    store.getState().setLanguageSelectorOpen(true);
    store.getState().setLanguageSelectorFocusedIndex(2);
    store.getState().saveTuiLanguagePreference('en');

    expect(ctx.commands.setTuiLanguagePreference).toHaveBeenCalledWith('en');
    expect(store.getState().shellState.languagePreference).toBe('en');
    expect(store.getState().shellState.locale).toBe('en');
    expect(store.getState().shellState.languageSelectorOpen).toBe(false);
    expect(store.getState().shellState.languageSelectorFocusedIndex).toBe(0);
  });

  it('creates store with the expected initial completion modal state', () => {
    const store = createAppStore(createMockServiceContext());
    expect(store.getState().shellState.completionModalOpen).toBeNull();
  });

  it('updates completion modal state through the store action', () => {
    const store = createAppStore(createMockServiceContext());

    store.getState().setCompletionModalOpen(true);
    expect(store.getState().shellState.completionModalOpen).toBe(true);

    store.getState().setCompletionModalOpen(false);
    expect(store.getState().shellState.completionModalOpen).toBe(false);

    store.getState().setCompletionModalOpen(null);
    expect(store.getState().shellState.completionModalOpen).toBeNull();
  });
});
