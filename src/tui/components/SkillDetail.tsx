/**
 * Skill detail panel for the Skills tab.
 *
 * Standard band renders a fixed-height scrollable overlay to prevent terminal
 * jumping while async detail data arrives or the focused skill changes.
 * Widescreen renders a stable inline preview with a larger fixed body.
 */

import { Box, Text, useInput } from 'ink';
import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type { WidthBand } from '../hooks/useTerminalDimensions.js';
import type { AppStore } from '../store/index.js';
import { inkColors } from '../theme.js';
import { truncateDisplayText } from '../utils/displayWidth.js';
import { getFocusedVisibleSkill } from '../utils/skillsView.js';

interface SkillDetailProps {
  store: StoreApi<AppStore>;
  band?: WidthBand;
  columns?: number;
  skillName?: string | null;
}

interface DetailLine {
  key: string;
  text: string;
  color?: string;
  bold?: boolean;
}

const STANDARD_VISIBLE_LINES = 10;
const WIDESCREEN_VISIBLE_LINES = 18;
const STANDARD_OVERLAY_WIDTH_RATIO = 0.68;

function sanitizeDetailText(text: string): string {
  const normalized = text.replace(/\r\n?/g, '\n');
  let sanitized = '';

  for (const char of normalized) {
    const code = char.charCodeAt(0);
    const isControl = (code >= 0 && code <= 8) || (code >= 11 && code <= 31) || code === 127;
    if (!isControl) {
      sanitized += char;
    }
  }

  return sanitized;
}

function blankLines(count: number, prefix: string): DetailLine[] {
  return Array.from({ length: Math.max(count, 0) }, (_, index) => ({
    key: `${prefix}-${index}`,
    text: ' ',
  }));
}

function formatTimestamp(value?: string): string {
  return value ?? 'Never';
}

