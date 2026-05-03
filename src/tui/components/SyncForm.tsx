/**
 * Multi-step form for sync and unsync workflows. Renders inside SyncScreen.
 *
 * State is driven entirely by the store's syncFormStep field.
 * Navigation is via local useInput (isActive gated to sync tab + no overlays).
 */

import { Box, Text, useInput, useStdout } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type { SkillDetailData } from '../../app/workbench-types.js';
import type { SyncMode } from '../../types.js';
import { getTuiText } from '../i18n.js';
import type { AppStore } from '../store/index.js';
import type { OperationResult, SyncOperation } from '../store/uiSlice.js';
import { inkColors, renderFocusPrefix, selectionMarkers, spacing } from '../theme.js';
import { truncateDisplayText } from '../utils/displayWidth.js';

import { ProgressBar } from './ProgressBar.js';
import { StepIndicator } from './StepIndicator.js';

interface SyncFormProps {
  store: StoreApi<AppStore>;
}

interface TargetItem {
  id: string;
  label: string;
}

interface AgentTypeItem {
  id: string;
  label: string;
}

const STEP_INDICATOR_WIDTH = 22;
const MIN_CONTENT_WIDTH = 24;

function truncateText(text: string, maxWidth: number): string {
  return truncateDisplayText(text, maxWidth);
}

function truncateSelectableLabel(label: string, contentWidth: number): string {
  return truncateText(label, Math.max(contentWidth - 8, 8));
}

function truncateSummaryList(
  items: string[],
  contentWidth: number,
  text: ReturnType<typeof getTuiText>
): string {
  if (items.length === 0) return text.common.none;
  return truncateText(items.join(', '), Math.max(contentWidth - 8, 8));
}

function getOutcome(result: OperationResult): 'success' | 'error' | 'skipped' {
  return result.outcome ?? (result.success ? 'success' : 'error');
}

function getProjectAvailability(detail: SkillDetailData | undefined): Map<string, Set<string>> {
  const availability = new Map<string, Set<string>>();

  for (const record of detail?.syncedProjects || []) {
    if (!availability.has(record.projectId)) {
      availability.set(record.projectId, new Set());
    }
    availability.get(record.projectId)?.add(record.agentType);
  }

  for (const project of detail?.projectDistribution || []) {
    if (!availability.has(project.projectId)) {
      availability.set(project.projectId, new Set());
    }
    const agentTypes = availability.get(project.projectId);
    for (const agent of project.agents) {
      agentTypes?.add(agent.id);
    }
  }

  return availability;
}

function buildUnsyncAgentTargets(
  selectedSkillNames: Set<string>,
  skillDetails: Record<string, SkillDetailData | undefined>,
  agents: Array<{ id: string; name: string }>
): TargetItem[] {
  const agentIds = new Set<string>();
  for (const skillName of selectedSkillNames) {
    for (const record of skillDetails[skillName]?.syncedTo || []) {
      agentIds.add(record.agentId);
    }
  }

  return agents
    .filter((agent) => agentIds.has(agent.id))
    .map((agent) => ({ id: agent.id, label: `${agent.name} (${agent.id})` }));
}

function buildUnsyncProjectTargets(
  selectedSkillNames: Set<string>,
  skillDetails: Record<string, SkillDetailData | undefined>,
  projects: Array<{ id: string; path: string }>
): TargetItem[] {
  const projectIds = new Set<string>();
  for (const skillName of selectedSkillNames) {
    const availability = getProjectAvailability(skillDetails[skillName]);
    for (const projectId of availability.keys()) {
      projectIds.add(projectId);
    }
  }

  return projects
    .filter((project) => projectIds.has(project.id))
    .map((project) => ({ id: project.id, label: `${project.id}  ${project.path}` }));
}

function parseExactProjectTargets(selectedTargetIds: Set<string>): Array<{
  projectId: string;
  agentType: string;
}> {
  return [...selectedTargetIds]
    .filter((targetId) => targetId.includes(':'))
    .map((targetId) => {
      const [projectId, agentType] = targetId.split(':');
      return { projectId, agentType };
    })
    .filter((target) => Boolean(target.projectId) && Boolean(target.agentType));
}

function buildUnsyncProjectAgentTypes(
  selectedSkillNames: Set<string>,
  selectedProjectIds: Set<string>,
  skillDetails: Record<string, SkillDetailData | undefined>,
  agents: Array<{ id: string; name: string }>
): AgentTypeItem[] {
  const exactTargets = parseExactProjectTargets(selectedProjectIds);
  if (exactTargets.length > 0) {
    return uniqueAgentTypes(new Set(exactTargets.map((target) => target.agentType)), agents);
  }

  const typeIds = new Set<string>();

  for (const skillName of selectedSkillNames) {
    const availability = getProjectAvailability(skillDetails[skillName]);
    for (const projectId of selectedProjectIds) {
      for (const agentType of availability.get(projectId) || []) {
        typeIds.add(agentType);
      }
    }
  }

  return uniqueAgentTypes(typeIds, agents);
}

