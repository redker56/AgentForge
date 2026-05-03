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

import { getTuiText } from '../i18n.js';
import type { AppStore } from '../store/index.js';
import type { OperationResult } from '../store/uiSlice.js';
import { inkColors, renderFocusPrefix, spacing } from '../theme.js';
import { truncateDisplayText } from '../utils/displayWidth.js';

import { ImportChecklist } from './ImportChecklist.js';
import { ProgressBar } from './ProgressBar.js';
import { StepIndicator } from './StepIndicator.js';

interface ImportFormTabProps {
  store: StoreApi<AppStore>;
}

const STEP_INDICATOR_WIDTH = 22;
const MIN_CONTENT_WIDTH = 24;

function truncateText(text: string, maxWidth: number): string {
  return truncateDisplayText(text, maxWidth);
}

export function ImportFormTab({ store }: ImportFormTabProps): React.ReactElement {
  const { stdout } = useStdout();
  const importTabStep = useStore(store, (s) => s.importWorkflowState.step);
  const locale = useStore(store, (s) => s.shellState.locale);
  const importTabSourceType = useStore(store, (s) => s.importWorkflowState.sourceType);
  const importTabSourceId = useStore(store, (s) => s.importWorkflowState.sourceId);
  const importTabSelectedSkillNames = useStore(
    store,
    (s) => s.importWorkflowState.selectedSkillNames
  );
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
  const text = getTuiText(locale);

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
          s.setImportTabSourceType(
            s.importWorkflowState.sourceType === 'project' ? 'agent' : 'project'
          );
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
          s.setImportTabFocusedIndex(
            Math.min(sourceList.length - 1, s.importWorkflowState.focusedIndex + 1)
          );
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
    {
      isActive:
        activeTab === 'import' &&
        !showSearch &&
        !showHelp &&
        !confirmState &&
        !formState &&
        !conflictState,
    }
  );

  // Import step indicator
  const importSteps: string[] = [
    text.importFlow.steps.selectSourceType,
    text.importFlow.steps.selectSource,
    text.importFlow.steps.selectSkills,
    text.importFlow.steps.confirm,
    text.importFlow.steps.executing,
    text.importFlow.steps.results,
  ];
  function importStepToLabel(step: string): string {
    switch (step) {
      case 'select-source-type':
        return text.importFlow.steps.selectSourceType;
      case 'select-source':
        return text.importFlow.steps.selectSource;
      case 'select-skills':
        return text.importFlow.steps.selectSkills;
      case 'confirm':
        return text.importFlow.steps.confirm;
      case 'executing':
        return text.importFlow.steps.executing;
      case 'results':
        return text.importFlow.steps.results;
      default:
        return step;
    }
  }
  const importCurrentIndex = importSteps.indexOf(importStepToLabel(importTabStep));
  const columns = stdout?.columns ?? 120;
  const contentWidth = Math.max(
    columns - STEP_INDICATOR_WIDTH - spacing.paddingX * 4 - 6,
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
          <SelectSourceType
            sourceType={importTabSourceType}
            contentWidth={contentWidth}
            text={text}
          />
        )}
        {importTabStep === 'select-source' && (
          <SelectSource
            sourceType={importTabSourceType}
            focusedIndex={importTabFocusedIndex}
            projects={projects}
            agents={agents}
            contentWidth={contentWidth}
            text={text}
          />
        )}
        {importTabStep === 'select-skills' && (
          <ImportChecklist
            skills={discoveredSkills}
            selected={importTabSelectedSkillNames}
            focusedIndex={importTabFocusedIndex}
            onToggle={(name) => toggleImportSkill(store, name)}
            onUp={() =>
              store
                .getState()
                .setImportTabFocusedIndex(
                  Math.max(0, store.getState().importWorkflowState.focusedIndex - 1)
                )
            }
            onDown={() =>
              store
                .getState()
                .setImportTabFocusedIndex(
                  Math.min(
                    discoveredSkills.length - 1,
                    store.getState().importWorkflowState.focusedIndex + 1
                  )
                )
            }
            columns={contentWidth}
            locale={locale}
          />
        )}
        {importTabStep === 'confirm' && (
          <ConfirmStep
            sourceType={importTabSourceType}
            sourceId={importTabSourceId}
            skillNames={importTabSelectedSkillNames}
            contentWidth={contentWidth}
            text={text}
          />
        )}
        {importTabStep === 'executing' && (
          <ExecutingStep progressItems={updateProgressItems} text={text} />
        )}
        {importTabStep === 'results' && (
          <ResultsStep results={importTabResults} contentWidth={contentWidth} text={text} />
        )}
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
    sourceType === 'project' ? state.scanProjectSkills(sourceId) : state.scanAgentSkills(sourceId);
  state.setImportDiscoveredSkills(candidates);
}

