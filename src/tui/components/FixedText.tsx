import { Text } from 'ink';
import React from 'react';

import { padDisplayText, truncateDisplayText } from '../utils/displayWidth.js';

type TextProps = React.ComponentProps<typeof Text>;

interface FixedTextProps extends Omit<TextProps, 'children'> {
  children: string;
  width: number;
  pad?: boolean;
}

export function fixedWidthText(text: string, width: number, pad = true): string {
  return pad ? padDisplayText(text, width) : truncateDisplayText(text, width);
}

export function FixedText({
  children,
  width,
  pad = true,
  ...textProps
}: FixedTextProps): React.ReactElement {
  return <Text {...textProps}>{fixedWidthText(children, width, pad)}</Text>;
}
