/**
 * UI State Slice
 */

import type { StateCreator } from 'zustand';

import type { ImportCandidate, SyncPreview } from '../../app/workbench-types.js';
import {
  ALL_SKILL_CATEGORY_FILTER,
  getSkillCategoryCounts,
  type SkillCategoryFilter,
  type SyncMode,
  type TuiLanguagePreference,
} from '../../types.js';
import type { ContextSkillFilter } from '../contextTypes.js';
import { getTuiText, type TuiLocale } from '../i18n.js';
import {
  getClampedFocusedSkillIndex,
  getVisibleSkillIndices,
  resolveNextSkillCategoryFilter,
} from '../utils/skillsView.js';

export type TabId = 'skills' | 'agents' | 'projects' | 'sync' | 'import';
export type SyncOperation = 'sync-agents' | 'sync-projects' | 'unsync';
export type SyncFormStep =
  | 'select-op'
  | 'select-skills'
  | 'select-unsync-scope'
  | 'select-targets'
  | 'select-unsync-project-mode'
  | 'select-agent-types'
  | 'select-mode'
  | 'confirm'
  | 'executing'
  | 'results';
export type ImportFormTabStep =
  | 'select-source-type'
  | 'select-source'
  | 'select-skills'
  | 'confirm'
  | 'executing'
  | 'results';

export interface OperationResult {
  target: string;
  success: boolean;
  error?: string;
  outcome?: 'success' | 'error' | 'skipped';
}

export interface UpdateResult {
  skillName: string;
  sourceType: 'git' | 'local' | 'project' | 'unknown';
  outcome: 'updated' | 'skipped' | 'error';
  detail?: string;
}

export type FormType =
  | 'addSkill'
  | 'addAgent'
  | 'addProject'
  | 'importProject'
  | 'importAgent'
  | 'importContextSkills'
  | 'categorizeSkills'
  | 'updateSelected'
  | 'updateAllGit';

export interface ConfirmState {
  title: string;
  message: string;
  onConfirm: () => void;
}

export interface ConflictEntry {
  agentId: string;
  agentName: string;
  sameContent: boolean;
  resolution: 'link' | 'skip' | 'pending';
}

export interface ConflictInfo {
  skillName: string;
  conflicts: ConflictEntry[];
  onComplete: () => void;
}

export interface FormState {
  formType: FormType;
  data: Record<string, string>;
}

export interface ProgressItem {
  id: string;
  label: string;
  progress: number;
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
}

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  expiresAt: number;
}

export interface UndoSnapshot {
  action: 'delete-skill' | 'remove-agent' | 'remove-project';
  snapshot: unknown;
  timestamp: number;
  remainingMs: number;
}

export interface UiShellState {
  locale: TuiLocale;
  languagePreference: TuiLanguagePreference;
  languageSelectorOpen: boolean;
  languageSelectorFocusedIndex: number;
  activeTab: TabId;
  searchQuery: string;
  detailOverlayVisible: boolean;
  detailSkillName: string | null;
  widthBand: 'compact' | 'standard' | 'widescreen' | 'warning';
  formDirty: boolean;
  showSearch: boolean;
  showHelp: boolean;
  showCommandPalette: boolean;
  confirmState: ConfirmState | null;
  formState: FormState | null;
  conflictState: ConflictInfo | null;
  focusedConflictIndex: number;
  completionModalOpen: boolean | null;
  searchResultIndex: number;
  tabSwitchPending: TabId | null;
  dirtyConfirmActive: boolean;
  undoBuffer: UndoSnapshot | null;
  undoActive: boolean;
  toastQueue: Toast[];
  activeToast: Toast | null;
  updateProgressItems: ProgressItem[];
}

export interface SkillsBrowserState {
  focusedIndex: number;
  selectedNames: Set<string>;
  activeCategoryFilter: SkillCategoryFilter;
}

export interface ContextBrowserState {
  focusedIndex: number;
  viewMode: 'master' | 'skills';
  focusedSkillIndex: number;
  selectedSkillRowIds: Set<string>;
  activeSkillFilter: ContextSkillFilter;
}

