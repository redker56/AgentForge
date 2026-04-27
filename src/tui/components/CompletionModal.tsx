/**
 * Completion setup modal -- prompts user to run shell completion setup
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type { AppStore } from '../store/index.js';
import { inkColors } from '../theme.js';

import { FixedText } from './FixedText.js';

interface CompletionModalProps {
  store: StoreApi<AppStore>;
}

const SHELLS = [
  { name: 'Bash', command: 'af completion bash --install' },
  { name: 'Zsh', command: 'af completion zsh --install' },
  { name: 'Fish', command: 'af completion fish --install' },
  { name: 'PowerShell', command: 'af completion powershell --install' },
];

export function CompletionModal({ store }: CompletionModalProps): React.ReactElement {
  const setCompletionModalOpen = useStore(store, (s) => s.setCompletionModalOpen);

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Box
        flexDirection="column"
        borderStyle="single"
        padding={1}
        width={56}
        borderColor={inkColors.border}
      >
        <Text bold color={inkColors.accent}>
          Shell Completion Setup
        </Text>
        <Text> </Text>
        <Text>Run one of the following commands to enable tab</Text>
        <Text>auto-completion for your shell:</Text>
        <Text> </Text>
        {SHELLS.map((shell) => (
          <Box key={shell.name} flexDirection="row" marginBottom={0}>
            <FixedText color={inkColors.success} width={12}>
              {shell.name}
            </FixedText>
            <Text dimColor>{shell.command}</Text>
          </Box>
        ))}
        <Text> </Text>
        <Text dimColor>[Esc] Close</Text>
      </Box>
      <HandleEsc store={store} setCompletionModalOpen={setCompletionModalOpen} />
    </Box>
  );
}

// Separate component to handle Escape key since we can't block input
// in a non-modal overlay -- the global handler will catch Esc
function HandleEsc({
  store,
  setCompletionModalOpen,
}: {
  store: StoreApi<AppStore>;
  setCompletionModalOpen: (open: boolean | null) => void;
}): React.ReactElement | null {
  // The modal is a passive informational overlay.
  // The user closes it by pressing [C] again or Esc (handled globally
  // when formState is null -- we rely on the C key handler to toggle).
  void store;
  void setCompletionModalOpen;
  return null;
}