async function executeImport(
  s: ReturnType<StoreApi<AppStore>['getState']>,
  _storeApi: StoreApi<AppStore>
): Promise<void> {
  const skillNames = [...s.importWorkflowState.selectedSkillNames];
  const sourceId = s.importWorkflowState.sourceId;

  if (!sourceId) return;

  s.setImportTabStep('executing');

  const items = skillNames.map((name) => ({
    id: `import-${name}`,
    label: getTuiText(s.shellState.locale).importFlow.importProgress(name),
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
  text,
}: {
  sourceType: 'project' | 'agent' | null;
  contentWidth: number;
  text: ReturnType<typeof getTuiText>;
}): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>
        {text.importFlow.screenTitle}
      </Text>
      <Text> </Text>
      <Text>{text.importFlow.chooseSource}</Text>
      <Text>
        {renderFocusPrefix(sourceType === 'project')}
        {truncateText(text.importFlow.importFromProject, Math.max(contentWidth - 2, 8))}
      </Text>
      <Text>
        {renderFocusPrefix(sourceType === 'agent')}
        {truncateText(text.importFlow.importFromAgent, Math.max(contentWidth - 2, 8))}
      </Text>
      <Text> </Text>
      <Text dimColor>{truncateText(text.common.upDownChooseEnterContinue, contentWidth)}</Text>
    </Box>
  );
}

function SelectSource({
  sourceType,
  focusedIndex,
  projects,
  agents,
  contentWidth,
  text,
}: {
  sourceType: 'project' | 'agent' | null;
  focusedIndex: number;
  projects: Array<{ id: string; path: string }>;
  agents: Array<{ id: string; name: string }>;
  contentWidth: number;
  text: ReturnType<typeof getTuiText>;
}): React.ReactElement {
  const list = sourceType === 'project' ? projects : agents;
  const title =
    sourceType === 'project' ? text.importFlow.selectProject : text.importFlow.selectAgent;

  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>
        {title}
      </Text>
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
      {list.length === 0 && (
        <Text dimColor>
          {truncateText(
            text.importFlow.noConfigured(
              sourceType === 'project' ? text.common.project : text.context.agent
            ),
            contentWidth
          )}
        </Text>
      )}
      <Text> </Text>
      <Text dimColor>{truncateText(text.common.upDownSelectEnterContinue, contentWidth)}</Text>
    </Box>
  );
}

function ConfirmStep({
  sourceType,
  sourceId,
  skillNames,
  contentWidth,
  text,
}: {
  sourceType: 'project' | 'agent' | null;
  sourceId: string | null;
  skillNames: Set<string>;
  contentWidth: number;
  text: ReturnType<typeof getTuiText>;
}): React.ReactElement {
  const label = sourceType === 'project' ? text.common.project : text.context.agent;

  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>
        {text.importFlow.confirmImport}
      </Text>
      <Text> </Text>
      <Text>
        {truncateText(
          text.importFlow.confirmSentence(skillNames.size, label, sourceId),
          contentWidth
        )}
      </Text>
      <Text> </Text>
      <Text dimColor>
        {truncateText(`${text.sync.skills}: ${[...skillNames].join(', ')}`, contentWidth)}
      </Text>
      <Text> </Text>
      <Box flexDirection="row" gap={2}>
        <Text color={inkColors.accent}>[Enter]</Text>
        <Text>{text.status.labels.import}</Text>
        <Text dimColor>[Esc] {text.common.back}</Text>
      </Box>
    </Box>
  );
}

function ExecutingStep({
  progressItems,
  text,
}: {
  progressItems: Array<{
    id: string;
    label: string;
    progress: number;
    status: 'pending' | 'running' | 'success' | 'error';
    error?: string;
  }>;
  text: ReturnType<typeof getTuiText>;
}): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>
        {text.importFlow.importingSkills}
      </Text>
      <Text> </Text>
      {progressItems.map((item) => (
        <ProgressBar
          key={item.id}
          label={item.label}
          progress={item.progress}
          status={item.status}
          error={item.error}
        />
      ))}
    </Box>
  );
}

function ResultsStep({
  results,
  contentWidth,
  text,
}: {
  results: Array<{ target: string; success: boolean; error?: string }>;
  contentWidth: number;
  text: ReturnType<typeof getTuiText>;
}): React.ReactElement {
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>
        {text.importFlow.importComplete}
      </Text>
      <Text> </Text>
      <Text>
        {truncateText(text.importFlow.resultSummary(successCount, failCount), contentWidth)}
      </Text>
      <Text> </Text>
      {results.map((r, i) => (
        <Text key={`${r.target}-${i}`} color={r.success ? inkColors.success : inkColors.error}>
          {truncateText(
            `${r.success ? text.common.ok : text.common.fail} ${r.target}${
              r.error ? `: ${r.error}` : ''
            }`,
            contentWidth
          )}
        </Text>
      ))}
      <Text> </Text>
      <Box flexDirection="row" gap={2}>
        <Text color={inkColors.accent}>[Enter]</Text>
        <Text>{text.common.newImport}</Text>
        <Text dimColor>[Esc] {text.common.close}</Text>
      </Box>
    </Box>
  );
}
