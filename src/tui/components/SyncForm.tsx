/**
 * Multi-step form for sync and unsync workflows. Renders inside SyncScreen.
 *
 * State is driven entirely by the store's syncFormStep field.
 * Navigation is via local useInput (isActive gated to sync tab + no overlays).
 */

import { Box, Text, useInput } from 'ink';
import React from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type { SyncMode } from '../../types.js';
import type { SkillDetailData } from '../store/dataSlice.js';
import type { AppStore } from '../store/index.js';
import type { OperationResult, SyncOperation } from '../store/uiSlice.js';
import { inkColors, renderFocusPrefix, selectionMarkers, spacing } from '../theme.js';

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

function buildUnsyncProjectAgentTypes(
  selectedSkillNames: Set<string>,
  selectedProjectIds: Set<string>,
  skillDetails: Record<string, SkillDetailData | undefined>,
  agents: Array<{ id: string; name: string }>
): AgentTypeItem[] {
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
  projectMode: 'all' | 'specific' | null
): string[] {
  switch (operation) {
    case 'sync-agents':
      return ['Select Operation', 'Select Skills', 'Select Targets', 'Select Mode', 'Confirm', 'Executing', 'Results'];
    case 'sync-projects':
      return ['Select Operation', 'Select Skills', 'Select Targets', 'Select Agent Types', 'Select Mode', 'Confirm', 'Executing', 'Results'];
    case 'unsync':
      if (unsyncScope === 'projects' && projectMode === 'specific') {
        return ['Select Operation', 'Select Skills', 'Select Scope', 'Select Targets', 'Select Unsync Mode', 'Select Agent Types', 'Confirm', 'Executing', 'Results'];
      }
      if (unsyncScope === 'projects') {
        return ['Select Operation', 'Select Skills', 'Select Scope', 'Select Targets', 'Select Unsync Mode', 'Confirm', 'Executing', 'Results'];
      }
      return ['Select Operation', 'Select Skills', 'Select Scope', 'Select Targets', 'Confirm', 'Executing', 'Results'];
    default:
      return ['Select Operation'];
  }
}

function stepToLabel(step: string): string {
  switch (step) {
    case 'select-op':
      return 'Select Operation';
    case 'select-skills':
      return 'Select Skills';
    case 'select-unsync-scope':
      return 'Select Scope';
    case 'select-targets':
      return 'Select Targets';
    case 'select-unsync-project-mode':
      return 'Select Unsync Mode';
    case 'select-agent-types':
      return 'Select Agent Types';
    case 'select-mode':
      return 'Select Mode';
    case 'confirm':
      return 'Confirm';
    case 'executing':
      return 'Executing';
    case 'results':
      return 'Results';
    default:
      return step;
  }
}

