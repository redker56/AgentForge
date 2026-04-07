/**
 * Inline error message component with red text styling
 */

import { Text } from 'ink';
import React from 'react';

import { inkColors } from '../theme.js';

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps): React.ReactElement {
  return (
    <Text>
      <Text color={inkColors.error} backgroundColor={inkColors.error}> </Text>
      <Text color={inkColors.error}> {message}</Text>
    </Text>
  );
}
