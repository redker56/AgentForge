/**
 * Language selector overlay.
 */

import { Box, Text, useInput } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type { TuiLanguagePreference } from '../../types.js';
import { getTuiText } from '../i18n.js';
import type { AppStore } from '../store/index.js';
import { inkColors, renderFocusPrefix, selectionMarkers } from '../theme.js';

interface LanguageSelectorProps {
  store: StoreApi<AppStore>;
}

const LANGUAGE_OPTIONS: TuiLanguagePreference[] = ['auto', 'zh', 'en'];

function clampFocusedIndex(index: number): number {
  return Math.max(0, Math.min(LANGUAGE_OPTIONS.length - 1, index));
}

export function getLanguagePreferenceIndex(preference: TuiLanguagePreference): number {
  return Math.max(0, LANGUAGE_OPTIONS.indexOf(preference));
}

export function LanguageSelector({ store }: LanguageSelectorProps): React.ReactElement {
  const locale = useStore(store, (s) => s.shellState.locale);
  const languagePreference = useStore(store, (s) => s.shellState.languagePreference);
  const focusedIndex = useStore(store, (s) => s.shellState.languageSelectorFocusedIndex);
  const text = getTuiText(locale);
  const activeIndex = clampFocusedIndex(focusedIndex);

  useInput((_, key) => {
    const state = store.getState();
    const current = clampFocusedIndex(state.shellState.languageSelectorFocusedIndex);

    if (key.escape) {
      state.setLanguageSelectorOpen(false);
      return;
    }

    if (key.upArrow) {
      state.setLanguageSelectorFocusedIndex(Math.max(0, current - 1));
      return;
    }

    if (key.downArrow) {
      state.setLanguageSelectorFocusedIndex(Math.min(LANGUAGE_OPTIONS.length - 1, current + 1));
      return;
    }

    if (key.return) {
      void state.saveTuiLanguagePreference(LANGUAGE_OPTIONS[current]);
    }
  });

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
      <Box
        flexDirection="column"
        borderStyle="single"
        padding={1}
        width={44}
        borderColor={inkColors.borderActive}
      >
        <Text bold color={inkColors.accent}>
          {text.language.title}
        </Text>
        <Text color={inkColors.muted}>{text.language.subtitle}</Text>
        <Text> </Text>
        <Text color={inkColors.muted}>
          {text.language.current}: {text.language.options[languagePreference]}
        </Text>
        <Text> </Text>
        {LANGUAGE_OPTIONS.map((preference, index) => {
          const isFocused = index === activeIndex;
          const isCurrent = preference === languagePreference;
          return (
            <Text key={preference}>
              {renderFocusPrefix(isFocused)}
              <Text color={isCurrent ? inkColors.success : inkColors.muted}>
                {isCurrent ? selectionMarkers.selected : selectionMarkers.unselected}
              </Text>{' '}
              {isFocused ? (
                <Text bold>{text.language.options[preference]}</Text>
              ) : (
                <Text>{text.language.options[preference]}</Text>
              )}
            </Text>
          );
        })}
        <Text> </Text>
        <Text color={inkColors.muted}>{text.language.hint}</Text>
      </Box>
    </Box>
  );
}
