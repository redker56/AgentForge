/**
 * Skill detail panel (right pane of Skills tab).
 * Accepts a band prop: widescreen = inline rendering (standard split-pane right pane),
 * standard = renders as a bordered slide-over overlay panel.
 * Modern Claude Code aesthetic with subtle color hierarchy.
 *
 * Fixed height for standard overlay mode to prevent terminal window jitter.
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type { WidthBand } from '../hooks/useTerminalDimensions.js';
import type { AppStore } from '../store/index.js';
import { inkColors, symbols } from '../theme.js';

interface SkillDetailProps {
  store: StoreApi<AppStore>;
  band?: WidthBand;
}

// Maximum visible content lines for standard overlay mode (excluding border and hint)
const MAX_CONTENT_LINES = 10;

export function SkillDetail({ store, band }: SkillDetailProps): React.ReactElement {
  const focusedIndex = useStore(store, (s) => s.focusedSkillIndex);
  const skills = useStore(store, (s) => s.skills);
  const skillDetails = useStore(store, (s) => s.skillDetails);

  const focusedSkill = skills[focusedIndex] ?? null;
  const detail = focusedSkill ? skillDetails[focusedSkill.name] : undefined;

  // Build content lines as an array
  const contentLines: React.ReactNode[] = [];

  if (focusedSkill) {
    contentLines.push(
      <Text key="name" bold color={inkColors.accent}>
        {detail?.name ?? focusedSkill.name}
      </Text>
    );

    if (detail) {
      contentLines.push(
        <Text key="source">
          <Text color={inkColors.muted}>Source: </Text>
          <Text color={detail.source.type === 'git' ? inkColors.git : inkColors.muted}>
            [{detail.source.type}]
          </Text>
          <Text color={inkColors.secondary}>
            {' '}{detail.source.type === 'git' ? detail.source.url : detail.source.type === 'local' ? 'local' : detail.source.projectId}
          </Text>
        </Text>
      );
      contentLines.push(
        <Text key="created">
          <Text color={inkColors.muted}>Created: </Text>
          <Text color={inkColors.secondary}>{detail.createdAt}</Text>
        </Text>
      );
      contentLines.push(<Text key="blank1"> </Text>);

      contentLines.push(
        <Text key="sync-header" bold color={inkColors.primary}>Synced to:</Text>
      );
      if (detail.syncStatus.length === 0) {
        contentLines.push(
          <Text key="sync-empty" color={inkColors.muted}>  Not synced to any agent</Text>
        );
      } else {
        detail.syncStatus.forEach((entry, idx) => {
          contentLines.push(
            <Text key={`sync-${idx}`}>
              <Text color={inkColors.muted}>  {entry.agentName}</Text>
              <Text color={inkColors.muted}>  {entry.mode}  </Text>
              <Text color={entry.status === 'synced' ? inkColors.success : inkColors.error}>
                ({entry.status})
              </Text>
            </Text>
          );
        });
      }

      contentLines.push(<Text key="blank2"> </Text>);

      contentLines.push(
        <Text key="proj-header" bold color={inkColors.primary}>Projects:</Text>
      );
      if (detail.projectDistribution.length === 0) {
        contentLines.push(
          <Text key="proj-empty" color={inkColors.muted}>  Not distributed to any project</Text>
        );
      } else {
        detail.projectDistribution.forEach((proj) => {
          contentLines.push(
            <Text key={`proj-${proj.projectId}`} color={inkColors.secondary}>
              {'  '}{proj.projectId}
            </Text>
          );
          proj.agents.forEach((a) => {
            contentLines.push(
              <Text key={`proj-agent-${a.id}`} color={inkColors.muted}>
                {'    '}{a.name}
                <Text color={a.isDifferentVersion ? inkColors.warning : inkColors.success}>
                  {' '}({a.isDifferentVersion ? 'different version' : 'synced'})
                </Text>
              </Text>
            );
          });
        });
      }

      if (detail.skillMdPreview) {
        contentLines.push(<Text key="blank3"> </Text>);
        contentLines.push(
          <Text key="md-header" bold color={inkColors.primary}>SKILL.md preview:</Text>
        );
        // Split preview into lines
        const previewLines = detail.skillMdPreview.split('\n');
        previewLines.forEach((line, idx) => {
          contentLines.push(
            <Text key={`md-line-${idx}`} color={inkColors.muted}>{line}</Text>
          );
        });
      }
    } else {
      contentLines.push(
        <Text key="loading" color={inkColors.muted}>Loading...</Text>
      );
    }
  } else {
    contentLines.push(
      <Text key="empty" color={inkColors.muted}>Select a skill to view details</Text>
    );
  }

  // Add hint for standard band
  if (band === 'standard') {
    contentLines.push(<Text key="blank-hint"> </Text>);
    contentLines.push(
      <Text key="hint-line" color={inkColors.muted}>{symbols.horizontal.repeat(30)}</Text>
    );
    contentLines.push(
      <Text key="hint" color={inkColors.muted}>[Esc] Back</Text>
    );
  }

  // For standard band: limit content height
  const totalLines = contentLines.length;
  const hasOverflow = band === 'standard' && totalLines > MAX_CONTENT_LINES;
  const visibleLines = hasOverflow ? contentLines.slice(0, MAX_CONTENT_LINES - 1) : contentLines;
  const hiddenCount = hasOverflow ? totalLines - MAX_CONTENT_LINES + 1 : 0;

  const content = (
    <Box flexDirection="column" paddingX={1}>
      {visibleLines}
      {hasOverflow && (
        <Text color={inkColors.muted}>  ... {hiddenCount} more lines</Text>
      )}
    </Box>
  );

  // Standard band: render as bordered overlay
  if (band === 'standard') {
    return (
      <Box borderStyle="single" width="60%" borderColor={inkColors.muted}>
        {content}
      </Box>
    );
  }

  // Widescreen (or default): render inline
  return <>{content}</>;
}
