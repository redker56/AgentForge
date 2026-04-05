/**
 * Vertical step indicator for multi-step form flows (Sync / Import).
 *
 * Renders a list of step labels with status markers:
 *   Completed: `* Step Name` (green dim)
 *   Current:   `> Step Name` (cyan bold)
 *   Future:    `  Step Name` (dim)
 *
 * Minimal horizontal space cost -- left-aligned within fixed width.
 */

import React from 'react';
import { Box, Text } from 'ink';

export interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  width?: number;
}

export function StepIndicator({
  steps,
  currentStep,
  width = 22,
}: StepIndicatorProps): React.ReactElement {
  return (
    <Box flexDirection="column" width={width} flexShrink={0} paddingY={0}>
      {steps.map((label, i) => {
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;
        const prefix = isCompleted ? '* ' : isCurrent ? '> ' : '  ';

        if (isCompleted) {
          return (
            <Box key={i} flexDirection="row">
              <Text color="green">{prefix}</Text>
              <Text color="green">{label}</Text>
            </Box>
          );
        }

        if (isCurrent) {
          return (
            <Box key={i} flexDirection="row">
              <Text bold color="cyan">{prefix}</Text>
              <Text bold color="cyan">{label}</Text>
            </Box>
          );
        }

        // Future step
        return (
          <Box key={i} flexDirection="row">
            <Text dimColor>{prefix}</Text>
            <Text dimColor>{label}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
