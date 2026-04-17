/**
 * Footer status bar showing counts, selection info, and context-aware key hints.
 * Styled as a quiet operations rail rather than a dense command footer.
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

type CountSummaryMode = 'full' | 'medium' | 'compact' | 'micro';

const CONTEXT_HINTS: Record<TabId, HintSpec[]> = {
  skills: [
    { key: 'd', label: 'Delete', priority: 1, category: 'destructive' },
    { key: 'a', label: 'Add', priority: 3, category: 'creation' },
    { key: 'i', label: 'Import', priority: 4, category: 'creation' },
    { key: 's', label: 'Sync', priority: 5, category: 'utility' },
    { key: 'p', label: 'ProjSync', priority: 5, category: 'utility' },
    { key: 'u', label: 'Update', priority: 6, category: 'utility' },
    { key: 'U', label: 'UpdateAll', priority: 7, category: 'utility' },
    { key: 'x', label: 'Unsync', priority: 8, category: 'utility' },
    { key: 'c', label: 'Categorize', priority: 8, category: 'utility' },
    { key: '[ ]', label: 'Category', priority: 9, category: 'utility' },
  ],
  agents: [
    { key: 'r', label: 'Remove', priority: 1, category: 'destructive' },
    { key: 'a', label: 'Add', priority: 3, category: 'creation' },
    { key: 'Enter', label: 'Open', priority: 10, category: 'utility' },
  ],
  projects: [
    { key: 'r', label: 'Remove', priority: 1, category: 'destructive' },
    { key: 'a', label: 'Add', priority: 3, category: 'creation' },
    { key: 'i', label: 'Import', priority: 4, category: 'creation' },
    { key: 'Enter', label: 'Open', priority: 10, category: 'utility' },
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

function estimateWidth(text: string): number {
  return Array.from(text).length;
}

function buildCountSummaryText(
  mode: CountSummaryMode,
  skillsCount: number,
  agentsCount: number,
  projectsCount: number,
  selectedCount: number
): string {
  const selectedSuffix =
    selectedCount > 0
      ? mode === 'micro'
        ? ` / ${selectedCount}`
        : mode === 'full'
          ? ` / ${selectedCount} selected`
          : ` / ${selectedCount} sel`
      : '';

  switch (mode) {
    case 'full':
      return `Library ${skillsCount} skills / ${agentsCount} agents / ${projectsCount} projects${selectedSuffix}`;
    case 'medium':
      return `Library ${skillsCount} sk / ${agentsCount} ag / ${projectsCount} proj${selectedSuffix}`;
    case 'compact':
      return `${skillsCount} sk / ${agentsCount} ag / ${projectsCount} pr${selectedSuffix}`;
    case 'micro':
      return `${skillsCount}/${agentsCount}/${projectsCount}${selectedSuffix}`;
  }
}

function chooseCountSummaryMode(
  columns: number,
  band: WidthBand,
  skillsCount: number,
  agentsCount: number,
  projectsCount: number,
  selectedCount: number
): CountSummaryMode {
  const reserveForHints = band === 'compact' ? 12 : band === 'standard' ? 24 : 42;
  const maxSummaryWidth = Math.max(columns - reserveForHints, 10);
  const modes: CountSummaryMode[] = ['full', 'medium', 'compact', 'micro'];

  for (const mode of modes) {
    if (
      estimateWidth(
        buildCountSummaryText(mode, skillsCount, agentsCount, projectsCount, selectedCount)
      ) <= maxSummaryWidth
    ) {
      return mode;
    }
  }

  return 'micro';
}

function renderCountSummary(
  mode: CountSummaryMode,
  skillsCount: number,
  agentsCount: number,
  projectsCount: number,
  selectedCount: number
): React.ReactElement {
  const separator = <Text color={inkColors.muted}> / </Text>;
  const showLibrary = mode === 'full' || mode === 'medium';
  const skillLabel = mode === 'full' ? ' skills' : mode === 'micro' ? '' : ' sk';
  const agentLabel = mode === 'full' ? ' agents' : mode === 'micro' ? '' : ' ag';
  const projectLabel = mode === 'full' ? ' projects' : mode === 'medium' ? ' proj' : mode === 'compact' ? ' pr' : '';
  const selectedLabel = mode === 'full' ? ' selected' : mode === 'micro' ? '' : ' sel';

  return (
    <Text>
      {showLibrary && <Text color={inkColors.muted}>Library </Text>}
      <Text bold color={inkColors.accent}>{skillsCount}</Text>
      {skillLabel && <Text color={inkColors.secondary}>{skillLabel}</Text>}
      {separator}
      <Text bold color={inkColors.info}>{agentsCount}</Text>
      {agentLabel && <Text color={inkColors.secondary}>{agentLabel}</Text>}
      {separator}
      <Text bold color={inkColors.success}>{projectsCount}</Text>
      {projectLabel && <Text color={inkColors.secondary}>{projectLabel}</Text>}
      {selectedCount > 0 && (
        <>
          {separator}
          <Text bold color={inkColors.success}>{selectedCount}</Text>
          {selectedLabel && <Text color={inkColors.secondary}>{selectedLabel}</Text>}
        </>
      )}
    </Text>
  );
}

export function StatusBar({ store, band, columns }: StatusBarProps): React.ReactElement {
  const skillsCount = useStore(store, (s) => s.skills.length);
  const agentsCount = useStore(store, (s) => s.agents.length);
  const projectsCount = useStore(store, (s) => s.projects.length);
  const activeTab = useStore(store, (s) => s.activeTab);
  const selectedSkillNames = useStore(store, (s) => s.selectedSkillNames) ?? new Set<string>();
  const selectedAgentSkillRowIds =
    useStore(store, (s) => s.selectedAgentSkillRowIds) ?? new Set<string>();
  const selectedProjectSkillRowIds =
    useStore(store, (s) => s.selectedProjectSkillRowIds) ?? new Set<string>();
  const agentViewMode = useStore(store, (s) => s.agentViewMode) ?? 'master';
  const projectViewMode = useStore(store, (s) => s.projectViewMode) ?? 'master';
  const detailOverlayVisible = useStore(store, (s) => s.detailOverlayVisible);
  const undoActive = useStore(store, (s) => s.undoActive);
  const undoBuffer = useStore(store, (s) => s.undoBuffer);
  const activeToast = useStore(store, (s) => s.activeToast);
  const selectedCount =
    activeTab === 'skills'
      ? selectedSkillNames.size
      : activeTab === 'agents' && agentViewMode === 'skills'
        ? selectedAgentSkillRowIds.size
        : activeTab === 'projects' && projectViewMode === 'skills'
          ? selectedProjectSkillRowIds.size
          : 0;

  let contextHints = CONTEXT_HINTS[activeTab];

  if (activeTab === 'agents' && agentViewMode === 'skills') {
    contextHints = [
      { key: 'Space', label: 'Toggle', priority: 3, category: 'utility' },
      { key: 'Enter', label: 'Detail', priority: 4, category: 'utility' },
      { key: 'i', label: 'Import', priority: 5, category: 'creation' },
      { key: 'x', label: 'Unsync', priority: 6, category: 'utility' },
      { key: 'u', label: 'Update', priority: 7, category: 'utility' },
      { key: 'c', label: 'Categorize', priority: 8, category: 'utility' },
      { key: '[ ]', label: 'Browse', priority: 9, category: 'utility' },
      { key: 'Esc', label: 'Back', priority: 10, category: 'utility' },
    ];
  }

  if (activeTab === 'projects' && projectViewMode === 'skills') {
    contextHints = [
      { key: 'Space', label: 'Toggle', priority: 3, category: 'utility' },
      { key: 'Enter', label: 'Detail', priority: 4, category: 'utility' },
      { key: 'i', label: 'Import', priority: 5, category: 'creation' },
      { key: 'x', label: 'Unsync', priority: 6, category: 'utility' },
      { key: 'u', label: 'Update', priority: 7, category: 'utility' },
      { key: 'c', label: 'Categorize', priority: 8, category: 'utility' },
      { key: '[ ]', label: 'Browse', priority: 9, category: 'utility' },
      { key: 'Esc', label: 'Back', priority: 10, category: 'utility' },
    ];
  }

  if (detailOverlayVisible) {
    contextHints = [
      { key: 'Esc', label: 'Back', priority: 0, category: 'utility' as const },
      ...contextHints,
    ];
  }

  let leftSection: React.ReactNode;
  let leftSectionText = '';

  if (undoActive && undoBuffer) {
    const remainingSeconds = Math.ceil(undoBuffer.remainingMs / 1000);
    const entityName = (undoBuffer.snapshot as Record<string, string>)?.name
      || (undoBuffer.snapshot as Record<string, string>)?.id
      || 'item';
    leftSectionText = `${symbols.crossMark} Deleted '${entityName}' - Undo (${remainingSeconds}s)`;
    leftSection = (
      <Text color={inkColors.warning}>
        {leftSectionText}
      </Text>
    );
  } else if (activeToast) {
    const toastSymbol =
      activeToast.variant === 'success'
        ? symbols.checkMark
        : activeToast.variant === 'error'
          ? symbols.crossMark
          : symbols.bullet;
    const color =
      activeToast.variant === 'success'
        ? inkColors.success
        : activeToast.variant === 'error'
          ? inkColors.error
          : inkColors.info;
    leftSectionText = `${toastSymbol} ${activeToast.message}`;
    leftSection = (
      <Text color={color}>
        {leftSectionText}
      </Text>
    );
  } else {
    const summaryMode = chooseCountSummaryMode(
      columns,
      band,
      skillsCount,
      agentsCount,
      projectsCount,
      selectedCount
    );
    leftSectionText = buildCountSummaryText(
      summaryMode,
      skillsCount,
      agentsCount,
      projectsCount,
      selectedCount
    );
    leftSection = renderCountSummary(
      summaryMode,
      skillsCount,
      agentsCount,
      projectsCount,
      selectedCount
    );
  }

  const availableWidth = Math.max(columns - estimateWidth(leftSectionText) - 10, 0);
  const { segments } = rankAndTruncateHints(contextHints, band, availableWidth);

  return (
    <Box
      borderStyle="single"
      borderTop={true}
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderColor={inkColors.border}
      paddingX={1}
    >
      {leftSection}
      <Box flexGrow={1} justifyContent="flex-end">
        {segments.map((seg, i) => (
          <React.Fragment key={seg.key}>
            {i > 0 && <Text color={inkColors.muted}> </Text>}
            <Text color={inkColors.accent}>{seg.key}</Text>
            <Text color={inkColors.muted}>:</Text>
            <Text color={inkColors.secondary}>{seg.label}</Text>
            {i < segments.length - 1 && <Text color={inkColors.muted}> /</Text>}
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
}
