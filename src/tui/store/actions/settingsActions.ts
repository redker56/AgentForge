/**
 * Settings action creators -- user-level TUI preferences.
 */

import type { StateCreator, StoreApi } from 'zustand';

import type { TuiLanguagePreference } from '../../../types.js';
import { getTuiText, resolveTuiLocale } from '../../i18n.js';
import type { AppStore } from '../index.js';
import type { WorkbenchContext } from '../workbenchContext.js';

export interface SettingsActions {
  saveTuiLanguagePreference: (preference: TuiLanguagePreference) => void;
}

function createSettingsActionsImpl(
  set: StoreApi<AppStore>['setState'],
  get: StoreApi<AppStore>['getState'],
  ctx: WorkbenchContext
): SettingsActions {
  return {
    saveTuiLanguagePreference: (preference): void => {
      ctx.commands.setTuiLanguagePreference(preference);
      const locale = resolveTuiLocale(preference);

      set((state) => ({
        shellState: {
          ...state.shellState,
          languagePreference: preference,
          locale,
          languageSelectorOpen: false,
          languageSelectorFocusedIndex: 0,
        },
      }));

      const text = getTuiText(locale);
      get().pushToast(text.language.saved(text.language.options[preference]), 'success');
    },
  };
}

export function createSettingsActions(
  store: StoreApi<AppStore>,
  ctx: WorkbenchContext
): SettingsActions {
  return createSettingsActionsImpl(store.setState, store.getState, ctx);
}

export function createSettingsActionsSlice(
  ctx: WorkbenchContext
): StateCreator<AppStore, [], [], SettingsActions> {
  return (set, get) => createSettingsActionsImpl(set, get, ctx);
}
