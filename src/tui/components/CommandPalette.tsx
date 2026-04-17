/**
 * Command palette overlay (Ctrl+P).
 *
 * Shows a fuzzy-searchable list of all available commands.
 * Enter triggers the selected command. Escape closes.
 * Focus index tracked in local component state.
 * Modern Claude Code aesthetic with coral accent color.
 */

import { Box, Text , useInput } from 'ink';
import React, { useState, useMemo } from 'react';
import type { StoreApi } from 'zustand';

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

function executeCommand(commandId: string, store: StoreApi<AppStore>): void {
  const state = store.getState();
  const focusedVisibleSkill = getFocusedVisibleSkill(
    state.skills,
    state.activeSkillCategoryFilter,
    state.focusedSkillIndex
  );
  const openUpdateForm = (skillNames: string[], formType: 'updateSelected' | 'updateAllGit'): void => {
    if (skillNames.length === 0) return;
    state.setFormState({
      formType,
      data: {
        skillNames: JSON.stringify(skillNames),
      },
    });
  };

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
      const names = state.selectedSkillNames.size > 0
        ? [...state.selectedSkillNames]
        : [focusedVisibleSkill?.name].filter(Boolean) as string[];
      if (names.length > 0) {
        state.setSyncFormSelectedSkillNames(new Set(names));
        state.setSyncFormOperation('unsync');
        state.setSyncFormUnsyncScope(null);
        state.setSyncFormProjectUnsyncMode(null);
        state.setSyncFormSelectedTargetIds(new Set());
        state.setSyncFormSelectedAgentTypes(new Set());
        state.setSyncFormStep('select-unsync-scope');
        state.setActiveTab('sync');
      } else {
        state.setActiveTab('skills');
      }
      state.setShowCommandPalette(false);
      break;
    }
    case 'update-skill': {
      const names = state.selectedSkillNames.size > 0
        ? [...state.selectedSkillNames]
        : [focusedVisibleSkill?.name].filter(Boolean) as string[];
      openUpdateForm(names, 'updateSelected');
      state.setShowCommandPalette(false);
      break;
    }
    case 'update-all': {
      const names = state.skills
        .filter((skill) => skill.source.type === 'git')
        .map((skill) => skill.name);
      openUpdateForm(names, 'updateAllGit');
      state.setShowCommandPalette(false);
      break;
    }
    case 'categorize-skill': {
      const names = state.selectedSkillNames.size > 0
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
    case 'import-skills':
      state.setFormState({ formType: 'importProject', data: {} });
      state.setShowCommandPalette(false);
      break;
  }
}

export function CommandPalette({ store }: CommandPaletteProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return COMMANDS.map(cmd => ({ item: cmd, score: 0, matchIndices: [] }));
    }
    return fuzzyMatch(query, COMMANDS, cmd => cmd.label);
  }, [query]);

  // Clamp focus index
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
      setFocusedIndex(prev => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setFocusedIndex(prev => Math.min(filteredCommands.length - 1, prev + 1));
      return;
    }

    if (key.backspace || key.delete) {
      setQuery(prev => prev.slice(0, -1));
      setFocusedIndex(0);
      return;
    }

    if (input && input.length === 1 && !key.ctrl && !key.meta) {
      setQuery(prev => prev + input);
      setFocusedIndex(0);
    }
  }, {
    isActive: store.getState().showCommandPalette,
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box borderStyle="single" paddingLeft={1} paddingRight={1} borderColor={inkColors.border}>
        <Text color={inkColors.accent}>{'>'} </Text>
        <Text>{query}</Text>
        <Text color={inkColors.muted}>|</Text>
      </Box>
      {filteredCommands.length > 0 && (
        <Box flexDirection="column" borderStyle="single" borderTop={false} paddingLeft={1} paddingRight={1} borderColor={inkColors.border}>
          {filteredCommands.map((result, i) => (
            <Text
              key={result.item.id}
              color={i === clampedIndex ? inkColors.accent : inkColors.secondary}
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
