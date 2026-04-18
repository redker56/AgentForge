/**
 * Breadcrumb derivation utility.
 *
 * Derives breadcrumb segments from store state for the BreadcrumbBar.
 * Returns an empty array when no overlay/form/step is active (zero height cost).
 */

import type { TabId, SyncFormStep, ImportFormTabStep, FormType } from '../store/uiSlice.js';

export interface BreadcrumbState {
  activeTab: TabId;
  showSearch: boolean;
  showHelp: boolean;
  showCommandPalette: boolean;
  confirmState: { title: string } | null;
  formState: { formType: FormType } | null;
  syncFormStep: SyncFormStep;
  importTabStep: ImportFormTabStep;
  detailOverlayVisible: boolean;
  widthBand: 'compact' | 'standard' | 'widescreen' | 'warning';
}

const TAB_NAMES: Record<TabId, string> = {
  skills: 'Skills',
  agents: 'Agents',
  projects: 'Projects',
  sync: 'Sync',
  import: 'Import',
};

const FORM_LABELS: Record<FormType, string> = {
  addSkill: 'Add Skill',
  addAgent: 'Add Agent',
  addProject: 'Add Project',
  importProject: 'Import',
  importAgent: 'Import',
  importContextSkills: 'Import',
  categorizeSkills: 'Categorize',
  updateSelected: 'Update',
  updateAllGit: 'Update',
};

const SYNC_STEP_LABELS: Record<SyncFormStep, string> = {
  'select-op': '',
  'select-skills': 'Select Skills',
  'select-unsync-scope': 'Select Scope',
  'select-targets': 'Select Targets',
  'select-unsync-project-mode': 'Select Unsync Mode',
  'select-agent-types': 'Select Agent Types',
  'select-mode': 'Select Mode',
  confirm: 'Confirm',
  executing: 'Executing',
  results: 'Results',
};

const IMPORT_STEP_LABELS: Record<ImportFormTabStep, string> = {
  'select-source-type': '',
  'select-source': 'Select Source',
  'select-skills': 'Select Skills',
  confirm: 'Confirm',
  executing: 'Executing',
  results: 'Results',
};

export function deriveBreadcrumbs(state: BreadcrumbState): string[] {
  const segments: string[] = [];

  // Base segment is always the active tab name
  const tabName = TAB_NAMES[state.activeTab] ?? state.activeTab;
  segments.push(tabName);

  let hasOverlay = false;

  // Confirm modal
  if (state.confirmState) {
    const title = state.confirmState.title;
    // Try to derive a clean action label from the title
    segments.push(`Confirm ${title}`);
    hasOverlay = true;
  }

  // Form state
  if (state.formState) {
    const label = FORM_LABELS[state.formState.formType] ?? state.formState.formType;
    segments.push(label);
    hasOverlay = true;
  }

  // Search overlay
  if (state.showSearch) {
    segments.push('Search');
    hasOverlay = true;
  }

  // Command palette
  if (state.showCommandPalette) {
    segments.push('Commands');
    hasOverlay = true;
  }

  // Help overlay
  if (state.showHelp) {
    segments.push('Help');
    hasOverlay = true;
  }

  // Detail overlay
  if (
    state.detailOverlayVisible &&
    (state.widthBand !== 'widescreen' || state.activeTab !== 'skills')
  ) {
    segments.push('Detail');
    hasOverlay = true;
  }

  // Sync form steps (only when user has progressed past select-op)
  if (state.activeTab === 'sync' && state.syncFormStep !== 'select-op') {
    const stepLabel = SYNC_STEP_LABELS[state.syncFormStep];
    if (stepLabel) {
      segments.push(stepLabel);
      hasOverlay = true;
    }
  }

  // Import form steps (only when user has progressed past select-source-type)
  if (state.activeTab === 'import' && state.importTabStep !== 'select-source-type') {
    const stepLabel = IMPORT_STEP_LABELS[state.importTabStep];
    if (stepLabel) {
      segments.push(stepLabel);
      hasOverlay = true;
    }
  }

  // If no overlay/step is active beyond the tab itself, return empty array (zero height cost)
  if (!hasOverlay) return [];

  return segments;
}
