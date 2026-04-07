/**
 * Footer status bar showing counts, selection info, and context-aware key hints.
 * Modern Claude Code aesthetic with subtle visual hierarchy.
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type { WidthBand } from '../hooks/useTerminalDimensions.js';
import type { AppStore, TabId } from '../store/index.js';
import { inkColors, symbols } from '../theme.js';
import { rankAndTruncateHints, type HintSpec } from '../utils/hintPriority.js';

interface StatusBarProps {
  store: StoreApi<AppStore>;
  band: WidthBand;
  columns: number;
}

const CONTEXT_HINTS: Record<TabId, HintSpec[]> = {
  skills: [
    { key: 'd', label: 'Delete', priority: 1, category: 'destructive' },
    { key: 'a', label: 'Add', priority: 3, category: 'creation' },
    { key: 'i', label: 'Import', priority: 4, category: 'creation' },
    { key: 's', label: 'Sync', priority: 5, category: 'utility' },
    { key: 'p', label: 'ProjSync', priority: 5, category: 'utility' },
    { key: 'u', label: 'Update', priority: 6, category: 'utility' },
    { key: 'U', label: 'All', priority: 7, category: 'utility' },
    { key: 'x', label: 'Unsync', priority: 8, category: 'utility' },
  ],
  agents: [
    { key: 'r', label: 'Remove', priority: 1, category: 'destructive' },
    { key: 'a', label: 'Add', priority: 3, category: 'creation' },
    { key: 'Enter', label: 'Expand', priority: 10, category: 'utility' },
  ],
  projects: [
    { key: 'r', label: 'Remove', priority: 1, category: 'destructive' },
    { key: 'a', label: 'Add', priority: 3, category: 'creation' },
    { key: 'i', label: 'Import', priority: 4, category: 'creation' },
    { key: 'Enter', label: 'Expand', priority: 10, category: 'utility' },
  ],
  sync: [
    { key: 'Space', label: 'Toggle', priority: 5, category: 'utility' },
    { key: 'Enter', label: 'Confirm', priority: 3, category: 'utility' },
    { key: 'Esc', label: 'Back', priority: 10, category: 'utility' },
  ],
  import: [
    { key: 'Space', label: 'Toggle', priority: 5, category: 'utility' },
    { key: 'Enter', label: 'Confirm', priority: 3, category: 'utility' },
    { key: 'Esc', label: 'Back', priority: 10, category: 'utility' },
  ],
};

export function StatusBar({ store, band, columns }: StatusBarProps): React.ReactElement {
  const skillsCount = useStore(store, (s) => s.skills.length);
  const agentsCount = useStore(store, (s) => s.agents.length);
  const projectsCount = useStore(store, (s) => s.projects.length);
  const activeTab = useStore(store, (s) => s.activeTab);
  const selectedSkillNames = useStore(store, (s) => s.selectedSkillNames);
  const detailOverlayVisible = useStore(store, (s) => s.detailOverlayVisible);

  // Sprint 3: Toast and undo state
  const undoActive = useStore(store, (s) => s.undoActive);
  const undoBuffer = useStore(store, (s) => s.undoBuffer);
  const activeToast = useStore(store, (s) => s.activeToast);

  let contextHints = CONTEXT_HINTS[activeTab];

  // Prepend Esc:Back hint when detail overlay is active on skills tab
  if (detailOverlayVisible && activeTab === 'skills') {
    contextHints = [
      { key: 'Esc', label: 'Back', priority: 0, category: 'utility' as const },
      ...contextHints,
    ];
  }

  // Sprint 3: Left section rendering -- undo countdown > toast > normal counts
  let leftSection: React.ReactNode;

  if (undoActive && undoBuffer) {
    const remainingSeconds = Math.ceil(undoBuffer.remainingMs / 1000);
    const entityName = (undoBuffer.snapshot as Record<string, string>)?.name
      || (undoBuffer.snapshot as Record<string, string>)?.id
      || 'item';
    leftSection = (
      <Text color={inkColors.warning}>
        {symbols.crossMark} Deleted '{entityName}' — Undo ({remainingSeconds}s)
      </Text>
    );
  } else if (activeToast) {
    const toastSymbol = activeToast.variant === 'success' ? symbols.checkMark : activeToast.variant === 'error' ? symbols.crossMark : symbols.bullet;
    const color = activeToast.variant === 'success' ? inkColors.success : activeToast.variant === 'error' ? inkColors.error : inkColors.info;
    leftSection = (
      <Text color={color}>
        {toastSymbol} {activeToast.message}
      </Text>
    );
  } else {
    leftSection = (
      <Text>
        <Text bold color={inkColors.accent}>{skillsCount}</Text>
        <Text color={inkColors.muted}> skills</Text>
        <Text color={inkColors.muted}> | </Text>
        <Text bold color={inkColors.accent}>{agentsCount}</Text>
        <Text color={inkColors.muted}> agents</Text>
        <Text color={inkColors.muted}> | </Text>
        <Text bold color={inkColors.accent}>{projectsCount}</Text>
        <Text color={inkColors.muted}> projects</Text>
        {selectedSkillNames.size > 0 && activeTab === 'skills' && (
          <>
            <Text color={inkColors.muted}> | </Text>
            <Text bold color={inkColors.success}>{selectedSkillNames.size}</Text>
            <Text color={inkColors.muted}> selected</Text>
          </>
        )}
      </Text>
    );
  }

  const availableWidth = Math.max(columns - 40, 20);
  const { segments } = rankAndTruncateHints(contextHints, band, availableWidth);

  return (
    <Box borderStyle="single" borderTop={true} borderBottom={false} borderLeft={false} borderRight={false} borderColor={inkColors.border}>
      {leftSection}
      <Box flexGrow={1} justifyContent="flex-end">
        {segments.map((seg, i) => (
          <React.Fragment key={seg.key}>
            {i > 0 && <Text color={inkColors.muted}> </Text>}
            <Text color={inkColors.secondary}>{seg.key}</Text>
            <Text color={inkColors.muted}>:</Text>
            <Text color={inkColors.secondary}>{seg.label}</Text>
            {i < segments.length - 1 && <Text color={inkColors.muted}> |</Text>}
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
}
