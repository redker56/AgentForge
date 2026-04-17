import type { SyncMode } from '../types.js';

export type ContextSkillFilter = 'all' | 'imported' | 'unimported';

export interface ContextSkillRow {
  rowId: string;
  name: string;
  path: string;
  registrySkillName?: string;
  agentId?: string;
  agentName?: string;
  projectId?: string;
  isImported: boolean;
  isDifferentVersion: boolean;
  syncMode?: SyncMode;
  isSynced?: boolean;
  sourceType: 'agent-user' | 'agent-project' | 'project';
}

export interface ContextSkillSection {
  id: string;
  title: string;
  rows: ContextSkillRow[];
}

export interface ContextSkillFilterCount {
  key: ContextSkillFilter;
  label: string;
  count: number;
}

export interface VisibleContextSkillRow extends ContextSkillRow {
  sectionId: string;
  sectionTitle: string;
}

const FILTER_SEQUENCE: ContextSkillFilter[] = ['all', 'imported', 'unimported'];

export function matchesContextSkillFilter(
  row: Pick<ContextSkillRow, 'isImported'>,
  filter: ContextSkillFilter
): boolean {
  if (filter === 'all') return true;
  if (filter === 'imported') return row.isImported;
  return !row.isImported;
}

export function getContextSkillFilterCounts(
  rows: Array<Pick<ContextSkillRow, 'isImported'>>
): ContextSkillFilterCount[] {
  const importedCount = rows.filter((row) => row.isImported).length;
  const unimportedCount = rows.length - importedCount;

  return [
    { key: 'all', label: 'All', count: rows.length },
    { key: 'imported', label: 'Imported', count: importedCount },
    { key: 'unimported', label: 'Unimported', count: unimportedCount },
  ];
}

export function getVisibleContextSkillRows(
  sections: ContextSkillSection[],
  filter: ContextSkillFilter
): VisibleContextSkillRow[] {
  return sections.flatMap((section) =>
    section.rows
      .filter((row) => matchesContextSkillFilter(row, filter))
      .map((row) => ({
        ...row,
        sectionId: section.id,
        sectionTitle: section.title,
      }))
  );
}

export function cycleContextSkillFilter(
  current: ContextSkillFilter,
  direction: -1 | 1
): ContextSkillFilter {
  const currentIndex = FILTER_SEQUENCE.indexOf(current);
  const startIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (startIndex + direction + FILTER_SEQUENCE.length) % FILTER_SEQUENCE.length;
  return FILTER_SEQUENCE[nextIndex];
}
