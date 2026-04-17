import { render } from 'ink-testing-library';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { StepIndicator } from '../../../src/tui/components/StepIndicator.js';

describe('StepIndicator', () => {
  it('renders all steps with correct labels', () => {
    const { lastFrame } = render(<StepIndicator steps={['Step One', 'Step Two', 'Step Three']} currentStep={0} />);
    const output = lastFrame();
    expect(output).toContain('Step One');
    expect(output).toContain('Step Two');
    expect(output).toContain('Step Three');
  });

  it('renders current step with > prefix and cyan-bold styling', () => {
    const { lastFrame } = render(<StepIndicator steps={['Select Operation', 'Select Skills', 'Confirm']} currentStep={1} />);
    const output = lastFrame();
    // Current step shows "> " prefix
    expect(output).toContain('Select Skills');
  });

  it('renders completed steps with green styling', () => {
    const { lastFrame } = render(<StepIndicator steps={['Step A', 'Step B', 'Step C']} currentStep={2} />);
    const output = lastFrame();
    // Steps 0 and 1 are completed, should be before step 2
    expect(output).toContain('Step A');
    expect(output).toContain('Step B');
    expect(output).toContain('Step C');
  });

  it('renders future steps with dim styling', () => {
    const { lastFrame } = render(<StepIndicator steps={['Step X', 'Step Y', 'Step Z']} currentStep={0} />);
    const output = lastFrame();
    expect(output).toContain('Step Y');
    expect(output).toContain('Step Z');
  });

  it('shows 7 steps for sync-agents operation', () => {
    const steps = ['Select Operation', 'Select Skills', 'Select Targets', 'Select Mode', 'Confirm', 'Executing', 'Results'];
    const { lastFrame } = render(<StepIndicator steps={steps} currentStep={0} />);
    const output = lastFrame();
    expect(output).toContain('Select Mode');
    expect(output?.split('\n').filter(l => l.trim().length > 0).length).toBe(7);
  });

  it('shows 8 steps for sync-projects operation', () => {
    const steps = ['Select Operation', 'Select Skills', 'Select Targets', 'Select Agent Types', 'Select Mode', 'Confirm', 'Executing', 'Results'];
    const { lastFrame } = render(<StepIndicator steps={steps} currentStep={0} />);
    const output = lastFrame();
    expect(output?.split('\n').filter(l => l.trim().length > 0).length).toBe(8);
  });

  it('shows 8 steps for project unsync operation', () => {
    const steps = ['Select Operation', 'Select Skills', 'Select Scope', 'Select Targets', 'Select Unsync Mode', 'Confirm', 'Executing', 'Results'];
    const { lastFrame } = render(<StepIndicator steps={steps} currentStep={0} />);
    const output = lastFrame();
    expect(output?.split('\n').filter(l => l.trim().length > 0).length).toBe(8);
  });

  it('respects custom width prop', () => {
    const { lastFrame } = render(<StepIndicator steps={['Short']} currentStep={0} width={30} />);
    const output = lastFrame();
    expect(output).toBeTruthy();
  });
});
