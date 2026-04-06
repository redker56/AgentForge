/**
 * Tab navigation bar at the top of the TUI screen.
 * Modern Claude Code aesthetic with subtle focus indicators.
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type { WidthBand } from '../hooks/useTerminalDimensions.js';
import type { AppStore, TabId } from '../store/index.js';
import { inkColors } from '../theme.js';

interface TabBarProps {
  store: StoreApi<AppStore>;
  band: WidthBand;
  columns: number;
}

const FULL_TABS: Array<{ id: TabId; label: string }> = [
  { id: 'skills', label: 'Skills' },
  { id: 'agents', label: 'Agents' },
  { id: 'projects', label: 'Projects' },
  { id: 'sync', label: 'Sync' },
  { id: 'import', label: 'Import' },
];

const SYMBOL_TABS: Array<{ id: TabId; label: string }> = [
  { id: 'skills', label: 'S' },
  { id: 'agents', label: 'A' },
  { id: 'projects', label: 'P' },
  { id: 'sync', label: 'Sy' },
  { id: 'import', label: 'I' },
];

export function TabBar({ store, band, columns }: TabBarProps): React.ReactElement {
  const activeTab = useStore(store, (s) => s.activeTab);

  const useSymbols = band === 'compact' || columns < 60;
  const tabs = useSymbols ? SYMBOL_TABS : FULL_TABS;

  return (
    <Box>
      <Text bold color={inkColors.accent}>AgentForge</Text>
      <Text color={inkColors.muted}>  </Text>
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        return (
          <React.Fragment key={tab.id}>
            <Text
              color={isActive ? inkColors.accent : inkColors.muted}
              bold={isActive}
            >
              {isActive ? '[' : ' '}
              <Text
                color={isActive ? 'white' : inkColors.secondary}
                bold={isActive}
              >
                {tab.label}
              </Text>
              {isActive ? ']' : ' '}
            </Text>
            {index < tabs.length - 1 && <Text> </Text>}
          </React.Fragment>
        );
      })}
    </Box>
  );
}
