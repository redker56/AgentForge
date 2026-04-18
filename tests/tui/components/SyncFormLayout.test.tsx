import { cleanup, render } from 'ink-testing-library';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { withLegacyUiState } from '../helpers/legacyUiState.js';

describe('SyncForm layout safety', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('ink', async (importOriginal) => {
      const actual = await importOriginal<typeof import('ink')>();
      return {
        ...actual,
        useStdout: () => ({
          stdout: { columns: 52, rows: 30 },
        }),
      };
    });
  });

  afterEach(() => {
    vi.doUnmock('ink');
    cleanup();
  });

  function createMockStore() {
    const state = {
      syncFormStep: 'select-targets',
      syncFormOperation: 'sync-projects' as const,
      syncFormSelectedSkillNames: new Set(['docx']),
      syncFormUnsyncScope: null,
      syncFormSelectedTargetIds: new Set(['very-long-project-id']),
      syncFormProjectUnsyncMode: null,
      syncFormSelectedAgentTypes: new Set<string>(),
      syncFormLoadingTargets: false,
      syncFormMode: 'copy' as const,
      syncFormResults: [],
      syncFormFocusedIndex: 0,
      skills: [{ name: 'docx' }],
      skillDetails: {},
      agents: [{ id: 'claude', name: 'Claude Code' }],
      projects: [
        {
          id: 'very-long-project-id',
          path: 'D:/a/really/long/project/path/that/would/otherwise/wrap/in-the-sync-form',
        },
      ],
      activeTab: 'sync' as const,
      showSearch: false,
      showHelp: false,
      confirmState: null,
      formState: null,
      conflictState: null,
      updateProgressItems: [],
      setSyncFormStep: vi.fn(),
      setSyncFormOperation: vi.fn(),
      setSyncFormSelectedSkillNames: vi.fn(),
      toggleSyncFormSkill: vi.fn(),
      setSyncFormUnsyncScope: vi.fn(),
      setSyncFormSelectedTargetIds: vi.fn(),
      toggleSyncFormTarget: vi.fn(),
      setSyncFormProjectUnsyncMode: vi.fn(),
      setSyncFormSelectedAgentTypes: vi.fn(),
      toggleSyncFormAgentType: vi.fn(),
      setSyncFormLoadingTargets: vi.fn(),
      setSyncFormMode: vi.fn(),
      setSyncFormResults: vi.fn(),
      setSyncFormFocusedIndex: vi.fn(),
      resetSyncForm: vi.fn(),
      loadSkillDetail: vi.fn(),
      refreshSkills: vi.fn(),
      syncSkillsToAgents: vi.fn(),
      syncSkillsToProjects: vi.fn(),
      unsyncFromAgents: vi.fn(),
      unsyncFromProjects: vi.fn(),
      updateSkills: vi.fn(),
      pushToast: vi.fn(),
      updateProgressItem: vi.fn(),
    };

    withLegacyUiState(state);
    return {
      getState: () => state,
      subscribe: vi.fn(() => () => {}),
    };
  }

  it('truncates long target rows so selected items do not wrap', async () => {
    const { SyncForm } = await import('../../../src/tui/components/SyncForm.js');
    const { lastFrame } = render(React.createElement(SyncForm, { store: createMockStore() }));
    const frame = lastFrame() ?? '';

    expect(frame).toContain('[+]');
    expect(frame).toContain('...');
    expect(frame).not.toContain('otherwise/wrap/in-the-sync-form');
  });
});
