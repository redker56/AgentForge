/**
 * Multi-step form for import workflows rendered inside the Import tab screen.
 * Distinct from the overlay ImportForm.tsx used by the `i` key shortcut from other tabs.
 *
 * Uses store-owned workflow state and import actions.
 */

import { Box, Text, useInput, useStdout } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type { AppStore } from '../store/index.js';
import type { OperationResult } from '../store/uiSlice.js';
import { inkColors, renderFocusPrefix, spacing } from '../theme.js';

import { ImportChecklist } from './ImportChecklist.js';
import { ProgressBar } from './ProgressBar.js';
import { StepIndicator } from './StepIndicator.js';

interface ImportFormTabProps {
  store: StoreApi<AppStore>;
}

const STEP_INDICATOR_WIDTH = 22;
const MIN_CONTENT_WIDTH = 24;

function truncateText(text: string, maxWidth: number): string {
  if (maxWidth <= 0) return '';
  if (text.length <= maxWidth) return text;
  if (maxWidth <= 3) return text.slice(0, maxWidth);
  return `${text.slice(0, maxWidth - 3)}...`;
}

export function ImportFormTab({ store }: ImportFormTabProps): React.ReactElement {
  const { stdout } = useStdout();
  const importTabStep = useStore(store, (s) => s.importWorkflowState.step);
  const importTabSourceType = useStore(store, (s) => s.importWorkflowState.sourceType);
  const importTabSourceId = useStore(store, (s) => s.importWorkflowState.sourceId);
  const importTabSelectedSkillNames = useStore(store, (s) => s.importWorkflowState.selectedSkillNames);
  const importTabResults = useStore(store, (s) => s.importWorkflowState.results);
  const importTabFocusedIndex = useStore(store, (s) => s.importWorkflowState.focusedIndex);
  const discoveredSkills = useStore(store, (s) => s.importWorkflowState.discoveredSkills);
  const agents = useStore(store, (s) => s.agents);
  const projects = useStore(store, (s) => s.projects);
  const activeTab = useStore(store, (s) => s.shellState.activeTab);
  const showSearch = useStore(store, (s) => s.shellState.showSearch);
  const showHelp = useStore(store, (s) => s.shellState.showHelp);
  const confirmState = useStore(store, (s) => s.shellState.confirmState);
  const formState = useStore(store, (s) => s.shellState.formState);
  const conflictState = useStore(store, (s) => s.shellState.conflictState);
  const updateProgressItems = useStore(store, (s) => s.shellState.updateProgressItems);

  // Local useInput for form navigation
  useInput(
    (input, key) => {
      const s = store.getState();

      if (s.importWorkflowState.step === 'results' || s.importWorkflowState.step === 'executing') {
        if (key.return || key.escape) {
          s.resetImportTab();
        }
        return;
      }

      if (s.importWorkflowState.step === 'select-source-type') {
        if (key.escape) {
          s.resetImportTab();
          return;
        }
        if (key.upArrow || key.downArrow) {
          s.setImportTabSourceType(s.importWorkflowState.sourceType === 'project' ? 'agent' : 'project');
        }
        if (key.return || input === ' ') {
          if (!s.importWorkflowState.sourceType) {
            s.setImportTabSourceType('project');
          }
          s.setImportTabStep('select-source');
          s.setImportTabSourceId(null);
          s.setImportTabFocusedIndex(0);
        }
        return;
      }

      if (s.importWorkflowState.step === 'select-source') {
        if (key.escape) {
          s.setImportTabStep('select-source-type');
          return;
        }
        const sourceList = s.importWorkflowState.sourceType === 'project' ? s.projects : s.agents;
        if (key.upArrow) {
          s.setImportTabFocusedIndex(Math.max(0, s.importWorkflowState.focusedIndex - 1));
        }
        if (key.downArrow) {
          s.setImportTabFocusedIndex(Math.min(sourceList.length - 1, s.importWorkflowState.focusedIndex + 1));
        }
        if (key.return || input === ' ') {
          const focused = sourceList[s.importWorkflowState.focusedIndex];
          if (!focused) return;
          const id = 'id' in focused ? focused.id : '';
          s.setImportTabSourceId(id);
          s.setImportTabStep('select-skills');
          s.setImportTabSelectedSkillNames(new Set());
          s.setImportTabFocusedIndex(0);
          runDiscovery(store);
        }
        return;
      }

      if (s.importWorkflowState.step === 'select-skills') {
        if (key.escape) {
          s.setImportTabStep('select-source');
          return;
        }
        if (key.upArrow) {
          s.setImportTabFocusedIndex(Math.max(0, s.importWorkflowState.focusedIndex - 1));
        }
        if (key.downArrow) {
          s.setImportTabFocusedIndex(
            Math.min(discoveredSkills.length - 1, s.importWorkflowState.focusedIndex + 1)
          );
        }
        if (input === ' ') {
          const skill = discoveredSkills[s.importWorkflowState.focusedIndex];
          if (skill && !skill.alreadyExists) {
            s.toggleImportTabSkill(skill.name);
          }
        }
        if (key.return) {
          if (s.importWorkflowState.selectedSkillNames.size === 0) return;
          s.setImportTabStep('confirm');
        }
        return;
      }

      if (s.importWorkflowState.step === 'confirm') {
        if (key.return) {
          void executeImport(s, store);
        }
        if (key.escape) {
          s.setImportTabStep('select-skills');
        }
        return;
      }

      if (key.escape) {
        handleImportBack(store);
      }
    },
    { isActive: activeTab === 'import' && !showSearch && !showHelp && !confirmState && !formState && !conflictState },
  );

  // Import step indicator
  const importSteps = ['Select Source Type', 'Select Source', 'Select Skills', 'Confirm', 'Executing', 'Results'];
  function importStepToLabel(step: string): string {
    switch (step) {
      case 'select-source-type': return 'Select Source Type';
      case 'select-source': return 'Select Source';
      case 'select-skills': return 'Select Skills';
      case 'confirm': return 'Confirm';
      case 'executing': return 'Executing';
      case 'results': return 'Results';
      default: return step;
    }
  }
  const importCurrentIndex = importSteps.indexOf(importStepToLabel(importTabStep));
  const columns = stdout?.columns ?? 120;
  const contentWidth = Math.max(
    columns - STEP_INDICATOR_WIDTH - (spacing.paddingX * 4) - 6,
    MIN_CONTENT_WIDTH
  );

  return (
    <Box flexDirection="row" flexGrow={1} paddingX={spacing.paddingX}>
      <StepIndicator
        steps={importSteps}
        currentStep={Math.max(0, importCurrentIndex)}
        width={STEP_INDICATOR_WIDTH}
      />
      <Box flexDirection="column" flexGrow={1} paddingX={spacing.paddingX}>
        {importTabStep === 'select-source-type' && (
          <SelectSourceType sourceType={importTabSourceType} contentWidth={contentWidth} />
        )}
        {importTabStep === 'select-source' && (
          <SelectSource
            sourceType={importTabSourceType}
            focusedIndex={importTabFocusedIndex}
            projects={projects}
            agents={agents}
            contentWidth={contentWidth}
          />
        )}
        {importTabStep === 'select-skills' && (
          <ImportChecklist
            skills={discoveredSkills}
            selected={importTabSelectedSkillNames}
            focusedIndex={importTabFocusedIndex}
            onToggle={(name) => toggleImportSkill(store, name)}
            onUp={() => store.getState().setImportTabFocusedIndex(Math.max(0, store.getState().importWorkflowState.focusedIndex - 1))}
            onDown={() =>
              store
                .getState()
                .setImportTabFocusedIndex(
                  Math.min(discoveredSkills.length - 1, store.getState().importWorkflowState.focusedIndex + 1)
                )
            }
            columns={contentWidth}
          />
        )}
        {importTabStep === 'confirm' && (
          <ConfirmStep
            sourceType={importTabSourceType}
            sourceId={importTabSourceId}
            skillNames={importTabSelectedSkillNames}
            contentWidth={contentWidth}
          />
        )}
        {importTabStep === 'executing' && <ExecutingStep progressItems={updateProgressItems} />}
        {importTabStep === 'results' && <ResultsStep results={importTabResults} contentWidth={contentWidth} />}
      </Box>
    </Box>
  );
}

