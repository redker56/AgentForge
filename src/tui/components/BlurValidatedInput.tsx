/**
 * Input wrapper that validates on blur (when focus leaves the field).
 *
 * Since Ink TextInput does not fire a native blur event, validation is triggered by:
 * 1. hasFocus transitioning from true to false (detected via useEffect)
 * 2. forceValidate prop toggling to true (parent forces validation for submit-time)
 *
 * The parent form tracks which field has focus and controls validation flow.
 */

import React, { useEffect, useState, useRef } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { ErrorMessage } from './ErrorMessage.js';

export interface BlurValidatedInputProps {
  value: string;
  onChange: (value: string) => void;
  validate: (value: string) => string | null;
  placeholder?: string;
  label?: string;
  width?: number;
  hasFocus?: boolean;
  onValidationResult?: (isValid: boolean, error: string | null) => void;
  forceValidate?: boolean;
}

export function BlurValidatedInput({
  value,
  onChange,
  validate,
  placeholder,
  label,
  width,
  hasFocus = false,
  onValidationResult,
  forceValidate = false,
}: BlurValidatedInputProps): React.ReactElement {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const prevHasFocus = useRef<boolean | undefined>(undefined);
  const prevForceValidate = useRef<boolean | undefined>(undefined);

  // Run validation when hasFocus transitions from true to false (blur)
  useEffect(() => {
    if (prevHasFocus.current === true && hasFocus === false) {
      const error = validate(value);
      setErrorMessage(error);
      if (onValidationResult) {
        onValidationResult(error === null, error);
      }
    }
    prevHasFocus.current = hasFocus;
  }, [hasFocus, value, validate, onValidationResult]);

  // Run validation when forceValidate is toggled to true
  useEffect(() => {
    const prev = prevForceValidate.current;
    if (forceValidate && (prev === false || prev === undefined)) {
      const error = validate(value);
      setErrorMessage(error);
      if (onValidationResult) {
        onValidationResult(error === null, error);
      }
    }
    prevForceValidate.current = forceValidate;
  }, [forceValidate, value, validate, onValidationResult]);

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        {label && <Text bold>{label}: </Text>}
        <TextInput
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          focus={hasFocus}
          onSubmit={() => {
            // Clear error on valid submit
          }}
        />
      </Box>
      {errorMessage && <ErrorMessage message={errorMessage} />}
    </Box>
  );
}