function uniqueAgentTypes(
  typeIds: Set<string>,
  agents: Array<{ id: string; name: string }>
): AgentTypeItem[] {
  return Array.from(typeIds)
    .sort()
    .map((agentType) => {
      const agent = agents.find((item) => item.id === agentType);
      return {
        id: agentType,
        label: agent ? `${agent.name} (${agent.id})` : agentType,
      };
    });
}

function buildTargetList(
  operation: SyncOperation | null,
  unsyncScope: 'agents' | 'projects' | null,
  selectedSkillNames: Set<string>,
  skillDetails: Record<string, SkillDetailData | undefined>,
  agents: Array<{ id: string; name: string }>,
  projects: Array<{ id: string; path: string }>
): TargetItem[] {
  if (operation === 'sync-agents') {
    return agents.map((agent) => ({ id: agent.id, label: `${agent.name} (${agent.id})` }));
  }

  if (operation === 'sync-projects') {
    return projects.map((project) => ({ id: project.id, label: `${project.id}  ${project.path}` }));
  }

  if (operation === 'unsync' && unsyncScope === 'agents') {
    return buildUnsyncAgentTargets(selectedSkillNames, skillDetails, agents);
  }

  if (operation === 'unsync' && unsyncScope === 'projects') {
    return buildUnsyncProjectTargets(selectedSkillNames, skillDetails, projects);
  }

  return [];
}

function getSyncSteps(
  operation: SyncOperation | null,
  unsyncScope: 'agents' | 'projects' | null,
  projectMode: 'all' | 'specific' | null,
  text: ReturnType<typeof getTuiText>
): string[] {
  const steps = text.sync.steps;
  switch (operation) {
    case 'sync-agents':
      return [
        steps.selectOperation,
        steps.selectSkills,
        steps.selectTargets,
        steps.selectMode,
        steps.confirm,
        steps.executing,
        steps.results,
      ];
    case 'sync-projects':
      return [
        steps.selectOperation,
        steps.selectSkills,
        steps.selectTargets,
        steps.selectAgentTypes,
        steps.selectMode,
        steps.confirm,
        steps.executing,
        steps.results,
      ];
    case 'unsync':
      if (unsyncScope === 'projects' && projectMode === 'specific') {
        return [
          steps.selectOperation,
          steps.selectSkills,
          steps.selectScope,
          steps.selectTargets,
          steps.selectUnsyncMode,
          steps.selectAgentTypes,
          steps.confirm,
          steps.executing,
          steps.results,
        ];
      }
      if (unsyncScope === 'projects') {
        return [
          steps.selectOperation,
          steps.selectSkills,
          steps.selectScope,
          steps.selectTargets,
          steps.selectUnsyncMode,
          steps.confirm,
          steps.executing,
          steps.results,
        ];
      }
      return [
        steps.selectOperation,
        steps.selectSkills,
        steps.selectScope,
        steps.selectTargets,
        steps.confirm,
        steps.executing,
        steps.results,
      ];
    default:
      return [steps.selectOperation];
  }
}

function stepToLabel(step: string, text: ReturnType<typeof getTuiText>): string {
  const labels = text.sync.steps;
  switch (step) {
    case 'select-op':
      return labels.selectOperation;
    case 'select-skills':
      return labels.selectSkills;
    case 'select-unsync-scope':
      return labels.selectScope;
    case 'select-targets':
      return labels.selectTargets;
    case 'select-unsync-project-mode':
      return labels.selectUnsyncMode;
    case 'select-agent-types':
      return labels.selectAgentTypes;
    case 'select-mode':
      return labels.selectMode;
    case 'confirm':
      return labels.confirm;
    case 'executing':
      return labels.executing;
    case 'results':
      return labels.results;
    default:
      return step;
  }
}

async function prepareUnsyncDetails(storeApi: StoreApi<AppStore>): Promise<void> {
  const state = storeApi.getState();
  state.setSyncFormLoadingTargets(true);
  try {
    await Promise.all(
      [...state.syncWorkflowState.selectedSkillNames].map((skillName) => {
        if (storeApi.getState().skillDetails[skillName]) {
          return Promise.resolve();
        }
        return storeApi.getState().loadSkillDetail(skillName);
      })
    );
  } finally {
    storeApi.getState().setSyncFormLoadingTargets(false);
  }
}

async function executeSync(storeApi: StoreApi<AppStore>): Promise<void> {
  const state = storeApi.getState();
  const skillNames = [...state.syncWorkflowState.selectedSkillNames];
  const targetIds = [...state.syncWorkflowState.selectedTargetIds];

  if (state.syncWorkflowState.operation === 'sync-agents') {
    await storeApi
      .getState()
      .syncSkillsToAgents(skillNames, targetIds, state.syncWorkflowState.mode as SyncMode);
    return;
  }

  if (state.syncWorkflowState.operation === 'sync-projects') {
    const agentTypes =
      state.syncWorkflowState.selectedAgentTypes.size > 0
        ? [...state.syncWorkflowState.selectedAgentTypes]
        : state.agents.map((agent) => agent.id);
    await storeApi
      .getState()
      .syncSkillsToProjects(
        skillNames,
        targetIds,
        agentTypes,
        state.syncWorkflowState.mode as SyncMode
      );
    return;
  }

  if (
    state.syncWorkflowState.operation === 'unsync' &&
    state.syncWorkflowState.unsyncScope === 'agents'
  ) {
    await storeApi.getState().unsyncFromAgents(skillNames, targetIds);
    return;
  }

  if (
    state.syncWorkflowState.operation === 'unsync' &&
    state.syncWorkflowState.unsyncScope === 'projects'
  ) {
    await storeApi.getState().unsyncFromProjects(skillNames, targetIds, {
      mode: state.syncWorkflowState.projectUnsyncMode || 'all',
      agentTypes:
        state.syncWorkflowState.projectUnsyncMode === 'specific'
          ? [...state.syncWorkflowState.selectedAgentTypes]
          : undefined,
    });
  }
}

