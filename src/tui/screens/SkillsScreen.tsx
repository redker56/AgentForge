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
import { getTuiText, localizeSkillCategoryLabel } from '../i18n.js';
import type { AppStore } from '../store/index.js';
import { inkColors } from '../theme.js';
import { getFocusedVisibleSkill } from '../utils/skillsView.js';

interface SkillsScreenProps {
  store: StoreApi<AppStore>;
  band: WidthBand;
  columns: number;
}

function formatSummaryDate(value: string | undefined, text: ReturnType<typeof getTuiText>): string {
  if (!value) return text.common.never;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return text.common.unknown;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function SkillsScreen({
  store,
  band,
  columns,
}: SkillsScreenProps): React.ReactElement | null {
  const focusedIndex = useStore(store, (s) => s.skillsBrowserState.focusedIndex);
  const locale = useStore(store, (s) => s.shellState.locale);
  const skills = useStore(store, (s) => s.skills);
  const activeSkillCategoryFilter = useStore(
    store,
    (s) => s.skillsBrowserState.activeCategoryFilter
  );
  const detailOverlayVisible = useStore(store, (s) => s.shellState.detailOverlayVisible);
  const text = getTuiText(locale);

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
      .at(-1),
    text
  );
  const categoryEntries = getSkillCategoryCounts(skills).filter(
    (entry) =>
      entry.key === activeSkillCategoryFilter ||
      entry.count > 0 ||
      entry.label === 'All' ||
      entry.label === 'Uncategorized'
  );
  const actionItems = [
    ['u', text.skillScreen.actionLabels.updateSelected],
    ['U', text.skillScreen.actionLabels.updateAllGit],
    ['x', text.skillScreen.actionLabels.unsync],
    ['c', text.skillScreen.actionLabels.categorize],
    ['[ ]', text.skillScreen.actionLabels.browseCategory],
  ] as const;

  return (
    <Box flexDirection="column" height="100%" paddingX={1}>
      <Box flexWrap="wrap">
        <Text color={inkColors.muted}>{text.skillScreen.library}</Text>
        <Text bold color={inkColors.accent}>
          {totalSkills}
        </Text>
        <Text color={inkColors.secondary}>{text.skillScreen.skillsTotal}</Text>
        <Text color={inkColors.muted}> / </Text>
        <Text bold color={inkColors.success}>
          {syncedToAgents}
        </Text>
        <Text color={inkColors.secondary}>{text.skillScreen.syncedToAgents}</Text>
        <Text color={inkColors.muted}> / </Text>
        <Text bold color={inkColors.info}>
          {inProjects}
        </Text>
        <Text color={inkColors.secondary}>{text.skillScreen.inProjects}</Text>
        <Text color={inkColors.muted}> / </Text>
        <Text color={inkColors.muted}>{text.skillScreen.lastUpdate}</Text>
        <Text color={inkColors.secondary}>{lastUpdate}</Text>
      </Box>
      <Box flexWrap="wrap">
        <Text color={inkColors.muted}>{text.skillScreen.browse}</Text>
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
                {isActive
                  ? ` ${localizeSkillCategoryLabel(entry.label, locale)}:${entry.count} `
                  : `${localizeSkillCategoryLabel(entry.label, locale)}:${entry.count}`}
              </Text>
            </React.Fragment>
          );
        })}
      </Box>
      <Box flexWrap="wrap">
        <Text color={inkColors.muted}>{text.skillScreen.actions}</Text>
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
