/**
 * Breadcrumb derivation utility.
 *
 * Derives breadcrumb segments from store state for the BreadcrumbBar.
 * Returns an empty array when no overlay/form/step is active (zero height cost).
 */

import { getTuiText, type TuiLocale } from '../i18n.js';
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
  locale?: TuiLocale;
}

export function deriveBreadcrumbs(state: BreadcrumbState): string[] {
  const segments: string[] = [];
  const text = getTuiText(state.locale);

  // Base segment is always the active tab name
  const tabName = text.tabs[state.activeTab] ?? state.activeTab;
  segments.push(tabName);

  let hasOverlay = false;

  // Confirm modal
  if (state.confirmState) {
    const title = state.confirmState.title;
    // Try to derive a clean action label from the title
    segments.push(text.breadcrumbs.confirmTitle(title));
    hasOverlay = true;
  }

  // Form state
  if (state.formState) {
    const label = text.breadcrumbs.forms[state.formState.formType] ?? state.formState.formType;
    segments.push(label);
    hasOverlay = true;
  }

  // Search overlay
  if (state.showSearch) {
    segments.push(text.breadcrumbs.search);
    hasOverlay = true;
  }

  // Command palette
  if (state.showCommandPalette) {
    segments.push(text.breadcrumbs.commands);
    hasOverlay = true;
  }

  // Help overlay
  if (state.showHelp) {
    segments.push(text.breadcrumbs.help);
    hasOverlay = true;
  }

  // Detail overlay
  if (
    state.detailOverlayVisible &&
    (state.widthBand !== 'widescreen' || state.activeTab !== 'skills')
  ) {
    segments.push(text.breadcrumbs.detail);
    hasOverlay = true;
  }

  // Sync form steps (only when user has progressed past select-op)
  if (state.activeTab === 'sync' && state.syncFormStep !== 'select-op') {
    const stepLabel = text.breadcrumbs.syncSteps[state.syncFormStep];
    if (stepLabel) {
      segments.push(stepLabel);
      hasOverlay = true;
    }
  }

  // Import form steps (only when user has progressed past select-source-type)
  if (state.activeTab === 'import' && state.importTabStep !== 'select-source-type') {
    const stepLabel = text.breadcrumbs.importSteps[state.importTabStep];
    if (stepLabel) {
      segments.push(stepLabel);
      hasOverlay = true;
    }
  }

  // If no overlay/step is active beyond the tab itself, return empty array (zero height cost)
  if (!hasOverlay) return [];

  return segments;
}
