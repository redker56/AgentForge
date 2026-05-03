/**
 * Sync tab full screen. Hosts SyncForm and provides a title header.
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import { ProgressBarStack } from '../components/ProgressBar.js';
import { SyncForm } from '../components/SyncForm.js';
import { getTuiText } from '../i18n.js';
import type { AppStore } from '../store/index.js';
import { inkColors } from '../theme.js';

interface SyncScreenProps {
  store: StoreApi<AppStore>;
}

export function SyncScreen({ store }: SyncScreenProps): React.ReactElement {
  const updateProgressItems = useStore(store, (s) => s.shellState.updateProgressItems);
  const locale = useStore(store, (s) => s.shellState.locale);
  const syncFormOperation = useStore(store, (s) => s.syncWorkflowState.operation);
  const syncFormUnsyncScope = useStore(store, (s) => s.syncWorkflowState.unsyncScope);
  const text = getTuiText(locale);

  const title =
    syncFormOperation === 'unsync' && syncFormUnsyncScope === 'projects'
      ? text.sync.unsyncProjectsTitle
      : syncFormOperation === 'unsync' && syncFormUnsyncScope === 'agents'
        ? text.sync.unsyncAgentsTitle
        : text.sync.screenTitle;

  return (
    <Box flexDirection="column" height="100%">
      <Box paddingX={1}>
        <Text bold color={inkColors.accent}>
          {title}
        </Text>
      </Box>
      <Box flexGrow={1}>
        <SyncForm store={store} />
      </Box>
      {updateProgressItems.length > 0 && (
        <Box paddingX={1}>
          <ProgressBarStack items={updateProgressItems} />
        </Box>
      )}
    </Box>
  );
}
