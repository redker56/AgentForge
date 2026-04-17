/**
 * Command palette overlay (Ctrl+P).
 *
 * Shows a fuzzy-searchable list of all available commands.
 * Enter triggers the selected command. Escape closes.
 * Focus index tracked in local component state.
 */

import { Box, Text, useInput } from 'ink';
import React, { useMemo, useState } from 'react';
import type { StoreApi } from 'zustand';

import { getVisibleContextSkillRows } from '../contextTypes.js';
import type { AppStore } from '../store/index.js';
import { inkColors, renderFocusPrefix } from '../theme.js';
import { fuzzyMatch } from '../utils/fuzzy.js';
import { getFocusedVisibleSkill } from '../utils/skillsView.js';

interface CommandEntry {
  id: string;
  label: string;
}

const COMMANDS: CommandEntry[] = [
  { id: 'add-skill', label: 'Add skill' },
  { id: 'add-agent', label: 'Add agent' },
  { id: 'add-project', label: 'Add project' },
  { id: 'remove-skill', label: 'Remove skill' },
  { id: 'remove-agent', label: 'Remove agent' },
  { id: 'remove-project', label: 'Remove project' },
  { id: 'sync-agents', label: 'Sync skill to agents' },
  { id: 'sync-projects', label: 'Sync skill to projects' },
  { id: 'unsync', label: 'Unsync skill' },
  { id: 'update-skill', label: 'Update skill' },
  { id: 'update-all', label: 'Update all skills' },
  { id: 'categorize-skill', label: 'Categorize skill(s)' },
  { id: 'import-skills', label: 'Import skills' },
];

interface CommandPaletteProps {
  store: StoreApi<AppStore>;
}

function openUpdateForm(
  state: AppStore,
  skillNames: string[],
  formType: 'updateSelected' | 'updateAllGit'
): void {
  if (skillNames.length === 0) return;
  state.setFormState({
    formType,
    data: {
      skillNames: JSON.stringify(skillNames),
    },
  });
}

function getSelectedContextSkillNames(state: AppStore): string[] {
  if (state.activeTab === 'agents' && state.agentViewMode === 'skills') {
    const focusedAgent = state.agents[state.focusedAgentIndex];
    const sections = focusedAgent ? state.agentDetails[focusedAgent.id]?.sections ?? [] : [];
    const visibleRows = getVisibleContextSkillRows(sections, state.activeAgentSkillFilter);
    const rows =
      state.selectedAgentSkillRowIds.size > 0
        ? visibleRows.filter((row) => state.selectedAgentSkillRowIds.has(row.rowId))
        : [visibleRows[Math.min(state.focusedAgentSkillIndex, visibleRows.length - 1)]].filter(Boolean);
    return Array.from(
      new Set(rows.map((row) => row?.registrySkillName).filter((name): name is string => Boolean(name)))
    );
  }

  if (state.activeTab === 'projects' && state.projectViewMode === 'skills') {
    const focusedProject = state.projects[state.focusedProjectIndex];
    const sections = focusedProject ? state.projectDetails[focusedProject.id]?.sections ?? [] : [];
    const visibleRows = getVisibleContextSkillRows(sections, state.activeProjectSkillFilter);
    const rows =
      state.selectedProjectSkillRowIds.size > 0
        ? visibleRows.filter((row) => state.selectedProjectSkillRowIds.has(row.rowId))
        : [visibleRows[Math.min(state.focusedProjectSkillIndex, visibleRows.length - 1)]].filter(Boolean);
    return Array.from(
      new Set(rows.map((row) => row?.registrySkillName).filter((name): name is string => Boolean(name)))
    );
  }

  return [];
}

function getSelectedContextRows(state: AppStore) {
  if (state.activeTab === 'agents' && state.agentViewMode === 'skills') {
    const focusedAgent = state.agents[state.focusedAgentIndex];
    const sections = focusedAgent ? state.agentDetails[focusedAgent.id]?.sections ?? [] : [];
    const visibleRows = getVisibleContextSkillRows(sections, state.activeAgentSkillFilter);
    return state.selectedAgentSkillRowIds.size > 0
      ? visibleRows.filter((row) => state.selectedAgentSkillRowIds.has(row.rowId))
      : [visibleRows[Math.min(state.focusedAgentSkillIndex, visibleRows.length - 1)]].filter(Boolean);
  }

  if (state.activeTab === 'projects' && state.projectViewMode === 'skills') {
    const focusedProject = state.projects[state.focusedProjectIndex];
    const sections = focusedProject ? state.projectDetails[focusedProject.id]?.sections ?? [] : [];
    const visibleRows = getVisibleContextSkillRows(sections, state.activeProjectSkillFilter);
    return state.selectedProjectSkillRowIds.size > 0
      ? visibleRows.filter((row) => state.selectedProjectSkillRowIds.has(row.rowId))
      : [visibleRows[Math.min(state.focusedProjectSkillIndex, visibleRows.length - 1)]].filter(Boolean);
  }

  return [];
}

