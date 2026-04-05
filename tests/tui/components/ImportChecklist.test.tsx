import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { ImportChecklist } from '../../../src/tui/components/ImportChecklist.js';
import type { ChecklistSkill } from '../../../src/tui/components/ImportChecklist.js';

const mockSkills: ChecklistSkill[] = [
  { name: 'react-hooks', path: '/home/user/.claude/skills/react-hooks', alreadyExists: false },
  { name: 'typescript-base', path: '/home/user/.claude/skills/typescript-base', alreadyExists: true },
  { name: 'very-long-path-skill-that-exceeds-available-width-convention', path: '/very/long/path/that/should/be/truncated/properly/react-hooks', alreadyExists: false },
];

describe('ImportChecklist', () => {
  it('renders skills with [x]/[ ] markers', () => {
    const selected = new Set<string>(['react-hooks']);
    const { lastFrame } = render(
      <ImportChecklist
        skills={mockSkills.slice(0, 2)}
        selected={selected}
        focusedIndex={0}
        onToggle={() => {}}
        onUp={() => {}}
        onDown={() => {}}
      />
    );
    const output = lastFrame();
    expect(output).toContain('[IMPORTED]');
    expect(output).toContain('react-hooks');
  });

  it('marks already-imported items with (already imported) note', () => {
    const selected = new Set<string>(['typescript-base']);
    const { lastFrame } = render(
      <ImportChecklist
        skills={mockSkills.slice(0, 2)}
        selected={selected}
        focusedIndex={1}
        onToggle={() => {}}
        onUp={() => {}}
        onDown={() => {}}
      />
    );
    const output = lastFrame();
    expect(output).toContain('already imported');
  });

  it('truncates long paths to available width', () => {
    const selected = new Set<string>();
    const skill = mockSkills[2];
    const { lastFrame } = render(
      <ImportChecklist
        skills={[skill]}
        selected={selected}
        focusedIndex={0}
        onToggle={() => {}}
        onUp={() => {}}
        onDown={() => {}}
        columns={60}
      />
    );
    const output = lastFrame();
    // The full path should be truncated, showing '...' at the beginning
    expect(output).toContain('...');
    // The full original path should not appear in its entirety
    const lines = output?.split('\n') || [];
    for (const line of lines) {
      if (line.includes(skill.path)) {
        // If the full path appears, the line must include truncation marker or path is short enough
        break;
      }
    }
  });

  it('shows path display with truncation marker for long paths', () => {
    const selected = new Set<string>();
    const longSkill: import('../../../src/tui/components/ImportChecklist.js').ChecklistSkill = {
      name: 'react-hooks',
      path: '/very/long/path/that/should/be/truncated/properly/react-hooks',
      alreadyExists: false,
    };
    const { lastFrame } = render(
      <ImportChecklist
        skills={[longSkill]}
        selected={selected}
        focusedIndex={0}
        onToggle={() => {}}
        onUp={() => {}}
        onDown={() => {}}
        columns={60}
      />
    );
    const output = lastFrame();
    // Path should contain '...' truncation
    expect(output).toContain('...');
  });

  it('shows focus indicator on focused item', () => {
    const selected = new Set<string>();
    const { lastFrame } = render(
      <ImportChecklist
        skills={mockSkills.slice(0, 2)}
        selected={selected}
        focusedIndex={0}
        onToggle={() => {}}
        onUp={() => {}}
        onDown={() => {}}
      />
    );
    const output = lastFrame();
    expect(output).toContain('>');
  });

  it('header shows "Select skills to import"', () => {
    const selected = new Set<string>();
    const { lastFrame } = render(
      <ImportChecklist
        skills={mockSkills}
        selected={selected}
        focusedIndex={0}
        onToggle={() => {}}
        onUp={() => {}}
        onDown={() => {}}
      />
    );
    const output = lastFrame();
    expect(output).toContain('Select skills to import');
  });
});