export interface SyncWorkflowState {
  step: SyncFormStep;
  operation: SyncOperation | null;
  selectedSkillNames: Set<string>;
  unsyncScope: 'agents' | 'projects' | null;
  selectedTargetIds: Set<string>;
  projectUnsyncMode: 'all' | 'specific' | null;
  selectedAgentTypes: Set<string>;
  loadingTargets: boolean;
  mode: SyncMode;
  results: OperationResult[];
  focusedIndex: number;
  preview: SyncPreview | null;
  previewError: string | null;
}

export interface ImportWorkflowState {
  step: ImportFormTabStep;
  sourceType: 'project' | 'agent' | null;
  sourceId: string | null;
  sourceLabel: string | null;
  selectedSkillNames: Set<string>;
  results: OperationResult[];
  focusedIndex: number;
  discoveredSkills: ImportCandidate[];
}

export interface UISlice {
  shellState: UiShellState;
  skillsBrowserState: SkillsBrowserState;
  agentsBrowserState: ContextBrowserState;
  projectsBrowserState: ContextBrowserState;
  syncWorkflowState: SyncWorkflowState;
  importWorkflowState: ImportWorkflowState;

  setActiveTab: (tab: TabId) => void;
  setFocusedSkillIndex: (index: number) => void;
  toggleSkillSelection: (name: string) => void;
  clearSelection: () => void;
  selectAllSkills: (allNames: string[]) => void;
  setSearchQuery: (query: string) => void;
  setActiveSkillCategoryFilter: (filter: SkillCategoryFilter) => void;
  cycleSkillCategoryFilter: (direction: -1 | 1) => void;
  moveFocusUp: () => void;
  moveFocusDown: () => void;

  setFocusedAgentIndex: (index: number) => void;
  setAgentViewMode: (mode: 'master' | 'skills') => void;
  setFocusedAgentSkillIndex: (index: number) => void;
  toggleAgentSkillSelection: (rowId: string) => void;
  clearAgentSkillSelection: () => void;
  setActiveAgentSkillFilter: (filter: ContextSkillFilter) => void;

  setFocusedProjectIndex: (index: number) => void;
  setProjectViewMode: (mode: 'master' | 'skills') => void;
  setFocusedProjectSkillIndex: (index: number) => void;
  toggleProjectSkillSelection: (rowId: string) => void;
  clearProjectSkillSelection: () => void;
  setActiveProjectSkillFilter: (filter: ContextSkillFilter) => void;

  setShowSearch: (show: boolean) => void;
  setShowHelp: (show: boolean) => void;
  setConfirmState: (state: ConfirmState | null) => void;
  setFormState: (state: FormState | null) => void;
  setConflictState: (state: ConflictInfo | null) => void;
  setFocusedConflictIndex: (index: number) => void;

  setSyncFormStep: (step: SyncFormStep) => void;
  setSyncFormOperation: (op: SyncOperation | null) => void;
  setSyncFormSelectedSkillNames: (names: Set<string>) => void;
  toggleSyncFormSkill: (name: string) => void;
  setSyncFormUnsyncScope: (scope: 'agents' | 'projects' | null) => void;
  setSyncFormSelectedTargetIds: (ids: Set<string>) => void;
  toggleSyncFormTarget: (id: string) => void;
  setSyncFormProjectUnsyncMode: (mode: 'all' | 'specific' | null) => void;
  setSyncFormSelectedAgentTypes: (types: Set<string>) => void;
  toggleSyncFormAgentType: (type: string) => void;
  setSyncFormLoadingTargets: (loading: boolean) => void;
  setSyncFormMode: (mode: SyncMode) => void;
  setSyncFormResults: (results: OperationResult[]) => void;
  setSyncFormFocusedIndex: (index: number) => void;
  setSyncWorkflowPreview: (preview: SyncPreview | null, error?: string | null) => void;
  resetSyncForm: () => void;

  setImportTabStep: (step: ImportFormTabStep) => void;
  setImportTabSourceType: (type: 'project' | 'agent' | null) => void;
  setImportTabSourceId: (id: string | null) => void;
  setImportTabSourceLabel: (label: string | null) => void;
  setImportTabSelectedSkillNames: (names: Set<string>) => void;
  toggleImportTabSkill: (name: string) => void;
  setImportTabResults: (results: OperationResult[]) => void;
  setImportTabFocusedIndex: (index: number) => void;
  setImportDiscoveredSkills: (skills: ImportCandidate[]) => void;
  resetImportTab: () => void;

