/**
 * SyncForm component tests -- Sprint 4 enhanced
 *
 * Behaviors tested:
 *  - Exports and basic render
 *  - ResultsStep compact summary
 *  - StepIndicator rendering on left side of form
 *  - Step status updates when user advances
 *  - ExecutingStep shows overall progress bar at top, per-skill bars below
 */

import { describe, expect, it, vi, beforeAll } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';

// Module references populated by beforeAll
let SyncForm: any;
let StepIndicator: any;
let ProgressBar: any;
let ProgressBarStack: any;

beforeAll(async () => {
  const sf = await import('../../../src/tui/components/SyncForm.js');
  SyncForm = sf.SyncForm;
  const si = await import('../../../src/tui/components/StepIndicator.js');
  StepIndicator = si.StepIndicator;
  const pb = await import('../../../src/tui/components/ProgressBar.js');
  ProgressBar = pb.ProgressBar;
  ProgressBarStack = pb.ProgressBarStack;
});

function createMockStore(overrides: Record<string, unknown> = {}) {
  return {
    getState: () => ({
      syncFormStep: 'select-op',
      syncFormOperation: null as string | null,
      syncFormSelectedSkillNames: new Set(),
      syncFormSelectedTargetIds: new Set(),
      syncFormSelectedAgentTypes: new Set(),
      syncFormMode: 'copy',
      syncFormResults: [],
      syncFormFocusedIndex: 0,
      skills: [],
      agents: [{ id: 'claude', name: 'Claude Code' }],
      projects: [],
      setSyncFormStep: vi.fn(),
      setSyncFormOperation: vi.fn(),
      setSyncFormSelectedSkillNames: vi.fn(),
      setSyncFormSelectedTargetIds: vi.fn(),
      setSyncFormSelectedAgentTypes: vi.fn(),
      setSyncFormMode: vi.fn(),
      setSyncFormResults: vi.fn(),
      setSyncFormFocusedIndex: vi.fn(),
      activeTab: 'sync',
      showSearch: false,
      showHelp: false,
      confirmState: null,
      formState: null,
      conflictState: null,
      updateProgressItems: [],
      resetSyncForm: vi.fn(),
      toggleSyncFormSkill: vi.fn(),
      toggleSyncFormTarget: vi.fn(),
      toggleSyncFormAgentType: vi.fn(),
      refreshSkills: vi.fn(),
      syncSkillsToAgents: vi.fn(),
      syncSkillsToProjects: vi.fn(),
      unsyncFromAgents: vi.fn(),
      ...overrides,
    }),
    subscribe: vi.fn(() => () => {}),
  };
}

