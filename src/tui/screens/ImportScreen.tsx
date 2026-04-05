/**
 * Import tab full screen. Hosts ImportFormTab and provides a title header.
 *
 * Receives ServiceContext to pass through to ImportFormTab for isolated
 * helper invocation (Known Deviation 1).
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { ServiceContext } from '../store/dataSlice.js';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';
import type { AppStore } from '../store/index.js';
import { ImportFormTab } from '../components/ImportFormTab.js';
import { ProgressBarStack } from '../components/ProgressBar.js';

interface ImportScreenProps {
  store: StoreApi<AppStore>;
  ctx: ServiceContext;
}

export function ImportScreen({ store, ctx }: ImportScreenProps): React.ReactElement {
  const updateProgressItems = useStore(store, (s) => s.updateProgressItems);

  return (
    <Box flexDirection="column" height="100%">
      <Box paddingX={1}>
        <Text bold color="cyan">Import Skills</Text>
      </Box>
      <Box flexGrow={1}>
        <ImportFormTab store={store} ctx={ctx} />
      </Box>
      {updateProgressItems.length > 0 && (
        <Box paddingX={1}>
          <ProgressBarStack items={updateProgressItems} />
        </Box>
      )}
    </Box>
  );
}
