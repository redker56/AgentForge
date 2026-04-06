/**
 * Inline error message component with red text styling
 */

import { Text } from 'ink';
import React from 'react';

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps): React.ReactElement {
  return (
    <Text>
      <Text color="red" backgroundColor="red"> </Text>
      <Text color="red"> {message}</Text>
    </Text>
  );
}
