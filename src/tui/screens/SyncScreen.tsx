/**
 * Sync tab full screen. Hosts SyncForm and provides a title header.
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import { ProgressBarStack } from '../components/ProgressBar.js';
import { SyncForm } from '../components/SyncForm.js';
import type { AppStore } from '../store/index.js';
import { inkColors } from '../theme.js';

interface SyncScreenProps {
  store: StoreApi<AppStore>;
}

export function SyncScreen({ store }: SyncScreenProps): React.ReactElement {
  const updateProgressItems = useStore(store, (s) => s.updateProgressItems);
  const syncFormOperation = useStore(store, (s) => s.syncFormOperation);
  const syncFormUnsyncScope = useStore(store, (s) => s.syncFormUnsyncScope);

  const title =
    syncFormOperation === 'unsync' && syncFormUnsyncScope === 'projects'
      ? 'Unsync from Projects'
      : syncFormOperation === 'unsync' && syncFormUnsyncScope === 'agents'
        ? 'Unsync from Agents'
        : 'Sync Skills';

  return (
    <Box flexDirection="column" height="100%">
      <Box paddingX={1}>
        <Text bold color={inkColors.accent}>{title}</Text>
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
