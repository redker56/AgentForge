/**
 * Help overlay -- centered overlay showing all keyboard shortcuts.
 * Pure display component. No input handling.
 * Modern Claude Code aesthetic.
 */

import { Box, Text } from 'ink';
import React from 'react';
import type { StoreApi } from 'zustand';

import type { AppStore } from '../store/index.js';
import { inkColors } from '../theme.js';

interface HelpOverlayProps {
  store: StoreApi<AppStore>;
}

export function HelpOverlay({ store: _store }: HelpOverlayProps): React.ReactElement {
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
      <Box flexDirection="column" borderStyle="single" padding={1} width={60} borderColor={inkColors.border}>
        <Text bold color={inkColors.accent}>Keyboard Shortcuts</Text>

        <Text> </Text>
        <Text bold color={inkColors.primary}>Navigation</Text>
        <Text color={inkColors.muted}>  Left/Right     Previous/next tab</Text>
        <Text color={inkColors.muted}>  1-5            Jump to tab</Text>
        <Text color={inkColors.muted}>  Up/Down        Move focus</Text>
        <Text color={inkColors.muted}>  Home/End       Jump to start/end</Text>

        <Text> </Text>
        <Text bold color={inkColors.primary}>Selection</Text>
        <Text color={inkColors.muted}>  Space          Toggle selection</Text>
        <Text color={inkColors.muted}>  Enter          Expand details / execute</Text>

        <Text> </Text>
        <Text bold color={inkColors.primary}>Actions</Text>
        <Text color={inkColors.muted}>  /              Open search</Text>
        <Text color={inkColors.muted}>  ?              Toggle this help</Text>
        <Text color={inkColors.muted}>  c              Categorize selected skill(s)</Text>
        <Text color={inkColors.muted}>  [ / ]          Previous/next category</Text>
        <Text color={inkColors.muted}>  u              Update selected skill(s)</Text>
        <Text color={inkColors.muted}>  U              Update all git-backed skills</Text>
        <Text color={inkColors.muted}>  x              Unsync selected skill(s)</Text>
        <Text color={inkColors.muted}>  R              Refresh all data</Text>
        <Text color={inkColors.muted}>  q              Quit</Text>

        <Text> </Text>
        <Text color={inkColors.muted}>Press Esc or ? to close</Text>
      </Box>
    </Box>
  );
}