function handleSyncBack(storeApi: StoreApi<AppStore>): void {
  const state = storeApi.getState();
  switch (state.syncWorkflowState.step) {
    case 'select-targets':
      if (state.syncWorkflowState.operation === 'unsync') {
        state.setSyncFormStep('select-unsync-scope');
      } else {
        state.setSyncFormStep('select-skills');
      }
      break;
    case 'select-unsync-scope':
      state.setSyncFormStep('select-skills');
      break;
    case 'select-unsync-project-mode':
      state.setSyncFormStep('select-targets');
      break;
    case 'select-agent-types':
      if (state.syncWorkflowState.operation === 'unsync') {
        state.setSyncFormStep('select-unsync-project-mode');
      } else {
        state.setSyncFormStep('select-targets');
      }
      break;
    case 'select-mode':
      if (state.syncWorkflowState.operation === 'sync-projects') {
        state.setSyncFormStep('select-agent-types');
      } else {
        state.setSyncFormStep('select-targets');
      }
      break;
    case 'confirm':
      if (
        state.syncWorkflowState.operation === 'sync-projects' ||
        state.syncWorkflowState.operation === 'sync-agents'
      ) {
        state.setSyncFormStep('select-mode');
      } else if (
        state.syncWorkflowState.operation === 'unsync' &&
        state.syncWorkflowState.unsyncScope === 'projects'
      ) {
        if (state.syncWorkflowState.projectUnsyncMode === 'specific') {
          state.setSyncFormStep('select-agent-types');
        } else {
          state.setSyncFormStep('select-unsync-project-mode');
        }
      } else {
        state.setSyncFormStep('select-targets');
      }
      break;
    case 'select-skills':
    case 'select-op':
    default:
      break;
  }
}

