/**
 * Scrollable skill list panel for Skills tab.
 * Uses useNavigation for scroll management, FocusHighlightRow for focus visuals,
 * and ScrollIndicator for scroll edge hints.
 * Modern Claude Code aesthetic with coral accent color.
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import { useNavigation } from '../hooks/useNavigation.js';
import type { AppStore } from '../store/index.js';
import { inkColors, statusDots, renderFocusPrefix, selectionMarkers, emptyStateText } from '../theme.js';
import { getVisibleFocusedSkillIndex, getVisibleSkills } from '../utils/skillsView.js';

import { ScrollIndicator } from './ScrollIndicator.js';


interface SkillListProps {
  store: StoreApi<AppStore>;
  columns: number;
}

export function SkillList({ store, columns }: SkillListProps): React.ReactElement {
  const skills = useStore(store, (s) => s.skills);
  const focusedIndex = useStore(store, (s) => s.focusedSkillIndex);
  const activeSkillCategoryFilter = useStore(store, (s) => s.activeSkillCategoryFilter);
  const selectedNames = useStore(store, (s) => s.selectedSkillNames);
  const visibleSkills = getVisibleSkills(skills, activeSkillCategoryFilter);
  const visibleFocusedIndex = getVisibleFocusedSkillIndex(
    skills,
    activeSkillCategoryFilter,
    focusedIndex
  );

  const { visibleItems, scrollTop, hiddenAbove, hiddenBelow } = useNavigation({
    items: visibleSkills,
    focusedIndex: visibleFocusedIndex,
  });

  // When detail overlay is visible on standard band, subtract overlay rows from viewport
  // This is handled automatically by useNavigation reading stdout.rows

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Text bold color={inkColors.accent}>
        Skills <Text color={inkColors.muted}>({visibleSkills.length})</Text>
      </Text>

      {hiddenAbove > 0 && (
        <ScrollIndicator hiddenAbove={hiddenAbove} hiddenBelow={0} columns={columns} position="above" />
      )}

      {visibleItems.map((skill, i) => {
        const actualIndex = scrollTop + i;
        const isFocused = actualIndex === visibleFocusedIndex;
        const isSelected = selectedNames.has(skill.name);
        const categoriesText =
          skill.categories.length > 0 ? ` {${skill.categories.join(', ')}}` : '';

        // Status indicator - use modern dot style
        let statusDot: string;
        let statusColor: string;
        if (!skill.exists) {
          statusDot = statusDots.inactive; // ○
          statusColor = inkColors.muted;
        } else if (skill.syncedTo.length > 0) {
          statusDot = statusDots.active; // ●
          statusColor = inkColors.success;
        } else {
          statusDot = statusDots.inactive; // ○
          statusColor = inkColors.muted;
        }

        // Source type color
        const sourceColor = skill.source.type === 'git' ? inkColors.git : inkColors.muted;

        // Focus prefix using shared function
        const prefix = renderFocusPrefix(isFocused);
        // Selection marker
        const marker = isSelected ? selectionMarkers.selected : '';

        // Focused row gets full-row background + white text
        // The ▎ must be rendered as a colored sibling, not inside the bg Text
        return (
          <Box key={skill.name}>
            {isFocused ? (
              <>
                <Text color={inkColors.accent}>{prefix}</Text>
                <Text> </Text>
                {isSelected ? (
                  <Text color={inkColors.success} backgroundColor={inkColors.focusBg}>
                    {marker}{' '}
                  </Text>
                ) : null}
                <Text backgroundColor={inkColors.focusBg}>
                  {skill.name}
                </Text>
                <Text> </Text>
                <Text color={sourceColor} backgroundColor={inkColors.focusBg}>
                  [{skill.source.type}]
                </Text>
                {categoriesText ? (
                  <>
                    <Text> </Text>
                    <Text color={inkColors.info} backgroundColor={inkColors.focusBg}>
                      {categoriesText}
                    </Text>
                  </>
                ) : null}
                <Text> </Text>
                <Text color={statusColor} backgroundColor={inkColors.focusBg}>{statusDot}</Text>
              </>
            ) : (
              <>
                <Text>
                  {prefix}
                </Text>
                {isSelected ? (
                  <Text color={inkColors.success}>{marker}{' '}</Text>
                ) : null}
                <Text color={inkColors.primary}>
                  {skill.name}
                </Text>
                <Text> </Text>
                <Text color={sourceColor}>
                  [{skill.source.type}]
                </Text>
                {categoriesText ? (
                  <>
                    <Text> </Text>
                    <Text color={inkColors.info}>{categoriesText}</Text>
                  </>
                ) : null}
                <Text> </Text>
                <Text color={statusColor}>{statusDot}</Text>
              </>
            )}
          </Box>
        );
      })}

      {visibleSkills.length === 0 && (
        <Text color={inkColors.muted}>{emptyStateText.skills}</Text>
      )}

      {hiddenBelow > 0 && (
        <ScrollIndicator hiddenAbove={0} hiddenBelow={hiddenBelow} columns={columns} position="below" />
      )}
    </Box>
  );
}
