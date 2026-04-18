/**
 * Scrollable project table for the master pane.
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import { useNavigation } from '../hooks/useNavigation.js';
import type { AppStore } from '../store/index.js';
import { inkColors, renderFocusPrefix, emptyStateText } from '../theme.js';

import { ScrollIndicator } from './ScrollIndicator.js';

interface ProjectTableProps {
  store: StoreApi<AppStore>;
  columns: number;
}

function truncateText(text: string, maxWidth: number): string {
  if (maxWidth <= 0) return '';
  if (text.length <= maxWidth) return text;
  if (maxWidth <= 3) return text.slice(0, maxWidth);
  return `${text.slice(0, maxWidth - 3)}...`;
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    return '?';
  }
}

export function ProjectTable({ store, columns }: ProjectTableProps): React.ReactElement {
  const projects = useStore(store, (s) => s.projects);
  const focusedProjectIndex = useStore(store, (s) => s.projectsBrowserState.focusedIndex);
  const projectSummaries = useStore(store, (s) => s.projectSummaries);

  const { visibleItems, scrollTop, hiddenAbove, hiddenBelow } = useNavigation({
    items: projects,
    focusedIndex: focusedProjectIndex,
  });

  const availableWidth = Math.max(columns - 2, 10);
  const idWidth = Math.min(15, Math.floor(availableWidth * 0.18));
  const addedWidth = 12;
  const skillsWidth = 6;
  const pathWidth = Math.max(availableWidth - idWidth - addedWidth - skillsWidth, 10);

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Text bold color={inkColors.accent}>
        Projects <Text color={inkColors.muted}>({projects.length})</Text>
      </Text>
      <Text color={inkColors.muted}>
        {'ID'.padEnd(idWidth)}
        {'Path'.padEnd(pathWidth)}
        {'Added'.padEnd(addedWidth)}
        Skills
      </Text>
      <Text color={inkColors.muted}>{'\u2500'.repeat(Math.max(availableWidth, 10))}</Text>

      {hiddenAbove > 0 && visibleItems.length > 0 && (
        <ScrollIndicator hiddenAbove={hiddenAbove} hiddenBelow={0} columns={columns} position="above" />
      )}

      {visibleItems.map((project, index) => {
        const actualIndex = scrollTop + index;
        const isFocused = actualIndex === focusedProjectIndex;
        const prefix = renderFocusPrefix(isFocused);
        const rowText =
          `${project.id.padEnd(idWidth)}` +
          `${truncateText(project.path, pathWidth).padEnd(pathWidth)}` +
          `${formatDate(project.addedAt).padEnd(addedWidth)}` +
          `${String(projectSummaries[project.id]?.skillCount ?? 0)}`;

        return (
          <Box key={project.id}>
            <Text color={isFocused ? inkColors.accent : inkColors.primary}>{prefix}</Text>
            <Text> </Text>
            {isFocused ? (
              <Text backgroundColor={inkColors.focusBg} color={inkColors.focusText} bold>
                {rowText}
              </Text>
            ) : (
              <Text color={inkColors.primary}>{rowText}</Text>
            )}
          </Box>
        );
      })}

      {projects.length === 0 && <Text color={inkColors.muted}>{emptyStateText.projects}</Text>}

      {hiddenBelow > 0 && visibleItems.length > 0 && (
        <ScrollIndicator hiddenAbove={0} hiddenBelow={hiddenBelow} columns={columns} position="below" />
      )}
    </Box>
  );
}
