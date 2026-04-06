/**
 * Skill detail panel (right pane of Skills tab).
 * Accepts a band prop: widescreen = inline rendering (standard split-pane right pane),
 * standard = renders as a bordered slide-over overlay panel.
 * Modern Claude Code aesthetic with subtle color hierarchy.
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

export function SkillDetail({ store, band }: SkillDetailProps): React.ReactElement {
  const focusedIndex = useStore(store, (s) => s.focusedSkillIndex);
  const skills = useStore(store, (s) => s.skills);
  const skillDetails = useStore(store, (s) => s.skillDetails);

  const focusedSkill = skills[focusedIndex] ?? null;
  const detail = focusedSkill ? skillDetails[focusedSkill.name] : undefined;

  const content = (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      {focusedSkill ? (
        <>
          <Text bold color={inkColors.accent}>{detail?.name ?? focusedSkill.name}</Text>
          {detail ? (
            <>
              <Text>
                <Text color={inkColors.muted}>Source: </Text>
                <Text color={detail.source.type === 'git' ? inkColors.git : inkColors.muted}>
                  [{detail.source.type}]
                </Text>
                <Text color={inkColors.secondary}>
                  {' '}{detail.source.type === 'git' ? detail.source.url : detail.source.type === 'local' ? 'local' : detail.source.projectId}
                </Text>
              </Text>
              <Text>
                <Text color={inkColors.muted}>Created: </Text>
                <Text color={inkColors.secondary}>{detail.createdAt}</Text>
              </Text>
              <Text> </Text>
              {/* Sync status table */}
              <Text bold color={inkColors.primary}>Synced to:</Text>
              {detail.syncStatus.length === 0 && (
                <Text color={inkColors.muted}>  Not synced to any agent</Text>
              )}
              {detail.syncStatus.map((entry) => (
                <Text key={entry.agentId}>
                  <Text color={inkColors.muted}>  {entry.agentName}</Text>
                  <Text color={inkColors.muted}>  {entry.mode}  </Text>
                  <Text color={entry.status === 'synced' ? inkColors.success : inkColors.error}>
                    ({entry.status})
                  </Text>
                </Text>
              ))}
              <Text> </Text>
              {/* Project distribution */}
              <Text bold color={inkColors.primary}>Projects:</Text>
              {detail.projectDistribution.length === 0 && (
                <Text color={inkColors.muted}>  Not distributed to any project</Text>
              )}
              {detail.projectDistribution.map((proj) => (
                <Box key={proj.projectId} flexDirection="column">
                  <Text color={inkColors.secondary}>  {proj.projectId}</Text>
                  {proj.agents.map((a) => (
                    <Text key={a.id} color={inkColors.muted}>
                      {'    '}{a.name}
                      <Text color={a.isDifferentVersion ? inkColors.warning : inkColors.success}>
                        {' '}({a.isDifferentVersion ? 'different version' : 'synced'})
                      </Text>
                    </Text>
                  ))}
                </Box>
              ))}
              <Text> </Text>
              {/* SKILL.md preview */}
              {detail.skillMdPreview && (
                <Box flexDirection="column">
                  <Text bold color={inkColors.primary}>SKILL.md preview:</Text>
                  <Text color={inkColors.muted}>{detail.skillMdPreview}</Text>
                </Box>
              )}
            </>
          ) : (
            <Text color={inkColors.muted}>Loading...</Text>
          )}
        </>
      ) : (
        <Text color={inkColors.muted}>Select a skill to view details</Text>
      )}

      {/* Esc Back hint shown in standard band overlay mode */}
      {band === 'standard' && (
        <>
          <Text> </Text>
          <Text color={inkColors.muted}>{symbols.horizontal.repeat(30)}</Text>
          <Text color={inkColors.muted}>[Esc] Back</Text>
        </>
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