export function SyncForm({ store }: SyncFormProps): React.ReactElement {
  const { stdout } = useStdout();
  const syncFormStep = useStore(store, (s) => s.syncWorkflowState.step);
  const locale = useStore(store, (s) => s.shellState.locale);
  const syncFormOperation = useStore(store, (s) => s.syncWorkflowState.operation);
  const syncFormSelectedSkillNames = useStore(store, (s) => s.syncWorkflowState.selectedSkillNames);
  const syncFormUnsyncScope = useStore(store, (s) => s.syncWorkflowState.unsyncScope);
  const syncFormSelectedTargetIds = useStore(store, (s) => s.syncWorkflowState.selectedTargetIds);
  const syncFormProjectUnsyncMode = useStore(store, (s) => s.syncWorkflowState.projectUnsyncMode);
  const syncFormSelectedAgentTypes = useStore(store, (s) => s.syncWorkflowState.selectedAgentTypes);
  const syncFormLoadingTargets = useStore(store, (s) => s.syncWorkflowState.loadingTargets);
  const syncFormMode = useStore(store, (s) => s.syncWorkflowState.mode);
  const syncFormResults = useStore(store, (s) => s.syncWorkflowState.results);
  const syncFormFocusedIndex = useStore(store, (s) => s.syncWorkflowState.focusedIndex);
  const skills = useStore(store, (s) => s.skills);
  const skillDetails = useStore(store, (s) => s.skillDetails);
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

  const targetList = buildTargetList(
    syncFormOperation,
    syncFormUnsyncScope,
    syncFormSelectedSkillNames,
    skillDetails,
    agents,
    projects
  );
  const unsyncProjectAgentTypes = buildUnsyncProjectAgentTypes(
    syncFormSelectedSkillNames,
    syncFormSelectedTargetIds,
    skillDetails,
    agents
  );
  const syncSteps = getSyncSteps(
    syncFormOperation,
    syncFormUnsyncScope,
    syncFormProjectUnsyncMode,
    text
  );
  const syncCurrentIndex = syncSteps.indexOf(stepToLabel(syncFormStep, text));
  const columns = stdout?.columns ?? 120;
  const contentWidth = Math.max(
    columns - STEP_INDICATOR_WIDTH - spacing.paddingX * 4 - 6,
    MIN_CONTENT_WIDTH
  );

  useInput(
    (input, key) => {
      const state = store.getState();

      if (
        state.syncWorkflowState.step === 'results' ||
        state.syncWorkflowState.step === 'executing'
      ) {
        if (key.return || key.escape) {
          state.resetSyncForm();
        }
        return;
      }

      if (state.syncWorkflowState.step === 'select-op') {
        if (key.escape) {
          state.resetSyncForm();
          return;
        }
        if (key.upArrow || key.downArrow) {
          const options: SyncOperation[] = ['sync-agents', 'sync-projects', 'unsync'];
          const current = state.syncWorkflowState.operation || 'sync-agents';
          const currentIndex = options.indexOf(current);
          const nextIndex = key.upArrow
            ? Math.max(0, currentIndex - 1)
            : Math.min(options.length - 1, currentIndex + 1);
          const nextOperation = options[nextIndex];
          state.setSyncFormOperation(nextOperation);
          if (nextOperation !== 'unsync') {
            state.setSyncFormUnsyncScope(null);
            state.setSyncFormProjectUnsyncMode(null);
          }
        }
        if (key.return) {
          state.setSyncFormStep('select-skills');
          state.setSyncFormFocusedIndex(0);
        }
        return;
      }

      if (state.syncWorkflowState.step === 'select-skills') {
        if (key.escape) {
          state.setSyncFormStep('select-op');
          return;
        }
        if (key.upArrow) {
          state.setSyncFormFocusedIndex(Math.max(0, state.syncWorkflowState.focusedIndex - 1));
        }
        if (key.downArrow) {
          state.setSyncFormFocusedIndex(
            Math.min(state.skills.length - 1, state.syncWorkflowState.focusedIndex + 1)
          );
        }
        if (input === ' ') {
          const focused = state.skills[state.syncWorkflowState.focusedIndex];
          if (focused) state.toggleSyncFormSkill(focused.name);
        }
        if (key.return) {
          if (state.syncWorkflowState.selectedSkillNames.size === 0) return;
          state.setSyncFormSelectedTargetIds(new Set());
          state.setSyncFormSelectedAgentTypes(new Set());
          state.setSyncFormFocusedIndex(0);
          if (state.syncWorkflowState.operation === 'unsync') {
            state.setSyncFormUnsyncScope(null);
            state.setSyncFormProjectUnsyncMode(null);
            state.setSyncFormStep('select-unsync-scope');
            void prepareUnsyncDetails(store);
          } else {
            state.setSyncFormStep('select-targets');
          }
        }
        return;
      }

      if (state.syncWorkflowState.step === 'select-unsync-scope') {
        if (key.escape) {
          state.setSyncFormStep('select-skills');
          return;
        }
        if (key.upArrow || key.downArrow) {
          const nextScope = state.syncWorkflowState.focusedIndex === 0 ? 1 : 0;
          state.setSyncFormFocusedIndex(nextScope);
        }
        if (key.return) {
          const scope = state.syncWorkflowState.focusedIndex === 0 ? 'agents' : 'projects';
          state.setSyncFormUnsyncScope(scope);
          state.setSyncFormSelectedTargetIds(new Set());
          state.setSyncFormSelectedAgentTypes(new Set());
          state.setSyncFormProjectUnsyncMode(null);
          state.setSyncFormFocusedIndex(0);
          state.setSyncFormStep('select-targets');
        }
        return;
      }

      if (state.syncWorkflowState.step === 'select-targets') {
        if (key.escape) {
          if (state.syncWorkflowState.operation === 'unsync') {
            state.setSyncFormStep('select-unsync-scope');
          } else {
            state.setSyncFormStep('select-skills');
          }
          return;
        }
        if (state.syncWorkflowState.loadingTargets) {
          return;
        }
        if (key.upArrow) {
          state.setSyncFormFocusedIndex(Math.max(0, state.syncWorkflowState.focusedIndex - 1));
        }
        if (key.downArrow) {
          state.setSyncFormFocusedIndex(
            Math.min(targetList.length - 1, state.syncWorkflowState.focusedIndex + 1)
          );
        }
        if (input === ' ') {
          const focused = targetList[state.syncWorkflowState.focusedIndex];
          if (focused) state.toggleSyncFormTarget(focused.id);
        }
        if (key.return) {
          if (targetList.length > 0 && state.syncWorkflowState.selectedTargetIds.size === 0) return;
          if (targetList.length === 0) {
            const errorMessage =
              state.syncWorkflowState.operation === 'sync-agents'
                ? text.sync.noAgentsConfigured
                : state.syncWorkflowState.operation === 'sync-projects'
                  ? text.sync.noProjectsConfigured
                  : state.syncWorkflowState.unsyncScope === 'projects'
                    ? text.sync.noSyncedProjectsFound
                    : text.sync.noSyncedAgentsFound;
            state.setSyncFormResults([makeEmptyResult(errorMessage, text)]);
            state.setSyncFormStep('results');
            return;
          }

          if (state.syncWorkflowState.operation === 'sync-projects') {
            state.setSyncFormStep('select-agent-types');
            state.setSyncFormSelectedAgentTypes(new Set());
            state.setSyncFormFocusedIndex(0);
            return;
          }

          if (state.syncWorkflowState.operation === 'sync-agents') {
            state.setSyncFormStep('select-mode');
            state.setSyncFormFocusedIndex(0);
            return;
          }

          if (
            state.syncWorkflowState.operation === 'unsync' &&
            state.syncWorkflowState.unsyncScope === 'projects'
          ) {
            state.setSyncFormProjectUnsyncMode('all');
            state.setSyncFormStep('select-unsync-project-mode');
            state.setSyncFormFocusedIndex(0);
            return;
          }

          state.setSyncFormStep('confirm');
        }
        return;
      }

      if (state.syncWorkflowState.step === 'select-unsync-project-mode') {
        if (key.escape) {
          state.setSyncFormStep('select-targets');
          return;
        }
        if (key.upArrow || key.downArrow) {
          state.setSyncFormFocusedIndex(state.syncWorkflowState.focusedIndex === 0 ? 1 : 0);
        }
        if (key.return) {
          const mode = state.syncWorkflowState.focusedIndex === 0 ? 'all' : 'specific';
          state.setSyncFormProjectUnsyncMode(mode);
          state.setSyncFormSelectedAgentTypes(new Set());
          state.setSyncFormFocusedIndex(0);
          state.setSyncFormStep(mode === 'specific' ? 'select-agent-types' : 'confirm');
        }
        return;
      }

      if (state.syncWorkflowState.step === 'select-agent-types') {
        if (key.escape) {
          if (state.syncWorkflowState.operation === 'unsync') {
            state.setSyncFormStep('select-unsync-project-mode');
          } else {
            state.setSyncFormStep('select-targets');
          }
          return;
        }

        const availableTypes =
          state.syncWorkflowState.operation === 'unsync'
            ? buildUnsyncProjectAgentTypes(
                state.syncWorkflowState.selectedSkillNames,
                state.syncWorkflowState.selectedTargetIds,
                state.skillDetails,
                state.agents
              )
            : uniqueAgentTypes(new Set(state.agents.map((agent) => agent.id)), state.agents);

        if (key.upArrow) {
          state.setSyncFormFocusedIndex(Math.max(0, state.syncWorkflowState.focusedIndex - 1));
        }
        if (key.downArrow) {
          state.setSyncFormFocusedIndex(
            Math.min(availableTypes.length - 1, state.syncWorkflowState.focusedIndex + 1)
          );
        }
        if (input === ' ') {
          const focused = availableTypes[state.syncWorkflowState.focusedIndex];
          if (focused) state.toggleSyncFormAgentType(focused.id);
        }
        if (key.return) {
          if (state.syncWorkflowState.selectedAgentTypes.size === 0 && availableTypes.length > 0)
            return;
          if (state.syncWorkflowState.operation === 'unsync') {
            state.setSyncFormStep('confirm');
          } else {
            state.setSyncFormStep('select-mode');
          }
        }
        return;
      }

      if (state.syncWorkflowState.step === 'select-mode') {
        if (key.escape) {
          state.setSyncFormStep(
            state.syncWorkflowState.operation === 'sync-projects'
              ? 'select-agent-types'
              : 'select-targets'
          );
          return;
        }
        if (key.upArrow || key.downArrow) {
          state.setSyncFormMode(state.syncWorkflowState.mode === 'copy' ? 'symlink' : 'copy');
        }
        if (key.return || input === ' ') {
          state.setSyncFormStep('confirm');
        }
        return;
      }

      if (state.syncWorkflowState.step === 'confirm') {
        if (key.return) {
          void executeSync(store);
        }
        if (key.escape) {
          handleSyncBack(store);
        }
        return;
      }

      if (key.escape) {
        handleSyncBack(store);
      }
    },
    {
      isActive:
        activeTab === 'sync' &&
        !showSearch &&
        !showHelp &&
        !confirmState &&
        !formState &&
        !conflictState,
    }
  );

  return (
    <Box flexDirection="row" flexGrow={1} paddingX={spacing.paddingX}>
      <StepIndicator
        steps={syncSteps}
        currentStep={Math.max(0, syncCurrentIndex)}
        width={STEP_INDICATOR_WIDTH}
      />
      <Box flexDirection="column" flexGrow={1} paddingX={spacing.paddingX}>
        {syncFormStep === 'select-op' && (
          <SelectOp operation={syncFormOperation} contentWidth={contentWidth} text={text} />
        )}
        {syncFormStep === 'select-skills' && (
          <SelectSkills
            skills={skills}
            selected={syncFormSelectedSkillNames}
            focusedIndex={syncFormFocusedIndex}
            contentWidth={contentWidth}
            text={text}
          />
        )}
        {syncFormStep === 'select-unsync-scope' && (
          <SelectUnsyncScope
            focusedIndex={syncFormFocusedIndex}
            contentWidth={contentWidth}
            text={text}
          />
        )}
        {syncFormStep === 'select-targets' && (
          <SelectTargets
            operation={syncFormOperation}
            unsyncScope={syncFormUnsyncScope}
            focusedIndex={syncFormFocusedIndex}
            selected={syncFormSelectedTargetIds}
            targets={targetList}
            loading={syncFormLoadingTargets}
            contentWidth={contentWidth}
            text={text}
          />
        )}
        {syncFormStep === 'select-unsync-project-mode' && (
          <SelectUnsyncProjectMode
            focusedIndex={syncFormFocusedIndex}
            mode={syncFormProjectUnsyncMode}
            contentWidth={contentWidth}
            text={text}
          />
        )}
        {syncFormStep === 'select-agent-types' && (
          <SelectAgentTypes
            items={
              syncFormOperation === 'unsync'
                ? unsyncProjectAgentTypes
                : uniqueAgentTypes(new Set(agents.map((agent) => agent.id)), agents)
            }
            selected={syncFormSelectedAgentTypes}
            focusedIndex={syncFormFocusedIndex}
            title={
              syncFormOperation === 'unsync'
                ? text.sync.selectAgentTypesUnsync
                : text.sync.selectAgentTypes
            }
            contentWidth={contentWidth}
            text={text}
          />
        )}
        {syncFormStep === 'select-mode' && (
          <SelectMode mode={syncFormMode} contentWidth={contentWidth} text={text} />
        )}
        {syncFormStep === 'confirm' && (
          <ConfirmStep
            operation={syncFormOperation}
            unsyncScope={syncFormUnsyncScope}
            projectUnsyncMode={syncFormProjectUnsyncMode}
            skillNames={syncFormSelectedSkillNames}
            targetIds={syncFormSelectedTargetIds}
            agentTypes={syncFormSelectedAgentTypes}
            mode={syncFormMode}
            contentWidth={contentWidth}
            text={text}
          />
        )}
        {syncFormStep === 'executing' && (
          <ExecutingStep progressItems={updateProgressItems} text={text} />
        )}
        {syncFormStep === 'results' && (
          <ResultsStep
            operation={syncFormOperation}
            results={syncFormResults}
            contentWidth={contentWidth}
            text={text}
          />
        )}
      </Box>
    </Box>
  );
}

