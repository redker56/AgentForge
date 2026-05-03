import type { InputRouteContext } from './types.js';

function handleConflictKeys({ input, key, state }: InputRouteContext): void {
  if (!state.shellState.conflictState) return;

  if (key.upArrow) {
    const idx = state.shellState.focusedConflictIndex;
    if (idx > 0) state.setFocusedConflictIndex(idx - 1);
    return;
  }
  if (key.downArrow) {
    const conflicts = state.shellState.conflictState.conflicts;
    if (state.shellState.focusedConflictIndex < conflicts.length - 1) {
      state.setFocusedConflictIndex(state.shellState.focusedConflictIndex + 1);
    }
    return;
  }
  if (input === ' ') {
    const conflict =
      state.shellState.conflictState.conflicts[state.shellState.focusedConflictIndex];
    if (conflict && !conflict.sameContent) {
      const newResolution: 'link' | 'skip' = conflict.resolution === 'link' ? 'skip' : 'link';
      const updatedConflicts = state.shellState.conflictState.conflicts.map((entry, index) =>
        index === state.shellState.focusedConflictIndex
          ? { ...entry, resolution: newResolution }
          : entry
      );
      state.setConflictState({ ...state.shellState.conflictState, conflicts: updatedConflicts });
    }
    return;
  }
  if (key.return || key.escape) {
    state.shellState.conflictState.onComplete();
    state.setConflictState(null);
  }
}

export function handleBlockingShellInput(context: InputRouteContext): boolean {
  const { input, key, state } = context;

  if (state.shellState.dirtyConfirmActive) {
    if (input === 'y') {
      const target = state.shellState.tabSwitchPending;
      state.setFormDirty(false);
      state.setDirtyConfirmActive(false);
      state.setTabSwitchPending(null);
      if (target) state.setActiveTab(target);
      return true;
    }
    if (input === 'n' || key.escape) {
      state.setDirtyConfirmActive(false);
      state.setTabSwitchPending(null);
      return true;
    }
    return true;
  }

  if (state.shellState.showCommandPalette) {
    if (key.escape) {
      state.setShowCommandPalette(false);
    }
    return true;
  }

  if (state.shellState.showSearch) {
    if (key.escape) {
      state.setShowSearch(false);
    }
    return true;
  }

  if (state.shellState.showHelp) {
    if (input === '?' || key.escape) {
      state.setShowHelp(false);
    }
    return true;
  }

  if (state.shellState.languageSelectorOpen) {
    if (key.escape) {
      state.setLanguageSelectorOpen(false);
    }
    return true;
  }

  if (state.shellState.confirmState) {
    if (key.return) {
      state.shellState.confirmState.onConfirm();
      return true;
    }
    if (key.escape) {
      state.setConfirmState(null);
      return true;
    }
    return true;
  }

  if (state.shellState.formState) {
    if (key.escape) {
      state.setFormState(null);
      state.setFormDirty(false);
    }
    return true;
  }

  if (state.shellState.conflictState) {
    handleConflictKeys(context);
    return true;
  }

  if (state.shellState.detailOverlayVisible) {
    if (key.escape || input === 'q') {
      state.setDetailOverlayVisible(false);
      state.setDetailSkillName(null);
    }
    return true;
  }

  return false;
}
