import { Box, Text } from 'ink';
import React from 'react';

import { getTuiText, type TuiLocale } from '../i18n.js';
import { inkColors, renderFocusPrefix, selectionMarkers } from '../theme.js';
import { truncateDisplayText } from '../utils/displayWidth.js';

export interface ChecklistSkill {
  name: string;
  path: string;
  alreadyExists: boolean;
  hasSkillMd?: boolean;
}

interface ImportChecklistProps {
  skills: ChecklistSkill[];
  selected: Set<string>;
  onToggle: (name: string) => void;
  focusedIndex: number;
  onUp: () => void;
  onDown: () => void;
  columns?: number;
  locale?: TuiLocale;
}

function truncateText(text: string, maxWidth: number): string {
  return truncateDisplayText(text, maxWidth);
}

/**
 * Checklist preview for import workflow.
 * Shows discovered skills with paths, already-imported markers, and [+]/[ ] toggles.
 */
export function ImportChecklist({
  skills,
  selected,
  onToggle: _onToggle,
  focusedIndex,
  onUp: _onUp,
  onDown: _onDown,
  columns = 80,
  locale = 'en',
}: ImportChecklistProps): React.ReactElement {
  const text = getTuiText(locale);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>{text.importFlow.selectSkillsToImport}</Text>
      </Box>
      {skills.map((skill, index) => {
        const isFocused = index === focusedIndex;
        const isSelected = selected.has(skill.name);
        const isAlreadyImported = skill.alreadyExists;

        const prefix = renderFocusPrefix(isFocused);
        const checkbox = isAlreadyImported
          ? text.common.importedLocked
          : isSelected
            ? selectionMarkers.selected
            : selectionMarkers.unselected;

        const availableWidth = columns - prefix.length - checkbox.length - 1;
        const namePart = skill.name;
        const pathWidth = Math.max(10, availableWidth - namePart.length);
        const pathPart =
          skill.path.length > pathWidth
            ? `...${skill.path.slice(skill.path.length - pathWidth + 3)}`
            : skill.path;
        const rowContent = `${checkbox} ${namePart}    ${pathPart}`;
        const totalWidth = Math.max(columns - prefix.length - 1, 12);
        const suffix = isAlreadyImported ? ` ${text.common.alreadyImportedSuffix}` : '';
        const displayContent = suffix
          ? `${truncateText(rowContent, Math.max(totalWidth - suffix.length, 8))}${suffix}`
          : truncateText(rowContent, totalWidth);

        if (isAlreadyImported) {
          return (
            <Box key={skill.name}>
              <Box width={prefix.length}>
                <Text>{prefix}</Text>
              </Box>
              <Text dimColor>{displayContent}</Text>
            </Box>
          );
        }

        return (
          <Box key={skill.name}>
            <Box width={prefix.length}>
              <Text color={isFocused ? inkColors.accent : undefined}>{prefix}</Text>
            </Box>
            <Text color={isSelected ? inkColors.success : undefined}>{displayContent}</Text>
          </Box>
        );
      })}
      <Box marginTop={1}>
        <Text dimColor>{truncateText(text.importFlow.hint, columns - 2)}</Text>
      </Box>
    </Box>
  );
}
