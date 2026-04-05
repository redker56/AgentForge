/**
 * Scrollable agent table with expandable rows.
 * Dynamic column widths based on columns prop. Focus highlight with ▎ prefix.
 * Modern Claude Code aesthetic with coral accent color.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';
import type { AppStore } from '../store/index.js';
import { useNavigation } from '../hooks/useNavigation.js';
import type { AgentDetailData } from '../store/dataSlice.js';
import { ScrollIndicator } from './ScrollIndicator.js';
import { inkColors } from '../theme.js';

interface AgentTableProps {
  store: StoreApi<AppStore>;
  columns: number;
}

export function AgentTable({ store, columns }: AgentTableProps): React.ReactElement {
  const agents = useStore(store, s => s.agents);
  const focusedAgentIndex = useStore(store, s => s.focusedAgentIndex);
  const expandedAgentIds = useStore(store, s => s.expandedAgentIds);
  const agentDetails = useStore(store, s => s.agentDetails);

  const { visibleItems, scrollTop, hiddenAbove, hiddenBelow } = useNavigation({ items: agents, focusedIndex: focusedAgentIndex });

  // Dynamic column width computation
  const availableWidth = Math.max(columns - 2, 10);
  const idWidth = Math.min(12, Math.floor(availableWidth * 0.15));
  const nameWidth = Math.min(15, Math.floor(availableWidth * 0.2));
  const fixedWidth = 10; // Skls:5 + Proj:5
  const pathWidth = Math.max(availableWidth - idWidth - nameWidth - fixedWidth, 10);

  const separatorWidth = Math.max(availableWidth, 10);

  const renderRow = (agent: typeof agents[0], isFocused: boolean): React.ReactElement => {
    const detail: AgentDetailData | undefined = agentDetails[agent.id];
    const skillCount = detail ? String(detail.userLevelSkills.length) : '?';
    const projCount = detail ? String(detail.projectLevelSkills.length) : '?';

    const pathDisplay = agent.basePath.length > pathWidth
      ? agent.basePath.slice(0, pathWidth - 3) + '...'
      : agent.basePath.padEnd(pathWidth);

    const rowText = `${agent.id.padEnd(idWidth)}${agent.name.padEnd(nameWidth)}${pathDisplay}${skillCount.padEnd(5)}${projCount}`;

    if (isFocused) {
      return (
        <>
          <Text color={inkColors.accent}>{"\u258E"}</Text>
          <Text> </Text>
          <Text backgroundColor={inkColors.focusBg}>{rowText}</Text>
        </>
      );
    }

    return <Text color={inkColors.secondary}>{rowText}</Text>;
  };


  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>
        Agents <Text color={inkColors.muted}>({agents.length})</Text>
      </Text>

      {/* Header row */}
      <Text color={inkColors.muted}>
        {'ID'.padEnd(idWidth)}{'Name'.padEnd(nameWidth)}{'Path'.padEnd(pathWidth)}{'Skls'.padEnd(5)}{'Proj'}
      </Text>
      <Text color={inkColors.muted}>{'\u2500'.repeat(separatorWidth)}</Text>

      {hiddenAbove > 0 && visibleItems.length > 0 && (
        <ScrollIndicator hiddenAbove={hiddenAbove} hiddenBelow={0} columns={columns} position="above" />
      )}

      {/* Agent rows */}
      {visibleItems.map((agent, i) => {
        const actualIndex = scrollTop + i;
        const isFocused = actualIndex === focusedAgentIndex;
        const isExpanded = expandedAgentIds.has(agent.id);
        const detail: AgentDetailData | undefined = agentDetails[agent.id];

        return (
          <Box key={agent.id} flexDirection="column">
            {/* Main row */}
            {renderRow(agent, isFocused)}

            {/* Expanded detail */}
            {isExpanded && (
              <Box flexDirection="column" paddingLeft={2}>
                {!detail && (
                  <Text color={inkColors.muted}>  Loading...</Text>
                )}
                {detail && (
                  <>
                    {detail.userLevelSkills.length > 0 && (
                      <Box flexDirection="column">
                        <Text color={inkColors.muted} bold>User-level:</Text>
                        {detail.userLevelSkills.map(skill => (
                          <Text key={skill.name} color={inkColors.secondary}>
                            {'  '}{skill.name}
                            <Text color={inkColors.muted}> ({skill.syncMode}, {skill.isSynced ? 'synced' : 'not synced'})</Text>
                          </Text>
                        ))}
                      </Box>
                    )}
                    {detail.projectLevelSkills.length > 0 && (
                      <Box flexDirection="column">
                        <Text color={inkColors.muted} bold>Project-level:</Text>
                        {detail.projectLevelSkills.map(proj => (
                          <Box key={proj.projectId} flexDirection="column">
                            <Text color={inkColors.secondary}>  {proj.projectId}:</Text>
                            {proj.skills.map(s => (
                              <Text key={s.name} color={inkColors.muted}>    {s.name}</Text>
                            ))}
                          </Box>
                        ))}
                      </Box>
                    )}
                    {detail.userLevelSkills.length === 0 && detail.projectLevelSkills.length === 0 && (
                      <Text color={inkColors.muted}>  No skills found</Text>
                    )}
                  </>
                )}
              </Box>
            )}
          </Box>
        );
      })}

      {hiddenBelow > 0 && visibleItems.length > 0 && (
        <ScrollIndicator hiddenAbove={0} hiddenBelow={hiddenBelow} columns={columns} position="below" />
      )}

      {agents.length === 0 && (
        <Text color={inkColors.muted}>No agents registered. Add a custom agent with `a` key.</Text>
      )}
    </Box>
  );
}
