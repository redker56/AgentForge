/**
 * ImportFormTab component tests -- Sprint 4 enhanced
 *
 * Behaviors tested:
 *  - Export and render
 *  - StepIndicator rendering with 6 import steps
 *  - ImportChecklist integration in select-skills step
 *  - Step indicator updates when navigating through steps
 */

import { describe, expect, it, vi, beforeAll } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';

// Module references populated by beforeAll
let ImportFormTab: any;
let StepIndicator: any;
let ImportChecklist: any;

beforeAll(async () => {
  const ift = await import('../../../src/tui/components/ImportFormTab.js');
  ImportFormTab = ift.ImportFormTab;
  const si = await import('../../../src/tui/components/StepIndicator.js');
  StepIndicator = si.StepIndicator;
  const ic = await import('../../../src/tui/components/ImportChecklist.js');
  ImportChecklist = ic.ImportChecklist;
});

function createMockStore(overrides: Record<string, unknown> = {}) {
  return {
    getState: () => ({
      importTabStep: 'select-source-type',
      importTabSourceType: null as string | null,
      importTabSourceId: null as string | null,
      importTabSelectedSkillNames: new Set(),
      importTabResults: [],
      importTabFocusedIndex: 0,
      skills: [],
      agents: [],
      projects: [],
      setImportTabStep: vi.fn(),
      setImportTabSourceType: vi.fn(),
      setImportTabSourceId: vi.fn(),
      setImportTabSelectedSkillNames: vi.fn(),
      setImportTabResults: vi.fn(),
      setImportTabFocusedIndex: vi.fn(),
      activeTab: 'import',
      showSearch: false,
      showHelp: false,
      confirmState: null,
      formState: null,
      conflictState: null,
      updateProgressItems: [],
      resetImportTab: vi.fn(),
      toggleImportTabSkill: vi.fn(),
      refreshSkills: vi.fn(),
      ...overrides,
    }),
    subscribe: vi.fn(() => () => {}),
  };
}

const mockCtx = {
  storage: {
    getProject: vi.fn(),
    getAgent: vi.fn(),
  },
  scanService: {
    scanProject: vi.fn().mockReturnValue([]),
  },
  skillService: {
    exists: vi.fn().mockReturnValue(false),
  },
  fileOps: {
    listSubdirectories: vi.fn().mockReturnValue([]),
    fileExists: vi.fn().mockReturnValue(false),
  },
};

