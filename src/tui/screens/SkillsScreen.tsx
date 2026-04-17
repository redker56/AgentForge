/**
 * Skills tab content -- responsive layout with summary bar.
 * Widescreen: 40/60 split-pane.
 * Standard: full-width list, detail overlay on Enter.
 * Compact: null (App-level warning banner handles this).
 */

import { Box, Text } from 'ink';
import React, { useEffect } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import { getSkillCategoryCounts } from '../../types.js';
import { SkillDetail } from '../components/SkillDetail.js';
import { SkillList } from '../components/SkillList.js';
import type { WidthBand } from '../hooks/useTerminalDimensions.js';
import type { AppStore } from '../store/index.js';
import { inkColors } from '../theme.js';
import { getFocusedVisibleSkill } from '../utils/skillsView.js';

interface SkillsScreenProps {
  store: StoreApi<AppStore>;
  band: WidthBand;
  columns: number;
}

function formatSummaryDate(value?: string): string {
  if (!value) return 'Never';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function truncateText(text: string, maxWidth: number): string {
  if (maxWidth <= 0) return '';
  if (text.length <= maxWidth) return text;
  if (maxWidth <= 3) return text.slice(0, maxWidth);
  return `${text.slice(0, maxWidth - 3)}...`;
}

export function SkillsScreen({ store, band, columns }: SkillsScreenProps): React.ReactElement | null {
  const focusedIndex = useStore(store, (s) => s.focusedSkillIndex);
  const skills = useStore(store, (s) => s.skills);
  const activeSkillCategoryFilter = useStore(store, (s) => s.activeSkillCategoryFilter);
  const detailOverlayVisible = useStore(store, (s) => s.detailOverlayVisible);

  // Load skill detail when focused skill changes
  useEffect(() => {
    const focusedSkill = getFocusedVisibleSkill(skills, activeSkillCategoryFilter, focusedIndex);
    if (focusedSkill) {
      const detail = store.getState().skillDetails[focusedSkill.name];
      if (!detail) {
        void store.getState().loadSkillDetail(focusedSkill.name);
      }
    }
  }, [activeSkillCategoryFilter, focusedIndex, skills, store]);

  // Compute summary bar data
  const totalSkills = skills.length;
  const syncedToAgents = skills.filter(s => s.syncedTo && s.syncedTo.length > 0).length;
  const inProjects = skills.filter((s) => (s.syncedProjects?.length ?? 0) > 0).length;

  const lastUpdate = formatSummaryDate(
    skills
      .map((s) => s.updatedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1)
  );
  const categoryBar = truncateText(
    `Browse: ${getSkillCategoryCounts(skills)
      .filter(
        (entry) =>
          entry.key === activeSkillCategoryFilter ||
          entry.count > 0 ||
          entry.label === 'All' ||
          entry.label === 'Uncategorized'
      )
      .map((entry) =>
        entry.key === activeSkillCategoryFilter
          ? `[${entry.label}:${entry.count}]`
          : `${entry.label}:${entry.count}`
      )
      .join(' | ')}`,
    Math.max(columns - 2, 24)
  );

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
      <Text color={inkColors.muted}>
        {categoryBar}
      </Text>
      <Text color={inkColors.muted}>
        Actions: <Text color={inkColors.secondary}>u</Text> update selected
        <Text> | </Text>
        <Text color={inkColors.secondary}>U</Text> update all git
        <Text> | </Text>
        <Text color={inkColors.secondary}>x</Text> unsync
        <Text> | </Text>
        <Text color={inkColors.secondary}>c</Text> categorize
        <Text> | </Text>
        <Text color={inkColors.secondary}>[</Text>/<Text color={inkColors.secondary}>]</Text> browse category
      </Text>

      {band === 'widescreen' ? (
        /* Widescreen: 40/60 split-pane with independent scrolling */
        <Box flexDirection="row" flexGrow={1} minHeight={0} overflow="hidden">
          <Box width="40%" flexDirection="column" minHeight={0}>
            <SkillList store={store} columns={columns} />
          </Box>
          <Box width="60%" flexDirection="column" borderStyle="single" borderLeft={true} borderRight={false} borderTop={false} borderBottom={false} borderColor={inkColors.muted} minHeight={0} overflow="hidden">
            <SkillDetail store={store} band="widescreen" columns={columns} />
          </Box>
        </Box>
      ) : (
        /* Standard/compact: full-width list + optional slide-over detail */
        <Box flexDirection="column" flexGrow={1}>
          <Box flexGrow={1}>
            <SkillList store={store} columns={columns} />
          </Box>
          {detailOverlayVisible && band === 'standard' && (
            <Box flexDirection="row">
              <Box flexGrow={1} />
              <SkillDetail store={store} band="standard" columns={columns} />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