async function prepareUnsyncDetails(storeApi: StoreApi<AppStore>): Promise<void> {
  const state = storeApi.getState();
  state.setSyncFormLoadingTargets(true);
  try {
    await Promise.all(
      [...state.syncFormSelectedSkillNames].map((skillName) => {
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
  const skillNames = [...state.syncFormSelectedSkillNames];
  const targetIds = [...state.syncFormSelectedTargetIds];

  if (state.syncFormOperation === 'sync-agents') {
    await storeApi.getState().syncSkillsToAgents(skillNames, targetIds, state.syncFormMode as SyncMode);
    return;
  }

  if (state.syncFormOperation === 'sync-projects') {
    const agentTypes =
      state.syncFormSelectedAgentTypes.size > 0
        ? [...state.syncFormSelectedAgentTypes]
        : state.agents.map((agent) => agent.id);
    await storeApi
      .getState()
      .syncSkillsToProjects(skillNames, targetIds, agentTypes, state.syncFormMode as SyncMode);
    return;
  }

  if (state.syncFormOperation === 'unsync' && state.syncFormUnsyncScope === 'agents') {
    await storeApi.getState().unsyncFromAgents(skillNames, targetIds);
    return;
  }

  if (state.syncFormOperation === 'unsync' && state.syncFormUnsyncScope === 'projects') {
    await storeApi.getState().unsyncFromProjects(skillNames, targetIds, {
      mode: state.syncFormProjectUnsyncMode || 'all',
      agentTypes:
        state.syncFormProjectUnsyncMode === 'specific'
          ? [...state.syncFormSelectedAgentTypes]
          : undefined,
    });
  }
}

function handleSyncBack(storeApi: StoreApi<AppStore>): void {
  const state = storeApi.getState();
  switch (state.syncFormStep) {
    case 'select-targets':
      if (state.syncFormOperation === 'unsync') {
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
      if (state.syncFormOperation === 'unsync') {
        state.setSyncFormStep('select-unsync-project-mode');
      } else {
        state.setSyncFormStep('select-targets');
      }
      break;
    case 'select-mode':
      if (state.syncFormOperation === 'sync-projects') {
        state.setSyncFormStep('select-agent-types');
      } else {
        state.setSyncFormStep('select-targets');
      }
      break;
    case 'confirm':
      if (state.syncFormOperation === 'sync-projects' || state.syncFormOperation === 'sync-agents') {
        state.setSyncFormStep('select-mode');
      } else if (state.syncFormOperation === 'unsync' && state.syncFormUnsyncScope === 'projects') {
        if (state.syncFormProjectUnsyncMode === 'specific') {
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
  const syncFormStep = useStore(store, (s) => s.syncFormStep);
  const syncFormOperation = useStore(store, (s) => s.syncFormOperation);
  const syncFormSelectedSkillNames = useStore(store, (s) => s.syncFormSelectedSkillNames);
  const syncFormUnsyncScope = useStore(store, (s) => s.syncFormUnsyncScope);
  const syncFormSelectedTargetIds = useStore(store, (s) => s.syncFormSelectedTargetIds);
  const syncFormProjectUnsyncMode = useStore(store, (s) => s.syncFormProjectUnsyncMode);
  const syncFormSelectedAgentTypes = useStore(store, (s) => s.syncFormSelectedAgentTypes);
  const syncFormLoadingTargets = useStore(store, (s) => s.syncFormLoadingTargets);
  const syncFormMode = useStore(store, (s) => s.syncFormMode);
  const syncFormResults = useStore(store, (s) => s.syncFormResults);
  const syncFormFocusedIndex = useStore(store, (s) => s.syncFormFocusedIndex);
  const skills = useStore(store, (s) => s.skills);
  const skillDetails = useStore(store, (s) => s.skillDetails);
  const agents = useStore(store, (s) => s.agents);
  const projects = useStore(store, (s) => s.projects);
  const activeTab = useStore(store, (s) => s.activeTab);
  const showSearch = useStore(store, (s) => s.showSearch);
  const showHelp = useStore(store, (s) => s.showHelp);
  const confirmState = useStore(store, (s) => s.confirmState);
  const formState = useStore(store, (s) => s.formState);
  const conflictState = useStore(store, (s) => s.conflictState);
  const updateProgressItems = useStore(store, (s) => s.updateProgressItems);

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
  const syncSteps = getSyncSteps(syncFormOperation, syncFormUnsyncScope, syncFormProjectUnsyncMode);
  const syncCurrentIndex = syncSteps.indexOf(stepToLabel(syncFormStep));

  useInput(
    (input, key) => {
      const state = store.getState();

      if (state.syncFormStep === 'results' || state.syncFormStep === 'executing') {
        if (key.return || key.escape) {
          state.resetSyncForm();
        }
        return;
      }

      if (state.syncFormStep === 'select-op') {
        if (key.escape) {
          state.resetSyncForm();
          return;
        }
        if (key.upArrow || key.downArrow) {
          const options: SyncOperation[] = ['sync-agents', 'sync-projects', 'unsync'];
          const current = state.syncFormOperation || 'sync-agents';
          const currentIndex = options.indexOf(current);
          const nextIndex = key.upArrow ? Math.max(0, currentIndex - 1) : Math.min(options.length - 1, currentIndex + 1);
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

      if (state.syncFormStep === 'select-skills') {
        if (key.escape) {
          state.setSyncFormStep('select-op');
          return;
        }
        if (key.upArrow) {
          state.setSyncFormFocusedIndex(Math.max(0, state.syncFormFocusedIndex - 1));
        }
        if (key.downArrow) {
          state.setSyncFormFocusedIndex(Math.min(state.skills.length - 1, state.syncFormFocusedIndex + 1));
        }
        if (input === ' ') {
          const focused = state.skills[state.syncFormFocusedIndex];
          if (focused) state.toggleSyncFormSkill(focused.name);
        }
        if (key.return) {
          if (state.syncFormSelectedSkillNames.size === 0) return;
          state.setSyncFormSelectedTargetIds(new Set());
          state.setSyncFormSelectedAgentTypes(new Set());
          state.setSyncFormFocusedIndex(0);
          if (state.syncFormOperation === 'unsync') {
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

      if (state.syncFormStep === 'select-unsync-scope') {
        if (key.escape) {
          state.setSyncFormStep('select-skills');
          return;
        }
        if (key.upArrow || key.downArrow) {
          const nextScope = state.syncFormFocusedIndex === 0 ? 1 : 0;
          state.setSyncFormFocusedIndex(nextScope);
        }
        if (key.return) {
          const scope = state.syncFormFocusedIndex === 0 ? 'agents' : 'projects';
          state.setSyncFormUnsyncScope(scope);
          state.setSyncFormSelectedTargetIds(new Set());
          state.setSyncFormSelectedAgentTypes(new Set());
          state.setSyncFormProjectUnsyncMode(null);
          state.setSyncFormFocusedIndex(0);
          state.setSyncFormStep('select-targets');
        }
        return;
      }

      if (state.syncFormStep === 'select-targets') {
        if (key.escape) {
          if (state.syncFormOperation === 'unsync') {
            state.setSyncFormStep('select-unsync-scope');
          } else {
            state.setSyncFormStep('select-skills');
          }
          return;
        }
        if (state.syncFormLoadingTargets) {
          return;
        }
        if (key.upArrow) {
          state.setSyncFormFocusedIndex(Math.max(0, state.syncFormFocusedIndex - 1));
        }
        if (key.downArrow) {
          state.setSyncFormFocusedIndex(Math.min(targetList.length - 1, state.syncFormFocusedIndex + 1));
        }
        if (input === ' ') {
          const focused = targetList[state.syncFormFocusedIndex];
          if (focused) state.toggleSyncFormTarget(focused.id);
        }
        if (key.return) {
          if (targetList.length > 0 && state.syncFormSelectedTargetIds.size === 0) return;
          if (targetList.length === 0) {
            const errorMessage =
              state.syncFormOperation === 'sync-agents'
                ? 'No agents configured'
                : state.syncFormOperation === 'sync-projects'
                  ? 'No projects configured'
                  : state.syncFormUnsyncScope === 'projects'
                    ? 'No synced projects found'
                    : 'No synced agents found';
            state.setSyncFormResults([makeEmptyResult(errorMessage)]);
            state.setSyncFormStep('results');
            return;
          }

          if (state.syncFormOperation === 'sync-projects') {
            state.setSyncFormStep('select-agent-types');
            state.setSyncFormSelectedAgentTypes(new Set());
            state.setSyncFormFocusedIndex(0);
            return;
          }

          if (state.syncFormOperation === 'sync-agents') {
            state.setSyncFormStep('select-mode');
            state.setSyncFormFocusedIndex(0);
            return;
          }

          if (state.syncFormOperation === 'unsync' && state.syncFormUnsyncScope === 'projects') {
            state.setSyncFormProjectUnsyncMode('all');
            state.setSyncFormStep('select-unsync-project-mode');
            state.setSyncFormFocusedIndex(0);
            return;
          }

          state.setSyncFormStep('confirm');
        }
        return;
      }

      if (state.syncFormStep === 'select-unsync-project-mode') {
        if (key.escape) {
          state.setSyncFormStep('select-targets');
          return;
        }
        if (key.upArrow || key.downArrow) {
          state.setSyncFormFocusedIndex(state.syncFormFocusedIndex === 0 ? 1 : 0);
        }
        if (key.return) {
          const mode = state.syncFormFocusedIndex === 0 ? 'all' : 'specific';
          state.setSyncFormProjectUnsyncMode(mode);
          state.setSyncFormSelectedAgentTypes(new Set());
          state.setSyncFormFocusedIndex(0);
          state.setSyncFormStep(mode === 'specific' ? 'select-agent-types' : 'confirm');
        }
        return;
      }

      if (state.syncFormStep === 'select-agent-types') {
        if (key.escape) {
          if (state.syncFormOperation === 'unsync') {
            state.setSyncFormStep('select-unsync-project-mode');
          } else {
            state.setSyncFormStep('select-targets');
          }
          return;
        }

        const availableTypes =
          state.syncFormOperation === 'unsync'
            ? buildUnsyncProjectAgentTypes(
                state.syncFormSelectedSkillNames,
                state.syncFormSelectedTargetIds,
                state.skillDetails,
                state.agents
              )
            : uniqueAgentTypes(new Set(state.agents.map((agent) => agent.id)), state.agents);

        if (key.upArrow) {
          state.setSyncFormFocusedIndex(Math.max(0, state.syncFormFocusedIndex - 1));
        }
        if (key.downArrow) {
          state.setSyncFormFocusedIndex(Math.min(availableTypes.length - 1, state.syncFormFocusedIndex + 1));
        }
        if (input === ' ') {
          const focused = availableTypes[state.syncFormFocusedIndex];
          if (focused) state.toggleSyncFormAgentType(focused.id);
        }
        if (key.return) {
          if (state.syncFormSelectedAgentTypes.size === 0 && availableTypes.length > 0) return;
          if (state.syncFormOperation === 'unsync') {
            state.setSyncFormStep('confirm');
          } else {
            state.setSyncFormStep('select-mode');
          }
        }
        return;
      }

      if (state.syncFormStep === 'select-mode') {
        if (key.escape) {
          state.setSyncFormStep(
            state.syncFormOperation === 'sync-projects' ? 'select-agent-types' : 'select-targets'
          );
          return;
        }
        if (key.upArrow || key.downArrow) {
          state.setSyncFormMode(state.syncFormMode === 'copy' ? 'symlink' : 'copy');
        }
        if (key.return || input === ' ') {
          state.setSyncFormStep('confirm');
        }
        return;
      }

      if (state.syncFormStep === 'confirm') {
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
      <StepIndicator steps={syncSteps} currentStep={Math.max(0, syncCurrentIndex)} width={22} />
      <Box flexDirection="column" flexGrow={1} paddingX={spacing.paddingX}>
        {syncFormStep === 'select-op' && <SelectOp operation={syncFormOperation} />}
        {syncFormStep === 'select-skills' && (
          <SelectSkills skills={skills} selected={syncFormSelectedSkillNames} focusedIndex={syncFormFocusedIndex} />
        )}
        {syncFormStep === 'select-unsync-scope' && <SelectUnsyncScope focusedIndex={syncFormFocusedIndex} />}
        {syncFormStep === 'select-targets' && (
          <SelectTargets
            operation={syncFormOperation}
            unsyncScope={syncFormUnsyncScope}
            focusedIndex={syncFormFocusedIndex}
            selected={syncFormSelectedTargetIds}
            targets={targetList}
            loading={syncFormLoadingTargets}
          />
        )}
        {syncFormStep === 'select-unsync-project-mode' && (
          <SelectUnsyncProjectMode focusedIndex={syncFormFocusedIndex} mode={syncFormProjectUnsyncMode} />
        )}
        {syncFormStep === 'select-agent-types' && (
          <SelectAgentTypes
            items={syncFormOperation === 'unsync' ? unsyncProjectAgentTypes : uniqueAgentTypes(new Set(agents.map((agent) => agent.id)), agents)}
            selected={syncFormSelectedAgentTypes}
            focusedIndex={syncFormFocusedIndex}
            title={
              syncFormOperation === 'unsync'
                ? 'Select agent types to unsync from selected projects'
                : 'Select agent types'
            }
          />
        )}
        {syncFormStep === 'select-mode' && <SelectMode mode={syncFormMode} />}
        {syncFormStep === 'confirm' && (
          <ConfirmStep
            operation={syncFormOperation}
            unsyncScope={syncFormUnsyncScope}
            projectUnsyncMode={syncFormProjectUnsyncMode}
            skillNames={syncFormSelectedSkillNames}
            targetIds={syncFormSelectedTargetIds}
            agentTypes={syncFormSelectedAgentTypes}
            mode={syncFormMode}
          />
        )}
        {syncFormStep === 'executing' && <ExecutingStep progressItems={updateProgressItems} />}
        {syncFormStep === 'results' && <ResultsStep operation={syncFormOperation} results={syncFormResults} />}
      </Box>
    </Box>
  );
}

function makeEmptyResult(error: string): OperationResult {
  return { target: 'Nothing to do', success: false, error, outcome: 'error' };
}

function SelectOp({ operation }: { operation: SyncOperation | null }): React.ReactElement {
  const options: Array<{ value: SyncOperation; label: string }> = [
    { value: 'sync-agents', label: 'Sync to Agents' },
    { value: 'sync-projects', label: 'Sync to Projects' },
    { value: 'unsync', label: 'Unsync' },
  ];
  const operationIndex = options.findIndex((option) => option.value === operation);

  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>Sync Skills</Text>
      <Text> </Text>
      <Text>Choose operation:</Text>
      {options.map((option, index) => (
        <Text key={option.value}>
          {renderFocusPrefix(index === operationIndex)}
          {index === operationIndex ? <Text bold>( {option.label} )</Text> : <Text> {option.label} </Text>}
        </Text>
      ))}
      <Text> </Text>
      <Text dimColor>Up/Down to choose, Enter to continue</Text>
    </Box>
  );
}

function SelectSkills({
  skills,
  selected,
  focusedIndex,
}: {
  skills: Array<{ name: string }>;
  selected: Set<string>;
  focusedIndex: number;
}): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>Select skills</Text>
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
            {skill.name}
          </Text>
        );
      })}
      {skills.length === 0 && <Text dimColor>No skills installed. Use the Skills tab to add skills.</Text>}
      <Text> </Text>
      <Text dimColor>Up/Down to navigate, Space to toggle, Enter to continue</Text>
    </Box>
  );
}

function SelectUnsyncScope({ focusedIndex }: { focusedIndex: number }): React.ReactElement {
  const options = ['Agents', 'Projects'];
  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>Select unsync scope</Text>
      <Text> </Text>
      {options.map((option, index) => (
        <Text key={option}>
          {renderFocusPrefix(index === focusedIndex)}
          {index === focusedIndex ? <Text bold>( {option} )</Text> : <Text> {option} </Text>}
        </Text>
      ))}
      <Text> </Text>
      <Text dimColor>Up/Down to choose, Enter to continue</Text>
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
}: {
  operation: SyncOperation | null;
  unsyncScope: 'agents' | 'projects' | null;
  focusedIndex: number;
  selected: Set<string>;
  targets: TargetItem[];
  loading: boolean;
}): React.ReactElement {
  const title =
    operation === 'sync-agents'
      ? 'Select agents'
      : operation === 'sync-projects'
        ? 'Select projects'
        : unsyncScope === 'projects'
          ? 'Select projects to unsync from'
          : 'Select agents to unsync from';

  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>{title}</Text>
      <Text> </Text>
      {loading ? (
        <Text dimColor>Loading sync relationships...</Text>
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
              {target.label}
            </Text>
          );
        })
      )}
      {!loading && targets.length === 0 && <Text dimColor>No matching targets found for the selected skills.</Text>}
      <Text> </Text>
      <Text dimColor>{selected.size} target(s) selected</Text>
      <Text dimColor>{loading ? 'Please wait...' : 'Up/Down to navigate, Space to toggle, Enter to continue'}</Text>
    </Box>
  );
}

function SelectUnsyncProjectMode({
  focusedIndex,
  mode,
}: {
  focusedIndex: number;
  mode: 'all' | 'specific' | null;
}): React.ReactElement {
  const options: Array<{ id: 'all' | 'specific'; label: string }> = [
    { id: 'all', label: 'All agent types' },
    { id: 'specific', label: 'Specific agent types' },
  ];
  const activeIndex =
    typeof mode === 'string' ? options.findIndex((option) => option.id === mode) : focusedIndex;

  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>Choose how to unsync from projects</Text>
      <Text> </Text>
      {options.map((option, index) => (
        <Text key={option.id}>
          {renderFocusPrefix(index === activeIndex)}
          {index === activeIndex ? <Text bold>( {option.label} )</Text> : <Text> {option.label} </Text>}
        </Text>
      ))}
      <Text> </Text>
      <Text dimColor>Up/Down to choose, Enter to continue</Text>
    </Box>
  );
}

function SelectAgentTypes({
  items,
  selected,
  focusedIndex,
  title,
}: {
  items: AgentTypeItem[];
  selected: Set<string>;
  focusedIndex: number;
  title: string;
}): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>{title}</Text>
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
            {item.label}
          </Text>
        );
      })}
      {items.length === 0 && <Text dimColor>No agent types are available for the selected projects.</Text>}
      <Text> </Text>
      <Text dimColor>Up/Down to navigate, Space to toggle, Enter to continue</Text>
    </Box>
  );
}

