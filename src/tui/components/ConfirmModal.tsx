/**
 * Confirmation dialog overlay for destructive actions
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import { getTuiText } from '../i18n.js';
import type { AppStore } from '../store/index.js';
import { inkColors } from '../theme.js';
import { truncateDisplayText } from '../utils/displayWidth.js';

interface ConfirmModalProps {
  store: StoreApi<AppStore>;
}

function truncateText(text: string, maxWidth = 52): string {
  return truncateDisplayText(text, maxWidth);
}

export function ConfirmModal({ store }: ConfirmModalProps): React.ReactElement {
  const confirmState = useStore(store, (s) => s.shellState.confirmState);
  const locale = useStore(store, (s) => s.shellState.locale);
  const text = getTuiText(locale);

  if (!confirmState) return <></>;

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
      <Box
        flexDirection="column"
        borderStyle="single"
        padding={1}
        width={56}
        borderColor={inkColors.border}
      >
        <Text bold color={inkColors.error}>
          {truncateText(confirmState.title)}
        </Text>
        <Text> </Text>
        <Text>{truncateText(confirmState.message)}</Text>
        <Text> </Text>
        <Box flexDirection="row" justifyContent="space-between" width="100%">
          <Text color={inkColors.accent}>{text.modal.enterConfirm}</Text>
          <Text dimColor>{text.modal.escCancel}</Text>
        </Box>
      </Box>
    </Box>
  );
}