// ============================================================
// Discovery & Execution
// ============================================================

function runDiscovery(storeApi: StoreApi<AppStore>): void {
  const state = storeApi.getState();
  const sourceType = state.importWorkflowState.sourceType;
  const sourceId = state.importWorkflowState.sourceId;
  if (!sourceType || !sourceId) {
    state.setImportDiscoveredSkills([]);
    return;
  }

  const candidates =
    sourceType === 'project'
      ? state.scanProjectSkills(sourceId)
      : state.scanAgentSkills(sourceId);
  state.setImportDiscoveredSkills(candidates);
}

async function executeImport(
  s: ReturnType<StoreApi<AppStore>['getState']>,
  _storeApi: StoreApi<AppStore>,
): Promise<void> {
  const skillNames = [...s.importWorkflowState.selectedSkillNames];
  const sourceId = s.importWorkflowState.sourceId;

  if (!sourceId) return;

  s.setImportTabStep('executing');

  const items = skillNames.map((name) => ({
    id: `import-${name}`,
    label: `Importing ${name}...`,
    progress: 0,
    status: 'running' as const,
    error: undefined as string | undefined,
  }));
  s.setUpdateProgressItems(items);

  let results: OperationResult[];

  if (s.importWorkflowState.sourceType === 'project') {
    results = await s.importFromProject(sourceId, skillNames);
  } else {
    results = await s.importFromAgent(sourceId, skillNames);
  }

  for (const r of results) {
    const item = items.find((i) => i.id === `import-${r.target}`);
    if (item) {
      s.updateProgressItem(item.id, {
        status: r.success ? 'success' : 'error',
        progress: 100,
        ...(r.error ? { error: r.error } : {}),
      });
    }
  }

  s.setImportTabResults(results);
  s.setImportTabStep('results');
}