function makeEmptyResult(error: string, text: ReturnType<typeof getTuiText>): OperationResult {
  return { target: text.sync.nothingToDo, success: false, error, outcome: 'error' };
}

function SelectOp({
  operation,
  contentWidth,
  text,
}: {
  operation: SyncOperation | null;
  contentWidth: number;
  text: ReturnType<typeof getTuiText>;
}): React.ReactElement {
  const options: Array<{ value: SyncOperation; label: string }> = [
    { value: 'sync-agents', label: text.sync.options.syncAgents },
    { value: 'sync-projects', label: text.sync.options.syncProjects },
    { value: 'unsync', label: text.sync.options.unsync },
  ];
  const operationIndex = options.findIndex((option) => option.value === operation);

  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>
        {text.sync.screenTitle}
      </Text>
      <Text> </Text>
      <Text>{text.sync.chooseOperation}</Text>
      {options.map((option, index) => (
        <Text key={option.value}>
          {renderFocusPrefix(index === operationIndex)}
          {index === operationIndex ? (
            <Text bold>( {truncateText(option.label, Math.max(contentWidth - 8, 8))} )</Text>
          ) : (
            <Text> {truncateText(option.label, Math.max(contentWidth - 6, 8))} </Text>
          )}
        </Text>
      ))}
      <Text> </Text>
      <Text dimColor>{truncateText(text.common.upDownChooseEnterContinue, contentWidth)}</Text>
    </Box>
  );
}

