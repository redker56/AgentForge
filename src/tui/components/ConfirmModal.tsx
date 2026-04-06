/**
 * Confirmation dialog overlay for destructive actions
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type { AppStore } from '../store/index.js';

interface ConfirmModalProps {
  store: StoreApi<AppStore>;
}

export function ConfirmModal({ store }: ConfirmModalProps): React.ReactElement {
  const confirmState = useStore(store, s => s.confirmState);

  if (!confirmState) return <></>;

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
      <Box flexDirection="column" borderStyle="round" padding={1} width={56}>
        <Text bold color="red">{confirmState.title}</Text>
        <Text> </Text>
        <Text>{confirmState.message}</Text>
        <Text> </Text>
        <Box flexDirection="row" justifyContent="space-between" width="100%">
          <Text color="cyan">[Enter] Confirm</Text>
          <Text dimColor>[Esc] Cancel</Text>
        </Box>
      </Box>
    </Box>
  );
}