function toggleImportSkill(storeApi: StoreApi<AppStore>, skillName: string): void {
  const s = storeApi.getState();
  const skill = s.importWorkflowState.discoveredSkills.find((entry) => entry.name === skillName);
  if (skill?.alreadyExists) return; // Cannot toggle already-imported
  const newSelected = new Set(s.importWorkflowState.selectedSkillNames);
  if (newSelected.has(skillName)) {
    newSelected.delete(skillName);
  } else {
    newSelected.add(skillName);
  }
  s.setImportTabSelectedSkillNames(newSelected);
}

function handleImportBack(storeApi: StoreApi<AppStore>): void {
  const s = storeApi.getState();
  switch (s.importWorkflowState.step) {
    case 'select-source':
      s.resetImportTab();
      break;
    case 'select-skills':
      s.setImportTabStep('select-source');
      break;
    case 'confirm':
      s.setImportTabStep('select-skills');
      break;
    default:
      s.resetImportTab();
  }
}

// ============================================================
// Step sub-components
// ============================================================

function SelectSourceType({
  sourceType,
  contentWidth,
}: {
  sourceType: 'project' | 'agent' | null;
  contentWidth: number;
}): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>Import Skills</Text>
      <Text> </Text>
      <Text>Choose source:</Text>
      <Text>{renderFocusPrefix(sourceType === 'project')}{truncateText('Import from Project', Math.max(contentWidth - 2, 8))}</Text>
      <Text>{renderFocusPrefix(sourceType === 'agent')}{truncateText('Import from Agent', Math.max(contentWidth - 2, 8))}</Text>
      <Text> </Text>
      <Text dimColor>{truncateText('Up/Down to choose, Enter to continue', contentWidth)}</Text>
    </Box>
  );
}

