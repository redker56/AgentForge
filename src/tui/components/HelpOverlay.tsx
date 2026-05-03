/**
 * Help overlay -- centered overlay showing all keyboard shortcuts.
 * Pure display component. No input handling.
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import { getTuiText } from '../i18n.js';
import type { AppStore } from '../store/index.js';
import { inkColors } from '../theme.js';

interface HelpOverlayProps {
  store: StoreApi<AppStore>;
}

export function HelpOverlay({ store }: HelpOverlayProps): React.ReactElement {
  const locale = useStore(store, (s) => s.shellState.locale);
  const text = getTuiText(locale);

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
      <Box
        flexDirection="column"
        borderStyle="single"
        padding={1}
        width={62}
        borderColor={inkColors.borderActive}
      >
        <Text bold color={inkColors.accent}>
          {text.help.title}
        </Text>
        <Text color={inkColors.muted}>{text.help.subtitle}</Text>

        <Text> </Text>
        <Text bold color={inkColors.accent}>
          {text.help.navigation}
        </Text>
        {text.help.rows.slice(0, 4).map((row) => (
          <Text color={inkColors.muted} key={row}>
            {row}
          </Text>
        ))}

        <Text> </Text>
        <Text bold color={inkColors.accent}>
          {text.help.selection}
        </Text>
        {text.help.rows.slice(4, 7).map((row) => (
          <Text color={inkColors.muted} key={row}>
            {row}
          </Text>
        ))}

        <Text> </Text>
        <Text bold color={inkColors.accent}>
          {text.help.actions}
        </Text>
        {text.help.rows.slice(7).map((row) => (
          <Text color={inkColors.muted} key={row}>
            {row}
          </Text>
        ))}

        <Text> </Text>
        <Text color={inkColors.muted}>{text.help.closeHint}</Text>
      </Box>
    </Box>
  );
}
