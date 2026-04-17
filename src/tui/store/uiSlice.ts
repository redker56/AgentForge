/**
 * UI State Slice
 */

import type { StateCreator } from 'zustand';

import {
  ALL_SKILL_CATEGORY_FILTER,
  type SkillCategoryFilter,
  type SyncMode,
  getSkillCategoryCounts,
} from '../../types.js';
import {
  getClampedFocusedSkillIndex,
  getVisibleSkillIndices,
  resolveNextSkillCategoryFilter,
} from '../utils/skillsView.js';
import type { ContextSkillFilter } from '../contextTypes.js';

export type TabId = 'skills' | 'agents' | 'projects' | 'sync' | 'import';

/** Operation type for Sync tab form */
export type SyncOperation = 'sync-agents' | 'sync-projects' | 'unsync';

/** Step index for Sync tab form */
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

/** Step index for Import tab form */
export type ImportFormTabStep =
  | 'select-source-type'
  | 'select-source'
  | 'select-skills'
  | 'confirm'
  | 'executing'
  | 'results';

/** Result entry for sync/update/import operations */
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
  progress: number; // 0-100
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
}

// Sprint 3: Toast notification types
export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  expiresAt: number;
}

// Sprint 3: Undo snapshot type
export interface UndoSnapshot {
  action: 'delete-skill' | 'remove-agent' | 'remove-project';
  snapshot: unknown;
  timestamp: number;
  remainingMs: number;
}

export interface UISlice {
  // State
  activeTab: TabId;
  focusedSkillIndex: number;
  selectedSkillNames: Set<string>;
  searchQuery: string;
  activeSkillCategoryFilter: SkillCategoryFilter;
  progressItems: ProgressItem[];
  detailOverlayVisible: boolean;
  widthBand: 'compact' | 'standard' | 'widescreen' | 'warning';
  formDirty: boolean;
  breadcrumbSegments: string[];
  detailSkillName: string | null;

  // Agent tab state
  focusedAgentIndex: number;
  agentViewMode: 'master' | 'skills';
  focusedAgentSkillIndex: number;
  selectedAgentSkillRowIds: Set<string>;
  activeAgentSkillFilter: ContextSkillFilter;

  // Project tab state
  focusedProjectIndex: number;
  projectViewMode: 'master' | 'skills';
  focusedProjectSkillIndex: number;
  selectedProjectSkillRowIds: Set<string>;
  activeProjectSkillFilter: ContextSkillFilter;

  // Overlay state
  showSearch: boolean;
  showHelp: boolean;

  // Overlay states (mutually exclusive with each other)
  confirmState: ConfirmState | null;
  formState: FormState | null;
  conflictState: ConflictInfo | null;
  focusedConflictIndex: number;

  // Sync tab form state
  syncFormStep: SyncFormStep;
  syncFormOperation: SyncOperation | null;
  syncFormSelectedSkillNames: Set<string>;
  syncFormUnsyncScope: 'agents' | 'projects' | null;
  syncFormSelectedTargetIds: Set<string>;
  syncFormProjectUnsyncMode: 'all' | 'specific' | null;
  syncFormSelectedAgentTypes: Set<string>;
  syncFormLoadingTargets: boolean;
  syncFormMode: SyncMode;
  syncFormResults: OperationResult[];
  syncFormFocusedIndex: number;

  // Import tab form state
  importTabStep: ImportFormTabStep;
  importTabSourceType: 'project' | 'agent' | null;
  importTabSourceId: string | null;
  importTabSelectedSkillNames: Set<string>;
  importTabResults: OperationResult[];
  importTabFocusedIndex: number;

  // Update progress state (used from Skills tab shortcuts)
  updateProgressItems: ProgressItem[];

  // Completion modal state
  completionModalOpen: boolean | null;

  // Sprint 2: Command palette
  showCommandPalette: boolean;

  // Sprint 2: Search result navigation (moved from SearchOverlay module-level)
  searchResultIndex: number;

  // Sprint 2: Dirty form tab-switch confirmation
  tabSwitchPending: TabId | null;
  dirtyConfirmActive: boolean;

  // Sprint 3: Undo buffer
  undoBuffer: UndoSnapshot | null;
  undoActive: boolean;

  // Sprint 3: Toast notifications
  toastQueue: Toast[];
  activeToast: Toast | null;

