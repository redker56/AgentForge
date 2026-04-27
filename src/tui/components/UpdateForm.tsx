/**
 * Update form overlay for batch skill updates from the Skills tab.
 */

import { Box, Text, useInput } from 'ink';
import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type { AppStore } from '../store/index.js';
import type { UpdateResult } from '../store/uiSlice.js';
import { inkColors } from '../theme.js';
import { truncateDisplayText } from '../utils/displayWidth.js';

import { ProgressBarStack } from './ProgressBar.js';

interface UpdateFormProps {
  store: StoreApi<AppStore>;
}

type UpdatePhase = 'preview' | 'executing' | 'results';

interface PreviewItem {
  skillName: string;
  sourceType: UpdateResult['sourceType'];
  willUpdate: boolean;
  detail: string;
}

interface ProgressViewport {
  visibleItems: AppStore['shellState']['updateProgressItems'];
  hiddenAboveCount: number;
  hiddenBelowCount: number;
}

const MAX_VISIBLE_ROWS = 8;
const MAX_VISIBLE_PROGRESS = 6;
const FORM_WIDTH = 76;
const CONTENT_WIDTH = FORM_WIDTH - 4;

function parseSkillNames(encoded: string | undefined): string[] {
  if (!encoded) return [];
  try {
    const parsed = JSON.parse(encoded) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

function formatSourceLabel(sourceType: PreviewItem['sourceType']): string {
  switch (sourceType) {
    case 'git':
      return 'git';
    case 'local':
      return 'local';
    case 'project':
      return 'project';
    default:
      return 'unknown';
  }
}

function renderFixedRows(
  rows: React.ReactNode[],
  emptyFactory: (index: number) => React.ReactNode
): React.ReactNode[] {
  const visible = rows.slice(0, MAX_VISIBLE_ROWS);
  const rendered: React.ReactNode[] = [...visible];
  while (rendered.length < MAX_VISIBLE_ROWS) {
    rendered.push(emptyFactory(rendered.length));
  }
  return rendered;
}

function truncateText(text: string, maxWidth = CONTENT_WIDTH): string {
  return truncateDisplayText(text, maxWidth);
}

function findViewportAnchorIndex(items: AppStore['shellState']['updateProgressItems']): number {
  const runningIndex = items.findIndex((item) => item.status === 'running');
  if (runningIndex >= 0) {
    return runningIndex;
  }

  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index]?.status !== 'pending') {
      return index;
    }
  }

  return 0;
}

export function getProgressViewport(
  items: AppStore['shellState']['updateProgressItems'],
  maxVisible: number
): ProgressViewport {
  if (items.length <= maxVisible) {
    return {
      visibleItems: items,
      hiddenAboveCount: 0,
      hiddenBelowCount: 0,
    };
  }

  const anchorIndex = findViewportAnchorIndex(items);
  const maxStart = Math.max(items.length - maxVisible, 0);
  const startIndex = Math.min(Math.max(anchorIndex - maxVisible + 1, 0), maxStart);
  const endIndex = Math.min(startIndex + maxVisible, items.length);

  return {
    visibleItems: items.slice(startIndex, endIndex),
    hiddenAboveCount: startIndex,
    hiddenBelowCount: Math.max(items.length - endIndex, 0),
  };
}

export function getRetryableUpdateSkillNames(results: UpdateResult[]): string[] {
  return results
    .filter((item) => item.outcome === 'error' && item.skillName !== 'update')
    .map((item) => item.skillName);
}

