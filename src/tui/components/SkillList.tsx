/**
 * Scrollable skill list panel for Skills tab.
 * Uses an editorial list treatment with light focus cards over a warm dark base.
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import { useNavigation } from '../hooks/useNavigation.js';
import type { AppStore } from '../store/index.js';
import { emptyStateText, inkColors, renderFocusPrefix, selectionMarkers, statusDots } from '../theme.js';
import { getVisibleFocusedSkillIndex, getVisibleSkills } from '../utils/skillsView.js';

import { ScrollIndicator } from './ScrollIndicator.js';

interface SkillListProps {
  store: StoreApi<AppStore>;
  columns: number;
}

function truncateText(text: string, maxWidth: number): string {
  if (maxWidth <= 0) return '';
  if (text.length <= maxWidth) return text;
  if (maxWidth <= 3) return text.slice(0, maxWidth);
  return `${text.slice(0, maxWidth - 3)}...`;
}

export function SkillList({ store, columns }: SkillListProps): React.ReactElement {
  const skills = useStore(store, (s) => s.skills);
  const focusedIndex = useStore(store, (s) => s.skillsBrowserState.focusedIndex);
  const activeSkillCategoryFilter = useStore(store, (s) => s.skillsBrowserState.activeCategoryFilter);
  const selectedNames = useStore(store, (s) => s.skillsBrowserState.selectedNames);
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

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Text bold color={inkColors.accent}>
        Skill Library <Text color={inkColors.muted}>({visibleSkills.length})</Text>
      </Text>

      {hiddenAbove > 0 && (
        <ScrollIndicator hiddenAbove={hiddenAbove} hiddenBelow={0} columns={columns} position="above" />
      )}

      {visibleItems.map((skill, i) => {
        const actualIndex = scrollTop + i;
        const isFocused = actualIndex === visibleFocusedIndex;
        const isSelected = selectedNames.has(skill.name);

        let statusDot: string;
        let statusColor: string;
        if (!skill.exists) {
          statusDot = statusDots.inactive;
          statusColor = inkColors.muted;
        } else if (skill.syncedTo.length > 0) {
          statusDot = statusDots.active;
          statusColor = inkColors.success;
        } else {
          statusDot = statusDots.inactive;
          statusColor = inkColors.muted;
        }

        const sourceColor = skill.source.type === 'git' ? inkColors.git : inkColors.muted;
        const focusedSourceColor =
          skill.source.type === 'git'
            ? inkColors.git
            : skill.source.type === 'project'
              ? inkColors.project
              : inkColors.focusText;
        const prefix = renderFocusPrefix(isFocused);
        const marker = isSelected ? selectionMarkers.selected : '';
        const sourceText = `[${skill.source.type}]`;
        const maxRowWidth = Math.max(columns - 6 - (isSelected ? marker.length + 1 : 0), 12);
        const fullCategoriesText =
          skill.categories.length > 0 ? `{${skill.categories.join(', ')}}` : '';
        const baseReservedWidth = sourceText.length + 2 + 1;
        const nameWidth = Math.max(
          Math.min(skill.name.length, maxRowWidth - baseReservedWidth - (fullCategoriesText ? 4 : 0)),
          4
        );
        const displayName = truncateText(skill.name, nameWidth);
        const remainingAfterName = Math.max(
          maxRowWidth - displayName.length - baseReservedWidth - (fullCategoriesText ? 1 : 0),
          0
        );
        const displayCategories = fullCategoriesText
          ? truncateText(fullCategoriesText, remainingAfterName)
          : '';

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
                <Text backgroundColor={inkColors.focusBg} color={inkColors.focusText} bold>
                  {displayName}
                  {' '}
                  <Text color={focusedSourceColor} backgroundColor={inkColors.focusBg}>
                    {sourceText}
                  </Text>
                  {displayCategories ? (
                    <>
                      {' '}
                      <Text color={inkColors.focusText} backgroundColor={inkColors.focusBg}>
                        {displayCategories}
                      </Text>
                    </>
                  ) : null}
                  {' '}
                  <Text color={statusColor} backgroundColor={inkColors.focusBg}>
                    {statusDot}
                  </Text>
                </Text>
              </>
            ) : (
              <>
                <Text>{prefix}</Text>
                {isSelected ? (
                  <Text color={inkColors.success}>{marker}{' '}</Text>
                ) : null}
                <Text color={inkColors.primary} bold>
                  {displayName}
                </Text>
                <Text> </Text>
                <Text color={sourceColor}>
                  {sourceText}
                </Text>
                {displayCategories ? (
                  <>
                    <Text> </Text>
                    <Text color={inkColors.secondary}>{displayCategories}</Text>
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
