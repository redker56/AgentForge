/**
 * Tab navigation bar at the top of the TUI screen.
 * Uses a warm editorial "desk" treatment inspired by Anthropic brand tones.
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type { WidthBand } from '../hooks/useTerminalDimensions.js';
import { getTuiText } from '../i18n.js';
import type { AppStore, TabId } from '../store/index.js';
import { inkColors, spacing } from '../theme.js';

interface TabBarProps {
  store: StoreApi<AppStore>;
  band: WidthBand;
  columns: number;
}

const TAB_IDS: TabId[] = ['skills', 'agents', 'projects', 'sync', 'import'];

export function TabBar({ store, band, columns }: TabBarProps): React.ReactElement {
  const activeTab = useStore(store, (s) => s.shellState.activeTab);
  const locale = useStore(store, (s) => s.shellState.locale);
  const text = getTuiText(locale);

  const useSymbols = band === 'compact' || columns < 60;
  const tabs = TAB_IDS.map((id) => ({
    id,
    label: useSymbols ? text.shortTabs[id] : text.tabs[id],
  }));
  const showHints = !useSymbols && columns >= 60;
  const showSubtitle = !useSymbols && columns >= 88;
  const gap = ' '.repeat(spacing.tabGap);

  return (
    <Box flexWrap="wrap">
      <Text bold color={inkColors.accent}>
        AgentForge
      </Text>
      {showSubtitle && (
        <>
          <Text color={inkColors.muted}> / </Text>
          <Text color={inkColors.secondary}>{text.subtitle}</Text>
        </>
      )}
      <Text>{`${gap}  `}</Text>
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        return (
          <React.Fragment key={tab.id}>
            {showHints && (
              <>
                <Text color={inkColors.subtle}>{index + 1}</Text>
                <Text color={inkColors.subtle}> </Text>
              </>
            )}
            <Text
              color={isActive ? inkColors.focusText : inkColors.secondary}
              backgroundColor={isActive ? inkColors.paper : undefined}
              bold={isActive}
            >
              {isActive ? `[${tab.label}]` : tab.label}
            </Text>
            {index < tabs.length - 1 && <Text>{gap}</Text>}
          </React.Fragment>
        );
      })}
    </Box>
  );
}
