/**
 * AgentForge TUI Theme - Modern Claude Code aesthetic
 *
 * Design Philosophy:
 * - Clean, minimal color palette with high contrast
 * - Subtle use of accent colors for focus and emphasis
 * - Consistent visual hierarchy
 * - Dark-mode optimized with soft highlights
 */

// Primary accent - warm coral/peach for focus states
export const colors = {
  // Brand / Accent
  accent: '#FF6B6B', // Warm coral - primary accent
  accentBright: '#FF8787', // Lighter coral for hover/active
  accentMuted: '#E85555', // Darker coral for pressed

  // Status colors
  success: '#4ADE80', // Soft green
  successMuted: '#22C55E', // Darker green
  warning: '#FBBF24', // Amber
  error: '#F87171', // Soft red
  info: '#60A5FA', // Soft blue

  // Neutral palette
  textPrimary: '#FAFAFA', // Near white
  textSecondary: '#A1A1AA', // Muted gray
  textTertiary: '#71717A', // Dim gray
  textDisabled: '#52525B', // Very dim

  // Background
  bgPrimary: '#18181B', // Near black (zinc-900)
  bgSecondary: '#27272A', // Dark gray (zinc-800)
  bgTertiary: '#3F3F46', // Medium gray (zinc-700)

  // Focus highlight
  focusBar: '#FF6B6B', // Coral focus indicator (▎)
  focusBg: '#3F3F46', // Medium gray background for focused row

  // Borders
  border: '#3F3F46', // Subtle border
  borderActive: '#52525B', // Active border

  // Syntax / semantic
  gitSource: '#C084FC', // Purple for git sources
  localSource: '#A1A1AA', // Gray for local sources
  projectSource: '#60A5FA', // Blue for project sources

  // Sync status
  synced: '#4ADE80', // Green for synced
  notSynced: '#71717A', // Gray for not synced
  differentVersion: '#FBBF24', // Amber for different version
} as const;

// Semantic color mappings for Ink components
export const inkColors = {
  // Text colors
  primary: 'white',
  secondary: 'gray',
  muted: 'gray',
  accent: '#FF6B6B',
  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',
  git: '#C084FC',

  // Background colors (for focused rows)
  focusBg: '#3F3F46',

  // Focus bar character
  focusBar: '#FF6B6B',
} as const;

// Focus row rendering helper
export function renderFocusPrefix(isFocused: boolean): string {
  return isFocused ? '\u258E' : ' '; // ▎ or space
}

// Status dot characters
export const statusDots = {
  active: '\u25CF', // ● filled
  inactive: '\u25CB', // ○ hollow
  partial: '\u25D0', // ◐ half
} as const;

// Unicode symbols
export const symbols = {
  focusBar: '\u258E', // ▎
  checkMark: '\u2713', // ✓
  crossMark: '\u2717', // ✗
  bullet: '\u2022', // •
  arrow: '\u2192', // →
  ellipsis: '\u2026', // …
  separator: '\u2500', // ─
  cornerTL: '\u250C', // ┌
  cornerTR: '\u2510', // ┐
  cornerBL: '\u2514', // └
  cornerBR: '\u2518', // ┘
  vertical: '\u2502', // │
  horizontal: '\u2500', // ─
} as const;
