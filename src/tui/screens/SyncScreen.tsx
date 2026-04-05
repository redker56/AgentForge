/**
 * Sync tab full screen. Hosts SyncForm and provides a title header.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';
import type { AppStore } from '../store/index.js';
import { SyncForm } from '../components/SyncForm.js';
import { ProgressBarStack } from '../components/ProgressBar.js';

interface SyncScreenProps {
  store: StoreApi<AppStore>;
}

export function SyncScreen({ store }: SyncScreenProps): React.ReactElement {
  const updateProgressItems = useStore(store, (s) => s.updateProgressItems);

  return (
    <Box flexDirection="column" height="100%">
      <Box paddingX={1}>
        <Text bold color="cyan">Sync Skills</Text>
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
