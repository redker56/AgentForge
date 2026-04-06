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
import type { AppStore } from '../store/index.js';
import type { SyncOperation } from '../store/uiSlice.js';

import { ProgressBar } from './ProgressBar.js';
import { StepIndicator } from './StepIndicator.js';

interface SyncFormProps {
  store: StoreApi<AppStore>;
}

export function SyncForm({ store }: SyncFormProps): React.ReactElement {
  /**
   * Step label mapping for each sync operation.
   */
  function getSyncSteps(op: SyncOperation | null): string[] {
    switch (op) {
      case 'sync-agents':
        return ['Select Operation', 'Select Skills', 'Select Targets', 'Confirm', 'Executing', 'Results'];
      case 'sync-projects':
        return ['Select Operation', 'Select Skills', 'Select Targets', 'Select Agent Types', 'Select Mode', 'Confirm', 'Executing', 'Results'];
      case 'unsync':
        return ['Select Operation', 'Select Skills', 'Select Targets', 'Confirm', 'Executing', 'Results'];
      default:
        return ['Select Operation'];
    }
  }

  function stepToLabel(step: string): string {
    switch (step) {
      case 'select-op': return 'Select Operation';
      case 'select-skills': return 'Select Skills';
      case 'select-targets': return 'Select Targets';
      case 'select-agent-types': return 'Select Agent Types';
      case 'select-mode': return 'Select Mode';
      case 'confirm': return 'Confirm';
      case 'executing': return 'Executing';
      case 'results': return 'Results';
      default: return step;
    }
  }

  const syncFormStep = useStore(store, (s) => s.syncFormStep);
  const syncFormOperation = useStore(store, (s) => s.syncFormOperation);
  const syncFormSelectedSkillNames = useStore(store, (s) => s.syncFormSelectedSkillNames);
  const syncFormSelectedTargetIds = useStore(store, (s) => s.syncFormSelectedTargetIds);
  const syncFormSelectedAgentTypes = useStore(store, (s) => s.syncFormSelectedAgentTypes);
  const syncFormMode = useStore(store, (s) => s.syncFormMode);
  const syncFormResults = useStore(store, (s) => s.syncFormResults);
  const syncFormFocusedIndex = useStore(store, (s) => s.syncFormFocusedIndex);
  const skills = useStore(store, (s) => s.skills);
  const agents = useStore(store, (s) => s.agents);
  const projects = useStore(store, (s) => s.projects);
  const activeTab = useStore(store, (s) => s.activeTab);
  const showSearch = useStore(store, (s) => s.showSearch);
  const showHelp = useStore(store, (s) => s.showHelp);
  const confirmState = useStore(store, (s) => s.confirmState);
  const formState = useStore(store, (s) => s.formState);
  const conflictState = useStore(store, (s) => s.conflictState);
  const updateProgressItems = useStore(store, (s) => s.updateProgressItems);

  // Local useInput for form navigation -- gated to sync tab active and no overlays
  useInput(
    (input, key) => {
      const s = store.getState();

      if (s.syncFormStep === 'results' || s.syncFormStep === 'executing') {
        if (key.return || key.escape) {
          s.resetSyncForm();
        }
        return;
      }

      if (s.syncFormStep === 'select-op') {
        if (key.escape) {
          s.resetSyncForm();
          return;
        }
        if (key.upArrow) {
          const opts: SyncOperation[] = ['sync-agents', 'sync-projects', 'unsync'];
          const cur = s.syncFormOperation || 'sync-agents';
          const idx = opts.indexOf(cur);
          if (idx > 0) s.setSyncFormOperation(opts[idx - 1]);
        }
        if (key.downArrow) {
          const opts: SyncOperation[] = ['sync-agents', 'sync-projects', 'unsync'];
          const cur = s.syncFormOperation || 'sync-agents';
          const idx = opts.indexOf(cur);
          if (idx < opts.length - 1) s.setSyncFormOperation(opts[idx + 1]);
        }
        if (key.return) {
          s.setSyncFormStep('select-skills');
          s.setSyncFormFocusedIndex(0);
        }
        return;
      }

      if (s.syncFormStep === 'select-skills') {
        if (key.escape) {
          s.setSyncFormStep('select-op');
          return;
        }
        if (key.upArrow) {
          s.setSyncFormFocusedIndex(Math.max(0, s.syncFormFocusedIndex - 1));
        }
        if (key.downArrow) {
          s.setSyncFormFocusedIndex(Math.min(s.skills.length - 1, s.syncFormFocusedIndex + 1));
        }
        if (input === ' ') {
          const focused = s.skills[s.syncFormFocusedIndex];
          if (focused) s.toggleSyncFormSkill(focused.name);
        }
        if (key.return) {
          if (s.syncFormSelectedSkillNames.size === 0) return;
          s.setSyncFormStep('select-targets');
          s.setSyncFormSelectedTargetIds(new Set());
          s.setSyncFormFocusedIndex(0);
        }
        return;
      }

      if (s.syncFormStep === 'select-targets') {
        if (key.escape) {
          s.setSyncFormStep('select-skills');
          return;
        }
        const targets = buildTargetList(s.syncFormOperation, s.agents, s.projects);
        if (key.upArrow) {
          s.setSyncFormFocusedIndex(Math.max(0, s.syncFormFocusedIndex - 1));
        }
        if (key.downArrow) {
          s.setSyncFormFocusedIndex(Math.min(targets.length - 1, s.syncFormFocusedIndex + 1));
        }
        if (input === ' ') {
          const focused = targets[s.syncFormFocusedIndex];
          if (focused) s.toggleSyncFormTarget(focused.id);
        }
        if (key.return) {
          if (targets.length > 0 && s.syncFormSelectedTargetIds.size === 0) return;
          if (targets.length === 0) {
            s.setSyncFormResults([
              {
                target: 'No targets found',
                success: false,
                error: `No ${s.syncFormOperation === 'sync-agents' ? 'agents' : 'projects'} configured`,
              },
            ]);
            s.setSyncFormStep('results');
            return;
          }
          if (s.syncFormOperation === 'sync-projects') {
            s.setSyncFormStep('select-agent-types');
            s.setSyncFormSelectedAgentTypes(new Set());
            s.setSyncFormFocusedIndex(0);
          } else {
            // sync-agents and unsync both go to confirm step
            s.setSyncFormStep('confirm');
          }
        }
        return;
      }

      if (s.syncFormStep === 'select-agent-types') {
        if (key.escape) {
          s.setSyncFormStep('select-targets');
          return;
        }
        if (key.upArrow) {
          s.setSyncFormFocusedIndex(Math.max(0, s.syncFormFocusedIndex - 1));
        }
        if (key.downArrow) {
          s.setSyncFormFocusedIndex(Math.min(s.agents.length - 1, s.syncFormFocusedIndex + 1));
        }
        if (input === ' ') {
          const focused = s.agents[s.syncFormFocusedIndex];
          if (focused) s.toggleSyncFormAgentType(focused.id);
        }
        if (key.return) {
          if (s.syncFormSelectedAgentTypes.size === 0 && s.agents.length > 0) return;
          s.setSyncFormStep('select-mode');
        }
        return;
      }

      if (s.syncFormStep === 'select-mode') {
        if (key.escape) {
          s.setSyncFormStep('select-agent-types');
          return;
        }
        if (key.upArrow || key.downArrow) {
          s.setSyncFormMode(s.syncFormMode === 'copy' ? 'symlink' : 'copy');
        }
        if (key.return || input === ' ') {
          s.setSyncFormStep('confirm');
        }
        return;
      }

      if (s.syncFormStep === 'confirm') {
        if (key.return) {
          void executeSync(s, store);
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
    { isActive: activeTab === 'sync' && !showSearch && !showHelp && !confirmState && !formState && !conflictState },
  );

  // Build target list for SelectTargets
  const targetList = buildTargetList(syncFormOperation, agents, projects);

  // Sync form step indicator
  const syncSteps = getSyncSteps(syncFormOperation);
  const syncStepLabel = stepToLabel(syncFormStep);
  const syncCurrentIndex = syncSteps.indexOf(syncStepLabel);

  return (
    <Box flexDirection="row" flexGrow={1} paddingX={1}>
      <StepIndicator steps={syncSteps} currentStep={Math.max(0, syncCurrentIndex)} width={22} />
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {syncFormStep === 'select-op' && <SelectOp operation={syncFormOperation} />}
        {syncFormStep === 'select-skills' && (
          <SelectSkills skills={skills} selected={syncFormSelectedSkillNames} focusedIndex={syncFormFocusedIndex} />
        )}
        {syncFormStep === 'select-targets' && (
          <SelectTargets
            operation={syncFormOperation}
            focusedIndex={syncFormFocusedIndex}
            selected={syncFormSelectedTargetIds}
            targets={targetList}
          />
        )}
        {syncFormStep === 'select-agent-types' && (
          <SelectAgentTypes agents={agents} selected={syncFormSelectedAgentTypes} focusedIndex={syncFormFocusedIndex} />
        )}
        {syncFormStep === 'select-mode' && <SelectMode mode={syncFormMode} />}
        {syncFormStep === 'confirm' && (
          <ConfirmStep
            operation={syncFormOperation}
            skillNames={syncFormSelectedSkillNames}
            targetIds={syncFormSelectedTargetIds}
            agentTypes={syncFormSelectedAgentTypes}
            mode={syncFormMode}
          />
        )}
        {syncFormStep === 'executing' && <ExecutingStep progressItems={updateProgressItems} />}
        {syncFormStep === 'results' && <ResultsStep results={syncFormResults} />}
      </Box>
    </Box>
  );
}

// ============================================================
// Target list builder
// ============================================================

interface TargetItem {
  id: string;
  label: string;
}

function buildTargetList(
  operation: SyncOperation | null,
  agents: Array<{ id: string; name: string }>,
  projects: Array<{ id: string; path: string }>,
): TargetItem[] {
  if (operation === 'sync-agents') {
    return agents.map((a) => ({ id: a.id, label: a.name }));
  }
  if (operation === 'sync-projects') {
    return projects.map((p) => ({ id: p.id, label: `${p.id}  ${p.path}` }));
  }
  if (operation === 'unsync') {
    return agents.map((a) => ({ id: a.id, label: a.name }));
  }
  return [];
}

// ============================================================
// Execute sync
// ============================================================

async function executeSync(
  s: ReturnType<StoreApi<AppStore>['getState']>,
  storeApi: StoreApi<AppStore>,
): Promise<void> {
  const skillNames = [...s.syncFormSelectedSkillNames];
  const targetIds = [...s.syncFormSelectedTargetIds];

  if (s.syncFormOperation === 'sync-agents') {
    await storeApi.getState().syncSkillsToAgents(skillNames, targetIds, s.syncFormMode as SyncMode);
  } else if (s.syncFormOperation === 'sync-projects') {
    const agentTypes =
      s.syncFormSelectedAgentTypes.size > 0 ? [...s.syncFormSelectedAgentTypes] : s.agents.map((a) => a.id);
    await storeApi
      .getState()
      .syncSkillsToProjects(skillNames, targetIds, agentTypes, s.syncFormMode as SyncMode);
  } else if (s.syncFormOperation === 'unsync') {
    await storeApi.getState().unsyncFromAgents(skillNames, targetIds);
  }
}

function handleSyncBack(storeApi: StoreApi<AppStore>): void {
  const s = storeApi.getState();
  switch (s.syncFormStep) {
    case 'select-targets':
      s.setSyncFormStep('select-skills');
      break;
    case 'select-agent-types':
      s.setSyncFormStep('select-targets');
      break;
    case 'select-mode':
      s.setSyncFormStep('select-agent-types');
      break;
    case 'select-skills':
    case 'select-op':
      break;
    case 'confirm':
      if (s.syncFormOperation === 'sync-projects') {
        s.setSyncFormStep('select-agent-types');
      } else {
        s.setSyncFormStep('select-targets');
      }
      break;
    default:
      break;
  }
}

// ============================================================
// Step sub-components
// ============================================================

function SelectOp({ operation }: { operation: SyncOperation | null }): React.ReactElement {
  const opts: Array<{ value: SyncOperation; label: string }> = [
    { value: 'sync-agents', label: 'Sync to Agents' },
    { value: 'sync-projects', label: 'Sync to Projects' },
    { value: 'unsync', label: 'Unsync' },
  ];
  const opIdx = opts.findIndex((o) => o.value === operation);

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Sync Skills</Text>
      <Text> </Text>
      <Text>Choose operation:</Text>
      {opts.map((op, i) => (
        <Text key={op.value}>
          {i === opIdx ? '  > ' : '    '}
          {i === opIdx ? <Text bold>( {op.label} )</Text> : <Text> {op.label} </Text>}
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
      <Text bold color="cyan">Select skills to sync</Text>
      <Text> </Text>
      {skills.map((skill, i) => {
        const isSelected = selected.has(skill.name);
        const isFocused = i === focusedIndex;
        return (
          <Text key={skill.name}>
            {isFocused ? '  > ' : '    '}
            <Text color={isSelected ? 'cyan' : undefined}>{isSelected ? '[x]' : '[ ]'}</Text>{' '}
            {skill.name}
          </Text>
        );
      })}
      {skills.length === 0 && <Text dimColor>No skills installed</Text>}
      <Text> </Text>
      <Text dimColor>Up/Down to navigate, Space to toggle, Enter to continue</Text>
    </Box>
  );
}

function SelectTargets({
  operation,
  focusedIndex,
  selected,
  targets,
}: {
  operation: SyncOperation | null;
  focusedIndex: number;
  selected: Set<string>;
  targets: TargetItem[];
}): React.ReactElement {
  const title =
    operation === 'sync-agents'
      ? 'Select agents'
      : operation === 'sync-projects'
        ? 'Select projects'
        : 'Select agents to unsync from';

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">{title}</Text>
      <Text> </Text>
      {targets.map((target, i) => {
        const isSelected = selected.has(target.id);
        const isFocused = i === focusedIndex;
        return (
          <Text key={target.id}>
            {isFocused ? '  > ' : '    '}
            <Text color={isSelected ? 'cyan' : undefined}>{isSelected ? '[x]' : '[ ]'}</Text>{' '}
            {target.label}
          </Text>
        );
      })}
      {targets.length === 0 && <Text dimColor>No targets configured</Text>}
      <Text> </Text>
      <Text dimColor>{selected.size} target(s) selected</Text>
      <Text dimColor>Up/Down to navigate, Space to toggle, Enter to continue</Text>
    </Box>
  );
}

function SelectAgentTypes({
  agents,
  selected,
  focusedIndex,
}: {
  agents: Array<{ id: string; name: string }>;
  selected: Set<string>;
  focusedIndex: number;
}): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Select agent types</Text>
      <Text> </Text>
      {agents.map((agent, i) => {
        const isSelected = selected.has(agent.id);
        const isFocused = i === focusedIndex;
        return (
          <Text key={agent.id}>
            {isFocused ? '  > ' : '    '}
            <Text color={isSelected ? 'cyan' : undefined}>{isSelected ? '[x]' : '[ ]'}</Text>{' '}
            {agent.id}
          </Text>
        );
      })}
      <Text> </Text>
      <Text dimColor>Up/Down to navigate, Space to toggle, Enter to continue</Text>
    </Box>
  );
}

function SelectMode({ mode }: { mode: SyncMode }): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Sync mode</Text>
      <Text> </Text>
      <Text>{mode === 'copy' ? '  > ' : '    '}Copy - Independent copy, stable and reliable</Text>
      <Text>{mode === 'symlink' ? '  > ' : '    '}Symlink - Link to source, updates automatically</Text>
      <Text> </Text>
      <Text dimColor>Up/Down to choose, Enter to continue</Text>
    </Box>
  );
}