function SelectSkills({
  skills,
  selected,
  focusedIndex,
  contentWidth,
  text,
}: {
  skills: Array<{ name: string }>;
  selected: Set<string>;
  focusedIndex: number;
  contentWidth: number;
  text: ReturnType<typeof getTuiText>;
}): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>
        {text.sync.selectSkills}
      </Text>
      <Text> </Text>
      {skills.map((skill, index) => {
        const isSelected = selected.has(skill.name);
        const isFocused = index === focusedIndex;
        return (
          <Text key={skill.name}>
            {renderFocusPrefix(isFocused)}
            <Text color={isSelected ? inkColors.success : undefined}>
              {isSelected ? selectionMarkers.selected : selectionMarkers.unselected}
            </Text>{' '}
            {truncateSelectableLabel(skill.name, contentWidth)}
          </Text>
        );
      })}
      {skills.length === 0 && (
        <Text dimColor>{truncateText(text.sync.noSkills, contentWidth)}</Text>
      )}
      <Text> </Text>
      <Text dimColor>
        {truncateText(text.common.upDownNavigateSpaceToggleEnterContinue, contentWidth)}
      </Text>
    </Box>
  );
}

function SelectUnsyncScope({
  focusedIndex,
  contentWidth,
  text,
}: {
  focusedIndex: number;
  contentWidth: number;
  text: ReturnType<typeof getTuiText>;
}): React.ReactElement {
  const options = [text.sync.options.agents, text.sync.options.projects];
  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>
        {text.sync.selectUnsyncScope}
      </Text>
      <Text> </Text>
      {options.map((option, index) => (
        <Text key={option}>
          {renderFocusPrefix(index === focusedIndex)}
          {index === focusedIndex ? (
            <Text bold>( {truncateText(option, Math.max(contentWidth - 8, 8))} )</Text>
          ) : (
            <Text> {truncateText(option, Math.max(contentWidth - 6, 8))} </Text>
          )}
        </Text>
      ))}
      <Text> </Text>
      <Text dimColor>{truncateText(text.common.upDownChooseEnterContinue, contentWidth)}</Text>
    </Box>
  );
}

