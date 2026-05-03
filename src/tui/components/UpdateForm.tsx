/**
 * Update form overlay for batch skill updates from the Skills tab.
 */

import { Box, Text, useInput } from 'ink';
import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import { getTuiText } from '../i18n.js';
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

function formatSourceLabel(
  sourceType: PreviewItem['sourceType'],
  text: ReturnType<typeof getTuiText>
): string {
  switch (sourceType) {
    case 'git':
      return text.common.git;
    case 'local':
      return text.common.local;
    case 'project':
      return text.common.project;
    default:
      return text.common.unknown.toLowerCase();
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
  const locale = useStore(store, (s) => s.shellState.locale);
  const text = getTuiText(locale);
  const updateText = text.updateForm;

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
          detail: updateText.missing,
        };
      }

      if (skill.source.type === 'git') {
        return {
          skillName,
          sourceType: 'git',
          willUpdate: true,
          detail: updateText.willUpdate,
        };
      }

      if (skill.source.type === 'project') {
        return {
          skillName,
          sourceType: 'project',
          willUpdate: false,
          detail: updateText.skippedProject,
        };
      }

      return {
        skillName,
        sourceType: 'local',
        willUpdate: false,
        detail: updateText.skippedNotGit,
      };
    });
  }, [requestedSkillNames, skills, updateText]);

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
    formState.formType === 'updateAllGit' ? updateText.titleAll : updateText.titleSelected;
  const previewRows = previewItems.map((item) => (
    <Text key={item.skillName}>
      {truncateText(
        `${item.willUpdate ? updateText.badges.update : updateText.badges.skip} ${item.skillName} [${formatSourceLabel(item.sourceType, text)}] ${item.detail}`
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
      ? updateText.progressBoth(hiddenAboveCount, hiddenBelowCount)
      : hiddenAboveCount > 0
        ? updateText.progressEarlier(hiddenAboveCount)
        : hiddenBelowCount > 0
          ? updateText.progressLater(hiddenBelowCount)
          : '';
  const updatedCount = results.filter((item) => item.outcome === 'updated').length;
  const skippedCount = results.filter((item) => item.outcome === 'skipped').length;
  const errorCount = results.filter((item) => item.outcome === 'error').length;
  const errorLabel = locale === 'en' && errorCount !== 1 ? 'errors' : text.common.error;
  const resultRows = results.map((item) => {
    const color =
      item.outcome === 'updated'
        ? inkColors.success
        : item.outcome === 'error'
          ? inkColors.error
          : inkColors.muted;
    const badge =
      item.outcome === 'updated'
        ? updateText.badges.updated
        : item.outcome === 'error'
          ? updateText.badges.error
          : updateText.badges.skipped;
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
        {updateText.requestedSummary(
          requestedSkillNames.length,
          updatableCount,
          skippedPreviewCount
        )}
      </Text>
      <Text> </Text>

      {phase === 'preview' && (
        <>
          <Text dimColor>{truncateText(updateText.preview)}</Text>
          <Text> </Text>
          {fixedPreviewRows}
          {previewItems.length > MAX_VISIBLE_ROWS && (
            <Text dimColor>{updateText.moreTargets(previewItems.length - MAX_VISIBLE_ROWS)}</Text>
          )}
          {previewItems.length <= MAX_VISIBLE_ROWS && <Text dimColor> </Text>}
          <Text> </Text>
          {updatableCount > 0 ? (
            <Text dimColor>{updateText.startHint}</Text>
          ) : (
            <Text dimColor>{truncateText(updateText.noGit)}</Text>
          )}
        </>
      )}

      {phase === 'executing' && (
        <>
          <Text dimColor>{truncateText(updateText.executing)}</Text>
          <Text> </Text>
          {visibleProgressItems.length > 0 ? (
            <ProgressBarStack items={visibleProgressItems} />
          ) : (
            <Text dimColor>{updateText.preparing}</Text>
          )}
          {progressOverflowSummary ? (
            <Text dimColor>{progressOverflowSummary}</Text>
          ) : (
            <Text dimColor> </Text>
          )}
          <Text> </Text>
          <Text dimColor>{text.common.pleaseWait}</Text>
        </>
      )}

      {phase === 'results' && (
        <>
          <Text>
            <Text color={inkColors.success}>
              {updatedCount} {text.common.updated}
            </Text>
            <Text color={inkColors.muted}> | </Text>
            <Text color={inkColors.muted}>
              {skippedCount} {text.common.skipped}
            </Text>
            <Text color={inkColors.muted}> | </Text>
            <Text color={errorCount > 0 ? inkColors.error : inkColors.muted}>
              {errorCount} {errorLabel}
            </Text>
          </Text>
          <Text> </Text>
          {fixedResultRows}
          {results.length > MAX_VISIBLE_ROWS && (
            <Text dimColor>{updateText.moreTargets(results.length - MAX_VISIBLE_ROWS)}</Text>
          )}
          {results.length <= MAX_VISIBLE_ROWS && <Text dimColor> </Text>}
          <Text> </Text>
          {errorCount > 0 && failedSkillNames.length > 0 ? (
            <Text dimColor>{updateText.retryHint}</Text>
          ) : (
            <Text dimColor>{text.common.enterCloseEscClose}</Text>
          )}
        </>
      )}
    </Box>
  );
}