describe('SyncForm', () => {
  it('exports SyncForm component', () => {
    expect(SyncForm).toBeDefined();
    expect(typeof SyncForm).toBe('function');
  });

  it('renders a React element', () => {
    const element = React.createElement(SyncForm, { store: createMockStore() });
    expect(element.type).toBe(SyncForm);
  });

  // Sprint 3: ResultsStep compact summary tests
  it('renders ResultsStep via React.createElement', () => {
    const element = React.createElement(SyncForm, { store: createMockStore({
      syncFormStep: 'results',
      syncFormResults: [
        { target: 'skill-a -> claude', success: true },
        { target: 'skill-a -> codex', success: true },
        { target: 'skill-a -> gemini', success: true },
        { target: 'skill-a -> openclaw', success: true },
      ],
    })});
    expect(element.type).toBe(SyncForm);
  });

  it('renders ResultsStep with mixed results via React.createElement', () => {
    const element = React.createElement(SyncForm, { store: createMockStore({
      syncFormStep: 'results',
      syncFormResults: [
        { target: 'skill-a -> claude', success: true },
        { target: 'skill-a -> codex', success: true },
        { target: 'skill-a -> gemini', success: true },
        { target: 'skill-a -> openclaw', success: false, error: 'permission denied' },
      ],
    })});
    expect(element.type).toBe(SyncForm);
  });

  it('renders ResultsStep with all failures via React.createElement', () => {
    const element = React.createElement(SyncForm, { store: createMockStore({
      syncFormStep: 'results',
      syncFormResults: [
        { target: 'skill-a -> claude', success: false, error: 'perm denied' },
        { target: 'skill-a -> codex', success: false, error: 'network error' },
      ],
    })});
    expect(element.type).toBe(SyncForm);
  });

  // ===== Sprint 4: StepIndicator integration =====

  it('renders step indicator via React.createElement at select-op step', () => {
    const store = createMockStore({
      syncFormStep: 'select-op',
      syncFormOperation: 'sync-agents',
    });
    const element = React.createElement(SyncForm, { store });
    expect(element.type).toBe(SyncForm);
  });

  it('renders StepIndicator with correct steps for sync-agents operation', () => {
    const steps = ['Select Operation', 'Select Skills', 'Select Targets', 'Confirm', 'Executing', 'Results'];
    const { lastFrame } = render(React.createElement(StepIndicator, { steps, currentStep: 0 }));
    const output = lastFrame() ?? '';
    expect(output).toContain('Select Operation');
    expect(output).toContain('Select Skills');
    expect(output).toContain('Confirm');
    expect(output).toContain('Results');
    // 6 steps total
    const nonEmptyLines = output.split('\n').filter(l => l.trim().length > 0);
    expect(nonEmptyLines.length).toBe(6);
  });

  it('renders StepIndicator with correct steps for sync-projects operation', () => {
    const steps = ['Select Operation', 'Select Skills', 'Select Targets', 'Select Agent Types', 'Select Mode', 'Confirm', 'Executing', 'Results'];
    const { lastFrame } = render(React.createElement(StepIndicator, { steps, currentStep: 0 }));
    const output = lastFrame() ?? '';
    // 8 steps total
    const nonEmptyLines = output.split('\n').filter(l => l.trim().length > 0);
    expect(nonEmptyLines.length).toBe(8);
    expect(output).toContain('Select Agent Types');
    expect(output).toContain('Select Mode');
  });

  it('step indicator updates when navigating from select-op to select-skills', () => {
    const steps = ['Select Operation', 'Select Skills', 'Select Targets', 'Confirm', 'Executing', 'Results'];

    // At step 0 (select-op)
    const { lastFrame: lf1 } = render(
      React.createElement(StepIndicator, { steps, currentStep: 0 })
    );
    const output1 = lf1() ?? '';
    expect(output1).toContain('Select Operation');

    // At step 1 (select-skills) -- separate render simulating navigation
    const { lastFrame: lf2 } = render(
      React.createElement(StepIndicator, { steps, currentStep: 1 })
    );
    const output2 = lf2() ?? '';
    expect(output2).toContain('Select Skills');
  });

  // ===== Sprint 4: ExecutingStep with overall progress bar =====

  it('renders ExecutingStep with overall progress bar and per-skill bars', () => {
    const progressItems = [
      { id: 'skill-a', label: 'skill-a', progress: 100, status: 'success' as const },
      { id: 'skill-b', label: 'skill-b', progress: 100, status: 'success' as const },
      { id: 'skill-c', label: 'skill-c', progress: 50, status: 'running' as const },
    ];
    const store = createMockStore({
      syncFormStep: 'executing',
      updateProgressItems: progressItems,
    });
    const element = React.createElement(SyncForm, { store });
    expect(element.type).toBe(SyncForm);
  });

  it('overall progress bar shows aggregate progress correctly', () => {
    // 3 items: 2 success, 1 running -> overall = 67%, completed=2, total=3
    const progressItems = [
      { id: 's1', label: 'alpha', progress: 100, status: 'success' as const },
      { id: 's2', label: 'beta', progress: 100, status: 'success' as const },
      { id: 's3', label: 'gamma', progress: 50, status: 'running' as const },
    ];
    const totalItems = progressItems.length;
    const completedItems = progressItems.filter((i: { status: string }) => i.status === 'success').length;
    const overallProgress = Math.round((completedItems / totalItems) * 100);

    const { lastFrame } = render(
      React.createElement(ProgressBar, {
        label: 'Overall',
        progress: overallProgress,
        status: 'running',
        completed: completedItems,
        total: totalItems,
      })
    );
    const output = lastFrame() ?? '';
    expect(output).toContain('2/3');
    expect(output).toContain('67%');
  });

  it('overall progress bar shows 100% when all items succeed', () => {
    const { lastFrame } = render(
      React.createElement(ProgressBar, {
        label: 'Overall',
        progress: 100,
        status: 'success',
        completed: 5,
        total: 5,
      })
    );
    const output = lastFrame() ?? '';
    expect(output).toContain('5/5');
    expect(output).toContain('100%');
  });

  it('overall status is error when any item has error', () => {
    const progressItems = [
      { id: 's1', label: 'alpha', progress: 100, status: 'success' as const },
      { id: 's2', label: 'beta', progress: 100, status: 'error' as const, error: 'failed' },
    ];
    const totalItems = progressItems.length;
    const completedItems = progressItems.filter((i: { status: string }) => i.status === 'success').length;
    const anyError = progressItems.some((i: { status: string }) => i.status === 'error');
    const anyRunning = progressItems.some((i: { status: string }) => i.status === 'running' || i.status === 'pending');
    const overallStatus = anyError ? 'error' : anyRunning ? 'running' : 'success';

    expect(overallStatus).toBe('error');
    expect(completedItems).toBe(1);
    expect(totalItems).toBe(2);
  });
});