function SelectTargets({
  operation,
  unsyncScope,
  focusedIndex,
  selected,
  targets,
  loading,
  contentWidth,
  text,
}: {
  operation: SyncOperation | null;
  unsyncScope: 'agents' | 'projects' | null;
  focusedIndex: number;
  selected: Set<string>;
  targets: TargetItem[];
  loading: boolean;
  contentWidth: number;
  text: ReturnType<typeof getTuiText>;
}): React.ReactElement {
  const title =
    operation === 'sync-agents'
      ? text.sync.selectAgents
      : operation === 'sync-projects'
        ? text.sync.selectProjects
        : unsyncScope === 'projects'
          ? text.sync.selectProjectsUnsync
          : text.sync.selectAgentsUnsync;

  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>
        {title}
      </Text>
      <Text> </Text>
      {loading ? (
        <Text dimColor>{text.sync.loadingRelationships}</Text>
      ) : (
        targets.map((target, index) => {
          const isSelected = selected.has(target.id);
          const isFocused = index === focusedIndex;
          return (
            <Text key={target.id}>
              {renderFocusPrefix(isFocused)}
              <Text color={isSelected ? inkColors.success : undefined}>
                {isSelected ? selectionMarkers.selected : selectionMarkers.unselected}
              </Text>{' '}
              {truncateSelectableLabel(target.label, contentWidth)}
            </Text>
          );
        })
      )}
      {!loading && targets.length === 0 && (
        <Text dimColor>{truncateText(text.sync.noTargets, contentWidth)}</Text>
      )}
      <Text> </Text>
      <Text dimColor>{truncateText(text.sync.targetsSelected(selected.size), contentWidth)}</Text>
      <Text dimColor>
        {truncateText(
          loading ? text.common.pleaseWait : text.common.upDownNavigateSpaceToggleEnterContinue,
          contentWidth
        )}
      </Text>
    </Box>
  );
}

function SelectUnsyncProjectMode({
  focusedIndex,
  mode,
  contentWidth,
  text,
}: {
  focusedIndex: number;
  mode: 'all' | 'specific' | null;
  contentWidth: number;
  text: ReturnType<typeof getTuiText>;
}): React.ReactElement {
  const options: Array<{ id: 'all' | 'specific'; label: string }> = [
    { id: 'all', label: text.sync.options.allAgentTypes },
    { id: 'specific', label: text.sync.options.specificAgentTypes },
  ];
  const activeIndex =
    typeof mode === 'string' ? options.findIndex((option) => option.id === mode) : focusedIndex;

  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>
        {text.sync.chooseProjectUnsync}
      </Text>
      <Text> </Text>
      {options.map((option, index) => (
        <Text key={option.id}>
          {renderFocusPrefix(index === activeIndex)}
          {index === activeIndex ? (
            <Text bold>( {truncateText(option.label, Math.max(contentWidth - 8, 8))} )</Text>
          ) : (
            <Text> {truncateText(option.label, Math.max(contentWidth - 6, 8))} </Text>
          )}
        </Text>
      ))}
      <Text> </Text>
      <Text dimColor>{truncateText(text.common.upDownChooseEnterContinue, contentWidth)}</Text>
    </Box>
  );
}

function SelectAgentTypes({
  items,
  selected,
  focusedIndex,
  title,
  contentWidth,
  text,
}: {
  items: AgentTypeItem[];
  selected: Set<string>;
  focusedIndex: number;
  title: string;
  contentWidth: number;
  text: ReturnType<typeof getTuiText>;
}): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>
        {truncateText(title, contentWidth)}
      </Text>
      <Text> </Text>
      {items.map((item, index) => {
        const isSelected = selected.has(item.id);
        const isFocused = index === focusedIndex;
        return (
          <Text key={item.id}>
            {renderFocusPrefix(isFocused)}
            <Text color={isSelected ? inkColors.success : undefined}>
              {isSelected ? selectionMarkers.selected : selectionMarkers.unselected}
            </Text>{' '}
            {truncateSelectableLabel(item.label, contentWidth)}
          </Text>
        );
      })}
      {items.length === 0 && (
        <Text dimColor>{truncateText(text.sync.noAgentTypes, contentWidth)}</Text>
      )}
      <Text> </Text>
      <Text dimColor>
        {truncateText(text.common.upDownNavigateSpaceToggleEnterContinue, contentWidth)}
      </Text>
    </Box>
  );
}

function SelectMode({
  mode,
  contentWidth,
  text,
}: {
  mode: SyncMode;
  contentWidth: number;
  text: ReturnType<typeof getTuiText>;
}): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>
        {text.sync.modeTitle}
      </Text>
      <Text> </Text>
      <Text>
        {renderFocusPrefix(mode === 'copy')}
        {truncateText(text.sync.options.copy, Math.max(contentWidth - 2, 8))}
      </Text>
      <Text>
        {renderFocusPrefix(mode === 'symlink')}
        {truncateText(text.sync.options.symlink, Math.max(contentWidth - 2, 8))}
      </Text>
      <Text> </Text>
      <Text dimColor>{truncateText(text.common.upDownChooseEnterContinue, contentWidth)}</Text>
    </Box>
  );
}

