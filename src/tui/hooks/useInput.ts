/**
 * Global keyboard input handler for the TUI
 */

import { useInput } from 'ink';
import type { StoreApi } from 'zustand';

import { BUILTIN_AGENTS } from '../../types.js';
import type {
  ContextSkillRow,
  ContextSkillSection,
  VisibleContextSkillRow,
} from '../contextTypes.js';
import { cycleContextSkillFilter, getVisibleContextSkillRows } from '../contextTypes.js';
import type { AppStore } from '../store/index.js';
import { TAB_IDS } from '../store/index.js';
import { getFocusedVisibleSkill } from '../utils/skillsView.js';

function openSkillDetail(store: StoreApi<AppStore>, skillName: string): void {
  const state = store.getState();
  state.setDetailSkillName(skillName);
  state.setDetailOverlayVisible(true);
  if (!state.skillDetails[skillName]) {
    void store.getState().loadSkillDetail(skillName);
  }
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

function getAgentContextSections(state: AppStore): ContextSkillSection[] {
  const focusedAgent = state.agents[state.focusedAgentIndex];
  if (!focusedAgent) return [];
  return state.agentDetails[focusedAgent.id]?.sections ?? [];
}

function getProjectContextSections(state: AppStore): ContextSkillSection[] {
  const focusedProject = state.projects[state.focusedProjectIndex];
  if (!focusedProject) return [];
  return state.projectDetails[focusedProject.id]?.sections ?? [];
}

function getFocusedContextRow(
  rows: VisibleContextSkillRow[],
  focusedIndex: number
): VisibleContextSkillRow | null {
  if (rows.length === 0) return null;
  return rows[Math.min(focusedIndex, rows.length - 1)] ?? null;
}

function getSelectedOrFocusedRows(
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

    // If detail overlay is active, dismiss on Esc/q
    if (state.detailOverlayVisible) {
      if (key.escape || input === 'q') {
        state.setDetailOverlayVisible(false);
        state.setDetailSkillName(null);
      }
      return;
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
      void state.loadAllData();
      return;
    }

    // Toggle completion modal
    if (input === 'C') {
      state.setCompletionModalOpen(state.completionModalOpen ? null : true);
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
  const focusedVisibleSkill = getFocusedVisibleSkill(
    state.skills,
    state.activeSkillCategoryFilter,
    state.focusedSkillIndex
  );

  if (key.upArrow) {
    state.moveFocusUp();
    return;
  }
  if (key.downArrow) {
    state.moveFocusDown(state.skills.length);
    return;
  }
  if (input === '[') {
    state.cycleSkillCategoryFilter(-1);
    return;
  }
  if (input === ']') {
    state.cycleSkillCategoryFilter(1);
    return;
  }
  if (key.return) {
    if (state.widthBand === 'standard') {
      if (!state.detailOverlayVisible && focusedVisibleSkill) {
        openSkillDetail(store, focusedVisibleSkill.name);
      }
      return;
    }
    // In widescreen, Enter does nothing for skill list (detail always visible)
    return;
  }
  if (input === ' ') {
    const focused = focusedVisibleSkill;
    if (focused) state.toggleSkillSelection(focused.name);
    return;
  }
  if (input === 'a') {
    state.setFormState({ formType: 'addSkill', data: {} });
    return;
  }
  if (input === 'c') {
    const names =
      state.selectedSkillNames.size > 0
        ? [...state.selectedSkillNames]
        : ([focusedVisibleSkill?.name].filter(Boolean) as string[]);
    if (names.length > 0) {
      state.setFormState({
        formType: 'categorizeSkills',
        data: {
          skillNames: JSON.stringify(names),
        },
      });
    }
    return;
  }
  if (input === 'd' || input === 'r') {
    const names =
      state.selectedSkillNames.size > 0
        ? [...state.selectedSkillNames]
        : ([focusedVisibleSkill?.name].filter(Boolean) as string[]);
    if (names.length > 0) {
      const agentSyncCount = names.reduce(
        (sum, n) => sum + (state.skillDetails[n]?.syncedTo.length ?? 0),
        0
      );
      const projectSyncCount = names.reduce(
        (sum, n) => sum + (state.skillDetails[n]?.syncedProjects?.length ?? 0),
        0
      );
      state.setConfirmState({
        title: `Delete ${names.length} skill(s)`,
        message: `This will remove ${agentSyncCount} user-level sync(s) and ${projectSyncCount} project sync(s). Files on disk will be deleted.`,
        onConfirm: () => {
          // Build undo snapshots for deleted skills (single-skill only per A-17)
          const snapshots = names
            .map((name) => {
              const skill = store.getState().skills.find((s) => s.name === name);
              return skill ? { ...skill } : null;
            })
            .filter(Boolean);

          for (const name of names) {
            void store.getState().removeSkill(name);
          }
          store.getState().setConfirmState(null);
          store.getState().clearSelection();
          void store.getState().refreshSkills();

          // Push undo entry for single-skill deletes only
          if (snapshots.length === 1) {
            store.getState().pushUndo('delete-skill', snapshots[0]);
          }
          // Push toast
          const msg =
            names.length === 1 ? `Deleted '${names[0]}'` : `Deleted ${names.length} skill(s)`;
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
    const names =
      state.selectedSkillNames.size > 0
        ? [...state.selectedSkillNames]
        : ([focusedVisibleSkill?.name].filter(Boolean) as string[]);
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
    const names =
      state.selectedSkillNames.size > 0
        ? [...state.selectedSkillNames]
        : ([focusedVisibleSkill?.name].filter(Boolean) as string[]);
    if (names.length > 0) {
      state.setSyncFormSelectedSkillNames(new Set(names));
      state.setSyncFormOperation('sync-projects');
      state.setSyncFormStep('select-targets');
      state.setActiveTab('sync');
    }
    return;
  }
  if (input === 'u') {
    const names =
      state.selectedSkillNames.size > 0
        ? [...state.selectedSkillNames]
        : ([focusedVisibleSkill?.name].filter(Boolean) as string[]);
    openUpdateForm(state, names, 'updateSelected');
    return;
  }
  if (input === 'U') {
    const names = state.skills
      .filter((skill) => skill.source.type === 'git')
      .map((skill) => skill.name);
    openUpdateForm(state, names, 'updateAllGit');
    return;
  }
  if (input === 'x') {
    // Unsync focused/selected skills -- switch to sync tab pre-configured
    const names =
      state.selectedSkillNames.size > 0
        ? [...state.selectedSkillNames]
        : ([focusedVisibleSkill?.name].filter(Boolean) as string[]);
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
    return;
  }
}

function handleAgentsKeys(
  store: StoreApi<AppStore>,
  input: string,
  key: { upArrow?: boolean; downArrow?: boolean; return?: boolean; escape?: boolean },
  state: AppStore
): void {
  const sections = getAgentContextSections(state);
  const visibleRows = getVisibleContextSkillRows(sections, state.activeAgentSkillFilter);

  if (state.agentViewMode === 'skills') {
    if (key.upArrow) {
      const idx = state.focusedAgentSkillIndex;
      if (idx > 0) state.setFocusedAgentSkillIndex(idx - 1);
      return;
    }
    if (key.downArrow) {
      const idx = state.focusedAgentSkillIndex;
      if (idx < visibleRows.length - 1) state.setFocusedAgentSkillIndex(idx + 1);
      return;
    }
    if (input === '[') {
      state.setActiveAgentSkillFilter(cycleContextSkillFilter(state.activeAgentSkillFilter, -1));
      return;
    }
    if (input === ']') {
      state.setActiveAgentSkillFilter(cycleContextSkillFilter(state.activeAgentSkillFilter, 1));
      return;
    }
    if (input === ' ') {
      const focusedRow = getFocusedContextRow(visibleRows, state.focusedAgentSkillIndex);
      if (focusedRow) {
        state.toggleAgentSkillSelection(focusedRow.rowId);
      }
      return;
    }
    if (key.return) {
      const focusedRow = getFocusedContextRow(visibleRows, state.focusedAgentSkillIndex);
      if (focusedRow?.registrySkillName) {
        openSkillDetail(store, focusedRow.registrySkillName);
      }
      return;
    }
    if (key.escape) {
      state.setAgentViewMode('master');
      state.clearAgentSkillSelection();
      state.setFocusedAgentSkillIndex(0);
      return;
    }
    if (input === 'i') {
      const rows = getSelectedOrFocusedRows(
        visibleRows,
        state.selectedAgentSkillRowIds,
        state.focusedAgentSkillIndex
      );
      if (rows.length > 0) {
        state.setFormState({
          formType: 'importContextSkills',
          data: { rows: JSON.stringify(rows) },
        });
      }
      return;
    }
    if (input === 'u') {
      const names = Array.from(
        new Set(
          getSelectedOrFocusedRows(
            visibleRows,
            state.selectedAgentSkillRowIds,
            state.focusedAgentSkillIndex
          )
            .map((row) => row.registrySkillName)
            .filter((name): name is string => Boolean(name))
        )
      );
      openUpdateForm(state, names, 'updateSelected');
      return;
    }
    if (input === 'c') {
      const names = Array.from(
        new Set(
          getSelectedOrFocusedRows(
            visibleRows,
            state.selectedAgentSkillRowIds,
            state.focusedAgentSkillIndex
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
      return;
    }
    if (input === 'x') {
      const rows = getSelectedOrFocusedRows(
        visibleRows,
        state.selectedAgentSkillRowIds,
        state.focusedAgentSkillIndex
      );
      const names = Array.from(
        new Set(
          rows
            .filter((row) => row.registrySkillName && row.syncMode)
            .map((row) => row.registrySkillName as string)
        )
      );
      const focusedAgent = state.agents[state.focusedAgentIndex];
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
      return;
    }
    return;
  }

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
      state.setAgentViewMode('skills');
      state.clearAgentSkillSelection();
      state.setFocusedAgentSkillIndex(0);
      if (!state.agentDetails[focusedAgent.id]) {
        void state.loadAgentDetail(focusedAgent.id);
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
    const builtinIds = BUILTIN_AGENTS.map((a) => a.id);
    if (builtinIds.includes(agent.id)) {
      // Built-in agents cannot be removed
      return;
    }
    state.setConfirmState({
      title: `Remove Agent "${agent.name}"`,
      message: 'Files stay on disk. AgentForge will forget sync references tied to this Agent.',
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
        store.getState().pushToast(`Removed agent '${agent.name}'`, 'success');
      },
    });
    return;
  }
}

function handleProjectsKeys(
  store: StoreApi<AppStore>,
  input: string,
  key: { upArrow?: boolean; downArrow?: boolean; return?: boolean; escape?: boolean },
  state: AppStore
): void {
  const sections = getProjectContextSections(state);
  const visibleRows = getVisibleContextSkillRows(sections, state.activeProjectSkillFilter);

  if (state.projectViewMode === 'skills') {
    if (key.upArrow) {
      const idx = state.focusedProjectSkillIndex;
      if (idx > 0) state.setFocusedProjectSkillIndex(idx - 1);
      return;
    }
    if (key.downArrow) {
      const idx = state.focusedProjectSkillIndex;
      if (idx < visibleRows.length - 1) state.setFocusedProjectSkillIndex(idx + 1);
      return;
    }
    if (input === '[') {
      state.setActiveProjectSkillFilter(
        cycleContextSkillFilter(state.activeProjectSkillFilter, -1)
      );
      return;
    }
    if (input === ']') {
      state.setActiveProjectSkillFilter(cycleContextSkillFilter(state.activeProjectSkillFilter, 1));
      return;
    }
    if (input === ' ') {
      const focusedRow = getFocusedContextRow(visibleRows, state.focusedProjectSkillIndex);
      if (focusedRow) {
        state.toggleProjectSkillSelection(focusedRow.rowId);
      }
      return;
    }
    if (key.return) {
      const focusedRow = getFocusedContextRow(visibleRows, state.focusedProjectSkillIndex);
      if (focusedRow?.registrySkillName) {
        openSkillDetail(store, focusedRow.registrySkillName);
      }
      return;
    }
    if (key.escape) {
      state.setProjectViewMode('master');
      state.clearProjectSkillSelection();
      state.setFocusedProjectSkillIndex(0);
      return;
    }
    if (input === 'i') {
      const rows = getSelectedOrFocusedRows(
        visibleRows,
        state.selectedProjectSkillRowIds,
        state.focusedProjectSkillIndex
      );
      if (rows.length > 0) {
        state.setFormState({
          formType: 'importContextSkills',
          data: { rows: JSON.stringify(rows) },
        });
      }
      return;
    }
    if (input === 'u') {
      const names = Array.from(
        new Set(
          getSelectedOrFocusedRows(
            visibleRows,
            state.selectedProjectSkillRowIds,
            state.focusedProjectSkillIndex
          )
            .map((row) => row.registrySkillName)
            .filter((name): name is string => Boolean(name))
        )
      );
      openUpdateForm(state, names, 'updateSelected');
      return;
    }
    if (input === 'c') {
      const names = Array.from(
        new Set(
          getSelectedOrFocusedRows(
            visibleRows,
            state.selectedProjectSkillRowIds,
            state.focusedProjectSkillIndex
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
      return;
    }
    if (input === 'x') {
      const rows = getSelectedOrFocusedRows(
        visibleRows,
        state.selectedProjectSkillRowIds,
        state.focusedProjectSkillIndex
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
      return;
    }
    return;
  }

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
      state.setProjectViewMode('skills');
      state.clearProjectSkillSelection();
      state.setFocusedProjectSkillIndex(0);
      if (!state.projectDetails[focusedProject.id]) {
        void store.getState().loadProjectDetail(focusedProject.id);
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
      message:
        'Files stay on disk. AgentForge will forget the project and its recorded sync references.',
      onConfirm: () => {
        void store.getState().removeProject(project.id);
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
