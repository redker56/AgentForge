/**
 * Footer status bar showing counts, selection info, and context-aware key hints.
 * Styled as a quiet operations rail rather than a dense command footer.
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type { WidthBand } from '../hooks/useTerminalDimensions.js';
import { getTuiText } from '../i18n.js';
import type { AppStore, TabId } from '../store/index.js';
import { inkColors, symbols } from '../theme.js';
import { getDisplayWidth } from '../utils/displayWidth.js';
import { dedupeHints, rankAndTruncateHints, type HintSpec } from '../utils/hintPriority.js';

interface StatusBarProps {
  store: StoreApi<AppStore>;
  band: WidthBand;
  columns: number;
}

type CountSummaryMode = 'full' | 'medium' | 'compact' | 'micro';

type TuiText = ReturnType<typeof getTuiText>;

function buildContextHints(activeTab: TabId, text: TuiText): HintSpec[] {
  const labels = text.status.labels;
  const sharedFlowHints: HintSpec[] = [
    { key: 'Space', label: labels.toggle, priority: 5, category: 'utility' },
    { key: 'Enter', label: labels.confirm, priority: 3, category: 'utility' },
    { key: 'Esc', label: labels.back, priority: 10, category: 'utility' },
  ];

  switch (activeTab) {
    case 'skills':
      return [
        { key: 'd', label: labels.delete, priority: 1, category: 'destructive' },
        { key: 'a', label: labels.add, priority: 3, category: 'creation' },
        { key: 'i', label: labels.import, priority: 4, category: 'creation' },
        { key: 's', label: labels.sync, priority: 5, category: 'utility' },
        { key: 'p', label: labels.projectSync, priority: 5, category: 'utility' },
        { key: 'u', label: labels.update, priority: 6, category: 'utility' },
        { key: 'U', label: labels.updateAll, priority: 7, category: 'utility' },
        { key: 'x', label: labels.unsync, priority: 8, category: 'utility' },
        { key: 'c', label: labels.categorize, priority: 8, category: 'utility' },
        { key: '[ ]', label: labels.category, priority: 9, category: 'utility' },
      ];
    case 'agents':
      return [
        { key: 'r', label: labels.remove, priority: 1, category: 'destructive' },
        { key: 'a', label: labels.add, priority: 3, category: 'creation' },
        { key: 'Enter', label: labels.open, priority: 10, category: 'utility' },
      ];
    case 'projects':
      return [
        { key: 'r', label: labels.remove, priority: 1, category: 'destructive' },
        { key: 'a', label: labels.add, priority: 3, category: 'creation' },
        { key: 'i', label: labels.import, priority: 4, category: 'creation' },
        { key: 'Enter', label: labels.open, priority: 10, category: 'utility' },
      ];
    case 'sync':
    case 'import':
      return sharedFlowHints;
  }
}

function buildGlobalHints(text: TuiText): HintSpec[] {
  const labels = text.status.labels;
  return [
    { key: '/', label: labels.search, priority: 10, category: 'utility' },
    { key: '?', label: labels.help, priority: 11, category: 'utility' },
    { key: 'q', label: labels.quit, priority: 1, category: 'utility' },
  ];
}

function estimateWidth(text: string): number {
  return getDisplayWidth(text);
}

function buildCountSummaryText(
  mode: CountSummaryMode,
  skillsCount: number,
  agentsCount: number,
  projectsCount: number,
  selectedCount: number,
  text: TuiText
): string {
  return text.status.countSummary(mode, skillsCount, agentsCount, projectsCount, selectedCount);
}

function chooseCountSummaryMode(
  columns: number,
  band: WidthBand,
  skillsCount: number,
  agentsCount: number,
  projectsCount: number,
  selectedCount: number,
  text: TuiText
): CountSummaryMode {
  const reserveForHints = band === 'compact' ? 12 : band === 'standard' ? 24 : 42;
  const maxSummaryWidth = Math.max(columns - reserveForHints, 10);
  const modes: CountSummaryMode[] = ['full', 'medium', 'compact', 'micro'];

  for (const mode of modes) {
    if (
      estimateWidth(
        buildCountSummaryText(mode, skillsCount, agentsCount, projectsCount, selectedCount, text)
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
  selectedCount: number,
  text: TuiText
): React.ReactElement {
  const separator = <Text color={inkColors.muted}> / </Text>;
  const showLibrary = mode === 'full' || mode === 'medium';
  const skillLabel =
    mode === 'full' ? text.status.skillsFull : mode === 'micro' ? '' : text.status.skillsCompact;
  const agentLabel =
    mode === 'full' ? text.status.agentsFull : mode === 'micro' ? '' : text.status.agentsCompact;
  const projectLabel =
    mode === 'full'
      ? text.status.projectsFull
      : mode === 'medium'
        ? text.status.projectsMedium
        : mode === 'compact'
          ? text.status.projectsCompact
          : '';
  const selectedLabel =
    mode === 'full'
      ? text.status.selectedFull
      : mode === 'micro'
        ? ''
        : text.status.selectedCompact;

  return (
    <Text>
      {showLibrary && <Text color={inkColors.muted}>{text.status.library}</Text>}
      <Text bold color={inkColors.accent}>
        {skillsCount}
      </Text>
      {skillLabel && <Text color={inkColors.secondary}>{skillLabel}</Text>}
      {separator}
      <Text bold color={inkColors.info}>
        {agentsCount}
      </Text>
      {agentLabel && <Text color={inkColors.secondary}>{agentLabel}</Text>}
      {separator}
      <Text bold color={inkColors.success}>
        {projectsCount}
      </Text>
      {projectLabel && <Text color={inkColors.secondary}>{projectLabel}</Text>}
      {selectedCount > 0 && (
        <>
          {separator}
          <Text bold color={inkColors.success}>
            {selectedCount}
          </Text>
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
  const activeTab = useStore(store, (s) => s.shellState.activeTab);
  const selectedSkillNames =
    useStore(store, (s) => s.skillsBrowserState.selectedNames) ?? new Set<string>();
  const selectedAgentSkillRowIds =
    useStore(store, (s) => s.agentsBrowserState.selectedSkillRowIds) ?? new Set<string>();
  const selectedProjectSkillRowIds =
    useStore(store, (s) => s.projectsBrowserState.selectedSkillRowIds) ?? new Set<string>();
  const agentViewMode = useStore(store, (s) => s.agentsBrowserState.viewMode) ?? 'master';
  const projectViewMode = useStore(store, (s) => s.projectsBrowserState.viewMode) ?? 'master';
  const detailOverlayVisible = useStore(store, (s) => s.shellState.detailOverlayVisible);
  const undoActive = useStore(store, (s) => s.shellState.undoActive);
  const undoBuffer = useStore(store, (s) => s.shellState.undoBuffer);
  const activeToast = useStore(store, (s) => s.shellState.activeToast);
  const locale = useStore(store, (s) => s.shellState.locale);
  const text = getTuiText(locale);
  const selectedCount =
    activeTab === 'skills'
      ? selectedSkillNames.size
      : activeTab === 'agents' && agentViewMode === 'skills'
        ? selectedAgentSkillRowIds.size
        : activeTab === 'projects' && projectViewMode === 'skills'
          ? selectedProjectSkillRowIds.size
          : 0;

  let contextHints = buildContextHints(activeTab, text);

  if (activeTab === 'agents' && agentViewMode === 'skills') {
    const labels = text.status.labels;
    contextHints = [
      { key: 'Space', label: labels.toggle, priority: 3, category: 'utility' },
      { key: 'Enter', label: labels.detail, priority: 4, category: 'utility' },
      { key: 'i', label: labels.import, priority: 5, category: 'creation' },
      { key: 'x', label: labels.unsync, priority: 6, category: 'utility' },
      { key: 'u', label: labels.update, priority: 7, category: 'utility' },
      { key: 'c', label: labels.categorize, priority: 8, category: 'utility' },
      { key: '[ ]', label: labels.browse, priority: 9, category: 'utility' },
      { key: 'Esc', label: labels.back, priority: 10, category: 'utility' },
    ];
  }

  if (activeTab === 'projects' && projectViewMode === 'skills') {
    const labels = text.status.labels;
    contextHints = [
      { key: 'Space', label: labels.toggle, priority: 3, category: 'utility' },
      { key: 'Enter', label: labels.detail, priority: 4, category: 'utility' },
      { key: 'i', label: labels.import, priority: 5, category: 'creation' },
      { key: 'x', label: labels.unsync, priority: 6, category: 'utility' },
      { key: 'u', label: labels.update, priority: 7, category: 'utility' },
      { key: 'c', label: labels.categorize, priority: 8, category: 'utility' },
      { key: '[ ]', label: labels.browse, priority: 9, category: 'utility' },
      { key: 'Esc', label: labels.back, priority: 10, category: 'utility' },
    ];
  }

  if (detailOverlayVisible) {
    contextHints = dedupeHints([
      { key: 'Esc', label: text.status.labels.back, priority: 0, category: 'utility' as const },
      ...contextHints,
    ]);
  }

  let leftSection: React.ReactNode;
  let leftSectionText = '';

  if (undoActive && undoBuffer) {
    const remainingSeconds = Math.ceil(undoBuffer.remainingMs / 1000);
    const entityName =
      (undoBuffer.snapshot as Record<string, string>)?.name ||
      (undoBuffer.snapshot as Record<string, string>)?.id ||
      'item';
    leftSectionText = `${symbols.crossMark} ${text.status.deletedUndo(entityName, remainingSeconds)}`;
    leftSection = <Text color={inkColors.warning}>{leftSectionText}</Text>;
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
    leftSection = <Text color={color}>{leftSectionText}</Text>;
  } else {
    const summaryMode = chooseCountSummaryMode(
      columns,
      band,
      skillsCount,
      agentsCount,
      projectsCount,
      selectedCount,
      text
    );
    leftSectionText = buildCountSummaryText(
      summaryMode,
      skillsCount,
      agentsCount,
      projectsCount,
      selectedCount,
      text
    );
    leftSection = renderCountSummary(
      summaryMode,
      skillsCount,
      agentsCount,
      projectsCount,
      selectedCount,
      text
    );
  }

  const contentWidth = Math.max(columns - 2, 0);
  const minimumGap = 1;
  const availableWidth = Math.max(contentWidth - estimateWidth(leftSectionText) - minimumGap, 0);
  const { segments } = rankAndTruncateHints(
    contextHints,
    band,
    availableWidth,
    buildGlobalHints(text)
  );

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
      <Box flexShrink={0}>{leftSection}</Box>
      <Box flexGrow={1} justifyContent="flex-end" paddingLeft={segments.length > 0 ? 1 : 0}>
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
