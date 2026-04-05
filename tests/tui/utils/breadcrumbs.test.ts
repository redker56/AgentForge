/**
 * Breadcrumb derivation tests
 */

import { describe, expect, it } from 'vitest';
import { deriveBreadcrumbs } from '../../../src/tui/utils/breadcrumbs.js';
import type { BreadcrumbState } from '../../../src/tui/utils/breadcrumbs.js';

function makeState(overrides: Partial<BreadcrumbState> = {}): BreadcrumbState {
  return {
    activeTab: 'skills',
    showSearch: false,
    showHelp: false,
    showCommandPalette: false,
    confirmState: null,
    formState: null,
    syncFormStep: 'select-op',
    importTabStep: 'select-source-type',
    detailOverlayVisible: false,
    widthBand: 'widescreen',
    ...overrides,
  };
}

describe('deriveBreadcrumbs', () => {
  it('returns empty array when no overlay is active', () => {
    const result = deriveBreadcrumbs(makeState());
    expect(result).toEqual([]);
  });

  it('returns base tab name only when no overlay is active', () => {
    // No overlay means empty array (zero height cost)
    const result = deriveBreadcrumbs(makeState({ activeTab: 'skills' }));
    expect(result).toEqual([]);
  });

  it('includes tab + Search when showSearch is true', () => {
    const result = deriveBreadcrumbs(makeState({ showSearch: true }));
    expect(result).toEqual(['Skills', 'Search']);
  });

  it('includes tab + Commands when showCommandPalette is true', () => {
    const result = deriveBreadcrumbs(makeState({ showCommandPalette: true }));
    expect(result).toEqual(['Skills', 'Commands']);
  });

  it('includes tab + Help when showHelp is true', () => {
    const result = deriveBreadcrumbs(makeState({ showHelp: true }));
    expect(result).toEqual(['Skills', 'Help']);
  });

  it('includes tab + Confirm title when confirmState is active', () => {
    const result = deriveBreadcrumbs(makeState({
      confirmState: { title: 'Delete skill', message: 'Sure?', onConfirm: () => {} },
    }));
    expect(result).toEqual(['Skills', 'Confirm Delete skill']);
  });

  it('includes tab + form type when formState is active', () => {
    const result = deriveBreadcrumbs(makeState({
      formState: { formType: 'addSkill', data: {} },
    }));
    expect(result).toEqual(['Skills', 'Add Skill']);
  });

  it('includes tab + Detail when detailOverlayVisible in standard band', () => {
    const result = deriveBreadcrumbs(makeState({
      detailOverlayVisible: true,
      widthBand: 'standard',
    }));
    expect(result).toEqual(['Skills', 'Detail']);
  });

  it('does NOT include Detail in widescreen band', () => {
    const result = deriveBreadcrumbs(makeState({
      detailOverlayVisible: true,
      widthBand: 'widescreen',
    }));
    // In widescreen, detail is shown inline, not as overlay -- no breadcrumb
    expect(result).toEqual([]);
  });

  it('includes sync step name when syncFormStep is past select-op', () => {
    const result = deriveBreadcrumbs(makeState({
      activeTab: 'sync',
      syncFormStep: 'select-skills',
    }));
    expect(result).toEqual(['Sync', 'Select Skills']);
  });

  it('includes multiple sync steps', () => {
    const result = deriveBreadcrumbs(makeState({
      activeTab: 'sync',
      syncFormStep: 'select-targets',
    }));
    expect(result).toEqual(['Sync', 'Select Targets']);
  });

  it('includes import step name when importTabStep is past select-source-type', () => {
    const result = deriveBreadcrumbs(makeState({
      activeTab: 'import',
      importTabStep: 'select-source',
    }));
    expect(result).toEqual(['Import', 'Select Source']);
  });

  it('includes import step for select-skills', () => {
    const result = deriveBreadcrumbs(makeState({
      activeTab: 'import',
      importTabStep: 'select-skills',
    }));
    expect(result).toEqual(['Import', 'Select Skills']);
  });

  it('combines tab name correctly for agents', () => {
    const result = deriveBreadcrumbs(makeState({
      activeTab: 'agents',
      showSearch: true,
    }));
    expect(result).toEqual(['Agents', 'Search']);
  });

  it('combines tab name correctly for projects', () => {
    const result = deriveBreadcrumbs(makeState({
      activeTab: 'projects',
      confirmState: { title: 'Remove Project', message: 'Sure?', onConfirm: () => {} },
    }));
    expect(result).toEqual(['Projects', 'Confirm Remove Project']);
  });

  it('uses correct tab names for all tabs', () => {
    const tabs = ['skills', 'agents', 'projects', 'sync', 'import'] as const;
    const expectedNames = ['Skills', 'Agents', 'Projects', 'Sync', 'Import'];

    for (let i = 0; i < tabs.length; i++) {
      const result = deriveBreadcrumbs(makeState({
        activeTab: tabs[i],
        showSearch: true,
      }));
      expect(result[0]).toBe(expectedNames[i]);
    }
  });

  it('does not include sync steps on non-sync tab', () => {
    const result = deriveBreadcrumbs(makeState({
      activeTab: 'skills',
      syncFormStep: 'select-skills',
    }));
    // Sync steps should only appear on sync tab
    expect(result).toEqual([]);
  });

  it('does not include import steps on non-import tab', () => {
    const result = deriveBreadcrumbs(makeState({
      activeTab: 'skills',
      importTabStep: 'select-source',
    }));
    expect(result).toEqual([]);
  });
});
