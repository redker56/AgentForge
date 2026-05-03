/**
 * Post-install/post-import conflict resolution panel.
 * Shows same-name skills found in agent directories and allows resolution.
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import { getTuiText } from '../i18n.js';
import type { AppStore } from '../store/index.js';
import { inkColors, selectionMarkers } from '../theme.js';
import { truncateDisplayText } from '../utils/displayWidth.js';

interface ConflictPanelProps {
  store: StoreApi<AppStore>;
}

function truncateText(text: string, maxWidth = 68): string {
  return truncateDisplayText(text, maxWidth);
}

export function ConflictPanel({ store }: ConflictPanelProps): React.ReactElement {
  const conflictState = useStore(store, (s) => s.shellState.conflictState);
  const focusedConflictIndex = useStore(store, (s) => s.shellState.focusedConflictIndex);
  const locale = useStore(store, (s) => s.shellState.locale);
  const text = getTuiText(locale);

  if (!conflictState) return <></>;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      padding={1}
      marginTop={1}
      width={72}
      borderColor={inkColors.border}
    >
      <Text bold color={inkColors.warning}>
        {text.modal.conflictTitle}
      </Text>
      <Text> </Text>
      <Text dimColor>{truncateText(text.modal.conflictFound(conflictState.skillName))}</Text>
      <Text> </Text>
      {conflictState.conflicts.map((conflict, i) => (
        <Text
          key={conflict.agentId}
          color={i === focusedConflictIndex ? inkColors.accent : undefined}
        >
          {truncateText(
            `${conflict.sameContent ? selectionMarkers.selected : conflict.resolution !== 'pending' ? selectionMarkers.selected : selectionMarkers.unselected} ${conflict.agentName} ${
              conflict.sameContent ? text.modal.sameContent : text.modal.differentContent
            }${
              !conflict.sameContent
                ? conflict.resolution === 'link'
                  ? ` -> ${text.common.link}`
                  : conflict.resolution === 'skip'
                    ? ` -> ${text.common.skip}`
                    : ''
                : ''
            }`
          )}
        </Text>
      ))}
      <Text> </Text>
      <Text dimColor>{truncateText(text.modal.navToggleConfirmSkip)}</Text>
    </Box>
  );
}