function ConfirmStep({
  operation,
  skillNames,
  targetIds,
  agentTypes,
  mode,
}: {
  operation: SyncOperation | null;
  skillNames: Set<string>;
  targetIds: Set<string>;
  agentTypes: Set<string>;
  mode: SyncMode;
}): React.ReactElement {
  const actionText = operation === 'unsync' ? 'Unsync' : 'Sync';
  const targetLabel =
    operation === 'sync-projects' ? 'project(s)' : operation === 'unsync' ? 'target(s)' : 'agent(s)';

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Confirm {operation === 'unsync' ? 'Unsync' : 'Sync'}</Text>
      <Text> </Text>
      <Text>
        {actionText} {skillNames.size} skill(s) to {targetIds.size} {targetLabel}.
        {operation !== 'unsync' && ` Using ${mode} mode.`}
      </Text>
      <Text> </Text>
      <Text dimColor>Skills: {[...skillNames].join(', ')}</Text>
      <Text dimColor>Targets: {[...targetIds].join(', ')}</Text>
      {agentTypes.size > 0 && <Text dimColor>Agent types: {[...agentTypes].join(', ')}</Text>}
      <Text> </Text>
      <Box flexDirection="row" gap={2}>
        <Text color="cyan">[Enter]</Text>
        <Text>{actionText}</Text>
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
  const completedItems = progressItems.filter(i => i.status === 'success').length;
  const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const anyRunning = progressItems.some(i => i.status === 'running' || i.status === 'pending');
  const anyError = progressItems.some(i => i.status === 'error');
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
        <ProgressBar key={item.id} label={item.label} progress={item.progress} status={item.status} error={item.error} />
      ))}
    </Box>
  );
}

function ResultsStep({
  results,
}: {
  results: Array<{ target: string; success: boolean; error?: string }>;
}): React.ReactElement {
  const successes = results.filter((r) => r.success);
  const failures = results.filter((r) => !r.success);

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Sync complete</Text>
      <Text> </Text>
      <Text>
        <Text bold>{successes.length}</Text> succeeded
        {failures.length > 0 && (
          <>
            , <Text bold color="red">{failures.length}</Text> failed
          </>
        )}
      </Text>
      {failures.length > 0 && (
        <>
          <Text> </Text>
          {failures.map((r, i) => (
            <Box key={`fail-${i}`} flexDirection="row" flexWrap="wrap">
              <Text color="red">x </Text>
              <Text>{r.target}</Text>
              {r.error && <Text color="red">: {r.error}</Text>}
            </Box>
          ))}
        </>
      )}
      <Text> </Text>
      <Box flexDirection="row" gap={2}>
        <Text color="cyan">[Enter]</Text>
        <Text>New sync</Text>
        <Text dimColor>[Esc] Close</Text>
      </Box>
    </Box>
  );
}
