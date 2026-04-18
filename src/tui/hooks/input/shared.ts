import type { StoreApi } from 'zustand';

import { BUILTIN_AGENTS } from '../../../types.js';
import type {
  ContextSkillRow,
  ContextSkillSection,
  VisibleContextSkillRow,
} from '../../contextTypes.js';
import type { AppStore } from '../../store/index.js';

export function openSkillDetail(store: StoreApi<AppStore>, skillName: string): void {
  const state = store.getState();
  state.setDetailSkillName(skillName);
  state.setDetailOverlayVisible(true);
  if (!state.skillDetails[skillName]) {
    void store.getState().loadSkillDetail(skillName);
  }
}

export function openUpdateForm(
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

export function getAgentContextSections(state: AppStore): ContextSkillSection[] {
  const focusedAgent = state.agents[state.agentsBrowserState.focusedIndex];
  if (!focusedAgent) return [];
  return state.agentDetails[focusedAgent.id]?.sections ?? [];
}

export function getProjectContextSections(state: AppStore): ContextSkillSection[] {
  const focusedProject = state.projects[state.projectsBrowserState.focusedIndex];
  if (!focusedProject) return [];
  return state.projectDetails[focusedProject.id]?.sections ?? [];
}

export function getFocusedContextRow(
  rows: VisibleContextSkillRow[],
  focusedIndex: number
): VisibleContextSkillRow | null {
  if (rows.length === 0) return null;
  return rows[Math.min(focusedIndex, rows.length - 1)] ?? null;
}

export function getSelectedOrFocusedRows(
  visibleRows: VisibleContextSkillRow[],
  selectedRowIds: Set<string>,
  focusedIndex: number
): ContextSkillRow[] {
  if (selectedRowIds.size > 0) {
    return visibleRows.filter((row) => selectedRowIds.has(row.rowId));
  }

  const focused = getFocusedContextRow(visibleRows, focusedIndex);
  return focused ? [focused] : [];
}

export function isBuiltinAgent(agentId: string): boolean {
  const builtinIds = BUILTIN_AGENTS.map((agent) => agent.id);
  return builtinIds.includes(agentId);
}
