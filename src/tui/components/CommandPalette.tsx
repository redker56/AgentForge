/**
 * Command palette overlay (Ctrl+P).
 *
 * Shows a fuzzy-searchable list of all available commands.
 * Enter triggers the selected command. Escape closes.
 * Focus index tracked in local component state.
 * Modern Claude Code aesthetic with coral accent color.
 */

import React, { useState, useMemo } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';
import type { AppStore } from '../store/index.js';
import { fuzzyMatch } from '../utils/fuzzy.js';
import { inkColors } from '../theme.js';

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
  { id: 'import-skills', label: 'Import skills' },
];

interface CommandPaletteProps {
  store: StoreApi<AppStore>;
}

function executeCommand(commandId: string, store: StoreApi<AppStore>): void {
  const state = store.getState();

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
      const name = state.skills[state.focusedSkillIndex]?.name;
      if (name) {
        state.setConfirmState({
          title: `Delete ${name}`,
          message: 'This will remove all sync references. Files on disk will be deleted.',
          onConfirm: async () => {
            await store.getState().removeSkill(name);
            store.getState().setConfirmState(null);
            store.getState().clearSelection();
            await store.getState().refreshSkills();
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
          onConfirm: async () => {
            await store.getState().removeAgent(agent.id);
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
          onConfirm: async () => {
            await store.getState().removeProject(project.id);
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
        : [state.skills[state.focusedSkillIndex]?.name].filter(Boolean) as string[];
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
        : [state.skills[state.focusedSkillIndex]?.name].filter(Boolean) as string[];
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
        : [state.skills[state.focusedSkillIndex]?.name].filter(Boolean) as string[];
      if (names.length > 0) {
        state.setSyncFormSelectedSkillNames(new Set(names));
        state.setSyncFormOperation('unsync');
        state.setSyncFormStep('select-targets');
        state.setActiveTab('sync');
      } else {
        state.setActiveTab('skills');
      }
      state.setShowCommandPalette(false);
      break;
    }
    case 'update-skill': {
      const skill = state.skills[state.focusedSkillIndex];
      if (skill) {
        void store.getState().updateSkill(skill.name);
      }
      state.setShowCommandPalette(false);
      break;
    }
    case 'update-all':
      store.getState().updateAllSkills();
      state.setShowCommandPalette(false);
      break;
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
      <Box borderStyle="single" paddingLeft={1} paddingRight={1} borderColor={inkColors.muted}>
        <Text color={inkColors.accent}>{'>'} </Text>
        <Text>{query}</Text>
        <Text color={inkColors.muted}>|</Text>
      </Box>
      {filteredCommands.length > 0 && (
        <Box flexDirection="column" borderStyle="single" borderTop={false} paddingLeft={1} paddingRight={1} borderColor={inkColors.muted}>
          {filteredCommands.map((result, i) => (
            <Text
              key={result.item.id}
              color={i === clampedIndex ? inkColors.accent : inkColors.secondary}
              bold={i === clampedIndex}
            >
              {i === clampedIndex ? '› ' : '  '}{result.item.label}
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