function SelectMode({ mode }: { mode: SyncMode }): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>Sync mode</Text>
      <Text> </Text>
      <Text>{renderFocusPrefix(mode === 'copy')}Copy - Independent copy, stable and reliable</Text>
      <Text>{renderFocusPrefix(mode === 'symlink')}Symlink - Link to source, updates automatically</Text>
      <Text> </Text>
      <Text dimColor>Up/Down to choose, Enter to continue</Text>
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
}: {
  operation: SyncOperation | null;
  unsyncScope: 'agents' | 'projects' | null;
  projectUnsyncMode: 'all' | 'specific' | null;
  skillNames: Set<string>;
  targetIds: Set<string>;
  agentTypes: Set<string>;
  mode: SyncMode;
}): React.ReactElement {
  let description = `Sync ${skillNames.size} skill(s) to ${targetIds.size} target(s) using ${mode} mode.`;
  if (operation === 'unsync' && unsyncScope === 'agents') {
    description = `Unsync ${skillNames.size} skill(s) from ${targetIds.size} agent target(s).`;
  }
  if (operation === 'unsync' && unsyncScope === 'projects') {
    description =
      projectUnsyncMode === 'specific'
        ? `Unsync ${skillNames.size} skill(s) from ${targetIds.size} project(s) for ${agentTypes.size} selected agent type(s).`
        : `Unsync ${skillNames.size} skill(s) from ${targetIds.size} project(s) across all discovered agent types.`;
  }

  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>
        {operation === 'unsync' ? 'Confirm Unsync' : 'Confirm Sync'}
      </Text>
      <Text> </Text>
      <Text>{description}</Text>
      <Text> </Text>
      <Text dimColor>Skills: {[...skillNames].join(', ')}</Text>
      <Text dimColor>Targets: {[...targetIds].join(', ')}</Text>
      {agentTypes.size > 0 && <Text dimColor>Agent types: {[...agentTypes].join(', ')}</Text>}
      <Text> </Text>
      <Box flexDirection="row" gap={2}>
        <Text color={inkColors.accent}>[Enter]</Text>
        <Text>{operation === 'unsync' ? 'Unsync' : 'Sync'}</Text>
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
  const totalItems = progressItems.length;
  const completedItems = progressItems.filter((item) => item.status === 'success').length;
  const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const anyRunning = progressItems.some((item) => item.status === 'running' || item.status === 'pending');
  const anyError = progressItems.some((item) => item.status === 'error');
  const overallStatus = anyError ? 'error' : anyRunning ? 'running' : 'success';

  return (
    <Box flexDirection="column">
      <ProgressBar
        label="Overall"
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
}: {
  operation: SyncOperation | null;
  results: OperationResult[];
}): React.ReactElement {
  const successes = results.filter((result) => getOutcome(result) === 'success');
  const skipped = results.filter((result) => getOutcome(result) === 'skipped');
  const failures = results.filter((result) => getOutcome(result) === 'error');
  const title = operation === 'unsync' ? 'Unsync complete' : 'Sync complete';

  return (
    <Box flexDirection="column">
      <Text bold color={inkColors.accent}>{title}</Text>
      <Text> </Text>
      <Text>
        <Text bold color={inkColors.success}>{successes.length}</Text> succeeded
        <Text color={inkColors.muted}> | </Text>
        <Text bold color={inkColors.muted}>{skipped.length}</Text> skipped
        <Text color={inkColors.muted}> | </Text>
        <Text bold color={failures.length > 0 ? inkColors.error : inkColors.muted}>{failures.length}</Text> failed
      </Text>
      {(skipped.length > 0 || failures.length > 0) && <Text> </Text>}
      {skipped.map((result, index) => (
        <Box key={`skip-${index}`} flexDirection="row" flexWrap="wrap">
          <Text color={inkColors.muted}>- </Text>
          <Text>{result.target}</Text>
          {result.error && <Text color={inkColors.muted}>: {result.error}</Text>}
        </Box>
      ))}
      {failures.map((result, index) => (
        <Box key={`fail-${index}`} flexDirection="row" flexWrap="wrap">
          <Text color={inkColors.error}>x </Text>
          <Text>{result.target}</Text>
          {result.error && <Text color={inkColors.error}>: {result.error}</Text>}
        </Box>
      ))}
      <Text> </Text>
      <Box flexDirection="row" gap={2}>
        <Text color={inkColors.accent}>[Enter]</Text>
        <Text>New flow</Text>
        <Text dimColor>[Esc] Close</Text>
      </Box>
    </Box>
  );
}