  setUpdateProgressItems: (items: ProgressItem[]) => void;
  updateProgressItem: (id: string, update: Partial<ProgressItem>) => void;
  setCompletionModalOpen: (open: boolean | null) => void;
  setShowCommandPalette: (show: boolean) => void;
  setLanguageSelectorOpen: (open: boolean) => void;
  setLanguageSelectorFocusedIndex: (index: number) => void;
  setTuiLanguageState: (preference: TuiLanguagePreference, locale: TuiLocale) => void;
  setSearchResultIndex: (index: number) => void;
  setTabSwitchPending: (tab: TabId | null) => void;
  setDirtyConfirmActive: (active: boolean) => void;
  pushUndo: (action: 'delete-skill' | 'remove-agent' | 'remove-project', snapshot: unknown) => void;
  executeUndo: () => void;
  clearUndo: () => void;
  pushToast: (message: string, variant: ToastVariant) => void;
  dismissActiveToast: () => void;
  setDetailOverlayVisible: (visible: boolean) => void;
  setDetailSkillName: (skillName: string | null) => void;
  setWidthBand: (band: 'compact' | 'standard' | 'widescreen' | 'warning') => void;
  setFormDirty: (dirty: boolean) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StoreState = UISlice & Record<string, any>;

let undoTickTimer: ReturnType<typeof setInterval> | null = null;
let toastTickTimer: ReturnType<typeof setInterval> | null = null;

const UNDO_WINDOW_MS = 8000;
const UNDO_TICK_MS = 250;
const TOAST_DURATION_MS = 2000;
const TOAST_TICK_MS = 250;

function createInitialSyncWorkflowState(): SyncWorkflowState {
  return {
    step: 'select-op',
    operation: 'sync-agents',
    selectedSkillNames: new Set(),
    unsyncScope: null,
    selectedTargetIds: new Set(),
    projectUnsyncMode: null,
    selectedAgentTypes: new Set(),
    loadingTargets: false,
    mode: 'copy',
    results: [],
    focusedIndex: 0,
    preview: null,
    previewError: null,
  };
}

function createInitialImportWorkflowState(): ImportWorkflowState {
  return {
    step: 'select-source-type',
    sourceType: 'project',
    sourceId: null,
    sourceLabel: null,
    selectedSkillNames: new Set(),
    results: [],
    focusedIndex: 0,
    discoveredSkills: [],
  };
}

export const createUISlice: StateCreator<StoreState, [], [], UISlice> = (set, get) => ({
  shellState: {
    activeTab: 'skills',
    locale: 'en',
    languagePreference: 'auto',
    languageSelectorOpen: false,
    languageSelectorFocusedIndex: 0,
    searchQuery: '',
    detailOverlayVisible: false,
    detailSkillName: null,
    widthBand: 'standard',
    formDirty: false,
    showSearch: false,
    showHelp: false,
    showCommandPalette: false,
    confirmState: null,
    formState: null,
    conflictState: null,
    focusedConflictIndex: 0,
    completionModalOpen: null,
    searchResultIndex: 0,
    tabSwitchPending: null,
    dirtyConfirmActive: false,
    undoBuffer: null,
    undoActive: false,
    toastQueue: [],
    activeToast: null,
    updateProgressItems: [],
  },
  skillsBrowserState: {
    focusedIndex: 0,
    selectedNames: new Set(),
    activeCategoryFilter: ALL_SKILL_CATEGORY_FILTER,
  },
  agentsBrowserState: {
    focusedIndex: 0,
    viewMode: 'master',
    focusedSkillIndex: 0,
    selectedSkillRowIds: new Set(),
    activeSkillFilter: 'all',
  },
  projectsBrowserState: {
    focusedIndex: 0,
    viewMode: 'master',
    focusedSkillIndex: 0,
    selectedSkillRowIds: new Set(),
    activeSkillFilter: 'all',
  },
  syncWorkflowState: createInitialSyncWorkflowState(),
  importWorkflowState: createInitialImportWorkflowState(),

  setActiveTab: (tab) =>
    set((state) => ({
      shellState: {
        ...state.shellState,
        activeTab: tab,
        confirmState: null,
        formState: null,
        conflictState: null,
        detailOverlayVisible: false,
        detailSkillName: null,
        languageSelectorOpen: false,
      },
      skillsBrowserState: {
        ...state.skillsBrowserState,
        focusedIndex: 0,
        selectedNames: new Set(),
      },
      agentsBrowserState: {
        ...state.agentsBrowserState,
        focusedIndex: 0,
        viewMode: 'master',
        focusedSkillIndex: 0,
        selectedSkillRowIds: new Set(),
        activeSkillFilter: 'all',
      },
      projectsBrowserState: {
        ...state.projectsBrowserState,
        focusedIndex: 0,
        viewMode: 'master',
        focusedSkillIndex: 0,
        selectedSkillRowIds: new Set(),
        activeSkillFilter: 'all',
      },
    })),
  setFocusedSkillIndex: (index) =>
    set((state) => ({
      skillsBrowserState: { ...state.skillsBrowserState, focusedIndex: index },
    })),
  toggleSkillSelection: (name) =>
    set((state) => {
      const next = new Set(state.skillsBrowserState.selectedNames);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return {
        skillsBrowserState: {
          ...state.skillsBrowserState,
          selectedNames: next,
        },
      };
    }),
  clearSelection: () =>
    set((state) => ({
      skillsBrowserState: {
        ...state.skillsBrowserState,
        selectedNames: new Set(),
      },
    })),
  selectAllSkills: (allNames) =>
    set((state) => ({
      skillsBrowserState: {
        ...state.skillsBrowserState,
        selectedNames: new Set(allNames),
      },
    })),
  setSearchQuery: (query) =>
    set((state) => ({
      shellState: { ...state.shellState, searchQuery: query },
    })),
  setActiveSkillCategoryFilter: (filter) =>
    set((state) => ({
      skillsBrowserState: {
        ...state.skillsBrowserState,
        activeCategoryFilter: filter,
        focusedIndex: getClampedFocusedSkillIndex(
          state.skills,
          filter,
          state.skillsBrowserState.focusedIndex
        ),
        selectedNames: new Set(),
      },
    })),
  cycleSkillCategoryFilter: (direction) =>
    set((state) => {
      const categories = getSkillCategoryCounts(state.skills).map((entry) => entry.key);
      const nextFilter = resolveNextSkillCategoryFilter(
        categories,
        state.skillsBrowserState.activeCategoryFilter,
        direction
      );
      return {
        skillsBrowserState: {
          ...state.skillsBrowserState,
          activeCategoryFilter: nextFilter,
          focusedIndex: getClampedFocusedSkillIndex(
            state.skills,
            nextFilter,
            state.skillsBrowserState.focusedIndex
          ),
          selectedNames: new Set(),
        },
      };
    }),
  moveFocusUp: () =>
    set((state) => {
      const visibleIndices = getVisibleSkillIndices(
        state.skills,
        state.skillsBrowserState.activeCategoryFilter
      );
      if (visibleIndices.length === 0) return {};
      const currentVisibleIndex = visibleIndices.indexOf(
        getClampedFocusedSkillIndex(
          state.skills,
          state.skillsBrowserState.activeCategoryFilter,
          state.skillsBrowserState.focusedIndex
        )
      );
      if (currentVisibleIndex <= 0) return {};
      return {
        skillsBrowserState: {
          ...state.skillsBrowserState,
          focusedIndex: visibleIndices[currentVisibleIndex - 1],
        },
      };
    }),
  moveFocusDown: () =>
    set((state) => {
      const visibleIndices = getVisibleSkillIndices(
        state.skills,
        state.skillsBrowserState.activeCategoryFilter
      );
      if (visibleIndices.length === 0) return {};
      const currentVisibleIndex = visibleIndices.indexOf(
        getClampedFocusedSkillIndex(
          state.skills,
          state.skillsBrowserState.activeCategoryFilter,
          state.skillsBrowserState.focusedIndex
        )
      );
      if (currentVisibleIndex >= visibleIndices.length - 1) return {};
      return {
        skillsBrowserState: {
          ...state.skillsBrowserState,
          focusedIndex: visibleIndices[currentVisibleIndex + 1],
        },
      };
    }),
  setFocusedAgentIndex: (index) =>
    set((state) => ({
      agentsBrowserState: { ...state.agentsBrowserState, focusedIndex: index },
    })),
  setAgentViewMode: (mode) =>
    set((state) => ({
      agentsBrowserState: { ...state.agentsBrowserState, viewMode: mode },
    })),
  setFocusedAgentSkillIndex: (index) =>
    set((state) => ({
      agentsBrowserState: { ...state.agentsBrowserState, focusedSkillIndex: index },
    })),
  toggleAgentSkillSelection: (rowId) =>
    set((state) => {
      const next = new Set(state.agentsBrowserState.selectedSkillRowIds);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return {
        agentsBrowserState: {
          ...state.agentsBrowserState,
          selectedSkillRowIds: next,
        },
      };
    }),
  clearAgentSkillSelection: () =>
    set((state) => ({
      agentsBrowserState: {
        ...state.agentsBrowserState,
        selectedSkillRowIds: new Set(),
      },
    })),
  setActiveAgentSkillFilter: (filter) =>
    set((state) => ({
      agentsBrowserState: {
        ...state.agentsBrowserState,
        activeSkillFilter: filter,
        focusedSkillIndex: 0,
        selectedSkillRowIds: new Set(),
      },
    })),

  setFocusedProjectIndex: (index) =>
    set((state) => ({
      projectsBrowserState: { ...state.projectsBrowserState, focusedIndex: index },
    })),
  setProjectViewMode: (mode) =>
    set((state) => ({
      projectsBrowserState: { ...state.projectsBrowserState, viewMode: mode },
    })),
  setFocusedProjectSkillIndex: (index) =>
    set((state) => ({
      projectsBrowserState: { ...state.projectsBrowserState, focusedSkillIndex: index },
    })),
  toggleProjectSkillSelection: (rowId) =>
    set((state) => {
      const next = new Set(state.projectsBrowserState.selectedSkillRowIds);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return {
        projectsBrowserState: {
          ...state.projectsBrowserState,
          selectedSkillRowIds: next,
        },
      };
    }),
  clearProjectSkillSelection: () =>
    set((state) => ({
      projectsBrowserState: {
        ...state.projectsBrowserState,
        selectedSkillRowIds: new Set(),
      },
    })),
  setActiveProjectSkillFilter: (filter) =>
    set((state) => ({
      projectsBrowserState: {
        ...state.projectsBrowserState,
        activeSkillFilter: filter,
        focusedSkillIndex: 0,
        selectedSkillRowIds: new Set(),
      },
    })),

  setShowSearch: (show) =>
    set((state) => ({
      shellState: {
        ...state.shellState,
        showSearch: show,
        showHelp: false,
        showCommandPalette: false,
        languageSelectorOpen: false,
        searchQuery: show ? '' : state.shellState.searchQuery,
        searchResultIndex: show ? 0 : state.shellState.searchResultIndex,
      },
    })),
  setShowHelp: (show) =>
    set((state) => ({
      shellState: {
        ...state.shellState,
        showHelp: show,
        showSearch: false,
        showCommandPalette: false,
        languageSelectorOpen: false,
      },
    })),
  setConfirmState: (confirmState) =>
    set((state) => ({
      shellState: {
        ...state.shellState,
        confirmState,
        formState: null,
        conflictState: null,
        languageSelectorOpen: false,
      },
    })),
  setFormState: (formState) =>
    set((state) => ({
      shellState: {
        ...state.shellState,
        formState,
        confirmState: null,
        conflictState: null,
        languageSelectorOpen: false,
      },
    })),
  setConflictState: (conflictState) =>
    set((state) => ({
      shellState: {
        ...state.shellState,
        conflictState,
      },
    })),
  setFocusedConflictIndex: (index) =>
    set((state) => ({
      shellState: { ...state.shellState, focusedConflictIndex: index },
    })),

  setSyncFormStep: (step) =>
    set((state) => ({
      syncWorkflowState: { ...state.syncWorkflowState, step },
    })),
  setSyncFormOperation: (operation) =>
    set((state) => ({
      syncWorkflowState: { ...state.syncWorkflowState, operation },
    })),
  setSyncFormSelectedSkillNames: (selectedSkillNames) =>
    set((state) => ({
      syncWorkflowState: { ...state.syncWorkflowState, selectedSkillNames },
    })),
  toggleSyncFormSkill: (name) =>
    set((state) => {
      const next = new Set(state.syncWorkflowState.selectedSkillNames);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return {
        syncWorkflowState: {
          ...state.syncWorkflowState,
          selectedSkillNames: next,
        },
      };
    }),
  setSyncFormUnsyncScope: (unsyncScope) =>
    set((state) => ({
      syncWorkflowState: { ...state.syncWorkflowState, unsyncScope },
    })),
  setSyncFormSelectedTargetIds: (selectedTargetIds) =>
    set((state) => ({
      syncWorkflowState: { ...state.syncWorkflowState, selectedTargetIds },
    })),
  toggleSyncFormTarget: (id) =>
    set((state) => {
      const next = new Set(state.syncWorkflowState.selectedTargetIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return {
        syncWorkflowState: {
          ...state.syncWorkflowState,
          selectedTargetIds: next,
        },
      };
    }),
  setSyncFormProjectUnsyncMode: (projectUnsyncMode) =>
    set((state) => ({
      syncWorkflowState: { ...state.syncWorkflowState, projectUnsyncMode },
    })),
  setSyncFormSelectedAgentTypes: (selectedAgentTypes) =>
    set((state) => ({
      syncWorkflowState: { ...state.syncWorkflowState, selectedAgentTypes },
    })),
  toggleSyncFormAgentType: (type) =>
    set((state) => {
      const next = new Set(state.syncWorkflowState.selectedAgentTypes);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return {
        syncWorkflowState: {
          ...state.syncWorkflowState,
          selectedAgentTypes: next,
        },
      };
    }),
  setSyncFormLoadingTargets: (loadingTargets) =>
    set((state) => ({
      syncWorkflowState: { ...state.syncWorkflowState, loadingTargets },
    })),
  setSyncFormMode: (mode) =>
    set((state) => ({
      syncWorkflowState: { ...state.syncWorkflowState, mode },
    })),
  setSyncFormResults: (results) =>
    set((state) => ({
      syncWorkflowState: { ...state.syncWorkflowState, results },
    })),
  setSyncFormFocusedIndex: (focusedIndex) =>
    set((state) => ({
      syncWorkflowState: { ...state.syncWorkflowState, focusedIndex },
    })),
  setSyncWorkflowPreview: (preview, previewError = null) =>
    set((state) => ({
      syncWorkflowState: { ...state.syncWorkflowState, preview, previewError },
    })),
  resetSyncForm: () => set({ syncWorkflowState: createInitialSyncWorkflowState() }),

  setImportTabStep: (step) =>
    set((state) => ({
      importWorkflowState: { ...state.importWorkflowState, step },
    })),
  setImportTabSourceType: (sourceType) =>
    set((state) => ({
      importWorkflowState: { ...state.importWorkflowState, sourceType },
    })),
  setImportTabSourceId: (sourceId) =>
    set((state) => ({
      importWorkflowState: { ...state.importWorkflowState, sourceId },
    })),
  setImportTabSourceLabel: (sourceLabel) =>
    set((state) => ({
      importWorkflowState: { ...state.importWorkflowState, sourceLabel },
    })),
  setImportTabSelectedSkillNames: (selectedSkillNames) =>
    set((state) => ({
      importWorkflowState: { ...state.importWorkflowState, selectedSkillNames },
    })),
  toggleImportTabSkill: (name) =>
    set((state) => {
      const next = new Set(state.importWorkflowState.selectedSkillNames);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return {
        importWorkflowState: {
          ...state.importWorkflowState,
          selectedSkillNames: next,
        },
      };
    }),
  setImportTabResults: (results) =>
    set((state) => ({
      importWorkflowState: { ...state.importWorkflowState, results },
    })),
  setImportTabFocusedIndex: (focusedIndex) =>
    set((state) => ({
      importWorkflowState: { ...state.importWorkflowState, focusedIndex },
    })),
  setImportDiscoveredSkills: (discoveredSkills) =>
    set((state) => ({
      importWorkflowState: { ...state.importWorkflowState, discoveredSkills },
    })),
  resetImportTab: () => set({ importWorkflowState: createInitialImportWorkflowState() }),

  setUpdateProgressItems: (updateProgressItems) =>
    set((state) => ({
      shellState: { ...state.shellState, updateProgressItems },
    })),
  updateProgressItem: (id, update) =>
    set((state) => ({
      shellState: {
        ...state.shellState,
        updateProgressItems: state.shellState.updateProgressItems.map((item) =>
          item.id === id ? { ...item, ...update } : item
        ),
      },
    })),
  setCompletionModalOpen: (completionModalOpen) =>
    set((state) => ({
      shellState: { ...state.shellState, completionModalOpen },
    })),
  setShowCommandPalette: (showCommandPalette) =>
    set((state) => ({
      shellState: {
        ...state.shellState,
        showCommandPalette,
        showSearch: false,
        showHelp: false,
        confirmState: null,
        formState: null,
        conflictState: null,
        languageSelectorOpen: false,
      },
    })),
  setLanguageSelectorOpen: (languageSelectorOpen) =>
    set((state) => ({
      shellState: {
        ...state.shellState,
        languageSelectorOpen,
        languageSelectorFocusedIndex: languageSelectorOpen
          ? state.shellState.languageSelectorFocusedIndex
          : 0,
        showCommandPalette: false,
        showSearch: false,
        showHelp: false,
        confirmState: languageSelectorOpen ? null : state.shellState.confirmState,
        formState: languageSelectorOpen ? null : state.shellState.formState,
        conflictState: languageSelectorOpen ? null : state.shellState.conflictState,
      },
    })),
  setLanguageSelectorFocusedIndex: (languageSelectorFocusedIndex) =>
    set((state) => ({
      shellState: {
        ...state.shellState,
        languageSelectorFocusedIndex,
      },
    })),
  setTuiLanguageState: (languagePreference, locale) =>
    set((state) => ({
      shellState: {
        ...state.shellState,
        languagePreference,
        locale,
        languageSelectorOpen: false,
        languageSelectorFocusedIndex: 0,
      },
    })),
  setSearchResultIndex: (searchResultIndex) =>
    set((state) => ({
      shellState: { ...state.shellState, searchResultIndex },
    })),
  setTabSwitchPending: (tabSwitchPending) =>
    set((state) => ({
      shellState: { ...state.shellState, tabSwitchPending },
    })),
  setDirtyConfirmActive: (dirtyConfirmActive) =>
    set((state) => ({
      shellState: { ...state.shellState, dirtyConfirmActive },
    })),
  setDetailOverlayVisible: (detailOverlayVisible) =>
    set((state) => ({
      shellState: {
        ...state.shellState,
        detailOverlayVisible,
        detailSkillName: detailOverlayVisible ? state.shellState.detailSkillName : null,
      },
    })),
  setDetailSkillName: (detailSkillName) =>
    set((state) => ({
      shellState: { ...state.shellState, detailSkillName },
    })),
  setWidthBand: (widthBand) =>
    set((state) => ({
      shellState: {
        ...state.shellState,
        widthBand,
        detailOverlayVisible:
          widthBand === 'compact' || widthBand === 'warning' || widthBand === 'widescreen'
            ? false
            : state.shellState.detailOverlayVisible,
        detailSkillName:
          widthBand === 'compact' || widthBand === 'warning' || widthBand === 'widescreen'
            ? null
            : state.shellState.detailSkillName,
      },
    })),
  setFormDirty: (formDirty) =>
    set((state) => ({
      shellState: { ...state.shellState, formDirty },
    })),

  pushUndo: (action, snapshot): void => {
    if (undoTickTimer !== null) {
      clearInterval(undoTickTimer);
      undoTickTimer = null;
    }

    const buffer: UndoSnapshot = {
      action,
      snapshot,
      timestamp: Date.now(),
      remainingMs: UNDO_WINDOW_MS,
    };
    set((state) => ({
      shellState: {
        ...state.shellState,
        undoBuffer: buffer,
        undoActive: true,
      },
    }));

    undoTickTimer = setInterval(() => {
      const current = get().shellState.undoBuffer;
      if (!current) {
        if (undoTickTimer !== null) {
          clearInterval(undoTickTimer);
          undoTickTimer = null;
        }
        return;
      }

      const updated = current.remainingMs - UNDO_TICK_MS;
      if (updated <= 0) {
        if (undoTickTimer !== null) {
          clearInterval(undoTickTimer);
          undoTickTimer = null;
        }
        set((state) => ({
          shellState: {
            ...state.shellState,
            undoBuffer: null,
            undoActive: false,
          },
        }));
        return;
      }

      set((state) => ({
        shellState: {
          ...state.shellState,
          undoBuffer: { ...current, remainingMs: updated },
        },
      }));
    }, UNDO_TICK_MS);
  },
  executeUndo: (): void => {
    const buffer = get().shellState.undoBuffer;
    if (!buffer) return;

    if (undoTickTimer !== null) {
      clearInterval(undoTickTimer);
      undoTickTimer = null;
    }

    const state = get() as StoreState;
    const snapshot = buffer.snapshot as Record<string, unknown>;
    if (buffer.action === 'delete-skill' && typeof state.restoreSkill === 'function') {
      state.restoreSkill(snapshot);
    } else if (buffer.action === 'remove-agent' && typeof state.restoreAgent === 'function') {
      state.restoreAgent(snapshot);
    } else if (buffer.action === 'remove-project' && typeof state.restoreProject === 'function') {
      state.restoreProject(snapshot);
    }

    const name = snapshot.name || snapshot.id || 'item';
    const text = getTuiText(state.shellState.locale);
    state.pushToast(text.status.restored(String(name)), 'success');
    set((current) => ({
      shellState: {
        ...current.shellState,
        undoBuffer: null,
        undoActive: false,
      },
    }));
  },
  clearUndo: (): void => {
    if (undoTickTimer !== null) {
      clearInterval(undoTickTimer);
      undoTickTimer = null;
    }
    set((state) => ({
      shellState: {
        ...state.shellState,
        undoBuffer: null,
        undoActive: false,
      },
    }));
  },
  pushToast: (message, variant): void => {
    const toast: Toast = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      message,
      variant,
      expiresAt: Date.now() + TOAST_DURATION_MS,
    };

    const current = get().shellState;
    if (!current.activeToast) {
      set((state) => ({
        shellState: { ...state.shellState, activeToast: toast },
      }));
    } else {
      set((state) => ({
        shellState: {
          ...state.shellState,
          toastQueue: [...state.shellState.toastQueue, toast],
        },
      }));
    }

    if (toastTickTimer === null) {
      toastTickTimer = setInterval(() => {
        const shellState = get().shellState;
        if (!shellState.activeToast) {
          if (toastTickTimer !== null) {
            clearInterval(toastTickTimer);
            toastTickTimer = null;
          }
          return;
        }

        if (Date.now() >= shellState.activeToast.expiresAt) {
          const nextToast = shellState.toastQueue.length > 0 ? shellState.toastQueue[0] : null;
          const nextQueue = shellState.toastQueue.length > 0 ? shellState.toastQueue.slice(1) : [];
          set((state) => ({
            shellState: {
              ...state.shellState,
              activeToast: nextToast,
              toastQueue: nextQueue,
            },
          }));

          if (!nextToast && toastTickTimer !== null) {
            clearInterval(toastTickTimer);
            toastTickTimer = null;
          }
        }
      }, TOAST_TICK_MS);
    }
  },
  dismissActiveToast: (): void => {
    const shellState = get().shellState;
    const nextToast = shellState.toastQueue.length > 0 ? shellState.toastQueue[0] : null;
    const nextQueue = shellState.toastQueue.length > 0 ? shellState.toastQueue.slice(1) : [];
    set((state) => ({
      shellState: {
        ...state.shellState,
        activeToast: nextToast,
        toastQueue: nextQueue,
      },
    }));
    if (!nextToast && toastTickTimer !== null) {
      clearInterval(toastTickTimer);
      toastTickTimer = null;
    }
  },
});