function SelectSource({
  sourceType,
  focusedIndex,
  projects,
  agents,
  contentWidth,
}: {
  sourceType: 'project' | 'agent' | null;
  focusedIndex: number;
  projects: Array<{ id: string; path: string }>;
  agents: Array<{ id: string; name: string }>;
  contentWidth: number;
}): React.ReactElement {
  const list = sourceType === 'project' ? projects : agents;
  const title = sourceType === 'project' ? 'Select project' : 'Select agent';

  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>{title}</Text>
      <Text> </Text>
      {list.map((item, i) => {
        const isFocused = i === focusedIndex;
        const label =
          sourceType === 'project'
            ? `${(item as { id: string; path: string }).id}  ${(item as { id: string; path: string }).path}`
            : (item as { id: string; name: string }).name;
        return (
          <Text key={(item as { id: string }).id}>
            {renderFocusPrefix(isFocused)} {truncateText(label, Math.max(contentWidth - 2, 8))}
          </Text>
        );
      })}
      {list.length === 0 && <Text dimColor>{truncateText(`No ${sourceType}s configured`, contentWidth)}</Text>}
      <Text> </Text>
      <Text dimColor>{truncateText('Up/Down to select, Enter to continue', contentWidth)}</Text>
    </Box>
  );
}

function ConfirmStep({
  sourceType,
  sourceId,
  skillNames,
  contentWidth,
}: {
  sourceType: 'project' | 'agent' | null;
  sourceId: string | null;
  skillNames: Set<string>;
  contentWidth: number;
}): React.ReactElement {
  const label = sourceType === 'project' ? 'project' : 'agent';

  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>Confirm Import</Text>
      <Text> </Text>
      <Text>
        {truncateText(`Import ${skillNames.size} skill(s) from ${label} "${sourceId}".`, contentWidth)}
      </Text>
      <Text> </Text>
      <Text dimColor>{truncateText(`Skills: ${[...skillNames].join(', ')}`, contentWidth)}</Text>
      <Text> </Text>
      <Box flexDirection="row" gap={2}>
        <Text color={inkColors.accent}>[Enter]</Text>
        <Text>Import</Text>
        <Text dimColor>[Esc] Back</Text>
      </Box>
    </Box>
  );
}

function ExecutingStep({
  progressItems,
}: {
  progressItems: Array<{
    id: string;
    label: string;
    progress: number;
    status: 'pending' | 'running' | 'success' | 'error';
    error?: string;
  }>;
}): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>Importing skills...</Text>
      <Text> </Text>
      {progressItems.map((item) => (
        <ProgressBar key={item.id} label={item.label} progress={item.progress} status={item.status} error={item.error} />
      ))}
    </Box>
  );
}

function ResultsStep({
  results,
  contentWidth,
}: {
  results: Array<{ target: string; success: boolean; error?: string }>;
  contentWidth: number;
}): React.ReactElement {
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>Import complete</Text>
      <Text> </Text>
      <Text>{truncateText(`${successCount} succeeded, ${failCount} failed.`, contentWidth)}</Text>
      <Text> </Text>
      {results.map((r, i) => (
        <Text key={`${r.target}-${i}`} color={r.success ? inkColors.success : inkColors.error}>
          {truncateText(`${r.success ? 'OK' : 'FAIL'} ${r.target}${r.error ? `: ${r.error}` : ''}`, contentWidth)}
        </Text>
      ))}
      <Text> </Text>
      <Box flexDirection="row" gap={2}>
        <Text color={inkColors.accent}>[Enter]</Text>
        <Text>New import</Text>
        <Text dimColor>[Esc] Close</Text>
      </Box>
    </Box>
  );
}
