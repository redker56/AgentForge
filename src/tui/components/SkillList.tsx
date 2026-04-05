/**
 * Scrollable skill list panel for Skills tab.
 * Uses useNavigation for scroll management, FocusHighlightRow for focus visuals,
 * and ScrollIndicator for scroll edge hints.
 * Modern Claude Code aesthetic with coral accent color.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';
import type { AppStore } from '../store/index.js';
import { useNavigation } from '../hooks/useNavigation.js';
import { ScrollIndicator } from './ScrollIndicator.js';
import { inkColors, statusDots } from '../theme.js';

interface SkillListProps {
  store: StoreApi<AppStore>;
  columns: number;
}

export function SkillList({ store, columns }: SkillListProps): React.ReactElement {
  const skills = useStore(store, (s) => s.skills);
  const focusedIndex = useStore(store, (s) => s.focusedSkillIndex);
  const selectedNames = useStore(store, (s) => s.selectedSkillNames);
  const detailOverlayVisible = useStore(store, (s) => s.detailOverlayVisible);

  const { visibleItems, scrollTop, hiddenAbove, hiddenBelow } = useNavigation({
    items: skills,
    focusedIndex,
  });

  // When detail overlay is visible on standard band, subtract overlay rows from viewport
  // This is handled automatically by useNavigation reading stdout.rows

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Text bold color={inkColors.accent}>
        Skills <Text color={inkColors.muted}>({skills.length})</Text>
        <Text color={inkColors.muted}>  [/] search</Text>
      </Text>

      {hiddenAbove > 0 && (
        <ScrollIndicator hiddenAbove={hiddenAbove} hiddenBelow={0} columns={columns} position="above" />
      )}

      {visibleItems.map((skill, i) => {
        const actualIndex = scrollTop + i;
        const isFocused = actualIndex === focusedIndex;
        const isSelected = selectedNames.has(skill.name);

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

        // Build prefix based on focus + selection state
        let prefix: string;
        if (isFocused) {
          // Focused rows get "▎ " prefix
          if (isSelected) {
            prefix = '\u258E [✓] ';
          } else {
            prefix = '\u258E ';
          }
        } else {
          // Non focused
          if (isSelected) {
            prefix = '[✓] ';
          } else {
            prefix = '  '; // 2-char indent for alignment
          }
        }

        // Focused row gets full-row background + white text
        // The ▎ must be rendered as a colored sibling, not inside the bg Text
        return (
          <Box key={skill.name}>
            {isFocused ? (
              <>
                <Text color={inkColors.accent}>{"\u258E"}</Text>
                <Text> </Text>
                {isSelected ? <Text backgroundColor={inkColors.focusBg}>[✓] </Text> : null}
                <Text backgroundColor={inkColors.focusBg}>
                  {isSelected ? '' : ''}{skill.name}
                </Text>
                <Text> </Text>
                <Text color={sourceColor} backgroundColor={inkColors.focusBg}>
                  [{skill.source.type}]
                </Text>
                <Text> </Text>
                <Text color={statusColor} backgroundColor={inkColors.focusBg}>{statusDot}</Text>
              </>
            ) : (
              <>
                <Text color={inkColors.accent}>
                  {prefix}
                </Text>
                <Text color={inkColors.primary}>
                  {skill.name}
                </Text>
                <Text> </Text>
                <Text color={sourceColor}>
                  [{skill.source.type}]
                </Text>
                <Text> </Text>
                <Text color={statusColor}>{statusDot}</Text>
              </>
            )}
          </Box>
        );
      })}

      {skills.length === 0 && (
        <Text color={inkColors.muted}>No skills installed</Text>
      )}

      {hiddenBelow > 0 && (
        <ScrollIndicator hiddenAbove={0} hiddenBelow={hiddenBelow} columns={columns} position="below" />
      )}
    </Box>
  );
}
