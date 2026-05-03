/**
 * Command palette overlay (Ctrl+P).
 *
 * Shows a fuzzy-searchable list of all available commands.
 * Enter triggers the selected command. Escape closes.
 * Focus index tracked in local component state.
 */

import { Box, Text, useInput } from 'ink';
import React, { useMemo, useState } from 'react';
import type { StoreApi } from 'zustand';

import { getTuiText, type TuiLocale } from '../i18n.js';
import type { AppStore } from '../store/index.js';
import { inkColors, renderFocusPrefix } from '../theme.js';
import { fuzzyMatch } from '../utils/fuzzy.js';

import { getLanguagePreferenceIndex } from './LanguageSelector.js';

interface CommandEntry {
  id: string;
  labelKey: keyof ReturnType<typeof getTuiText>['commands']['entries'];
}

const COMMANDS: CommandEntry[] = [{ id: 'change-language', labelKey: 'changeLanguage' }];

function getCommandLabel(command: CommandEntry, locale: TuiLocale): string {
  return getTuiText(locale).commands.entries[command.labelKey];
}

interface CommandPaletteProps {
  store: StoreApi<AppStore>;
}

function executeCommand(commandId: string, store: StoreApi<AppStore>): void {
  const state = store.getState();

  switch (commandId) {
    case 'change-language': {
      state.setLanguageSelectorFocusedIndex(
        getLanguagePreferenceIndex(state.shellState.languagePreference)
      );
      state.setLanguageSelectorOpen(true);
      break;
    }
  }
}

export function CommandPalette({ store }: CommandPaletteProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const locale = store.getState().shellState.locale;
  const text = getTuiText(locale);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return COMMANDS.map((cmd) => ({ item: cmd, score: 0, matchIndices: [] }));
    }
    return fuzzyMatch(query, COMMANDS, (cmd) => getCommandLabel(cmd, locale));
  }, [query, locale]);

  const clampedIndex = Math.min(focusedIndex, Math.max(filteredCommands.length - 1, 0));

  useInput(
    (input, key) => {
      const state = store.getState();

      if (key.escape) {
        state.setShowCommandPalette(false);
        return;
      }

      if (key.return) {
        const cmd = filteredCommands[clampedIndex];
        if (cmd) {
          executeCommand(cmd.item.id, store);
        } else {
          state.setShowCommandPalette(false);
        }
        return;
      }

      if (key.upArrow) {
        setFocusedIndex((prev) => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setFocusedIndex((prev) => Math.min(filteredCommands.length - 1, prev + 1));
        return;
      }

      if (key.backspace || key.delete) {
        setQuery((prev) => prev.slice(0, -1));
        setFocusedIndex(0);
        return;
      }

      if (input && input.length === 1 && !key.ctrl && !key.meta) {
        setQuery((prev) => prev + input);
        setFocusedIndex(0);
      }
    },
    {
      isActive: store.getState().shellState.showCommandPalette,
    }
  );

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box
        flexDirection="column"
        borderStyle="single"
        paddingLeft={1}
        paddingRight={1}
        borderColor={inkColors.borderActive}
      >
        <Text color={inkColors.muted}>{text.commands.title}</Text>
        <Box>
          <Text color={inkColors.accent}>{text.commands.command}</Text>
          <Text color={inkColors.muted}> / </Text>
          <Text color={inkColors.primary}>{query}</Text>
          <Text color={inkColors.accent}>|</Text>
        </Box>
      </Box>
      {filteredCommands.length > 0 && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderTop={false}
          paddingLeft={1}
          paddingRight={1}
          borderColor={inkColors.borderActive}
        >
          {filteredCommands.map((result, i) => (
            <Text
              key={result.item.id}
              color={i === clampedIndex ? inkColors.focusText : inkColors.secondary}
              backgroundColor={i === clampedIndex ? inkColors.paper : undefined}
              bold={i === clampedIndex}
            >
              {renderFocusPrefix(i === clampedIndex)}
              {getCommandLabel(result.item, locale)}
            </Text>
          ))}
        </Box>
      )}
      {query.trim() && filteredCommands.length === 0 && (
        <Text color={inkColors.muted}> {text.common.noCommandsFound}</Text>
      )}
    </Box>
  );
}