function ConfirmStep({
  operation,
  unsyncScope,
  projectUnsyncMode,
  skillNames,
  targetIds,
  agentTypes,
  mode,
  contentWidth,
  text,
}: {
  operation: SyncOperation | null;
  unsyncScope: 'agents' | 'projects' | null;
  projectUnsyncMode: 'all' | 'specific' | null;
  skillNames: Set<string>;
  targetIds: Set<string>;
  agentTypes: Set<string>;
  mode: SyncMode;
  contentWidth: number;
  text: ReturnType<typeof getTuiText>;
}): React.ReactElement {
  let description = text.sync.summarySync(skillNames.size, targetIds.size, mode);
  if (operation === 'unsync' && unsyncScope === 'agents') {
    description = text.sync.summaryUnsyncAgents(skillNames.size, targetIds.size);
  }
  if (operation === 'unsync' && unsyncScope === 'projects') {
    description =
      projectUnsyncMode === 'specific'
        ? text.sync.summaryUnsyncProjectsSpecific(skillNames.size, targetIds.size, agentTypes.size)
        : text.sync.summaryUnsyncProjectsAll(skillNames.size, targetIds.size);
  }

  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>
        {operation === 'unsync' ? text.sync.confirmUnsync : text.sync.confirmSync}
      </Text>
      <Text> </Text>
      <Text>{truncateText(description, contentWidth)}</Text>
      <Text> </Text>
      <Text dimColor>
        {truncateText(
          `${text.sync.skills}: ${truncateSummaryList([...skillNames], contentWidth, text)}`,
          contentWidth
        )}
      </Text>
      <Text dimColor>
        {truncateText(
          `${text.sync.targets}: ${truncateSummaryList([...targetIds], contentWidth, text)}`,
          contentWidth
        )}
      </Text>
      {agentTypes.size > 0 && (
        <Text dimColor>
          {truncateText(
            `${text.sync.agentTypes}: ${truncateSummaryList([...agentTypes], contentWidth, text)}`,
            contentWidth
          )}
        </Text>
      )}
      <Text> </Text>
      <Box flexDirection="row" gap={2}>
        <Text color={inkColors.accent}>[Enter]</Text>
        <Text>{operation === 'unsync' ? text.status.labels.unsync : text.status.labels.sync}</Text>
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
  const totalItems = progressItems.length;
  const completedItems = progressItems.filter((item) => item.status === 'success').length;
  const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const anyRunning = progressItems.some(
    (item) => item.status === 'running' || item.status === 'pending'
  );
  const anyError = progressItems.some((item) => item.status === 'error');
  const overallStatus = anyError ? 'error' : anyRunning ? 'running' : 'success';

  return (
    <Box flexDirection="column">
      <ProgressBar
        label={text.sync.overall}
        progress={overallProgress}
        status={overallStatus}
        completed={completedItems}
        total={totalItems}
      />
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
  operation,
  results,
  contentWidth,
  text,
}: {
  operation: SyncOperation | null;
  results: OperationResult[];
  contentWidth: number;
  text: ReturnType<typeof getTuiText>;
}): React.ReactElement {
  const successes = results.filter((result) => getOutcome(result) === 'success');
  const skipped = results.filter((result) => getOutcome(result) === 'skipped');
  const failures = results.filter((result) => getOutcome(result) === 'error');
  const title = operation === 'unsync' ? text.sync.completeUnsync : text.sync.completeSync;

  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>
        {title}
      </Text>
      <Text> </Text>
      <Text>
        <Text bold color={inkColors.success}>
          {successes.length}
        </Text>{' '}
        {text.sync.succeeded}
        <Text color={inkColors.muted}> | </Text>
        <Text bold color={inkColors.muted}>
          {skipped.length}
        </Text>{' '}
        {text.common.skipped}
        <Text color={inkColors.muted}> | </Text>
        <Text bold color={failures.length > 0 ? inkColors.error : inkColors.muted}>
          {failures.length}
        </Text>{' '}
        {text.sync.failed}
      </Text>
      {(skipped.length > 0 || failures.length > 0) && <Text> </Text>}
      {skipped.map((result, index) => (
        <Text key={`skip-${index}`} color={inkColors.muted}>
          {truncateText(
            `- ${result.target}${result.error ? `: ${result.error}` : ''}`,
            contentWidth
          )}
        </Text>
      ))}
      {failures.map((result, index) => (
        <Text key={`fail-${index}`} color={inkColors.error}>
          {truncateText(
            `x ${result.target}${result.error ? `: ${result.error}` : ''}`,
            contentWidth
          )}
        </Text>
      ))}
      <Text> </Text>
      <Box flexDirection="row" gap={2}>
        <Text color={inkColors.accent}>[Enter]</Text>
        <Text>{text.common.newFlow}</Text>
        <Text dimColor>[Esc] {text.common.close}</Text>
      </Box>
    </Box>
  );
}
