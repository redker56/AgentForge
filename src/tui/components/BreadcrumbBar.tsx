/**
 * Breadcrumb bar -- renders navigation context between TabBar and content.
 *
 * Shows breadcrumb segments as a single dim line: `[ Skills > Confirm Delete ]`
 * Returns null when no segments are provided (zero height cost).
 */

import React from 'react';
import { Text } from 'ink';

interface BreadcrumbBarProps {
  segments: string[];
}

export function BreadcrumbBar({ segments }: BreadcrumbBarProps): React.ReactElement | null {
  if (segments.length === 0) return null;

  const text = `[ ${segments.join(' > ')} ]`;
  return (
    <Text dimColor>{text}</Text>
  );
}
