import React from 'react';
import { Box, Text } from 'ink';

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
}

/**
 * Checklist preview for import workflow.
 * Shows discovered skills with paths, already-imported markers, and [x]/[ ] toggles.
 */
export function ImportChecklist({
  skills,
  selected,
  focusedIndex,
  onToggle,
  onUp,
  onDown,
  columns = 80,
}: ImportChecklistProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Select skills to import</Text>
      </Box>
      {skills.map((skill, index) => {
        const isFocused = index === focusedIndex;
        const isSelected = selected.has(skill.name);
        const isAlreadyImported = skill.alreadyExists;

        const prefix = isFocused ? '> ' : '  ';
        let checkbox: string;
        if (isAlreadyImported) {
          checkbox = '[IMPORTED]';
        } else {
          checkbox = isSelected ? '[x]' : '[ ]';
        }

        const availableWidth = columns - prefix.length - checkbox.length - 1;
        const namePart = skill.name;
        const pathWidth = Math.max(10, availableWidth - namePart.length);
        const pathPart =
          skill.path.length > pathWidth
            ? '...' + skill.path.slice(skill.path.length - pathWidth + 3)
            : skill.path;

        let rowContent: string;
        if (isAlreadyImported) {
          rowContent = `${checkbox} ${namePart}    ${pathPart}`;
        } else {
          rowContent = `${checkbox} ${namePart}    ${pathPart}`;
        }

        if (isAlreadyImported) {
          return (
            <Box key={skill.name}>
              <Box width={prefix.length}>
                <Text>{prefix}</Text>
              </Box>
              <Text dimColor>
                {rowContent} (already imported)
              </Text>
            </Box>
          );
        }

        const nameColor = isSelected ? 'cyan' : undefined;

        return (
          <Box key={skill.name}>
            {prefix === '> ' ? (
              <Box width={prefix.length}>
                <Text color="cyan">{prefix}</Text>
              </Box>
            ) : (
              <Box width={prefix.length}>
                <Text>{prefix}</Text>
              </Box>
            )}
            {isSelected ? (
              <Text color="cyan">{rowContent}</Text>
            ) : (
              <Text>{rowContent}</Text>
            )}
          </Box>
        );
      })}
      <Box marginTop={1}>
        <Text dimColor>Space: toggle │ ↑↓: navigate │ Enter: confirm</Text>
      </Box>
    </Box>
  );
}