export function SkillDetail({
  store,
  band,
  columns = 100,
  skillName,
}: SkillDetailProps): React.ReactElement {
  const focusedIndex = useStore(store, (s) => s.skillsBrowserState.focusedIndex);
  const skills = useStore(store, (s) => s.skills);
  const activeSkillCategoryFilter = useStore(
    store,
    (s) => s.skillsBrowserState.activeCategoryFilter
  );
  const skillDetails = useStore(store, (s) => s.skillDetails);

  const focusedSkill =
    skillName != null
      ? (skills.find((skill) => skill.name === skillName) ?? null)
      : getFocusedVisibleSkill(skills, activeSkillCategoryFilter, focusedIndex);
  const detail = focusedSkill ? skillDetails[focusedSkill.name] : undefined;

  useEffect(() => {
    if (focusedSkill && !detail) {
      void store.getState().loadSkillDetail(focusedSkill.name);
    }
  }, [detail, focusedSkill, store]);

  const panelWidth = Math.max(
    Math.min(Math.floor(columns * STANDARD_OVERLAY_WIDTH_RATIO), columns - 4),
    32
  );
  const contentWidth =
    band === 'standard'
      ? Math.max(panelWidth - 4, 24)
      : Math.max(Math.floor(columns * 0.56) - 4, 36);

  const detailLines = useMemo(() => {
    const lines: DetailLine[] = [];

    if (!focusedSkill) {
      return [
        {
          key: 'empty',
          text: truncateDisplayText('Select a skill to view details.', contentWidth),
          color: inkColors.muted,
        },
      ];
    }

    lines.push({
      key: 'kicker',
      text: truncateDisplayText('Skill dossier', contentWidth),
      color: inkColors.muted,
    });
    lines.push({
      key: 'name',
      text: truncateDisplayText(detail?.name ?? focusedSkill.name, contentWidth),
      color: inkColors.accent,
      bold: true,
    });

    if (!detail) {
      lines.push({
        key: 'loading',
        text: truncateDisplayText('Loading skill details...', contentWidth),
        color: inkColors.muted,
      });
      return lines;
    }

    lines.push({
      key: 'source',
      text: truncateDisplayText(
        `Source: [${detail.source.type}] ${
          detail.source.type === 'git'
            ? detail.source.url
            : detail.source.type === 'local'
              ? 'local'
              : detail.source.projectId
        }`,
        contentWidth
      ),
      color: inkColors.secondary,
    });
    lines.push({
      key: 'created',
      text: truncateDisplayText(`Created: ${formatTimestamp(detail.createdAt)}`, contentWidth),
      color: inkColors.secondary,
    });
    lines.push({
      key: 'updated',
      text: truncateDisplayText(`Updated: ${formatTimestamp(detail.updatedAt)}`, contentWidth),
      color: inkColors.secondary,
    });
    lines.push({
      key: 'categories',
      text: truncateDisplayText(
        `Categories: ${detail.categories.length > 0 ? detail.categories.join(', ') : '(none)'}`,
        contentWidth
      ),
      color: inkColors.secondary,
    });
    lines.push({ key: 'blank-1', text: ' ' });

    lines.push({
      key: 'sync-header',
      text: 'Synced to:',
      color: inkColors.accent,
      bold: true,
    });
    if (detail.syncStatus.length === 0) {
      lines.push({
        key: 'sync-empty',
        text: truncateDisplayText('  Not synced to any agent', contentWidth),
        color: inkColors.muted,
      });
    } else {
      for (const [index, entry] of detail.syncStatus.entries()) {
        lines.push({
          key: `sync-${index}`,
          text: truncateDisplayText(
            `  ${entry.agentName}  ${entry.mode}  (${entry.status})`,
            contentWidth
          ),
          color: entry.status === 'synced' ? inkColors.success : inkColors.error,
        });
      }
    }

    lines.push({ key: 'blank-2', text: ' ' });
    lines.push({
      key: 'projects-header',
      text: 'Projects:',
      color: inkColors.accent,
      bold: true,
    });
    if (detail.projectDistribution.length === 0) {
      lines.push({
        key: 'projects-empty',
        text: truncateDisplayText('  Not distributed to any project', contentWidth),
        color: inkColors.muted,
      });
    } else {
      for (const project of detail.projectDistribution) {
        lines.push({
          key: `project-${project.projectId}`,
          text: truncateDisplayText(`  ${project.projectId}`, contentWidth),
          color: inkColors.secondary,
        });
        for (const agent of project.agents) {
          lines.push({
            key: `project-${project.projectId}-${agent.id}`,
            text: truncateDisplayText(
              `    ${agent.name} (${agent.isDifferentVersion ? 'different version' : 'synced'})`,
              contentWidth
            ),
            color: agent.isDifferentVersion ? inkColors.warning : inkColors.success,
          });
        }
      }
    }

    if (detail.skillMdPreview) {
      lines.push({ key: 'blank-3', text: ' ' });
      lines.push({
        key: 'preview-header',
        text: 'SKILL.md preview:',
        color: inkColors.accent,
        bold: true,
      });
      detail.skillMdPreview.split('\n').forEach((line, index) => {
        lines.push({
          key: `preview-${index}`,
          text: truncateDisplayText(sanitizeDetailText(line || ' '), contentWidth),
          color: inkColors.muted,
        });
      });
    }

    return lines;
  }, [contentWidth, detail, focusedSkill]);

  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    setScrollTop(0);
  }, [focusedSkill?.name, detail?.createdAt, detail?.updatedAt, band]);

  const maxScroll = Math.max(detailLines.length - STANDARD_VISIBLE_LINES, 0);

  useEffect(() => {
    setScrollTop((current) => Math.min(current, maxScroll));
  }, [maxScroll]);

  useInput(
    (_input, key) => {
      if (band !== 'standard') return;

      if (key.upArrow) {
        setScrollTop((current) => Math.max(0, current - 1));
      } else if (key.downArrow) {
        setScrollTop((current) => Math.min(maxScroll, current + 1));
      } else if (key.pageUp) {
        setScrollTop((current) => Math.max(0, current - STANDARD_VISIBLE_LINES));
      } else if (key.pageDown) {
        setScrollTop((current) => Math.min(maxScroll, current + STANDARD_VISIBLE_LINES));
      } else if (key.home) {
        setScrollTop(0);
      } else if (key.end) {
        setScrollTop(maxScroll);
      }
    },
    { isActive: band === 'standard' }
  );

  const renderLine = (line: DetailLine): React.ReactElement => (
    <Text key={line.key} color={line.color} bold={line.bold}>
      {line.text}
    </Text>
  );

  if (band === 'standard') {
    const visibleLines = detailLines.slice(scrollTop, scrollTop + STANDARD_VISIBLE_LINES);
    const hiddenAbove = scrollTop;
    const hiddenBelow = Math.max(detailLines.length - scrollTop - visibleLines.length, 0);
    const paddedLines = [
      ...visibleLines,
      ...blankLines(STANDARD_VISIBLE_LINES - visibleLines.length, 'pad'),
    ];

    return (
      <Box borderStyle="single" width={panelWidth} borderColor={inkColors.borderActive}>
        <Box flexDirection="column" paddingX={1}>
          <Text color={inkColors.muted}>
            {hiddenAbove > 0
              ? truncateDisplayText(`^ ${hiddenAbove} more above`, contentWidth)
              : ' '}
          </Text>
          {paddedLines.map(renderLine)}
          <Text color={inkColors.muted}>
            {hiddenBelow > 0
              ? truncateDisplayText(`v ${hiddenBelow} more below`, contentWidth)
              : ' '}
          </Text>
          <Text color={inkColors.muted}>{'-'.repeat(Math.max(contentWidth, 1))}</Text>
          <Text color={inkColors.muted}>
            {truncateDisplayText('Up/Down:Scroll  PgUp/PgDn:Jump  Esc:Back', contentWidth)}
          </Text>
        </Box>
      </Box>
    );
  }

  const hasOverflow = detailLines.length > WIDESCREEN_VISIBLE_LINES;
  const visibleLines = hasOverflow
    ? detailLines.slice(0, WIDESCREEN_VISIBLE_LINES - 1)
    : detailLines.slice(0, WIDESCREEN_VISIBLE_LINES);
  const paddedLines = [
    ...visibleLines,
    ...(hasOverflow
      ? [
          {
            key: 'overflow',
            text: truncateDisplayText(
              `... ${detailLines.length - WIDESCREEN_VISIBLE_LINES + 1} more lines`,
              contentWidth
            ),
            color: inkColors.muted,
          } satisfies DetailLine,
        ]
      : blankLines(WIDESCREEN_VISIBLE_LINES - visibleLines.length, 'wide-pad')),
  ];

  return (
    <Box flexDirection="column" paddingX={1}>
      {paddedLines.map(renderLine)}
    </Box>
  );
}
