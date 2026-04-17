/**
 * AgentForge TUI Theme - Anthropic editorial terminal aesthetic.
 *
 * Design translation for terminal UI:
 * - Warm graphite base instead of cold black
 * - Paper-toned focus surfaces for primary interactions
 * - Restrained orange / blue / green accents for hierarchy
 * - Editorial information density with gentle contrast
 */

export const colors = {
  // Brand accents
  accent: '#d97757',
  accentBright: '#e08b6f',
  accentMuted: '#b86447',

  // Supporting accents
  info: '#6a9bcc',
  infoMuted: '#5b87b5',
  success: '#788c5d',
  successMuted: '#64754d',
  warning: '#c89a57',
  error: '#c56b55',

  // Warm neutral text
  textPrimary: '#faf9f5',
  textSecondary: '#b0aea5',
  textTertiary: '#8f8b80',
  textDisabled: '#6e6a62',

  // Surfaces
  bgPrimary: '#141413',
  bgSecondary: '#1c1b18',
  bgTertiary: '#26241f',
  surface: '#201f1c',
  surfaceMuted: '#292721',
  paper: '#e8e6dc',
  paperText: '#141413',

  // Borders and focus
  border: '#5d584f',
  borderActive: '#b0aea5',
  focusBar: '#d97757',
  focusBg: '#e8e6dc',
  focusText: '#141413',

  // Sources and sync states
  gitSource: '#6a9bcc',
  localSource: '#b0aea5',
  projectSource: '#788c5d',
  synced: '#788c5d',
  notSynced: '#8f8b80',
  differentVersion: '#c89a57',
} as const;

export const inkColors = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  muted: colors.textTertiary,
  subtle: colors.textDisabled,
  accent: colors.accent,
  accentSoft: colors.accentBright,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  info: colors.info,
  git: colors.gitSource,
  project: colors.projectSource,
  focusBg: colors.focusBg,
  focusText: colors.focusText,
  focusBar: colors.focusBar,
  border: colors.border,
  borderActive: colors.borderActive,
  panel: colors.surface,
  paper: colors.paper,
} as const;

export const spacing = {
  paddingX: 1,
  tabGap: 1,
  listIndent: 2,
  sectionGap: 1,
} as const;

export const selectionMarkers = {
  selected: '[+]',
  unselected: '[ ]',
} as const;

export const emptyStateText = {
  skills: 'No skills installed. Press `a` to add one.',
  agents: 'No agents registered. Press `a` to add a custom agent.',
  projects: 'No projects registered. Press `a` to add a project.',
} as const;

export function renderFocusPrefix(isFocused: boolean): string {
  return isFocused ? '\u258E' : '  ';
}

export const statusDots = {
  active: '\u25CF',
  inactive: '\u25CB',
  partial: '\u25D0',
} as const;

export const progressStatusColors = {
  pending: inkColors.muted,
  running: inkColors.accent,
  success: inkColors.success,
  error: inkColors.error,
} as const;

export const symbols = {
  focusBar: '\u258E',
  checkMark: '\u2713',
  crossMark: '\u2717',
  bullet: '\u2022',
  arrow: '\u2192',
  ellipsis: '\u2026',
  separator: '\u2500',
  cornerTL: '\u250C',
  cornerTR: '\u2510',
  cornerBL: '\u2514',
  cornerBR: '\u2518',
  vertical: '\u2502',
  horizontal: '\u2500',
} as const;