function executeCommand(commandId: string, store: StoreApi<AppStore>): void {
  const state = store.getState();
  const focusedVisibleSkill = getFocusedVisibleSkill(
    state.skills,
    state.activeSkillCategoryFilter,
    state.focusedSkillIndex
  );

  switch (commandId) {
    case 'add-skill':
      state.setFormState({ formType: 'addSkill', data: {} });
      state.setShowCommandPalette(false);
      break;
    case 'add-agent':
      state.setFormState({ formType: 'addAgent', data: {} });
      state.setShowCommandPalette(false);
      break;
    case 'add-project':
      state.setFormState({ formType: 'addProject', data: {} });
      state.setShowCommandPalette(false);
      break;
    case 'remove-skill': {
      const name = focusedVisibleSkill?.name;
      if (name) {
        state.setConfirmState({
          title: `Delete ${name}`,
          message: 'This will remove all sync references. Files on disk will be deleted.',
          onConfirm: () => {
            void store.getState().removeSkill(name);
            store.getState().setConfirmState(null);
            store.getState().clearSelection();
            void store.getState().refreshSkills();
          },
        });
      }
      state.setShowCommandPalette(false);
      break;
    }
    case 'remove-agent': {
      const agent = state.agents[state.focusedAgentIndex];
      if (agent) {
        state.setConfirmState({
          title: `Remove Agent "${agent.name}"`,
          message: 'Files stay on disk. AgentForge will forget sync references tied to this Agent.',
          onConfirm: () => {
            void store.getState().removeAgent(agent.id);
            store.getState().setConfirmState(null);
          },
        });
      }
      state.setShowCommandPalette(false);
      break;
    }
    case 'remove-project': {
      const project = state.projects[state.focusedProjectIndex];
      if (project) {
        state.setConfirmState({
          title: `Remove Project "${project.id}"`,
          message: 'Files stay on disk. AgentForge will forget the project and its recorded sync references.',
          onConfirm: () => {
            void store.getState().removeProject(project.id);
            store.getState().setConfirmState(null);
          },
        });
      }
      state.setShowCommandPalette(false);
      break;
    }
    case 'sync-agents': {
      const names = state.selectedSkillNames.size > 0
        ? [...state.selectedSkillNames]
        : [focusedVisibleSkill?.name].filter(Boolean) as string[];
      if (names.length > 0) {
        state.setSyncFormSelectedSkillNames(new Set(names));
        state.setSyncFormOperation('sync-agents');
        state.setSyncFormStep('select-targets');
        state.setActiveTab('sync');
      } else {
        state.setActiveTab('skills');
      }
      state.setShowCommandPalette(false);
      break;
    }
    case 'sync-projects': {
      const names = state.selectedSkillNames.size > 0
        ? [...state.selectedSkillNames]
        : [focusedVisibleSkill?.name].filter(Boolean) as string[];
      if (names.length > 0) {
        state.setSyncFormSelectedSkillNames(new Set(names));
        state.setSyncFormOperation('sync-projects');
        state.setSyncFormStep('select-targets');
        state.setActiveTab('sync');
      } else {
        state.setActiveTab('skills');
      }
      state.setShowCommandPalette(false);
      break;
    }
    case 'unsync': {
      const contextRows = getSelectedContextRows(state);
      const contextNames = getSelectedContextSkillNames(state);
      const names = contextNames.length > 0
        ? contextNames
        : state.selectedSkillNames.size > 0
          ? [...state.selectedSkillNames]
          : [focusedVisibleSkill?.name].filter(Boolean) as string[];
      if (names.length > 0) {
        state.setSyncFormSelectedSkillNames(new Set(names));
        state.setSyncFormOperation('unsync');
        if (state.activeTab === 'agents' && state.agentViewMode === 'skills') {
          const agent = state.agents[state.focusedAgentIndex];
          if (agent) {
            state.setSyncFormUnsyncScope('agents');
            state.setSyncFormProjectUnsyncMode(null);
            state.setSyncFormSelectedTargetIds(new Set([agent.id]));
            state.setSyncFormSelectedAgentTypes(new Set());
            state.setSyncFormStep('confirm');
          }
        } else if (state.activeTab === 'projects' && state.projectViewMode === 'skills') {
          const targetPairs = contextRows
            .filter((row) => row.projectId && row.agentId && row.registrySkillName)
            .map((row) => `${row.projectId}:${row.agentId}`);
          state.setSyncFormUnsyncScope('projects');
          state.setSyncFormProjectUnsyncMode('specific');
          state.setSyncFormSelectedTargetIds(new Set(targetPairs));
          state.setSyncFormSelectedAgentTypes(new Set());
          state.setSyncFormStep('confirm');
        } else {
          state.setSyncFormUnsyncScope(null);
          state.setSyncFormProjectUnsyncMode(null);
          state.setSyncFormSelectedTargetIds(new Set());
          state.setSyncFormSelectedAgentTypes(new Set());
          state.setSyncFormStep('select-unsync-scope');
        }
        state.setActiveTab('sync');
      } else {
        state.setActiveTab('skills');
      }
      state.setShowCommandPalette(false);
      break;
    }
    case 'update-skill': {
      const contextNames = getSelectedContextSkillNames(state);
      const names = contextNames.length > 0
        ? contextNames
        : state.selectedSkillNames.size > 0
          ? [...state.selectedSkillNames]
          : [focusedVisibleSkill?.name].filter(Boolean) as string[];
      openUpdateForm(state, names, 'updateSelected');
      state.setShowCommandPalette(false);
      break;
    }
    case 'update-all': {
      const names = state.skills
        .filter((skill) => skill.source.type === 'git')
        .map((skill) => skill.name);
      openUpdateForm(state, names, 'updateAllGit');
      state.setShowCommandPalette(false);
      break;
    }
    case 'categorize-skill': {
      const contextNames = getSelectedContextSkillNames(state);
      const names = contextNames.length > 0
        ? contextNames
        : state.selectedSkillNames.size > 0
          ? [...state.selectedSkillNames]
          : [focusedVisibleSkill?.name].filter(Boolean) as string[];
      if (names.length > 0) {
        state.setFormState({
          formType: 'categorizeSkills',
          data: {
            skillNames: JSON.stringify(names),
          },
        });
      } else {
        state.setActiveTab('skills');
      }
      state.setShowCommandPalette(false);
      break;
    }
    case 'import-skills': {
      const contextRows = getSelectedContextRows(state);
      if (contextRows.length > 0) {
        state.setFormState({
          formType: 'importContextSkills',
          data: { rows: JSON.stringify(contextRows) },
        });
      } else {
        state.setFormState({
          formType: state.activeTab === 'agents' ? 'importAgent' : 'importProject',
          data: {},
        });
      }
      state.setShowCommandPalette(false);
      break;
    }
  }
}

