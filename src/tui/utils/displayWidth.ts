import stringWidth from 'string-width';

export function getDisplayWidth(text: string): number {
  return stringWidth(text);
}

export function truncateDisplayText(text: string, maxWidth: number): string {
  if (maxWidth <= 0) return '';
  if (getDisplayWidth(text) <= maxWidth) return text;
  if (maxWidth <= 3) {
    return truncateWithoutEllipsis(text, maxWidth);
  }

  const ellipsis = '...';
  const availableWidth = maxWidth - getDisplayWidth(ellipsis);
  return `${truncateWithoutEllipsis(text, availableWidth)}${ellipsis}`;
}

function truncateWithoutEllipsis(text: string, maxWidth: number): string {
  if (maxWidth <= 0) return '';

  let output = '';
  let usedWidth = 0;
  for (const character of text) {
    const characterWidth = getDisplayWidth(character);
    if (usedWidth + characterWidth > maxWidth) {
      break;
    }
    output += character;
    usedWidth += characterWidth;
  }

  return output;
}
