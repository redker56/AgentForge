/**
 * Import tab full screen. Hosts ImportFormTab and provides a title header.
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import { ImportFormTab } from '../components/ImportFormTab.js';
import { ProgressBarStack } from '../components/ProgressBar.js';
import type { AppStore } from '../store/index.js';
import { inkColors } from '../theme.js';

interface ImportScreenProps {
  store: StoreApi<AppStore>;
}

export function ImportScreen({ store }: ImportScreenProps): React.ReactElement {
  const updateProgressItems = useStore(store, (s) => s.shellState.updateProgressItems);

  return (
    <Box flexDirection="column" height="100%">
      <Box paddingX={1}>
        <Text bold color={inkColors.accent}>Import Skills</Text>
      </Box>
      <Box flexGrow={1}>
        <ImportFormTab store={store} />
      </Box>
      {updateProgressItems.length > 0 && (
        <Box paddingX={1}>
          <ProgressBarStack items={updateProgressItems} />
        </Box>
      )}
    </Box>
  );
}
