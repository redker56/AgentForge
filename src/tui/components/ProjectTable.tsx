/**
 * Scrollable project table with expandable rows.
 * Dynamic column widths based on columns prop. Focus highlight with ▎ prefix.
 * Modern Claude Code aesthetic with coral accent color.
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import { useNavigation } from '../hooks/useNavigation.js';
import type { ProjectDetailData } from '../store/dataSlice.js';
import type { AppStore } from '../store/index.js';
import { inkColors, renderFocusPrefix, emptyStateText } from '../theme.js';

import { ScrollIndicator } from './ScrollIndicator.js';


interface ProjectTableProps {
  store: StoreApi<AppStore>;
  columns: number;
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
  const projects = useStore(store, s => s.projects);
  const focusedProjectIndex = useStore(store, s => s.focusedProjectIndex);
  const expandedProjectIds = useStore(store, s => s.expandedProjectIds);
  const projectDetails = useStore(store, s => s.projectDetails);
  const projectSummaries = useStore(store, s => s.projectSummaries);

  const { visibleItems, scrollTop, hiddenAbove, hiddenBelow } = useNavigation({ items: projects, focusedIndex: focusedProjectIndex });

  // Dynamic column width computation
  const availableWidth = Math.max(columns - 2, 10);
  const idWidth = Math.min(15, Math.floor(availableWidth * 0.18));
  const addedWidth = 12;
  const skillsWidth = 6;
  const pathWidth = Math.max(availableWidth - idWidth - addedWidth - skillsWidth, 10);
  const separatorWidth = Math.max(availableWidth, 10);

  const renderRow = (project: typeof projects[0], isFocused: boolean): React.ReactElement => {
    const detail: ProjectDetailData | undefined = projectDetails[project.id];
    const totalSkills = String(
      projectSummaries[project.id]?.skillCount ??
      (detail ? detail.skillsByAgent.reduce((sum, g) => sum + g.skills.length, 0) : 0)
    );

    const dateStr = formatDate(project.addedAt);
    const pathDisplay = project.path.length > pathWidth
      ? project.path.slice(0, pathWidth - 3) + '...'
      : project.path.padEnd(pathWidth);

    const rowText = `${project.id.padEnd(idWidth)}${pathDisplay}${dateStr.padEnd(addedWidth)}${totalSkills}`;
    const prefix = renderFocusPrefix(isFocused);

    if (isFocused) {
      return (
        <>
          <Text color={inkColors.accent}>{prefix}</Text>
          <Text> </Text>
          <Text backgroundColor={inkColors.focusBg} color={inkColors.focusText} bold>
            {rowText}
          </Text>
        </>
      );
    }

    return (
      <>
        <Text>{prefix}</Text>
        <Text color={inkColors.primary}>{rowText}</Text>
      </>
    );
  };

  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>
        Projects <Text color={inkColors.muted}>({projects.length})</Text>
      </Text>

      {/* Header row */}
      <Text color={inkColors.muted}>
        {'ID'.padEnd(idWidth)}{'Path'.padEnd(pathWidth)}{'Added'.padEnd(addedWidth)}{'Skills'.padEnd(skillsWidth > 6 ? skillsWidth : 6)}
      </Text>
      <Text color={inkColors.muted}>{'\u2500'.repeat(separatorWidth)}</Text>

      {hiddenAbove > 0 && visibleItems.length > 0 && (
        <ScrollIndicator hiddenAbove={hiddenAbove} hiddenBelow={0} columns={columns} position="above" />
      )}

      {/* Project rows */}
      {visibleItems.map((project, i) => {
        const actualIndex = scrollTop + i;
        const isFocused = actualIndex === focusedProjectIndex;
        const isExpanded = expandedProjectIds.has(project.id);
        const detail: ProjectDetailData | undefined = projectDetails[project.id];

        return (
          <Box key={project.id} flexDirection="column">
            {/* Main row */}
            {renderRow(project, isFocused)}

            {/* Expanded detail */}
            {isExpanded && (
              <Box flexDirection="column" paddingLeft={2}>
                {!detail && (
                  <Text color={inkColors.muted}>  Loading...</Text>
                )}
                {detail && (
                  <>
                    {detail.skillsByAgent.map(group => (
                      <Box key={group.agentId} flexDirection="column">
                        <Text color={inkColors.muted} bold>{group.agentName}:</Text>
                        {group.skills.map(skill => {
                          let statusLabel: string;
                          let statusColor: string;
                          if (skill.isImported) {
                            statusLabel = 'imported';
                            statusColor = inkColors.success;
                          } else if (skill.isDifferentVersion) {
                            statusLabel = 'different version';
                            statusColor = inkColors.warning;
                          } else {
                            statusLabel = 'not imported';
                            statusColor = inkColors.muted;
                          }
                          return (
                            <Text key={skill.name} color={inkColors.secondary}>
                              {'  '}{skill.name}
                              <Text color={statusColor}> ({statusLabel})</Text>
                            </Text>
                          );
                        })}
                      </Box>
                    ))}
                    {detail.skillsByAgent.length === 0 && (
                      <Text color={inkColors.muted}>  No skills found</Text>
                    )}
                  </>
                )}
              </Box>
            )}
          </Box>
        );
      })}

      {hiddenBelow > 0 && visibleItems.length > 0 && (
        <ScrollIndicator hiddenAbove={0} hiddenBelow={hiddenBelow} columns={columns} position="below" />
      )}

      {projects.length === 0 && (
        <Text color={inkColors.muted}>{emptyStateText.projects}</Text>
      )}
    </Box>
  );
}