  // Actions
  setActiveTab: (tab: TabId) => void;
  setFocusedSkillIndex: (index: number) => void;
  toggleSkillSelection: (name: string) => void;
  clearSelection: () => void;
  selectAllSkills: (allNames: string[]) => void;
  setSearchQuery: (query: string) => void;
  setActiveSkillCategoryFilter: (filter: SkillCategoryFilter) => void;
  cycleSkillCategoryFilter: (direction: -1 | 1) => void;
  moveFocusUp: () => void;
  moveFocusDown: (listLength: number) => void;

  // Agent actions
  setFocusedAgentIndex: (index: number) => void;
  setAgentViewMode: (mode: 'master' | 'skills') => void;
  setFocusedAgentSkillIndex: (index: number) => void;
  toggleAgentSkillSelection: (rowId: string) => void;
  clearAgentSkillSelection: () => void;
  setActiveAgentSkillFilter: (filter: ContextSkillFilter) => void;

  // Project actions
  setFocusedProjectIndex: (index: number) => void;
  setProjectViewMode: (mode: 'master' | 'skills') => void;
  setFocusedProjectSkillIndex: (index: number) => void;
  toggleProjectSkillSelection: (rowId: string) => void;
  clearProjectSkillSelection: () => void;
  setActiveProjectSkillFilter: (filter: ContextSkillFilter) => void;

  // Overlay actions
  setShowSearch: (show: boolean) => void;
  setShowHelp: (show: boolean) => void;

  // Overlay state actions
  setConfirmState: (state: ConfirmState | null) => void;
  setFormState: (state: FormState | null) => void;
  setConflictState: (state: ConflictInfo | null) => void;
  setFocusedConflictIndex: (index: number) => void;

  // Sync form actions
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
  resetSyncForm: () => void;

  // Import tab form actions
  setImportTabStep: (step: ImportFormTabStep) => void;
  setImportTabSourceType: (type: 'project' | 'agent' | null) => void;
  setImportTabSourceId: (id: string | null) => void;
  setImportTabSelectedSkillNames: (names: Set<string>) => void;
  toggleImportTabSkill: (name: string) => void;
  setImportTabResults: (results: OperationResult[]) => void;
  setImportTabFocusedIndex: (index: number) => void;
  resetImportTab: () => void;

  // Update progress actions
  setUpdateProgressItems: (items: ProgressItem[]) => void;
  updateProgressItem: (id: string, update: Partial<ProgressItem>) => void;

  // Completion modal actions
  setCompletionModalOpen: (open: boolean | null) => void;

  // Sprint 2: Command palette
  setShowCommandPalette: (show: boolean) => void;

  // Sprint 2: Search result navigation
  setSearchResultIndex: (index: number) => void;

  // Sprint 2: Dirty form tab-switch confirmation
  setTabSwitchPending: (tab: TabId | null) => void;
  setDirtyConfirmActive: (active: boolean) => void;

  // Sprint 3: Undo actions
  pushUndo: (action: 'delete-skill' | 'remove-agent' | 'remove-project', snapshot: unknown) => void;
  executeUndo: () => void;
  clearUndo: () => void;

  // Sprint 3: Toast actions
  pushToast: (message: string, variant: ToastVariant) => void;
  dismissActiveToast: () => void;

  // Sprint 1: responsive detail overlay + width band
  setDetailOverlayVisible: (visible: boolean) => void;
  setDetailSkillName: (skillName: string | null) => void;
  setWidthBand: (band: 'compact' | 'standard' | 'widescreen' | 'warning') => void;
  setFormDirty: (dirty: boolean) => void;
}

// Forward reference to avoid circular import.
// The actual store type is composed in index.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StoreState = UISlice & Record<string, any>;

// Module-level timer references (live outside Zustand state)
let undoTickTimer: ReturnType<typeof setInterval> | null = null;
let toastTickTimer: ReturnType<typeof setInterval> | null = null;

const UNDO_WINDOW_MS = 8000;
const UNDO_TICK_MS = 250;
const TOAST_DURATION_MS = 2000;
const TOAST_TICK_MS = 250;

