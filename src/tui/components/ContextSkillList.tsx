import { Box, Text } from 'ink';
import React from 'react';

import type {
  ContextSkillFilter,
  ContextSkillSection,
  VisibleContextSkillRow,
} from '../contextTypes.js';
import { getVisibleContextSkillRows } from '../contextTypes.js';
import { useNavigation } from '../hooks/useNavigation.js';
import { getTuiText, type TuiLocale } from '../i18n.js';
import { inkColors, renderFocusPrefix, selectionMarkers } from '../theme.js';
import { truncateDisplayText } from '../utils/displayWidth.js';

import { ScrollIndicator } from './ScrollIndicator.js';

interface ContextSkillListProps {
  title: string;
  sections: ContextSkillSection[];
  filter: ContextSkillFilter;
  focusedIndex: number;
  selectedRowIds: Set<string>;
  columns: number;
  emptyText?: string;
  locale?: TuiLocale;
}

function truncateText(text: string, maxWidth: number): string {
  return truncateDisplayText(text, maxWidth);
}

function getStatusText(row: VisibleContextSkillRow, text: ReturnType<typeof getTuiText>): string {
  if (row.isDifferentVersion) return text.context.different;
  if (row.isImported) return text.context.imported;
  return text.context.unimported;
}

function getStatusColor(row: VisibleContextSkillRow): string {
  if (row.isDifferentVersion) return inkColors.warning;
  if (row.isImported) return inkColors.success;
  return inkColors.muted;
}

export function ContextSkillList({
  title,
  sections,
  filter,
  focusedIndex,
  selectedRowIds,
  columns,
  emptyText,
  locale = 'en',
}: ContextSkillListProps): React.ReactElement {
  const visibleRows = getVisibleContextSkillRows(sections, filter);
  const text = getTuiText(locale);
  const { visibleItems, scrollTop, hiddenAbove, hiddenBelow } = useNavigation({
    items: visibleRows,
    focusedIndex: Math.min(focusedIndex, Math.max(visibleRows.length - 1, 0)),
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Text bold color={inkColors.accent}>
        {title} <Text color={inkColors.muted}>({visibleRows.length})</Text>
      </Text>

      {hiddenAbove > 0 && visibleRows.length > 0 && (
        <ScrollIndicator
          hiddenAbove={hiddenAbove}
          hiddenBelow={0}
          columns={columns}
          position="above"
        />
      )}

      {visibleItems.map((row, offset) => {
        const actualIndex = scrollTop + offset;
        const previousVisible = actualIndex > 0 ? visibleRows[actualIndex - 1] : null;
        const showSectionHeader = !previousVisible || previousVisible.sectionId !== row.sectionId;
        const isFocused = actualIndex === focusedIndex;
        const isSelected = selectedRowIds.has(row.rowId);
        const prefix = renderFocusPrefix(isFocused);
        const marker = isSelected ? selectionMarkers.selected : '';
        const statusText = getStatusText(row, text);
        const syncText = row.syncMode ? `[${row.syncMode}]` : '';
        const reservedWidth =
          prefix.length +
          1 +
          (isSelected ? marker.length + 1 : 0) +
          statusText.length +
          (syncText ? syncText.length + 1 : 0) +
          2;
        const displayName = truncateText(row.name, Math.max(columns - reservedWidth, 8));

        return (
          <Box key={row.rowId} flexDirection="column">
            {showSectionHeader && (
              <Text color={inkColors.muted} bold>
                {row.sectionTitle}
              </Text>
            )}
            <Box>
              <Text color={isFocused ? inkColors.accent : inkColors.primary}>{prefix}</Text>
              <Text> </Text>
              {isSelected ? (
                <Text color={isFocused ? inkColors.success : inkColors.success}>{marker} </Text>
              ) : null}
              {isFocused ? (
                <Text backgroundColor={inkColors.focusBg} color={inkColors.focusText} bold>
                  {displayName}{' '}
                  <Text backgroundColor={inkColors.focusBg} color={getStatusColor(row)}>
                    {statusText}
                  </Text>
                  {syncText ? (
                    <>
                      {' '}
                      <Text backgroundColor={inkColors.focusBg} color={inkColors.focusText}>
                        {syncText}
                      </Text>
                    </>
                  ) : null}
                </Text>
              ) : (
                <>
                  <Text color={inkColors.primary} bold>
                    {displayName}
                  </Text>
                  <Text> </Text>
                  <Text color={getStatusColor(row)}>{statusText}</Text>
                  {syncText ? (
                    <>
                      <Text> </Text>
                      <Text color={inkColors.secondary}>{syncText}</Text>
                    </>
                  ) : null}
                </>
              )}
            </Box>
          </Box>
        );
      })}

      {visibleRows.length === 0 && (
        <Text color={inkColors.muted}>{emptyText ?? text.empty.skills}</Text>
      )}

      {hiddenBelow > 0 && visibleRows.length > 0 && (
        <ScrollIndicator
          hiddenAbove={0}
          hiddenBelow={hiddenBelow}
          columns={columns}
          position="below"
        />
      )}
    </Box>
  );
}
