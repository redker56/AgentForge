/**
 * Post-install/post-import conflict resolution panel.
 * Shows same-name skills found in agent directories and allows resolution.
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type { AppStore } from '../store/index.js';

interface ConflictPanelProps {
  store: StoreApi<AppStore>;
}

export function ConflictPanel({ store }: ConflictPanelProps): React.ReactElement {
  const conflictState = useStore(store, s => s.conflictState);
  const focusedConflictIndex = useStore(store, s => s.focusedConflictIndex);

  if (!conflictState) return <></>;

  return (
    <Box flexDirection="column" borderStyle="single" padding={1} marginTop={1}>
      <Text bold color="yellow">Auto-Link Detection</Text>
      <Text> </Text>
      <Text dimColor>Found same-name skills in Agent directories for "{conflictState.skillName}":</Text>
      <Text> </Text>
      {conflictState.conflicts.map((conflict, i) => (
        <Box flexDirection="row" key={conflict.agentId}>
          <Text color={i === focusedConflictIndex ? 'cyan' : 'gray'}>
            {conflict.sameContent ? '[x]' : conflict.resolution !== 'pending' ? '[x]' : '[ ]'} {conflict.agentName}
          </Text>
          <Text> </Text>
          <Text dimColor>
            {conflict.sameContent ? '(same content, auto-linked)' : '(different content)'}
          </Text>
          {!conflict.sameContent && (
            <Text color="yellow">
              {conflict.resolution === 'link' ? ' -> Link' : conflict.resolution === 'skip' ? ' -> Skip' : ''}
            </Text>
          )}
        </Box>
      ))}
      <Text> </Text>
      <Text dimColor>Up/Down:Navigate Space:Toggle Enter:Confirm Esc:Skip All</Text>
    </Box>
  );
}
