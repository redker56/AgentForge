import { getFocusedVisibleSkill } from '../../utils/skillsView.js';

import { openSkillDetail, openUpdateForm } from './shared.js';
import type { InputRouteContext } from './types.js';

function getSelectedOrFocusedSkillNames(state: InputRouteContext['state']): string[] {
  const focusedVisibleSkill = getFocusedVisibleSkill(
    state.skills,
    state.skillsBrowserState.activeCategoryFilter,
    state.skillsBrowserState.focusedIndex
  );

  return state.skillsBrowserState.selectedNames.size > 0
    ? [...state.skillsBrowserState.selectedNames]
    : ([focusedVisibleSkill?.name].filter(Boolean) as string[]);
}

export function handleSkillsTabInput({ store, input, key, state }: InputRouteContext): boolean {
  const focusedVisibleSkill = getFocusedVisibleSkill(
    state.skills,
    state.skillsBrowserState.activeCategoryFilter,
    state.skillsBrowserState.focusedIndex
  );

  if (key.upArrow) {
    state.moveFocusUp();
    return true;
  }
  if (key.downArrow) {
    state.moveFocusDown();
    return true;
  }
  if (input === '[') {
    state.cycleSkillCategoryFilter(-1);
    return true;
  }
  if (input === ']') {
    state.cycleSkillCategoryFilter(1);
    return true;
  }
  if (key.return) {
    if (state.shellState.widthBand === 'standard' && focusedVisibleSkill) {
      openSkillDetail(store, focusedVisibleSkill.name);
    }
    return true;
  }
  if (input === ' ') {
    if (focusedVisibleSkill) state.toggleSkillSelection(focusedVisibleSkill.name);
    return true;
  }
  if (input === 'a') {
    state.setFormState({ formType: 'addSkill', data: {} });
    return true;
  }
  if (input === 'c') {
    const names = getSelectedOrFocusedSkillNames(state);
    if (names.length > 0) {
      state.setFormState({
        formType: 'categorizeSkills',
        data: {
          skillNames: JSON.stringify(names),
        },
      });
    }
    return true;
  }
  if (input === 'd' || input === 'r') {
    const names = getSelectedOrFocusedSkillNames(state);
    if (names.length > 0) {
      const agentSyncCount = names.reduce(
        (sum, name) => sum + (state.skillDetails[name]?.syncedTo.length ?? 0),
        0
      );
      const projectSyncCount = names.reduce(
        (sum, name) => sum + (state.skillDetails[name]?.syncedProjects?.length ?? 0),
        0
      );
      state.setConfirmState({
        title: `Delete ${names.length} skill(s)`,
        message: `This will remove ${agentSyncCount} user-level sync(s) and ${projectSyncCount} project sync(s). Files on disk will be deleted.`,
        onConfirm: () => {
          const snapshots = names
            .map((name) => {
              const skill = store.getState().skills.find((entry) => entry.name === name);
              return skill ? { ...skill } : null;
            })
            .filter(Boolean);

          for (const name of names) {
            void store.getState().removeSkill(name);
          }
          store.getState().setConfirmState(null);
          store.getState().clearSelection();
          void store.getState().refreshSkills();

          if (snapshots.length === 1) {
            store.getState().pushUndo('delete-skill', snapshots[0]);
          }

          const message =
            names.length === 1 ? `Deleted '${names[0]}'` : `Deleted ${names.length} skill(s)`;
          store.getState().pushToast(message, 'success');
        },
      });
    }
    return true;
  }
  if (input === 'i') {
    state.setFormState({ formType: 'importProject', data: {} });
    return true;
  }
  if (input === 's') {
    const names = getSelectedOrFocusedSkillNames(state);
    if (names.length > 0) {
      state.setSyncFormSelectedSkillNames(new Set(names));
      state.setSyncFormOperation('sync-agents');
      state.setSyncFormStep('select-targets');
      state.setActiveTab('sync');
    }
    return true;
  }
  if (input === 'p') {
    const names = getSelectedOrFocusedSkillNames(state);
    if (names.length > 0) {
      state.setSyncFormSelectedSkillNames(new Set(names));
      state.setSyncFormOperation('sync-projects');
      state.setSyncFormStep('select-targets');
      state.setActiveTab('sync');
    }
    return true;
  }
  if (input === 'u') {
    openUpdateForm(state, getSelectedOrFocusedSkillNames(state), 'updateSelected');
    return true;
  }
  if (input === 'U') {
    const names = state.skills
      .filter((skill) => skill.source.type === 'git')
      .map((skill) => skill.name);
    openUpdateForm(state, names, 'updateAllGit');
    return true;
  }
  if (input === 'x') {
    const names = getSelectedOrFocusedSkillNames(state);
    if (names.length > 0) {
      state.setSyncFormSelectedSkillNames(new Set(names));
      state.setSyncFormOperation('unsync');
      state.setSyncFormUnsyncScope(null);
      state.setSyncFormProjectUnsyncMode(null);
      state.setSyncFormSelectedTargetIds(new Set());
      state.setSyncFormSelectedAgentTypes(new Set());
      state.setSyncFormStep('select-unsync-scope');
      state.setActiveTab('sync');
    }
    return true;
  }

  return false;
}
