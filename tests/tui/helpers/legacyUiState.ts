import { ALL_SKILL_CATEGORY_FILTER } from '../../../src/types.js';

type AnyState = Record<string, unknown>;

function defineAlias<T>(state: AnyState, key: string, getter: () => T): void {
  if (Object.prototype.hasOwnProperty.call(state, key)) {
    return;
  }

  Object.defineProperty(state, key, {
    enumerable: true,
    configurable: true,
    get: getter,
  });
}

export function withLegacyUiState<T extends AnyState>(state: T): T {
  const shellState = (state.shellState as AnyState | undefined) ?? {
    activeTab: state.activeTab ?? 'skills',
    locale: state.locale ?? 'en',
    languagePreference: state.languagePreference ?? 'auto',
    languageSelectorOpen: state.languageSelectorOpen ?? false,
    languageSelectorFocusedIndex: state.languageSelectorFocusedIndex ?? 0,
    searchQuery: state.searchQuery ?? '',
    detailOverlayVisible: state.detailOverlayVisible ?? false,
    detailSkillName: state.detailSkillName ?? null,
    widthBand: state.widthBand ?? 'standard',
    formDirty: state.formDirty ?? false,
    showSearch: state.showSearch ?? false,
    showHelp: state.showHelp ?? false,
    showCommandPalette: state.showCommandPalette ?? false,
    confirmState: state.confirmState ?? null,
    formState: state.formState ?? null,
    conflictState: state.conflictState ?? null,
    focusedConflictIndex: state.focusedConflictIndex ?? 0,
    completionModalOpen: state.completionModalOpen ?? null,
    searchResultIndex: state.searchResultIndex ?? 0,
    tabSwitchPending: state.tabSwitchPending ?? null,
    dirtyConfirmActive: state.dirtyConfirmActive ?? false,
    undoBuffer: state.undoBuffer ?? null,
    undoActive: state.undoActive ?? false,
    toastQueue: state.toastQueue ?? [],
    activeToast: state.activeToast ?? null,
    updateProgressItems: state.updateProgressItems ?? [],
  };

  const skillsBrowserState = (state.skillsBrowserState as AnyState | undefined) ?? {
    focusedIndex: state.focusedSkillIndex ?? 0,
    selectedNames: state.selectedSkillNames ?? new Set<string>(),
    activeCategoryFilter: state.activeSkillCategoryFilter ?? ALL_SKILL_CATEGORY_FILTER,
  };

  const agentsBrowserState = (state.agentsBrowserState as AnyState | undefined) ?? {
    focusedIndex: state.focusedAgentIndex ?? 0,
    viewMode: state.agentViewMode ?? 'master',
    focusedSkillIndex: state.focusedAgentSkillIndex ?? 0,
    selectedSkillRowIds: state.selectedAgentSkillRowIds ?? new Set<string>(),
    activeSkillFilter: state.activeAgentSkillFilter ?? 'all',
  };

  const projectsBrowserState = (state.projectsBrowserState as AnyState | undefined) ?? {
    focusedIndex: state.focusedProjectIndex ?? 0,
    viewMode: state.projectViewMode ?? 'master',
    focusedSkillIndex: state.focusedProjectSkillIndex ?? 0,
    selectedSkillRowIds: state.selectedProjectSkillRowIds ?? new Set<string>(),
    activeSkillFilter: state.activeProjectSkillFilter ?? 'all',
  };

  const syncWorkflowState = (state.syncWorkflowState as AnyState | undefined) ?? {
    step: state.syncFormStep ?? 'select-op',
    operation: state.syncFormOperation ?? 'sync-agents',
    selectedSkillNames: state.syncFormSelectedSkillNames ?? new Set<string>(),
    unsyncScope: state.syncFormUnsyncScope ?? null,
    selectedTargetIds: state.syncFormSelectedTargetIds ?? new Set<string>(),
    projectUnsyncMode: state.syncFormProjectUnsyncMode ?? null,
    selectedAgentTypes: state.syncFormSelectedAgentTypes ?? new Set<string>(),
    loadingTargets: state.syncFormLoadingTargets ?? false,
    mode: state.syncFormMode ?? 'copy',
    results: state.syncFormResults ?? [],
    focusedIndex: state.syncFormFocusedIndex ?? 0,
    preview: state.syncWorkflowPreview ?? null,
    previewError: state.syncWorkflowPreviewError ?? null,
  };

  const importWorkflowState = (state.importWorkflowState as AnyState | undefined) ?? {
    step: state.importTabStep ?? 'select-source-type',
    sourceType: state.importTabSourceType ?? 'project',
    sourceId: state.importTabSourceId ?? null,
    sourceLabel: state.importTabSourceLabel ?? null,
    selectedSkillNames: state.importTabSelectedSkillNames ?? new Set<string>(),
    results: state.importTabResults ?? [],
    focusedIndex: state.importTabFocusedIndex ?? 0,
    discoveredSkills: state.importDiscoveredSkills ?? [],
  };

  state.shellState = shellState;
  state.skillsBrowserState = skillsBrowserState;
  state.agentsBrowserState = agentsBrowserState;
  state.projectsBrowserState = projectsBrowserState;
  state.syncWorkflowState = syncWorkflowState;
  state.importWorkflowState = importWorkflowState;

  defineAlias(state, 'activeTab', () => shellState.activeTab);
  defineAlias(state, 'locale', () => shellState.locale);
  defineAlias(state, 'languagePreference', () => shellState.languagePreference);
  defineAlias(state, 'languageSelectorOpen', () => shellState.languageSelectorOpen);
  defineAlias(state, 'languageSelectorFocusedIndex', () => shellState.languageSelectorFocusedIndex);
  defineAlias(state, 'showSearch', () => shellState.showSearch);
  defineAlias(state, 'showHelp', () => shellState.showHelp);
  defineAlias(state, 'showCommandPalette', () => shellState.showCommandPalette);
  defineAlias(state, 'confirmState', () => shellState.confirmState);
  defineAlias(state, 'formState', () => shellState.formState);
  defineAlias(state, 'conflictState', () => shellState.conflictState);
  defineAlias(state, 'completionModalOpen', () => shellState.completionModalOpen);
  defineAlias(state, 'detailOverlayVisible', () => shellState.detailOverlayVisible);
  defineAlias(state, 'detailSkillName', () => shellState.detailSkillName);
  defineAlias(state, 'dirtyConfirmActive', () => shellState.dirtyConfirmActive);
  defineAlias(state, 'undoBuffer', () => shellState.undoBuffer);
  defineAlias(state, 'undoActive', () => shellState.undoActive);
  defineAlias(state, 'activeToast', () => shellState.activeToast);
  defineAlias(state, 'updateProgressItems', () => shellState.updateProgressItems);
  defineAlias(state, 'focusedSkillIndex', () => skillsBrowserState.focusedIndex);
  defineAlias(state, 'selectedSkillNames', () => skillsBrowserState.selectedNames);
  defineAlias(state, 'activeSkillCategoryFilter', () => skillsBrowserState.activeCategoryFilter);
  defineAlias(state, 'focusedAgentIndex', () => agentsBrowserState.focusedIndex);
  defineAlias(state, 'agentViewMode', () => agentsBrowserState.viewMode);
  defineAlias(state, 'focusedAgentSkillIndex', () => agentsBrowserState.focusedSkillIndex);
  defineAlias(state, 'selectedAgentSkillRowIds', () => agentsBrowserState.selectedSkillRowIds);
  defineAlias(state, 'activeAgentSkillFilter', () => agentsBrowserState.activeSkillFilter);
  defineAlias(state, 'focusedProjectIndex', () => projectsBrowserState.focusedIndex);
  defineAlias(state, 'projectViewMode', () => projectsBrowserState.viewMode);
  defineAlias(state, 'focusedProjectSkillIndex', () => projectsBrowserState.focusedSkillIndex);
  defineAlias(state, 'selectedProjectSkillRowIds', () => projectsBrowserState.selectedSkillRowIds);
  defineAlias(state, 'activeProjectSkillFilter', () => projectsBrowserState.activeSkillFilter);
  defineAlias(state, 'syncFormStep', () => syncWorkflowState.step);
  defineAlias(state, 'syncFormOperation', () => syncWorkflowState.operation);
  defineAlias(state, 'syncFormSelectedSkillNames', () => syncWorkflowState.selectedSkillNames);
  defineAlias(state, 'syncFormUnsyncScope', () => syncWorkflowState.unsyncScope);
  defineAlias(state, 'syncFormSelectedTargetIds', () => syncWorkflowState.selectedTargetIds);
  defineAlias(state, 'syncFormProjectUnsyncMode', () => syncWorkflowState.projectUnsyncMode);
  defineAlias(state, 'syncFormSelectedAgentTypes', () => syncWorkflowState.selectedAgentTypes);
  defineAlias(state, 'syncFormLoadingTargets', () => syncWorkflowState.loadingTargets);
  defineAlias(state, 'syncFormMode', () => syncWorkflowState.mode);
  defineAlias(state, 'syncFormResults', () => syncWorkflowState.results);
  defineAlias(state, 'syncFormFocusedIndex', () => syncWorkflowState.focusedIndex);
  defineAlias(state, 'importTabStep', () => importWorkflowState.step);
  defineAlias(state, 'importTabSourceType', () => importWorkflowState.sourceType);
  defineAlias(state, 'importTabSourceId', () => importWorkflowState.sourceId);
  defineAlias(state, 'importTabSourceLabel', () => importWorkflowState.sourceLabel);
  defineAlias(state, 'importTabSelectedSkillNames', () => importWorkflowState.selectedSkillNames);
  defineAlias(state, 'importTabResults', () => importWorkflowState.results);
  defineAlias(state, 'importTabFocusedIndex', () => importWorkflowState.focusedIndex);

  return state;
}
