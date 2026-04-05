/**
 * Global keyboard input handler for the TUI
 */

import { useInput } from 'ink';
import type { StoreApi } from 'zustand';
import type { AppStore, TabId } from '../store/index.js';
import { TAB_IDS } from '../store/index.js';
import { BUILTIN_AGENTS } from '../../types.js';

export function useInputHandler(store: StoreApi<AppStore>): void {
  useInput((input, key) => {
    const state = store.getState();

    // === DIRTY FORM CONFIRM (highest priority) ===
    if (state.dirtyConfirmActive) {
      if (input === 'y') {
        const target = state.tabSwitchPending;
        state.setFormDirty(false);
        state.setDirtyConfirmActive(false);
        state.setTabSwitchPending(null);
        if (target) state.setActiveTab(target);
        return;
      }
      if (input === 'n' || key.escape) {
        state.setDirtyConfirmActive(false);
        state.setTabSwitchPending(null);
        return;
      }
      return; // Block all other input while confirm is active
    }

    // === OVERLAY GATING ===

    // If command palette is active, let the CommandPalette component handle its own input
    // (CommandPalette uses a local useInput with isActive gating)
    if (state.showCommandPalette) {
      if (key.escape) {
        state.setShowCommandPalette(false);
      }
      return;
    }

    // If search is active, SearchOverlay handles its own input via local useInput
    if (state.showSearch) {
      if (key.escape) {
        state.setShowSearch(false);
      }
      return;
    }

    // If help is active, only Esc/? closes it
    if (state.showHelp) {
      if (input === '?' || key.escape) {
        state.setShowHelp(false);
      }
      return;
    }

    // If confirm modal is active, only Enter/Esc are handled
    if (state.confirmState) {
      if (key.return) {
        state.confirmState.onConfirm();
        return;
      }
      if (key.escape) {
        state.setConfirmState(null);
        return;
      }
      return; // Block all other input
    }

    // If form is active, only Esc is handled by global handler
    // (form components handle their own input via local useInput / ink-text-input)
    if (state.formState) {
      if (key.escape) {
        state.setFormState(null);
        state.setFormDirty(false);
        return;
      }
      return; // Block all other input -- form handles it
    }

    // If conflict panel is active, delegate to conflict handler
    if (state.conflictState) {
      handleConflictKeys(store, input, key, state);
      return;
    }

    // If detail overlay is active on skills tab, dismiss on Esc/q
    if (state.detailOverlayVisible && state.activeTab === 'skills') {
      if (key.escape || input === 'q') {
        state.setDetailOverlayVisible(false);
        return;
      }
    }

    // === GLOBAL SHORTCUTS ===

    // Toggle help
    if (input === '?') {
      state.setShowHelp(true);
      return;
    }

    // Toggle search
    if (input === '/') {
      state.setShowSearch(true);
      return;
    }

    // Command palette (Ctrl+P)
    if (input === 'p' && key.ctrl) {
      state.setShowCommandPalette(true);
      return;
    }

    // Tab navigation -- left/right arrow keys (with dirty form check)
    if (key.leftArrow) {
      const idx = TAB_IDS.indexOf(state.activeTab);
      const targetTab = idx > 0 ? TAB_IDS[idx - 1] : null;
      if (targetTab) {
        if (state.formDirty) {
          state.setTabSwitchPending(targetTab);
          state.setDirtyConfirmActive(true);
        } else {
          state.setActiveTab(targetTab);
        }
      }
      return;
    }
    if (key.rightArrow) {
      const idx = TAB_IDS.indexOf(state.activeTab);
      const targetTab = idx < TAB_IDS.length - 1 ? TAB_IDS[idx + 1] : null;
      if (targetTab) {
        if (state.formDirty) {
          state.setTabSwitchPending(targetTab);
          state.setDirtyConfirmActive(true);
        } else {
          state.setActiveTab(targetTab);
        }
      }
      return;
    }

    // Number key tab switching (with dirty form check)
    if (input >= '1' && input <= '5') {
      const targetTab = TAB_IDS[parseInt(input) - 1];
      if (targetTab) {
        if (state.formDirty) {
          state.setTabSwitchPending(targetTab);
          state.setDirtyConfirmActive(true);
        } else {
          state.setActiveTab(targetTab);
        }
      }
      return;
    }

    // Refresh
    if (input === 'R') {
      state.loadAllData();
      return;
    }

    // Toggle completion modal
    if (input === 'C') {
      state.setCompletionModalOpen(
        state.completionModalOpen ? null : true
      );
      return;
    }

    // Undo handler (Sprint 3)
    if (input === 'z') {
      if (state.undoActive && state.undoBuffer) {
        state.executeUndo();
      }
      return;
    }

    // === TAB-SPECIFIC HANDLERS ===

    if (state.activeTab === 'skills') {
      handleSkillsKeys(store, input, key, state);
    } else if (state.activeTab === 'agents') {
      handleAgentsKeys(store, input, key, state);
    } else if (state.activeTab === 'projects') {
      handleProjectsKeys(store, input, key, state);
    }

    // Quit (always available except when detail overlay is being dismissed -- handled above)
    if (input === 'q') {
      process.exit(0);
    }
  });
}