export const createUISlice: StateCreator<StoreState, [], [], UISlice> = (set, get) => ({
  activeTab: 'skills',
  focusedSkillIndex: 0,
  selectedSkillNames: new Set(),
  searchQuery: '',
  activeSkillCategoryFilter: ALL_SKILL_CATEGORY_FILTER,
  progressItems: [],
  detailSkillName: null,

  // Agent tab state
  focusedAgentIndex: 0,
  agentViewMode: 'master',
  focusedAgentSkillIndex: 0,
  selectedAgentSkillRowIds: new Set(),
  activeAgentSkillFilter: 'all',

  // Project tab state
  focusedProjectIndex: 0,
  projectViewMode: 'master',
  focusedProjectSkillIndex: 0,
  selectedProjectSkillRowIds: new Set(),
  activeProjectSkillFilter: 'all',

  // Overlay state
  showSearch: false,
  showHelp: false,

  // Overlay states
  confirmState: null,
  formState: null,
  conflictState: null,
  focusedConflictIndex: 0,

  // Sync tab form state
  syncFormStep: 'select-op',
  syncFormOperation: 'sync-agents',
  syncFormSelectedSkillNames: new Set(),
  syncFormUnsyncScope: null,
  syncFormSelectedTargetIds: new Set(),
  syncFormProjectUnsyncMode: null,
  syncFormSelectedAgentTypes: new Set(),
  syncFormLoadingTargets: false,
  syncFormMode: 'copy',
  syncFormResults: [],
  syncFormFocusedIndex: 0,

  // Import tab form state
  importTabStep: 'select-source-type',
  importTabSourceType: 'project',
  importTabSourceId: null,
  importTabSelectedSkillNames: new Set(),
  importTabResults: [],
  importTabFocusedIndex: 0,

  // Update progress state
  updateProgressItems: [],

  // Completion modal state
  completionModalOpen: null,

  // Sprint 2: Command palette
  showCommandPalette: false,

  // Sprint 2: Search result navigation
  searchResultIndex: 0,

  // Sprint 2: Dirty form tab-switch confirmation
  tabSwitchPending: null,
  dirtyConfirmActive: false,

  // Sprint 1: responsive layout state
  detailOverlayVisible: false,
  widthBand: 'standard' as 'compact' | 'standard' | 'widescreen' | 'warning',
  formDirty: false,
  breadcrumbSegments: [],

  // Sprint 3: Undo state
  undoBuffer: null,
  undoActive: false,

  // Sprint 3: Toast state
  toastQueue: [],
  activeToast: null,

  setActiveTab: (tab) =>
    set({
      activeTab: tab,
      focusedSkillIndex: 0,
      selectedSkillNames: new Set(),
      // Reset agent/project focus when switching tabs
      focusedAgentIndex: 0,
      agentViewMode: 'master',
      focusedAgentSkillIndex: 0,
      selectedAgentSkillRowIds: new Set(),
      activeAgentSkillFilter: 'all',
      focusedProjectIndex: 0,
      projectViewMode: 'master',
      focusedProjectSkillIndex: 0,
      selectedProjectSkillRowIds: new Set(),
      activeProjectSkillFilter: 'all',
      // Clear overlay states on tab switch
      confirmState: null,
      formState: null,
      conflictState: null,
      detailOverlayVisible: false,
      detailSkillName: null,
    }),
  setFocusedSkillIndex: (index) => set({ focusedSkillIndex: index }),
  toggleSkillSelection: (name): void => {
    const next = new Set(get().selectedSkillNames);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    set({ selectedSkillNames: next });
  },
  clearSelection: () => set({ selectedSkillNames: new Set() }),
  selectAllSkills: (allNames) => set({ selectedSkillNames: new Set(allNames) }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveSkillCategoryFilter: (filter): void => {
    const skills = get().skills;
    set({
      activeSkillCategoryFilter: filter,
      focusedSkillIndex: getClampedFocusedSkillIndex(skills, filter, get().focusedSkillIndex),
      selectedSkillNames: new Set(),
    });
  },
  cycleSkillCategoryFilter: (direction): void => {
    const skills = get().skills;
    const categories = getSkillCategoryCounts(skills).map((entry) => entry.key);
    const nextFilter = resolveNextSkillCategoryFilter(
      categories,
      get().activeSkillCategoryFilter,
      direction
    );

    set({
      activeSkillCategoryFilter: nextFilter,
      focusedSkillIndex: getClampedFocusedSkillIndex(skills, nextFilter, get().focusedSkillIndex),
      selectedSkillNames: new Set(),
    });
  },
  moveFocusUp: (): void => {
    const visibleIndices = getVisibleSkillIndices(
      get().skills,
      get().activeSkillCategoryFilter
    );
    if (visibleIndices.length === 0) return;

    const currentVisibleIndex = visibleIndices.indexOf(
      getClampedFocusedSkillIndex(get().skills, get().activeSkillCategoryFilter, get().focusedSkillIndex)
    );
    if (currentVisibleIndex > 0) {
      set({ focusedSkillIndex: visibleIndices[currentVisibleIndex - 1] });
    }
  },
  moveFocusDown: (_listLength): void => {
    const visibleIndices = getVisibleSkillIndices(
      get().skills,
      get().activeSkillCategoryFilter
    );
    if (visibleIndices.length === 0) return;

    const currentVisibleIndex = visibleIndices.indexOf(
      getClampedFocusedSkillIndex(get().skills, get().activeSkillCategoryFilter, get().focusedSkillIndex)
    );
    if (currentVisibleIndex < visibleIndices.length - 1) {
      set({ focusedSkillIndex: visibleIndices[currentVisibleIndex + 1] });
    }
  },

  // Agent actions
  setFocusedAgentIndex: (index) => set({ focusedAgentIndex: index }),
  setAgentViewMode: (mode) => set({ agentViewMode: mode }),
  setFocusedAgentSkillIndex: (index) => set({ focusedAgentSkillIndex: index }),
  toggleAgentSkillSelection: (rowId): void => {
    const next = new Set(get().selectedAgentSkillRowIds);
    if (next.has(rowId)) next.delete(rowId);
    else next.add(rowId);
    set({ selectedAgentSkillRowIds: next });
  },
  clearAgentSkillSelection: () => set({ selectedAgentSkillRowIds: new Set() }),
  setActiveAgentSkillFilter: (filter) =>
    set({
      activeAgentSkillFilter: filter,
      focusedAgentSkillIndex: 0,
      selectedAgentSkillRowIds: new Set(),
    }),

  // Project actions
  setFocusedProjectIndex: (index) => set({ focusedProjectIndex: index }),
  setProjectViewMode: (mode) => set({ projectViewMode: mode }),
  setFocusedProjectSkillIndex: (index) => set({ focusedProjectSkillIndex: index }),
  toggleProjectSkillSelection: (rowId): void => {
    const next = new Set(get().selectedProjectSkillRowIds);
    if (next.has(rowId)) next.delete(rowId);
    else next.add(rowId);
    set({ selectedProjectSkillRowIds: next });
  },
  clearProjectSkillSelection: () => set({ selectedProjectSkillRowIds: new Set() }),
  setActiveProjectSkillFilter: (filter) =>
    set({
      activeProjectSkillFilter: filter,
      focusedProjectSkillIndex: 0,
      selectedProjectSkillRowIds: new Set(),
    }),

  // Overlay actions (mutually exclusive with each other)
  setShowSearch: (show) =>
    set({
      showSearch: show,
      showHelp: false,
      showCommandPalette: false,
      searchQuery: show ? '' : get().searchQuery,
      searchResultIndex: show ? 0 : get().searchResultIndex,
    }),
  setShowHelp: (show) =>
    set({
      showHelp: show,
      showSearch: false,
      showCommandPalette: false,
    }),

  // Overlay state actions (mutually exclusive: setting one clears the others)
  setConfirmState: (state) => set({ confirmState: state, formState: null, conflictState: null }),
  setFormState: (state) => set({ formState: state, confirmState: null, conflictState: null }),
  setConflictState: (state) => set({ conflictState: state }),
  setFocusedConflictIndex: (index) => set({ focusedConflictIndex: index }),

  // Sync form actions
  setSyncFormStep: (step) => set({ syncFormStep: step }),
  setSyncFormOperation: (op) => set({ syncFormOperation: op }),
  setSyncFormSelectedSkillNames: (names) => set({ syncFormSelectedSkillNames: names }),
  toggleSyncFormSkill: (name): void => {
    const next = new Set(get().syncFormSelectedSkillNames);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    set({ syncFormSelectedSkillNames: next });
  },
  setSyncFormUnsyncScope: (scope) => set({ syncFormUnsyncScope: scope }),
  setSyncFormSelectedTargetIds: (ids) => set({ syncFormSelectedTargetIds: ids }),
  toggleSyncFormTarget: (id): void => {
    const next = new Set(get().syncFormSelectedTargetIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ syncFormSelectedTargetIds: next });
  },
  setSyncFormProjectUnsyncMode: (mode) => set({ syncFormProjectUnsyncMode: mode }),
  setSyncFormSelectedAgentTypes: (types) => set({ syncFormSelectedAgentTypes: types }),
  toggleSyncFormAgentType: (type): void => {
    const next = new Set(get().syncFormSelectedAgentTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    set({ syncFormSelectedAgentTypes: next });
  },
  setSyncFormLoadingTargets: (loading) => set({ syncFormLoadingTargets: loading }),
  setSyncFormMode: (mode) => set({ syncFormMode: mode }),
  setSyncFormResults: (results) => set({ syncFormResults: results }),
  setSyncFormFocusedIndex: (index) => set({ syncFormFocusedIndex: index }),
  resetSyncForm: () =>
    set({
      syncFormStep: 'select-op',
      syncFormOperation: 'sync-agents',
      syncFormSelectedSkillNames: new Set(),
      syncFormUnsyncScope: null,
      syncFormSelectedTargetIds: new Set(),
      syncFormProjectUnsyncMode: null,
      syncFormSelectedAgentTypes: new Set(),
      syncFormLoadingTargets: false,
      syncFormMode: 'copy' as SyncMode,
      syncFormResults: [],
      syncFormFocusedIndex: 0,
    }),

  // Import tab form actions
  setImportTabStep: (step) => set({ importTabStep: step }),
  setImportTabSourceType: (type) => set({ importTabSourceType: type }),
  setImportTabSourceId: (id) => set({ importTabSourceId: id }),
  setImportTabSelectedSkillNames: (names) => set({ importTabSelectedSkillNames: names }),
  toggleImportTabSkill: (name): void => {
    const next = new Set(get().importTabSelectedSkillNames);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    set({ importTabSelectedSkillNames: next });
  },
  setImportTabResults: (results) => set({ importTabResults: results }),
  setImportTabFocusedIndex: (index) => set({ importTabFocusedIndex: index }),
  resetImportTab: () =>
    set({
      importTabStep: 'select-source-type',
      importTabSourceType: 'project',
      importTabSourceId: null,
      importTabSelectedSkillNames: new Set(),
      importTabResults: [],
      importTabFocusedIndex: 0,
    }),

  // Update progress actions
  setUpdateProgressItems: (items) => set({ updateProgressItems: items }),
  updateProgressItem: (id, update): void => {
    set({
      updateProgressItems: get().updateProgressItems.map((item) =>
        item.id === id ? { ...item, ...update } : item
      ),
    });
  },

  setCompletionModalOpen: (open) => set({ completionModalOpen: open }),

  // Sprint 2: Command palette -- clears all other overlays for mutual exclusivity
  setShowCommandPalette: (show) =>
    set({
      showCommandPalette: show,
      showSearch: false,
      showHelp: false,
      confirmState: null,
      formState: null,
      conflictState: null,
    }),

  // Sprint 2: Search result navigation
  setSearchResultIndex: (index) => set({ searchResultIndex: index }),

  // Sprint 2: Dirty form tab-switch confirmation
  setTabSwitchPending: (tab) => set({ tabSwitchPending: tab }),
  setDirtyConfirmActive: (active) => set({ dirtyConfirmActive: active }),

  setDetailOverlayVisible: (visible): void =>
    set({
      detailOverlayVisible: visible,
      detailSkillName: visible ? get().detailSkillName : null,
    }),
  setDetailSkillName: (skillName): void => set({ detailSkillName: skillName }),

  setWidthBand: (band): void => {
    const updates: {
      widthBand: 'compact' | 'standard' | 'widescreen' | 'warning';
      detailOverlayVisible?: boolean;
      detailSkillName?: string | null;
    } = {
      widthBand: band,
    };
    // Detail overlay cannot persist at compact or warning widths
    if (band === 'compact' || band === 'warning') {
      updates.detailOverlayVisible = false;
      updates.detailSkillName = null;
    }
    // In widescreen, detail is always shown inline in split-pane; clear overlay
    if (band === 'widescreen') {
      updates.detailOverlayVisible = false;
      updates.detailSkillName = null;
    }
    set(updates);
  },

  setFormDirty: (dirty) => set({ formDirty: dirty }),

  pushUndo: (action, snapshot): void => {
    // Clear any existing undo timer
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
    set({ undoBuffer: buffer, undoActive: true });

    // Start 250ms tick to decrement remainingMs
    undoTickTimer = setInterval(() => {
      const current = get().undoBuffer;
      if (!current) {
        if (undoTickTimer !== null) {
          clearInterval(undoTickTimer);
          undoTickTimer = null;
        }
        return;
      }
      const updated = current.remainingMs - UNDO_TICK_MS;
      if (updated <= 0) {
        // Auto-expire
        if (undoTickTimer !== null) {
          clearInterval(undoTickTimer);
          undoTickTimer = null;
        }
        set({ undoBuffer: null, undoActive: false });
        return;
      }
      set({ undoBuffer: { ...current, remainingMs: updated } });
    }, UNDO_TICK_MS);
  },

  executeUndo: (): void => {
    const buffer = get().undoBuffer;
    if (!buffer) return;

    // Stop the undo timer
    if (undoTickTimer !== null) {
      clearInterval(undoTickTimer);
      undoTickTimer = null;
    }

    // The actual restore is delegated to action creators (restoreSkill, restoreAgent, restoreProject)
    // which are bound via Object.assign. executeUndo dispatches to them.
    const state = get() as StoreState;
    const snapshot = buffer.snapshot as Record<string, unknown>;

    if (buffer.action === 'delete-skill' && typeof state.restoreSkill === 'function') {
      state.restoreSkill(snapshot);
    } else if (buffer.action === 'remove-agent' && typeof state.restoreAgent === 'function') {
      state.restoreAgent(snapshot);
    } else if (buffer.action === 'remove-project' && typeof state.restoreProject === 'function') {
      state.restoreProject(snapshot);
    }

    // Push success toast
    const name =
      (snapshot as Record<string, unknown>).name ||
      (snapshot as Record<string, unknown>).id ||
      'item';
    state.pushToast(`Restored '${String(name)}'`, 'success');

    // Clear undo buffer
    set({ undoBuffer: null, undoActive: false });
  },

  clearUndo: (): void => {
    if (undoTickTimer !== null) {
      clearInterval(undoTickTimer);
      undoTickTimer = null;
    }
    set({ undoBuffer: null, undoActive: false });
  },

  pushToast: (message, variant): void => {
    const toast: Toast = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      message,
      variant,
      expiresAt: Date.now() + TOAST_DURATION_MS,
    };

    const current = get();
    if (!current.activeToast) {
      set({ activeToast: toast });
    } else {
      set({ toastQueue: [...current.toastQueue, toast] });
    }

    // Ensure the toast auto-dismiss timer is running
    if (toastTickTimer === null) {
      toastTickTimer = setInterval(() => {
        const s = get();
        if (!s.activeToast) {
          if (toastTickTimer !== null) {
            clearInterval(toastTickTimer);
            toastTickTimer = null;
          }
          return;
        }
        if (Date.now() >= s.activeToast.expiresAt) {
          // Dismiss active, promote next
          const next = s.toastQueue.length > 0 ? s.toastQueue.slice(1) : [];
          const nextToast = s.toastQueue.length > 0 ? s.toastQueue[0] : null;
          set({ activeToast: nextToast, toastQueue: next });
          if (!nextToast && toastTickTimer !== null) {
            clearInterval(toastTickTimer);
            toastTickTimer = null;
          }
        }
      }, TOAST_TICK_MS);
    }
  },

  dismissActiveToast: (): void => {
    const current = get();
    const next = current.toastQueue.length > 0 ? current.toastQueue.slice(1) : [];
    const nextToast = current.toastQueue.length > 0 ? current.toastQueue[0] : null;
    set({ activeToast: nextToast, toastQueue: next });
    if (!nextToast && toastTickTimer !== null) {
      clearInterval(toastTickTimer);
      toastTickTimer = null;
    }
  },
});