export function CommandPalette({ store }: CommandPaletteProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return COMMANDS.map((cmd) => ({ item: cmd, score: 0, matchIndices: [] }));
    }
    return fuzzyMatch(query, COMMANDS, (cmd) => cmd.label);
  }, [query]);

  const clampedIndex = Math.min(focusedIndex, Math.max(filteredCommands.length - 1, 0));

  useInput((input, key) => {
    const state = store.getState();

    if (key.escape) {
      state.setShowCommandPalette(false);
      return;
    }

    if (key.return) {
      const cmd = filteredCommands[clampedIndex];
      if (cmd) {
        executeCommand(cmd.item.id, store);
      } else {
        state.setShowCommandPalette(false);
      }
      return;
    }

    if (key.upArrow) {
      setFocusedIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setFocusedIndex((prev) => Math.min(filteredCommands.length - 1, prev + 1));
      return;
    }

    if (key.backspace || key.delete) {
      setQuery((prev) => prev.slice(0, -1));
      setFocusedIndex(0);
      return;
    }

    if (input && input.length === 1 && !key.ctrl && !key.meta) {
      setQuery((prev) => prev + input);
      setFocusedIndex(0);
    }
  }, {
    isActive: store.getState().showCommandPalette,
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box
        flexDirection="column"
        borderStyle="single"
        paddingLeft={1}
        paddingRight={1}
        borderColor={inkColors.borderActive}
      >
        <Text color={inkColors.muted}>Command palette</Text>
        <Box>
          <Text color={inkColors.accent}>Command</Text>
          <Text color={inkColors.muted}> / </Text>
          <Text color={inkColors.primary}>{query}</Text>
          <Text color={inkColors.accent}>|</Text>
        </Box>
      </Box>
      {filteredCommands.length > 0 && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderTop={false}
          paddingLeft={1}
          paddingRight={1}
          borderColor={inkColors.borderActive}
        >
          {filteredCommands.map((result, i) => (
            <Text
              key={result.item.id}
              color={i === clampedIndex ? inkColors.focusText : inkColors.secondary}
              backgroundColor={i === clampedIndex ? inkColors.paper : undefined}
              bold={i === clampedIndex}
            >
              {renderFocusPrefix(i === clampedIndex)}{result.item.label}
            </Text>
          ))}
        </Box>
      )}
      {query.trim() && filteredCommands.length === 0 && (
        <Text color={inkColors.muted}>  No commands found</Text>
      )}
    </Box>
  );
}
