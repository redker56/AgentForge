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

export function SkillsScreen({ store, band, columns }: SkillsScreenProps): React.ReactElement | null {
  const focusedIndex = useStore(store, (s) => s.skillsBrowserState.focusedIndex);
  const skills = useStore(store, (s) => s.skills);
  const activeSkillCategoryFilter = useStore(store, (s) => s.skillsBrowserState.activeCategoryFilter);
  const detailOverlayVisible = useStore(store, (s) => s.shellState.detailOverlayVisible);

  useEffect(() => {
    const focusedSkill = getFocusedVisibleSkill(skills, activeSkillCategoryFilter, focusedIndex);
    if (focusedSkill) {
      const detail = store.getState().skillDetails[focusedSkill.name];
      if (!detail) {
        void store.getState().loadSkillDetail(focusedSkill.name);
      }
    }
  }, [activeSkillCategoryFilter, focusedIndex, skills, store]);

  const totalSkills = skills.length;
  const syncedToAgents = skills.filter((s) => s.syncedTo && s.syncedTo.length > 0).length;
  const inProjects = skills.filter((s) => (s.syncedProjects?.length ?? 0) > 0).length;
  const lastUpdate = formatSummaryDate(
    skills
      .map((s) => s.updatedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1)
  );
  const categoryEntries = getSkillCategoryCounts(skills).filter(
    (entry) =>
      entry.key === activeSkillCategoryFilter ||
      entry.count > 0 ||
      entry.label === 'All' ||
      entry.label === 'Uncategorized'
  );
  const actionItems = [
    ['u', 'update selected'],
    ['U', 'update all git'],
    ['x', 'unsync'],
    ['c', 'categorize'],
    ['[ ]', 'browse category'],
  ] as const;

  return (
    <Box flexDirection="column" height="100%" paddingX={1}>
      <Box flexWrap="wrap">
        <Text color={inkColors.muted}>Library: </Text>
        <Text bold color={inkColors.accent}>{totalSkills}</Text>
        <Text color={inkColors.secondary}> skills total</Text>
        <Text color={inkColors.muted}> / </Text>
        <Text bold color={inkColors.success}>{syncedToAgents}</Text>
        <Text color={inkColors.secondary}> synced to agents</Text>
        <Text color={inkColors.muted}> / </Text>
        <Text bold color={inkColors.info}>{inProjects}</Text>
        <Text color={inkColors.secondary}> in projects</Text>
        <Text color={inkColors.muted}> / </Text>
        <Text color={inkColors.muted}>Last update: </Text>
        <Text color={inkColors.secondary}>{lastUpdate}</Text>
      </Box>
      <Box flexWrap="wrap">
        <Text color={inkColors.muted}>Browse: </Text>
        {categoryEntries.map((entry, index) => {
          const isActive = entry.key === activeSkillCategoryFilter;
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
        {actionItems.map(([key, label], index) => (
          <React.Fragment key={key}>
            {index > 0 && <Text color={inkColors.muted}> | </Text>}
            <Text color={inkColors.accent}>{key}</Text>
            <Text color={inkColors.secondary}> {label}</Text>
          </React.Fragment>
        ))}
      </Box>

      {band === 'widescreen' ? (
        <Box flexDirection="row" flexGrow={1} minHeight={0} overflow="hidden">
          <Box width="40%" flexDirection="column" minHeight={0}>
            <SkillList store={store} columns={columns} />
          </Box>
          <Box
            width="60%"
            flexDirection="column"
            borderStyle="single"
            borderLeft={true}
            borderRight={false}
            borderTop={false}
            borderBottom={false}
            borderColor={inkColors.border}
            minHeight={0}
            overflow="hidden"
          >
            <SkillDetail store={store} band="widescreen" columns={columns} />
          </Box>
        </Box>
      ) : (
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