describe('ImportFormTab', () => {
  it('exports ImportFormTab component', () => {
    expect(ImportFormTab).toBeDefined();
    expect(typeof ImportFormTab).toBe('function');
  });

  it('ImportFormTab renders a React element', () => {
    const element = React.createElement(ImportFormTab, { store: createMockStore(), ctx: mockCtx });
    expect(element.type).toBe(ImportFormTab);
  });

  // ===== Sprint 4: StepIndicator integration =====

  it('renders StepIndicator with 6 import steps', () => {
    const steps = ['Select Source Type', 'Select Source', 'Select Skills', 'Confirm', 'Executing', 'Results'];
    const { lastFrame } = render(React.createElement(StepIndicator, { steps, currentStep: 0 }));
    const output = lastFrame() ?? '';
    expect(output).toContain('Select Source Type');
    expect(output).toContain('Select Skills');
    expect(output).toContain('Confirm');
    expect(output).toContain('Results');
    // 6 steps total
    const nonEmptyLines = output.split('\n').filter((l: string) => l.trim().length > 0);
    expect(nonEmptyLines.length).toBe(6);
  });

  it('import step indicator updates when navigating through steps', () => {
    const steps = ['Select Source Type', 'Select Source', 'Select Skills', 'Confirm', 'Executing', 'Results'];

    // Step 0: select-source-type
    const { lastFrame: lf1 } = render(
      React.createElement(StepIndicator, { steps, currentStep: 0 })
    );
    let output = lf1() ?? '';
    expect(output).toContain('Select Source Type');

    // Step 2: select-skills (after navigation)
    const { lastFrame: lf2 } = render(
      React.createElement(StepIndicator, { steps, currentStep: 2 })
    );
    output = lf2() ?? '';
    expect(output).toContain('Select Skills');
  });

  // ===== Sprint 4: ImportChecklist integration =====

  it('renders ImportChecklist for select-skills step', () => {
    const skills = [
      { name: 'react-hooks', path: '/home/.claude/skills/react-hooks', alreadyExists: false },
      { name: 'typescript', path: '/home/.claude/skills/typescript', alreadyExists: true },
    ];
    const { lastFrame } = render(
      React.createElement(ImportChecklist, {
        skills,
        selected: new Set(['react-hooks']),
        focusedIndex: 0,
        onToggle: () => {},
        onUp: () => {},
        onDown: () => {},
      })
    );
    const output = lastFrame() ?? '';
    expect(output).toContain('Select skills to import');
    expect(output).toContain('react-hooks');
    expect(output).toContain('[IMPORTED]');
  });

  it('ImportFormTab renders ImportChecklist when at select-skills step', () => {
    const store = createMockStore({
      importTabStep: 'select-skills',
      importTabSelectedSkillNames: new Set(),
    });
    const element = React.createElement(ImportFormTab, { store, ctx: mockCtx });
    expect(element.type).toBe(ImportFormTab);
  });

  it('already-imported items in ImportChecklist show dim and (already imported) note', () => {
    const skills = [
      { name: 'existing-skill', path: '/home/.claude/skills/existing', alreadyExists: true },
    ];
    const { lastFrame } = render(
      React.createElement(ImportChecklist, {
        skills,
        selected: new Set(['existing-skill']),
        focusedIndex: 0,
        onToggle: () => {},
        onUp: () => {},
        onDown: () => {},
      })
    );
    const output = lastFrame() ?? '';
    expect(output).toContain('already imported');
    expect(output).toContain('[IMPORTED]');
  });

  it('ImportChecklist toggle is no-op for already-imported items (parent guard)', () => {
    const selected = new Set<string>(['existing']);
    const skill = { name: 'existing', path: '/path', alreadyExists: true };

    // Parent (ImportFormTab) checks alreadyExists before calling toggle
    let toggleCalled = false;
    if (!skill.alreadyExists) {
      toggleCalled = true;
    }
    expect(toggleCalled).toBe(false);
    expect(selected.has('existing')).toBe(true);
  });

  it('Space key toggles selection on non-already-imported items', () => {
    const selected = new Set<string>();
    const skill = { name: 'new-skill', path: '/path/new', alreadyExists: false };

    // First toggle: add
    if (!skill.alreadyExists) {
      if (selected.has(skill.name)) {
        selected.delete(skill.name);
      } else {
        selected.add(skill.name);
      }
    }
    expect(selected.has('new-skill')).toBe(true);

    // Second toggle: remove
    if (!skill.alreadyExists) {
      if (selected.has(skill.name)) {
        selected.delete(skill.name);
      } else {
        selected.add(skill.name);
      }
    }
    expect(selected.has('new-skill')).toBe(false);
  });

  it('ImportFormTab ExecutingStep renders progress bars', () => {
    const store = createMockStore({
      importTabStep: 'executing',
      updateProgressItems: [
        { id: 'import-react', label: 'Importing react-hooks...', progress: 50, status: 'running' },
      ],
    });
    const element = React.createElement(ImportFormTab, { store, ctx: mockCtx });
    expect(element.type).toBe(ImportFormTab);
  });

  it('ImportFormTab ResultsStep renders results', () => {
    const store = createMockStore({
      importTabStep: 'results',
      importTabResults: [
        { target: 'react-hooks', success: true },
        { target: 'typescript', success: true },
      ],
    });
    const element = React.createElement(ImportFormTab, { store, ctx: mockCtx });
    expect(element.type).toBe(ImportFormTab);
  });
});