function handleConflictKeys(
  store: StoreApi<AppStore>,
  input: string,
  key: { upArrow?: boolean; downArrow?: boolean; return?: boolean; escape?: boolean },
  state: AppStore
): void {
  if (!state.conflictState) return;

  if (key.upArrow) {
    const idx = state.focusedConflictIndex;
    if (idx > 0) state.setFocusedConflictIndex(idx - 1);
    return;
  }
  if (key.downArrow) {
    const conflicts = state.conflictState.conflicts;
    if (state.focusedConflictIndex < conflicts.length - 1) {
      state.setFocusedConflictIndex(state.focusedConflictIndex + 1);
    }
    return;
  }
  if (input === ' ') {
    // Toggle resolution for focused conflict
    const conflict = state.conflictState.conflicts[state.focusedConflictIndex];
    if (conflict && !conflict.sameContent) {
      const newResolution: 'link' | 'skip' = conflict.resolution === 'link' ? 'skip' : 'link';
      const updatedConflicts = state.conflictState.conflicts.map((c, i) =>
        i === state.focusedConflictIndex ? { ...c, resolution: newResolution } : c
      );
      state.setConflictState({ ...state.conflictState, conflicts: updatedConflicts });
    }
    return;
  }
  if (key.return) {
    // Confirm all resolutions
    state.conflictState.onComplete();
    state.setConflictState(null);
    return;
  }
  if (key.escape) {
    // Skip all unresolved
    state.conflictState.onComplete();
    state.setConflictState(null);
    return;
  }
}

function handleSkillsKeys(
  store: StoreApi<AppStore>,
  input: string,
  key: { upArrow?: boolean; downArrow?: boolean; return?: boolean; escape?: boolean },
  state: AppStore
): void {
  if (key.upArrow) {
    state.moveFocusUp();
    return;
  }
  if (key.downArrow) {
    state.moveFocusDown(state.skills.length);
    return;
  }
  if (key.return) {
    if (state.widthBand === 'standard') {
      if (!state.detailOverlayVisible) {
        state.setDetailOverlayVisible(true);
        const focused = state.skills[state.focusedSkillIndex];
        if (focused && !state.skillDetails[focused.name]) {
          store.getState().loadSkillDetail(focused.name);
        }
      }
      return;
    }
    // In widescreen, Enter does nothing for skill list (detail always visible)
    return;
  }
  if (input === ' ') {
    const focused = state.skills[state.focusedSkillIndex];
    if (focused) state.toggleSkillSelection(focused.name);
    return;
  }
  if (input === 'a') {
    state.setFormState({ formType: 'addSkill', data: {} });
    return;
  }
  if (input === 'd' || input === 'r') {
    const names = state.selectedSkillNames.size > 0
      ? [...state.selectedSkillNames]
      : [state.skills[state.focusedSkillIndex]?.name].filter(Boolean) as string[];
    if (names.length > 0) {
      const agentSyncCount = names.reduce((sum, n) => sum + (state.skillDetails[n]?.syncedTo.length ?? 0), 0);
      const projectSyncCount = names.reduce((sum, n) => sum + (state.skillDetails[n]?.syncedProjects?.length ?? 0), 0);
      state.setConfirmState({
        title: `Delete ${names.length} skill(s)`,
        message: `This will remove ${agentSyncCount} user-level sync(s) and ${projectSyncCount} project sync(s). Files on disk will be deleted.`,
        onConfirm: async () => {
          // Build undo snapshots for deleted skills (single-skill only per A-17)
          const snapshots = names.map(name => {
            const skill = store.getState().skills.find(s => s.name === name);
            return skill ? { ...skill } : null;
          }).filter(Boolean);

          for (const name of names) {
            await store.getState().removeSkill(name);
          }
          store.getState().setConfirmState(null);
          store.getState().clearSelection();
          await store.getState().refreshSkills();

          // Push undo entry for single-skill deletes only
          if (snapshots.length === 1) {
            store.getState().pushUndo('delete-skill', snapshots[0]);
          }
          // Push toast
          const msg = names.length === 1
            ? `Deleted '${names[0]}'`
            : `Deleted ${names.length} skill(s)`;
          store.getState().pushToast(msg, 'success');
        },
      });
    }
    return;
  }
  if (input === 'i') {
    state.setFormState({ formType: 'importProject', data: {} });
    return;
  }
  if (input === 's') {
    // Sync focused/selected skills to agents -- switch to sync tab pre-configured
    const names = state.selectedSkillNames.size > 0
      ? [...state.selectedSkillNames]
      : [state.skills[state.focusedSkillIndex]?.name].filter(Boolean) as string[];
    if (names.length > 0) {
      state.setSyncFormSelectedSkillNames(new Set(names));
      state.setSyncFormOperation('sync-agents');
      state.setSyncFormStep('select-targets');
      state.setActiveTab('sync');
    }
    return;
  }
  if (input === 'p') {
    // Sync focused/selected skills to projects -- switch to sync tab pre-configured
    const names = state.selectedSkillNames.size > 0
      ? [...state.selectedSkillNames]
      : [state.skills[state.focusedSkillIndex]?.name].filter(Boolean) as string[];
    if (names.length > 0) {
      state.setSyncFormSelectedSkillNames(new Set(names));
      state.setSyncFormOperation('sync-projects');
      state.setSyncFormStep('select-targets');
      state.setActiveTab('sync');
    }
    return;
  }
  if (input === 'u') {
    // Update focused skill in place (no tab switch) -- call unconditionally
    const skill = state.skills[state.focusedSkillIndex];
    if (skill) {
      void store.getState().updateSkill(skill.name);
    }
    return;
  }
  if (input === 'U') {
    // Update all git-sourced skills in place
    store.getState().updateAllSkills();
    return;
  }
  if (input === 'x') {
    // Unsync focused/selected skills -- switch to sync tab pre-configured
    const names = state.selectedSkillNames.size > 0
      ? [...state.selectedSkillNames]
      : [state.skills[state.focusedSkillIndex]?.name].filter(Boolean) as string[];
    if (names.length > 0) {
      state.setSyncFormSelectedSkillNames(new Set(names));
      state.setSyncFormOperation('unsync');
      state.setSyncFormStep('select-targets');
      state.setActiveTab('sync');
    }
    return;
  }
}