export function UpdateForm({ store }: UpdateFormProps): React.ReactElement {
  const formState = useStore(store, (s) => s.shellState.formState);
  const skills = useStore(store, (s) => s.skills);
  const updateProgressItems = useStore(store, (s) => s.shellState.updateProgressItems);

  const [phase, setPhase] = useState<UpdatePhase>('preview');
  const [results, setResults] = useState<UpdateResult[]>([]);

  const isVisible =
    formState?.formType === 'updateSelected' || formState?.formType === 'updateAllGit';
  const requestedSkillNames = useMemo(
    () => parseSkillNames(formState?.data.skillNames),
    [formState?.data.skillNames]
  );

  const previewItems = useMemo<PreviewItem[]>(() => {
    return requestedSkillNames.map((skillName) => {
      const skill = skills.find((item) => item.name === skillName);
      if (!skill) {
        return {
          skillName,
          sourceType: 'unknown',
          willUpdate: false,
          detail: 'Missing from registry',
        };
      }

      if (skill.source.type === 'git') {
        return {
          skillName,
          sourceType: 'git',
          willUpdate: true,
          detail: 'Will update and re-sync',
        };
      }

      if (skill.source.type === 'project') {
        return {
          skillName,
          sourceType: 'project',
          willUpdate: false,
          detail: 'Skipped: project-backed',
        };
      }

      return {
        skillName,
        sourceType: 'local',
        willUpdate: false,
        detail: 'Skipped: not git-backed',
      };
    });
  }, [requestedSkillNames, skills]);

  const updatableCount = previewItems.filter((item) => item.willUpdate).length;
  const skippedPreviewCount = previewItems.length - updatableCount;

  useEffect(() => {
    if (!isVisible) return;
    setPhase('preview');
    setResults([]);
  }, [formState?.formType, formState?.data.skillNames, isVisible]);

  const failedSkillNames = useMemo(() => getRetryableUpdateSkillNames(results), [results]);

  function runUpdate(skillNames: string[]): void {
    setPhase('executing');
    setResults([]);
    void store
      .getState()
      .updateSkills(skillNames)
      .then((nextResults) => {
        setResults(nextResults);
        setPhase('results');
      })
      .catch((error: unknown) => {
        setResults([
          {
            skillName: 'update',
            sourceType: 'unknown',
            outcome: 'error',
            detail: error instanceof Error ? error.message : String(error),
          },
        ]);
        setPhase('results');
      });
  }

  useInput(
    (input, key) => {
      if (!isVisible || phase === 'executing') return;

      if (phase === 'results' && input.toLowerCase() === 'r' && failedSkillNames.length > 0) {
        runUpdate(failedSkillNames);
        return;
      }

      if (key.return) {
        if (phase === 'preview') {
          if (updatableCount === 0) {
            store.getState().setFormState(null);
            return;
          }

          runUpdate(requestedSkillNames);
          return;
        }

        if (phase === 'results') {
          store.getState().setFormState(null);
        }
        return;
      }

      if (key.escape) {
        store.getState().setFormState(null);
      }
    },
    { isActive: isVisible }
  );

  if (!isVisible || !formState) {
    return <></>;
  }

  const title =
    formState.formType === 'updateAllGit' ? 'Update All Git Skills' : 'Update Selected Skills';
  const previewRows = previewItems.map((item) => (
    <Text key={item.skillName}>
      {truncateText(
        `${item.willUpdate ? '[update]' : '[skip]  '} ${item.skillName} [${formatSourceLabel(item.sourceType)}] ${item.detail}`
      )}
    </Text>
  ));

  const fixedPreviewRows = renderFixedRows(previewRows, (index) => (
    <Text key={`empty-preview-${index}`} dimColor>
      {' '}
    </Text>
  ));
  const {
    visibleItems: visibleProgressItems,
    hiddenAboveCount,
    hiddenBelowCount,
  } = getProgressViewport(updateProgressItems, MAX_VISIBLE_PROGRESS);
  const progressOverflowSummary =
    hiddenAboveCount > 0 && hiddenBelowCount > 0
      ? `... ${hiddenAboveCount} earlier | ${hiddenBelowCount} more task(s)`
      : hiddenAboveCount > 0
        ? `... ${hiddenAboveCount} earlier task(s)`
        : hiddenBelowCount > 0
          ? `... ${hiddenBelowCount} more task(s)`
          : '';
  const updatedCount = results.filter((item) => item.outcome === 'updated').length;
  const skippedCount = results.filter((item) => item.outcome === 'skipped').length;
  const errorCount = results.filter((item) => item.outcome === 'error').length;
  const resultRows = results.map((item) => {
    const color =
      item.outcome === 'updated'
        ? inkColors.success
        : item.outcome === 'error'
          ? inkColors.error
          : inkColors.muted;
    const badge =
      item.outcome === 'updated'
        ? '[updated]'
        : item.outcome === 'error'
          ? '[error]  '
          : '[skipped]';
    return (
      <Text key={`${item.skillName}-${item.outcome}`} color={color}>
        {truncateText(`${badge} ${item.skillName}${item.detail ? ` - ${item.detail}` : ''}`)}
      </Text>
    );
  });
  const fixedResultRows = renderFixedRows(resultRows, (index) => (
    <Text key={`empty-result-${index}`} dimColor>
      {' '}
    </Text>
  ));

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      padding={1}
      width={FORM_WIDTH}
      marginTop={1}
      borderColor={inkColors.border}
    >
      <Text bold color={inkColors.accent}>
        {title}
      </Text>
      <Text color={inkColors.muted}>
        {requestedSkillNames.length} requested | {updatableCount} updatable
        {skippedPreviewCount > 0 ? ` | ${skippedPreviewCount} skipped` : ''}
      </Text>
      <Text> </Text>

      {phase === 'preview' && (
        <>
          <Text dimColor>{truncateText('Preview targets before running the update:')}</Text>
          <Text> </Text>
          {fixedPreviewRows}
          {previewItems.length > MAX_VISIBLE_ROWS && (
            <Text dimColor>... {previewItems.length - MAX_VISIBLE_ROWS} more target(s)</Text>
          )}
          {previewItems.length <= MAX_VISIBLE_ROWS && <Text dimColor> </Text>}
          <Text> </Text>
          {updatableCount > 0 ? (
            <Text dimColor>Enter:Start update Esc:Cancel</Text>
          ) : (
            <Text dimColor>
              {truncateText('No git-backed skills to update. Enter or Esc to close.')}
            </Text>
          )}
        </>
      )}

      {phase === 'executing' && (
        <>
          <Text dimColor>
            {truncateText('Updating git-backed skills and re-syncing managed copies...')}
          </Text>
          <Text> </Text>
          {visibleProgressItems.length > 0 ? (
            <ProgressBarStack items={visibleProgressItems} />
          ) : (
            <Text dimColor>Preparing update tasks...</Text>
          )}
          {progressOverflowSummary ? (
            <Text dimColor>{progressOverflowSummary}</Text>
          ) : (
            <Text dimColor> </Text>
          )}
          <Text> </Text>
          <Text dimColor>Please wait...</Text>
        </>
      )}

      {phase === 'results' && (
        <>
          <Text>
            <Text color={inkColors.success}>{updatedCount} updated</Text>
            <Text color={inkColors.muted}> | </Text>
            <Text color={inkColors.muted}>{skippedCount} skipped</Text>
            <Text color={inkColors.muted}> | </Text>
            <Text color={errorCount > 0 ? inkColors.error : inkColors.muted}>
              {errorCount} errors
            </Text>
          </Text>
          <Text> </Text>
          {fixedResultRows}
          {results.length > MAX_VISIBLE_ROWS && (
            <Text dimColor>... {results.length - MAX_VISIBLE_ROWS} more result(s)</Text>
          )}
          {results.length <= MAX_VISIBLE_ROWS && <Text dimColor> </Text>}
          <Text> </Text>
          {errorCount > 0 && failedSkillNames.length > 0 ? (
            <Text dimColor>R:Retry failed Enter:Close Esc:Close</Text>
          ) : (
            <Text dimColor>Enter:Close Esc:Close</Text>
          )}
        </>
      )}
    </Box>
  );
}
