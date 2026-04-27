/**
 * Scrollable agent table for the master pane.
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import { useNavigation } from '../hooks/useNavigation.js';
import type { AppStore } from '../store/index.js';
import { inkColors, renderFocusPrefix, emptyStateText } from '../theme.js';
import { padDisplayText, truncateDisplayText } from '../utils/displayWidth.js';

import { ScrollIndicator } from './ScrollIndicator.js';

interface AgentTableProps {
  store: StoreApi<AppStore>;
  columns: number;
}

function truncateText(text: string, maxWidth: number): string {
  return truncateDisplayText(text, maxWidth);
}

export function AgentTable({ store, columns }: AgentTableProps): React.ReactElement {
  const agents = useStore(store, (s) => s.agents);
  const focusedAgentIndex = useStore(store, (s) => s.agentsBrowserState.focusedIndex);
  const agentSummaries = useStore(store, (s) => s.agentSummaries);

  const { visibleItems, scrollTop, hiddenAbove, hiddenBelow } = useNavigation({
    items: agents,
    focusedIndex: focusedAgentIndex,
  });

  const availableWidth = Math.max(columns - 2, 10);
  const idWidth = Math.min(12, Math.floor(availableWidth * 0.16));
  const nameWidth = Math.min(16, Math.floor(availableWidth * 0.22));
  const fixedWidth = 12;
  const pathWidth = Math.max(availableWidth - idWidth - nameWidth - fixedWidth, 10);

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Text bold color={inkColors.accent}>
        Agents <Text color={inkColors.muted}>({agents.length})</Text>
      </Text>
      <Text color={inkColors.muted}>
        {padDisplayText('ID', idWidth)}
        {padDisplayText('Name', nameWidth)}
        {padDisplayText('Path', pathWidth)}
        {padDisplayText('Skls', 5)}
        Proj
      </Text>
      <Text color={inkColors.muted}>{'\u2500'.repeat(Math.max(availableWidth, 10))}</Text>

      {hiddenAbove > 0 && visibleItems.length > 0 && (
        <ScrollIndicator
          hiddenAbove={hiddenAbove}
          hiddenBelow={0}
          columns={columns}
          position="above"
        />
      )}

      {visibleItems.map((agent, index) => {
        const actualIndex = scrollTop + index;
        const isFocused = actualIndex === focusedAgentIndex;
        const prefix = renderFocusPrefix(isFocused);
        const summary = agentSummaries[agent.id];
        const rowText =
          `${padDisplayText(agent.id, idWidth)}` +
          `${padDisplayText(truncateText(agent.name, nameWidth), nameWidth)}` +
          `${padDisplayText(truncateText(agent.basePath, pathWidth), pathWidth)}` +
          `${padDisplayText(String(summary?.userLevelSkillCount ?? 0), 5)}` +
          `${String(summary?.projectLevelSkillCount ?? 0)}`;

        return (
          <Box key={agent.id}>
            <Text color={isFocused ? inkColors.accent : inkColors.primary}>{prefix}</Text>
            <Text> </Text>
            {isFocused ? (
              <Text backgroundColor={inkColors.focusBg} color={inkColors.focusText} bold>
                {rowText}
              </Text>
            ) : (
              <Text color={inkColors.primary}>{rowText}</Text>
            )}
          </Box>
        );
      })}

      {agents.length === 0 && <Text color={inkColors.muted}>{emptyStateText.agents}</Text>}

      {hiddenBelow > 0 && visibleItems.length > 0 && (
        <ScrollIndicator
          hiddenAbove={0}
          hiddenBelow={hiddenBelow}
          columns={columns}
          position="below"
        />
      )}
    </Box>
  );
}
