/**
 * Agents tab content with a master list and contextual skill workbench.
 */

import { Box, Text } from 'ink';
import React, { useEffect } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import { AgentTable } from '../components/AgentTable.js';
import { ContextSkillList } from '../components/ContextSkillList.js';
import { SkillDetail } from '../components/SkillDetail.js';
import { getContextSkillFilterCounts, getVisibleContextSkillRows } from '../contextTypes.js';
import type { WidthBand } from '../hooks/useTerminalDimensions.js';
import type { AppStore } from '../store/index.js';
import { inkColors } from '../theme.js';

interface AgentsScreenProps {
  store: StoreApi<AppStore>;
  band: WidthBand;
  columns: number;
}

export function AgentsScreen({ store, band, columns }: AgentsScreenProps): React.ReactElement | null {
  const focusedAgentIndex = useStore(store, (s) => s.agentsBrowserState.focusedIndex);
  const agents = useStore(store, (s) => s.agents);
  const agentDetails = useStore(store, (s) => s.agentDetails);
  const agentViewMode = useStore(store, (s) => s.agentsBrowserState.viewMode) ?? 'master';
  const focusedAgentSkillIndex = useStore(store, (s) => s.agentsBrowserState.focusedSkillIndex) ?? 0;
  const selectedAgentSkillRowIds =
    useStore(store, (s) => s.agentsBrowserState.selectedSkillRowIds) ?? new Set<string>();
  const activeAgentSkillFilter = useStore(store, (s) => s.agentsBrowserState.activeSkillFilter) ?? 'all';
  const detailOverlayVisible = useStore(store, (s) => s.shellState.detailOverlayVisible);
  const detailSkillName = useStore(store, (s) => s.shellState.detailSkillName);

  const focusedAgent = agents[focusedAgentIndex];
  const detail = focusedAgent ? agentDetails[focusedAgent.id] : undefined;
  const sections = detail?.sections ?? [];
  const visibleRows = getVisibleContextSkillRows(sections, activeAgentSkillFilter);
  const filterCounts = getContextSkillFilterCounts(sections.flatMap((section) => section.rows));

  useEffect(() => {
    if (focusedAgent && !detail) {
      void store.getState().loadAgentDetail(focusedAgent.id);
    }
  }, [detail, focusedAgent, store]);

  useEffect(() => {
    store.getState().clearAgentSkillSelection();
    store.getState().setFocusedAgentSkillIndex(0);
  }, [focusedAgent?.id, store]);

  const contextPane = (
    <Box flexDirection="column" flexGrow={1} minHeight={0}>
      <Text color={inkColors.muted}>
        Agent:{' '}
        <Text color={inkColors.accent} bold>
          {focusedAgent?.name ?? 'None selected'}
        </Text>
        <Text color={inkColors.muted}> / Focus: </Text>
        <Text color={agentViewMode === 'skills' ? inkColors.accent : inkColors.secondary}>
          {agentViewMode === 'skills' ? 'Skills' : 'Agent'}
        </Text>
      </Text>
      <Box flexWrap="wrap">
        <Text color={inkColors.muted}>Browse: </Text>
        {filterCounts.map((entry, index) => {
          const isActive = entry.key === activeAgentSkillFilter;
          return (
            <React.Fragment key={entry.key}>
              {index > 0 && <Text color={inkColors.muted}> | </Text>}
              <Text
                color={isActive ? inkColors.focusText : inkColors.secondary}
                backgroundColor={isActive ? inkColors.paper : undefined}
                bold={isActive}
              >
                {isActive ? ` ${entry.label}:${entry.count} ` : `${entry.label}:${entry.count}`}
              </Text>
            </React.Fragment>
          );
        })}
      </Box>
      <Box flexWrap="wrap">
        <Text color={inkColors.muted}>Actions: </Text>
        <Text color={inkColors.accent}>Enter</Text>
        <Text color={inkColors.secondary}> detail</Text>
        <Text color={inkColors.muted}> | </Text>
        <Text color={inkColors.accent}>Space</Text>
        <Text color={inkColors.secondary}> select</Text>
        <Text color={inkColors.muted}> | </Text>
        <Text color={inkColors.accent}>i</Text>
        <Text color={inkColors.secondary}> import</Text>
        <Text color={inkColors.muted}> | </Text>
        <Text color={inkColors.accent}>x</Text>
        <Text color={inkColors.secondary}> unsync</Text>
        <Text color={inkColors.muted}> | </Text>
        <Text color={inkColors.accent}>u</Text>
        <Text color={inkColors.secondary}> update</Text>
        <Text color={inkColors.muted}> | </Text>
        <Text color={inkColors.accent}>c</Text>
        <Text color={inkColors.secondary}> categorize</Text>
      </Box>
      {detail ? (
        <ContextSkillList
          title="Agent Skills"
          sections={sections}
          filter={activeAgentSkillFilter}
          focusedIndex={focusedAgentSkillIndex}
          selectedRowIds={selectedAgentSkillRowIds}
          columns={band === 'widescreen' ? Math.max(Math.floor(columns * 0.56), 40) : columns}
          emptyText="No context skills available."
        />
      ) : (
        <Text color={inkColors.muted}>Loading skills for this agent...</Text>
      )}
      {agentViewMode === 'skills' && visibleRows.length === 0 && detail && (
        <Text color={inkColors.muted}>No skills match the current filter.</Text>
      )}
    </Box>
  );

  return (
    <Box flexDirection="column" height="100%" padding={1}>
      {band === 'widescreen' ? (
        <Box flexDirection="row" flexGrow={1} minHeight={0} overflow="hidden">
          <Box width="42%" flexDirection="column" minHeight={0}>
            <AgentTable store={store} columns={Math.max(Math.floor(columns * 0.42), 30)} />
          </Box>
          <Box
            width="58%"
            flexDirection="column"
            borderStyle="single"
            borderLeft={true}
            borderRight={false}
            borderTop={false}
            borderBottom={false}
            borderColor={inkColors.border}
            minHeight={0}
            overflow="hidden"
            paddingLeft={1}
          >
            {contextPane}
          </Box>
        </Box>
      ) : agentViewMode === 'master' ? (
        <AgentTable store={store} columns={columns} />
      ) : (
        contextPane
      )}

      {detailOverlayVisible && detailSkillName && (
        <Box flexDirection="row">
          <Box flexGrow={1} />
          <SkillDetail store={store} band="standard" columns={columns} skillName={detailSkillName} />
        </Box>
      )}
    </Box>
  );
}
