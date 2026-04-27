/**
 * Help overlay -- centered overlay showing all keyboard shortcuts.
 * Pure display component. No input handling.
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
      <Box
        flexDirection="column"
        borderStyle="single"
        padding={1}
        width={62}
        borderColor={inkColors.borderActive}
      >
        <Text bold color={inkColors.accent}>
          Keyboard Shortcuts
        </Text>
        <Text color={inkColors.muted}>Warm desk controls for the full AgentForge TUI.</Text>

        <Text> </Text>
        <Text bold color={inkColors.accent}>
          Navigation
        </Text>
        <Text color={inkColors.muted}> Left/Right Previous/next tab</Text>
        <Text color={inkColors.muted}> 1-5 Jump to tab</Text>
        <Text color={inkColors.muted}> Up/Down Move focus</Text>
        <Text color={inkColors.muted}> Home/End Jump to start/end</Text>

        <Text> </Text>
        <Text bold color={inkColors.accent}>
          Selection
        </Text>
        <Text color={inkColors.muted}> Space Toggle selection</Text>
        <Text color={inkColors.muted}> Enter Open list / detail / execute</Text>
        <Text color={inkColors.muted}> Esc Back from detail or context list</Text>

        <Text> </Text>
        <Text bold color={inkColors.accent}>
          Actions
        </Text>
        <Text color={inkColors.muted}> / Open search</Text>
        <Text color={inkColors.muted}> ? Toggle this help</Text>
        <Text color={inkColors.muted}> i Import visible context skill(s)</Text>
        <Text color={inkColors.muted}> c Categorize selected skill(s)</Text>
        <Text color={inkColors.muted}> [ / ] Previous/next category or context filter</Text>
        <Text color={inkColors.muted}> u Update selected skill(s)</Text>
        <Text color={inkColors.muted}> U Update all git-backed skills</Text>
        <Text color={inkColors.muted}> x Unsync selected skill(s)</Text>
        <Text color={inkColors.muted}> R Refresh all data</Text>
        <Text color={inkColors.muted}> q Quit</Text>

        <Text> </Text>
        <Text color={inkColors.muted}>Press Esc or ? to close</Text>
      </Box>
    </Box>
  );
}
