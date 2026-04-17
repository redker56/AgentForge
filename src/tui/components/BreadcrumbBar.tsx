/**
 * Breadcrumb bar -- renders navigation context between TabBar and content.
 */

import { Box, Text } from 'ink';
import React from 'react';

import { inkColors } from '../theme.js';

interface BreadcrumbBarProps {
  segments: string[];
}

export function BreadcrumbBar({ segments }: BreadcrumbBarProps): React.ReactElement | null {
  if (segments.length === 0) return null;

  return (
    <Box>
      <Text color={inkColors.subtle}>Context</Text>
      {segments.map((segment, index) => (
        <React.Fragment key={`${segment}-${index}`}>
          <Text color={inkColors.muted}> / </Text>
          <Text color={index === segments.length - 1 ? inkColors.secondary : inkColors.muted}>
            {segment}
          </Text>
        </React.Fragment>
      ))}
    </Box>
  );
}
