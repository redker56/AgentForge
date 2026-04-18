import type { StoreApi } from 'zustand';

import type { AppStore } from '../../store/index.js';

export interface InputKey {
  ctrl?: boolean;
  upArrow?: boolean;
  downArrow?: boolean;
  leftArrow?: boolean;
  rightArrow?: boolean;
  return?: boolean;
  escape?: boolean;
}

export interface InputRouteContext {
  store: StoreApi<AppStore>;
  input: string;
  key: InputKey;
  state: AppStore;
}
