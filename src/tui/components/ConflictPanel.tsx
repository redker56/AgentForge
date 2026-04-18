/**
 * Post-install/post-import conflict resolution panel.
 * Shows same-name skills found in agent directories and allows resolution.
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type { AppStore } from '../store/index.js';
import { inkColors, selectionMarkers } from '../theme.js';

interface ConflictPanelProps {
  store: StoreApi<AppStore>;
}

function truncateText(text: string, maxWidth = 68): string {
  if (maxWidth <= 0) return '';
  if (text.length <= maxWidth) return text;
  if (maxWidth <= 3) return text.slice(0, maxWidth);
  return `${text.slice(0, maxWidth - 3)}...`;
}

export function ConflictPanel({ store }: ConflictPanelProps): React.ReactElement {
  const conflictState = useStore(store, s => s.shellState.conflictState);
  const focusedConflictIndex = useStore(store, s => s.shellState.focusedConflictIndex);

  if (!conflictState) return <></>;

  return (
    <Box flexDirection="column" borderStyle="single" padding={1} marginTop={1} width={72} borderColor={inkColors.border}>
      <Text bold color={inkColors.warning}>Auto-Link Detection</Text>
      <Text> </Text>
      <Text dimColor>{truncateText(`Found same-name skills in Agent directories for "${conflictState.skillName}":`)}</Text>
      <Text> </Text>
      {conflictState.conflicts.map((conflict, i) => (
        <Text key={conflict.agentId} color={i === focusedConflictIndex ? inkColors.accent : undefined}>
          {truncateText(
            `${conflict.sameContent ? selectionMarkers.selected : conflict.resolution !== 'pending' ? selectionMarkers.selected : selectionMarkers.unselected} ${conflict.agentName} ${
              conflict.sameContent ? '(same content, auto-linked)' : '(different content)'
            }${!conflict.sameContent
              ? conflict.resolution === 'link'
                ? ' -> Link'
                : conflict.resolution === 'skip'
                  ? ' -> Skip'
                  : ''
              : ''}`
          )}
        </Text>
      ))}
      <Text> </Text>
      <Text dimColor>{truncateText('Up/Down:Navigate Space:Toggle Enter:Confirm Esc:Skip All')}</Text>
    </Box>
  );
}
