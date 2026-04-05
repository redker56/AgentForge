/**
 * BlurValidatedInput component tests — actual ink-testing-library render tests.
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { BlurValidatedInput } from '../../../src/tui/components/BlurValidatedInput.js';

describe('BlurValidatedInput', () => {
  it('renders with label and text input', () => {
    const { lastFrame } = render(
      <BlurValidatedInput
        value=""
        onChange={() => {}}
        validate={() => null}
        hasFocus
        label="Test Field"
      />
    );
    const frame = lastFrame();
    expect(frame).toBeDefined();
    expect(frame).toContain('Test Field');
  });

  it('shows error message when validation fails on forceValidate', () => {
    const validationResult = vi.fn();
    const { lastFrame } = render(
      <BlurValidatedInput
        value="invalid"
        onChange={() => {}}
        validate={() => 'bad'}
        hasFocus={false}
        forceValidate
        onValidationResult={validationResult}
        label="Field"
      />
    );
    const frame = lastFrame();
    expect(frame).toBeDefined();
    // First line: label + text input value
    expect(frame).toMatch(/Field:.*invalid/);
    // Callback confirms validation was performed and failed
    expect(validationResult).toHaveBeenCalledWith(false, 'bad');
  });

  it('clears error when value becomes valid on blur', () => {
    const validate = (v: string) => (v === 'bad' ? 'wrong!' : null);
    const validationResult = vi.fn();
    const { rerender } = render(
      <BlurValidatedInput
        value="bad"
        onChange={() => {}}
        validate={validate}
        hasFocus
        onValidationResult={validationResult}
        label="Field"
      />
    );

    // Focus the field then blur with valid value
    rerender(
      <BlurValidatedInput
        value="good"
        onChange={() => {}}
        validate={validate}
        hasFocus={false}
        onValidationResult={validationResult}
        label="Field"
      />
    );
    expect(validationResult).toHaveBeenCalledWith(true, null);
  });

  it('forceValidate toggles off and on retriggers validation', () => {
    const validate = (v: string) => (v === 'bad' ? 'wrong!' : null);
    const validationResult = vi.fn();
    const { rerender } = render(
      <BlurValidatedInput
        value="bad"
        onChange={() => {}}
        validate={validate}
        hasFocus={false}
        forceValidate
        onValidationResult={validationResult}
        label="Field"
      />
    );
    // First forceValidate triggers validation
    expect(validationResult).toHaveBeenCalledWith(false, 'wrong!');
    validationResult.mockClear();

    // ForceValidate off
    rerender(
      <BlurValidatedInput
        value="bad"
        onChange={() => {}}
        validate={validate}
        hasFocus={false}
        forceValidate={false}
        onValidationResult={validationResult}
        label="Field"
      />
    );
    expect(validationResult).not.toHaveBeenCalled();

    // ForceValidate on again with valid value
    rerender(
      <BlurValidatedInput
        value="good"
        onChange={() => {}}
        validate={validate}
        hasFocus={false}
        forceValidate
        onValidationResult={validationResult}
        label="Field"
      />
    );
    expect(validationResult).toHaveBeenCalledWith(true, null);
  });

  it('calls onValidationResult callback when forceValidate triggers', () => {
    const validationResult = vi.fn();
    render(
      <BlurValidatedInput
        value="bad"
        onChange={() => {}}
        validate={() => 'invalid'}
        hasFocus={false}
        forceValidate
        onValidationResult={validationResult}
        label="Field"
      />
    );
    expect(validationResult).toHaveBeenCalledWith(false, 'invalid');
  });

  it('calls onValidationResult callback when valid on forceValidate', () => {
    const validationResult = vi.fn();
    render(
      <BlurValidatedInput
        value="good"
        onChange={() => {}}
        validate={() => null}
        hasFocus={false}
        forceValidate
        onValidationResult={validationResult}
        label="Field"
      />
    );
    expect(validationResult).toHaveBeenCalledWith(true, null);
  });

  it('blur transition (hasFocus true -> false) triggers validation', () => {
    const validationResult = vi.fn();
    const { rerender } = render(
      <BlurValidatedInput
        value="bad"
        onChange={() => {}}
        validate={() => 'invalid'}
        hasFocus
        onValidationResult={validationResult}
        label="Field"
      />
    );

    expect(validationResult).not.toHaveBeenCalled();

    // Transition to hasFocus=false triggers blur validation
    rerender(
      <BlurValidatedInput
        value="bad"
        onChange={() => {}}
        validate={() => 'invalid'}
        hasFocus={false}
        onValidationResult={validationResult}
        label="Field"
      />
    );
    expect(validationResult).toHaveBeenCalledWith(false, 'invalid');
  });

  it('blur with valid value clears error and reports valid', () => {
    const validationResult = vi.fn();
    const { rerender } = render(
      <BlurValidatedInput
        value="good"
        onChange={() => {}}
        validate={() => null}
        hasFocus
        onValidationResult={validationResult}
        label="Field"
      />
    );

    rerender(
      <BlurValidatedInput
        value="good"
        onChange={() => {}}
        validate={() => null}
        hasFocus={false}
        onValidationResult={validationResult}
        label="Field"
      />
    );
    expect(validationResult).toHaveBeenCalledWith(true, null);
  });

  it('does not validate on initial render with hasFocus=false (no blur transition)', () => {
    const validationResult = vi.fn();
    render(
      <BlurValidatedInput
        value="bad"
        onChange={() => {}}
        validate={() => 'should not be called'}
        hasFocus={false}
        forceValidate={false}
        onValidationResult={validationResult}
        label="Field"
      />
    );
    // No blur transition, no forceValidate -> no validation
    expect(validationResult).not.toHaveBeenCalled();
  });
});