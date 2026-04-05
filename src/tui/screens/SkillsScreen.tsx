/**
 * Skills tab content -- responsive layout with summary bar.
 * Widescreen: 40/60 split-pane.
 * Standard: full-width list, detail overlay on Enter.
 * Compact: null (App-level warning banner handles this).
 */

import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';
import type { AppStore } from '../store/index.js';
import { SkillList } from '../components/SkillList.js';
import { SkillDetail } from '../components/SkillDetail.js';
import type { WidthBand } from '../hooks/useTerminalDimensions.js';
import { inkColors } from '../theme.js';

interface SkillsScreenProps {
  store: StoreApi<AppStore>;
  band: WidthBand;
  columns: number;
}

export function SkillsScreen({ store, band, columns }: SkillsScreenProps): React.ReactElement | null {
  const focusedIndex = useStore(store, (s) => s.focusedSkillIndex);
  const skills = useStore(store, (s) => s.skills);
  const detailOverlayVisible = useStore(store, (s) => s.detailOverlayVisible);

  // Load skill detail when focused skill changes
  useEffect(() => {
    const focusedSkill = skills[focusedIndex];
    if (focusedSkill) {
      const detail = store.getState().skillDetails[focusedSkill.name];
      if (!detail) {
        store.getState().loadSkillDetail(focusedSkill.name);
      }
    }
  }, [focusedIndex, skills, store]);

  // Compact band: App-level warning banner handles this
  if (band === 'compact') {
    return null;
  }

  // Compute summary bar data
  const totalSkills = skills.length;
  const syncedToAgents = skills.filter(s => s.syncedTo && s.syncedTo.length > 0).length;
  const inProjects = skills.filter(s => {
    const detail = store.getState().skillDetails[s.name];
    return detail?.syncedProjects && detail.syncedProjects.length > 0;
  }).length;

  // Last update: most recent createdAt
  let lastUpdate = 'Never';
  if (skills.length > 0) {
    const dates = skills
      .map(s => s.createdAt)
      .filter(Boolean)
      .sort()
      .reverse();
    if (dates.length > 0) {
      try {
        const d = new Date(dates[0]);
        lastUpdate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } catch {
        lastUpdate = 'Unknown';
      }
    }
  }

  return (
    <Box flexDirection="column" height="100%" paddingX={1}>
      {/* Summary bar */}
      <Text color={inkColors.muted}>
        <Text bold color={inkColors.accent}>{totalSkills}</Text> skills total
        <Text> | </Text>
        <Text bold color={inkColors.success}>{syncedToAgents}</Text> synced to agents
        <Text> | </Text>
        <Text bold color={inkColors.info}>{inProjects}</Text> in projects
        <Text> | </Text>
        Last update: <Text color={inkColors.secondary}>{lastUpdate}</Text>
      </Text>

      {band === 'widescreen' ? (
        /* Widescreen: 40/60 split-pane with independent scrolling */
        <Box flexDirection="row" flexGrow={1} minHeight={0} overflow="hidden">
          <Box width="40%" flexDirection="column" minHeight={0}>
            <SkillList store={store} columns={columns} />
          </Box>
          <Box width="60%" flexDirection="column" borderStyle="single" borderLeft={true} borderRight={false} borderTop={false} borderBottom={false} borderColor={inkColors.muted} minHeight={0} overflow="hidden">
            <SkillDetail store={store} band="widescreen" />
          </Box>
        </Box>
      ) : (
        /* Standard: full-width list + optional slide-over detail */
        <Box flexDirection="column" flexGrow={1}>
          <Box flexGrow={1}>
            <SkillList store={store} columns={columns} />
          </Box>
          {detailOverlayVisible && (
            <Box flexDirection="row">
              <Box flexGrow={1} />
              <SkillDetail store={store} band="standard" />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
