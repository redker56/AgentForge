/**
 * Global keyboard input handler for the TUI
 */

import { useInput } from 'ink';
import type { StoreApi } from 'zustand';

import type { AppStore } from '../store/index.js';

import { handleGlobalShellInput } from './input/global.js';
import { handleBlockingShellInput } from './input/overlays.js';
import { routeActiveTabInput } from './input/tabRouter.js';

export function useInputHandler(store: StoreApi<AppStore>): void {
  useInput((input, key) => {
    const state = store.getState();
    const context = { store, input, key, state };

    if (handleBlockingShellInput(context)) {
      return;
    }

    if (handleGlobalShellInput(context)) {
      return;
    }

    if (routeActiveTabInput(context)) {
      return;
    }

    if (input === 'q') {
      process.exit(0);
    }
  });
}