function handleAgentsKeys(
  store: StoreApi<AppStore>,
  input: string,
  key: { upArrow?: boolean; downArrow?: boolean; return?: boolean },
  state: AppStore
): void {
  if (key.upArrow) {
    const idx = state.focusedAgentIndex;
    if (idx > 0) state.setFocusedAgentIndex(idx - 1);
    return;
  }
  if (key.downArrow) {
    const idx = state.focusedAgentIndex;
    if (idx < state.agents.length - 1) state.setFocusedAgentIndex(idx + 1);
    return;
  }
  if (key.return) {
    const focusedAgent = state.agents[state.focusedAgentIndex];
    if (focusedAgent) {
      state.toggleAgentExpanded(focusedAgent.id);
      // Lazy-load detail if not cached
      if (!state.agentDetails[focusedAgent.id]) {
        state.loadAgentDetail(focusedAgent.id);
      }
    }
    return;
  }
  if (input === 'a') {
    state.setFormState({ formType: 'addAgent', data: {} });
    return;
  }
  if (input === 'r') {
    const agent = state.agents[state.focusedAgentIndex];
    if (!agent) return;
    const builtinIds = BUILTIN_AGENTS.map(a => a.id);
    if (builtinIds.includes(agent.id)) {
      // Built-in agents cannot be removed
      return;
    }
    state.setConfirmState({
      title: `Remove Agent "${agent.name}"`,
      message: 'Files stay on disk. AgentForge will forget sync references tied to this Agent.',
      onConfirm: async () => {
        const agentSnapshot = { id: agent.id, name: agent.name, basePath: agent.basePath, skillsDirName: agent.skillsDirName };
        await store.getState().removeAgent(agent.id);
        store.getState().setConfirmState(null);
        store.getState().pushUndo('remove-agent', agentSnapshot);
        store.getState().pushToast(`Removed agent '${agent.name}'`, 'success');
      },
    });
    return;
  }
}

function handleProjectsKeys(
  store: StoreApi<AppStore>,
  input: string,
  key: { upArrow?: boolean; downArrow?: boolean; return?: boolean },
  state: AppStore
): void {
  if (key.upArrow) {
    const idx = state.focusedProjectIndex;
    if (idx > 0) state.setFocusedProjectIndex(idx - 1);
    return;
  }
  if (key.downArrow) {
    const idx = state.focusedProjectIndex;
    if (idx < state.projects.length - 1) state.setFocusedProjectIndex(idx + 1);
    return;
  }
  if (key.return) {
    const focusedProject = state.projects[state.focusedProjectIndex];
    if (focusedProject) {
      state.toggleProjectExpanded(focusedProject.id);
      // Lazy-load detail if not cached
      if (!state.projectDetails[focusedProject.id]) {
        state.loadProjectDetail(focusedProject.id);
      }
    }
    return;
  }
  if (input === 'a') {
    state.setFormState({ formType: 'addProject', data: {} });
    return;
  }
  if (input === 'r') {
    const project = state.projects[state.focusedProjectIndex];
    if (!project) return;
    const projectSnapshot = { id: project.id, path: project.path, addedAt: project.addedAt };
    state.setConfirmState({
      title: `Remove Project "${project.id}"`,
      message: 'Files stay on disk. AgentForge will forget the project and its recorded sync references.',
      onConfirm: async () => {
        await store.getState().removeProject(project.id);
        store.getState().setConfirmState(null);
        store.getState().pushUndo('remove-project', projectSnapshot);
        store.getState().pushToast(`Removed project '${project.id}'`, 'success');
      },
    });
    return;
  }
  if (input === 'i') {
    const project = state.projects[state.focusedProjectIndex];
    if (!project) return;
    state.setFormState({ formType: 'importProject', data: { projectId: project.id } });
    return;
  }
}
