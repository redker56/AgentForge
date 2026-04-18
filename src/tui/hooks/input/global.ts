import { TAB_IDS } from '../../store/index.js';

import type { InputRouteContext } from './types.js';

function requestTabSwitch(
  state: InputRouteContext['state'],
  targetTab: (typeof TAB_IDS)[number]
): void {
  if (state.shellState.formDirty) {
    state.setTabSwitchPending(targetTab);
    state.setDirtyConfirmActive(true);
    return;
  }

  state.setActiveTab(targetTab);
}

export function handleGlobalShellInput({ input, key, state }: InputRouteContext): boolean {
  if (input === '?') {
    state.setShowHelp(true);
    return true;
  }

  if (input === '/') {
    state.setShowSearch(true);
    return true;
  }

  if (input === 'p' && key.ctrl) {
    state.setShowCommandPalette(true);
    return true;
  }

  if (key.leftArrow) {
    const idx = TAB_IDS.indexOf(state.shellState.activeTab);
    const targetTab = idx > 0 ? TAB_IDS[idx - 1] : null;
    if (targetTab) {
      requestTabSwitch(state, targetTab);
    }
    return true;
  }

  if (key.rightArrow) {
    const idx = TAB_IDS.indexOf(state.shellState.activeTab);
    const targetTab = idx < TAB_IDS.length - 1 ? TAB_IDS[idx + 1] : null;
    if (targetTab) {
      requestTabSwitch(state, targetTab);
    }
    return true;
  }

  if (input >= '1' && input <= '5') {
    const targetTab = TAB_IDS[Number.parseInt(input, 10) - 1];
    if (targetTab) {
      requestTabSwitch(state, targetTab);
    }
    return true;
  }

  if (input === 'R') {
    void state.loadAllData();
    return true;
  }

  if (input === 'C') {
    state.setCompletionModalOpen(state.shellState.completionModalOpen ? null : true);
    return true;
  }

  if (input === 'z') {
    if (state.shellState.undoActive && state.shellState.undoBuffer) {
      state.executeUndo();
    }
    return true;
  }

  return false;
}
