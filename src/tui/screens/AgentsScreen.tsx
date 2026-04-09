/**
 * Agents tab content -- wraps AgentTable with padding and detail loading.
 */

import { Box } from 'ink';
import React, { useEffect } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import { AgentTable } from '../components/AgentTable.js';
import type { WidthBand } from '../hooks/useTerminalDimensions.js';
import type { AppStore } from '../store/index.js';

interface AgentsScreenProps {
  store: StoreApi<AppStore>;
  band: WidthBand;
  columns: number;
}

export function AgentsScreen({ store, band, columns }: AgentsScreenProps): React.ReactElement | null {
  const focusedAgentIndex = useStore(store, s => s.focusedAgentIndex);
  const agents = useStore(store, s => s.agents);

  // Load agent detail when focused agent changes
  useEffect(() => {
    const focusedAgent = agents[focusedAgentIndex];
    if (focusedAgent) {
      const detail = store.getState().agentDetails[focusedAgent.id];
      if (!detail) {
        void store.getState().loadAgentDetail(focusedAgent.id);
      }
    }
  }, [focusedAgentIndex, agents, store]);

  return (
    <Box flexDirection="column" height="100%" padding={1}>
      <AgentTable store={store} columns={columns} />
    </Box>
  );
}
