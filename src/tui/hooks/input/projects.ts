import { cycleContextSkillFilter, getVisibleContextSkillRows } from '../../contextTypes.js';
import { getTuiText } from '../../i18n.js';

import {
  getFocusedContextRow,
  getProjectContextSections,
  getSelectedOrFocusedRows,
  openSkillDetail,
  openUpdateForm,
} from './shared.js';
import type { InputRouteContext } from './types.js';

export function handleProjectsTabInput({ store, input, key, state }: InputRouteContext): boolean {
  const text = getTuiText(state.shellState.locale);
  const sections = getProjectContextSections(state);
  const visibleRows = getVisibleContextSkillRows(
    sections,
    state.projectsBrowserState.activeSkillFilter
  );

  if (state.projectsBrowserState.viewMode === 'skills') {
    if (key.upArrow) {
      const index = state.projectsBrowserState.focusedSkillIndex;
      if (index > 0) state.setFocusedProjectSkillIndex(index - 1);
      return true;
    }
    if (key.downArrow) {
      const index = state.projectsBrowserState.focusedSkillIndex;
      if (index < visibleRows.length - 1) state.setFocusedProjectSkillIndex(index + 1);
      return true;
    }
    if (key.home || key.end) {
      if (visibleRows.length > 0) {
        state.setFocusedProjectSkillIndex(key.home ? 0 : visibleRows.length - 1);
      }
      return true;
    }
    if (input === '[') {
      state.setActiveProjectSkillFilter(
        cycleContextSkillFilter(state.projectsBrowserState.activeSkillFilter, -1)
      );
      return true;
    }
    if (input === ']') {
      state.setActiveProjectSkillFilter(
        cycleContextSkillFilter(state.projectsBrowserState.activeSkillFilter, 1)
      );
      return true;
    }
    if (input === ' ') {
      const focusedRow = getFocusedContextRow(
        visibleRows,
        state.projectsBrowserState.focusedSkillIndex
      );
      if (focusedRow) {
        state.toggleProjectSkillSelection(focusedRow.rowId);
      }
      return true;
    }
    if (key.return) {
      const focusedRow = getFocusedContextRow(
        visibleRows,
        state.projectsBrowserState.focusedSkillIndex
      );
      if (focusedRow?.registrySkillName) {
        openSkillDetail(store, focusedRow.registrySkillName);
      }
      return true;
    }
    if (key.escape) {
      state.setProjectViewMode('master');
      state.clearProjectSkillSelection();
      state.setFocusedProjectSkillIndex(0);
      return true;
    }
    if (input === 'i') {
      const rows = getSelectedOrFocusedRows(
        visibleRows,
        state.projectsBrowserState.selectedSkillRowIds,
        state.projectsBrowserState.focusedSkillIndex
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
            state.projectsBrowserState.selectedSkillRowIds,
            state.projectsBrowserState.focusedSkillIndex
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
            state.projectsBrowserState.selectedSkillRowIds,
            state.projectsBrowserState.focusedSkillIndex
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
        state.projectsBrowserState.selectedSkillRowIds,
        state.projectsBrowserState.focusedSkillIndex
      );
      const names = Array.from(
        new Set(
          rows
            .filter((row) => row.registrySkillName && row.projectId && row.agentId)
            .map((row) => row.registrySkillName as string)
        )
      );
      const targetIds = Array.from(
        new Set(
          rows
            .filter((row) => row.projectId && row.agentId && row.registrySkillName)
            .map((row) => `${row.projectId}:${row.agentId}`)
        )
      );

      if (names.length > 0 && targetIds.length > 0) {
        state.setSyncFormSelectedSkillNames(new Set(names));
        state.setSyncFormOperation('unsync');
        state.setSyncFormUnsyncScope('projects');
        state.setSyncFormProjectUnsyncMode('specific');
        state.setSyncFormSelectedTargetIds(new Set(targetIds));
        state.setSyncFormSelectedAgentTypes(new Set());
        state.setSyncFormStep('confirm');
        state.setActiveTab('sync');
      }
      return true;
    }
    return false;
  }

  if (key.upArrow) {
    const index = state.projectsBrowserState.focusedIndex;
    if (index > 0) state.setFocusedProjectIndex(index - 1);
    return true;
  }
  if (key.downArrow) {
    const index = state.projectsBrowserState.focusedIndex;
    if (index < state.projects.length - 1) state.setFocusedProjectIndex(index + 1);
    return true;
  }
  if (key.home || key.end) {
    if (state.projects.length > 0) {
      state.setFocusedProjectIndex(key.home ? 0 : state.projects.length - 1);
    }
    return true;
  }
  if (key.return) {
    const focusedProject = state.projects[state.projectsBrowserState.focusedIndex];
    if (focusedProject) {
      state.setProjectViewMode('skills');
      state.clearProjectSkillSelection();
      state.setFocusedProjectSkillIndex(0);
      if (!state.projectDetails[focusedProject.id]) {
        void store.getState().loadProjectDetail(focusedProject.id);
      }
    }
    return true;
  }
  if (input === 'a') {
    state.setFormState({ formType: 'addProject', data: {} });
    return true;
  }
  if (input === 'r') {
    const project = state.projects[state.projectsBrowserState.focusedIndex];
    if (!project) return true;
    const projectSnapshot = { id: project.id, path: project.path, addedAt: project.addedAt };
    state.setConfirmState({
      title: text.mutations.removeProjectTitle(project.id),
      message: text.mutations.removeProjectMessage,
      onConfirm: () => {
        void store.getState().removeProject(project.id);
        store.getState().setConfirmState(null);
        store.getState().pushUndo('remove-project', projectSnapshot);
        store.getState().pushToast(text.mutations.removedProject(project.id), 'success');
      },
    });
    return true;
  }
  if (input === 'i') {
    const project = state.projects[state.projectsBrowserState.focusedIndex];
    if (!project) return true;
    state.setFormState({ formType: 'importProject', data: { projectId: project.id } });
    return true;
  }

  return false;
}
