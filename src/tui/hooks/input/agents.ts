import { cycleContextSkillFilter, getVisibleContextSkillRows } from '../../contextTypes.js';
import { getTuiText } from '../../i18n.js';

import {
  getAgentContextSections,
  getFocusedContextRow,
  getSelectedOrFocusedRows,
  isBuiltinAgent,
  openSkillDetail,
  openUpdateForm,
} from './shared.js';
import type { InputRouteContext } from './types.js';

export function handleAgentsTabInput({ store, input, key, state }: InputRouteContext): boolean {
  const text = getTuiText(state.shellState.locale);
  const sections = getAgentContextSections(state);
  const visibleRows = getVisibleContextSkillRows(
    sections,
    state.agentsBrowserState.activeSkillFilter
  );

  if (state.agentsBrowserState.viewMode === 'skills') {
    if (key.upArrow) {
      const index = state.agentsBrowserState.focusedSkillIndex;
      if (index > 0) state.setFocusedAgentSkillIndex(index - 1);
      return true;
    }
    if (key.downArrow) {
      const index = state.agentsBrowserState.focusedSkillIndex;
      if (index < visibleRows.length - 1) state.setFocusedAgentSkillIndex(index + 1);
      return true;
    }
    if (key.home || key.end) {
      if (visibleRows.length > 0) {
        state.setFocusedAgentSkillIndex(key.home ? 0 : visibleRows.length - 1);
      }
      return true;
    }
    if (input === '[') {
      state.setActiveAgentSkillFilter(
        cycleContextSkillFilter(state.agentsBrowserState.activeSkillFilter, -1)
      );
      return true;
    }
    if (input === ']') {
      state.setActiveAgentSkillFilter(
        cycleContextSkillFilter(state.agentsBrowserState.activeSkillFilter, 1)
      );
      return true;
    }
    if (input === ' ') {
      const focusedRow = getFocusedContextRow(
        visibleRows,
        state.agentsBrowserState.focusedSkillIndex
      );
      if (focusedRow) {
        state.toggleAgentSkillSelection(focusedRow.rowId);
      }
      return true;
    }
    if (key.return) {
      const focusedRow = getFocusedContextRow(
        visibleRows,
        state.agentsBrowserState.focusedSkillIndex
      );
      if (focusedRow?.registrySkillName) {
        openSkillDetail(store, focusedRow.registrySkillName);
      }
      return true;
    }
    if (key.escape) {
      state.setAgentViewMode('master');
      state.clearAgentSkillSelection();
      state.setFocusedAgentSkillIndex(0);
      return true;
    }
    if (input === 'i') {
      const rows = getSelectedOrFocusedRows(
        visibleRows,
        state.agentsBrowserState.selectedSkillRowIds,
        state.agentsBrowserState.focusedSkillIndex
      );
      if (rows.length > 0) {
        state.setFormState({
          formType: 'importContextSkills',
          data: { rows: JSON.stringify(rows) },
        });
      }
      return true;
    }
    if (input === 'u') {
      const names = Array.from(
        new Set(
          getSelectedOrFocusedRows(
            visibleRows,
            state.agentsBrowserState.selectedSkillRowIds,
            state.agentsBrowserState.focusedSkillIndex
          )
            .map((row) => row.registrySkillName)
            .filter((name): name is string => Boolean(name))
        )
      );
      openUpdateForm(state, names, 'updateSelected');
      return true;
    }
    if (input === 'c') {
      const names = Array.from(
        new Set(
          getSelectedOrFocusedRows(
            visibleRows,
            state.agentsBrowserState.selectedSkillRowIds,
            state.agentsBrowserState.focusedSkillIndex
          )
            .map((row) => row.registrySkillName)
            .filter((name): name is string => Boolean(name))
        )
      );
      if (names.length > 0) {
        state.setFormState({
          formType: 'categorizeSkills',
          data: { skillNames: JSON.stringify(names) },
        });
      }
      return true;
    }
    if (input === 'x') {
      const rows = getSelectedOrFocusedRows(
        visibleRows,
        state.agentsBrowserState.selectedSkillRowIds,
        state.agentsBrowserState.focusedSkillIndex
      );
      const names = Array.from(
        new Set(
          rows
            .filter((row) => row.registrySkillName && row.syncMode)
            .map((row) => row.registrySkillName as string)
        )
      );
      const focusedAgent = state.agents[state.agentsBrowserState.focusedIndex];
      if (focusedAgent && names.length > 0) {
        state.setSyncFormSelectedSkillNames(new Set(names));
        state.setSyncFormOperation('unsync');
        state.setSyncFormUnsyncScope('agents');
        state.setSyncFormProjectUnsyncMode(null);
        state.setSyncFormSelectedTargetIds(new Set([focusedAgent.id]));
        state.setSyncFormSelectedAgentTypes(new Set());
        state.setSyncFormStep('confirm');
        state.setActiveTab('sync');
      }
      return true;
    }
    return false;
  }

  if (key.upArrow) {
    const index = state.agentsBrowserState.focusedIndex;
    if (index > 0) state.setFocusedAgentIndex(index - 1);
    return true;
  }
  if (key.downArrow) {
    const index = state.agentsBrowserState.focusedIndex;
    if (index < state.agents.length - 1) state.setFocusedAgentIndex(index + 1);
    return true;
  }
  if (key.home || key.end) {
    if (state.agents.length > 0) {
      state.setFocusedAgentIndex(key.home ? 0 : state.agents.length - 1);
    }
    return true;
  }
  if (key.return) {
    const focusedAgent = state.agents[state.agentsBrowserState.focusedIndex];
    if (focusedAgent) {
      state.setAgentViewMode('skills');
      state.clearAgentSkillSelection();
      state.setFocusedAgentSkillIndex(0);
      if (!state.agentDetails[focusedAgent.id]) {
        void store.getState().loadAgentDetail(focusedAgent.id);
      }
    }
    return true;
  }
  if (input === 'a') {
    state.setFormState({ formType: 'addAgent', data: {} });
    return true;
  }
  if (input === 'r') {
    const agent = state.agents[state.agentsBrowserState.focusedIndex];
    if (!agent || isBuiltinAgent(agent.id)) return true;
    state.setConfirmState({
      title: text.mutations.removeAgentTitle(agent.name),
      message: text.mutations.removeAgentMessage,
      onConfirm: () => {
        const agentSnapshot = {
          id: agent.id,
          name: agent.name,
          basePath: agent.basePath,
          skillsDirName: agent.skillsDirName,
        };
        void store.getState().removeAgent(agent.id);
        store.getState().setConfirmState(null);
        store.getState().pushUndo('remove-agent', agentSnapshot);
        store.getState().pushToast(text.mutations.removedAgent(agent.name), 'success');
      },
    });
    return true;
  }

  return false;
}
