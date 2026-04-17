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

const MAX_VISIBLE_ROWS = 8;
const MAX_VISIBLE_PROGRESS = 6;

function parseSkillNames(encoded: string | undefined): string[] {
  if (!encoded) return [];
  try {
    const parsed = JSON.parse(encoded) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
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

export function UpdateForm({ store }: UpdateFormProps): React.ReactElement {
  const formState = useStore(store, (s) => s.formState);
  const skills = useStore(store, (s) => s.skills);
  const updateProgressItems = useStore(store, (s) => s.updateProgressItems);

  const [phase, setPhase] = useState<UpdatePhase>('preview');
  const [results, setResults] = useState<UpdateResult[]>([]);

  const isVisible = formState?.formType === 'updateSelected' || formState?.formType === 'updateAllGit';
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

  useInput(
    (input, key) => {
      if (!isVisible || phase === 'executing') return;

      if (key.return) {
        if (phase === 'preview') {
          if (updatableCount === 0) {
            store.getState().setFormState(null);
            return;
          }

          setPhase('executing');
          void store
            .getState()
            .updateSkills(requestedSkillNames)
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

  const title = formState.formType === 'updateAllGit' ? 'Update All Git Skills' : 'Update Selected Skills';
  const previewRows = previewItems.map((item) => (
    <Text key={item.skillName}>
      <Text color={item.willUpdate ? inkColors.success : inkColors.muted}>
        {item.willUpdate ? '[update]' : '[skip]  '}
      </Text>
      <Text>{item.skillName}</Text>
      <Text color={inkColors.muted}> [{formatSourceLabel(item.sourceType)}]</Text>
      <Text color={item.willUpdate ? inkColors.secondary : inkColors.muted}> {item.detail}</Text>
    </Text>
  ));

  const fixedPreviewRows = renderFixedRows(previewRows, (index) => (
    <Text key={`empty-preview-${index}`} dimColor> </Text>
  ));
  const visibleProgressItems = updateProgressItems.slice(0, MAX_VISIBLE_PROGRESS);
  const hiddenProgressCount = Math.max(updateProgressItems.length - visibleProgressItems.length, 0);
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
        {badge} {item.skillName}
        {item.detail ? ` - ${item.detail}` : ''}
      </Text>
    );
  });
  const fixedResultRows = renderFixedRows(resultRows, (index) => (
    <Text key={`empty-result-${index}`} dimColor> </Text>
  ));

  return (
    <Box flexDirection="column" borderStyle="single" padding={1} width={76} marginTop={1} borderColor={inkColors.border}>
      <Text bold color={inkColors.accent}>{title}</Text>
      <Text color={inkColors.muted}>
        {requestedSkillNames.length} requested | {updatableCount} updatable
        {skippedPreviewCount > 0 ? ` | ${skippedPreviewCount} skipped` : ''}
      </Text>
      <Text> </Text>

      {phase === 'preview' && (
        <>
          <Text dimColor>Preview targets before running the update:</Text>
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
            <Text dimColor>No git-backed skills to update. Enter or Esc to close.</Text>
          )}
        </>
      )}

      {phase === 'executing' && (
        <>
          <Text dimColor>Updating git-backed skills and re-syncing managed copies...</Text>
          <Text> </Text>
          {visibleProgressItems.length > 0 ? (
            <ProgressBarStack items={visibleProgressItems} />
          ) : (
            <Text dimColor>Preparing update tasks...</Text>
          )}
          {hiddenProgressCount > 0 && <Text dimColor>... {hiddenProgressCount} more task(s)</Text>}
          {hiddenProgressCount === 0 && <Text dimColor> </Text>}
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
            <Text color={errorCount > 0 ? inkColors.error : inkColors.muted}>{errorCount} errors</Text>
          </Text>
          <Text> </Text>
          {fixedResultRows}
          {results.length > MAX_VISIBLE_ROWS && (
            <Text dimColor>... {results.length - MAX_VISIBLE_ROWS} more result(s)</Text>
          )}
          {results.length <= MAX_VISIBLE_ROWS && <Text dimColor> </Text>}
          <Text> </Text>
          <Text dimColor>Enter:Close Esc:Close</Text>
        </>
      )}
    </Box>
  );
}
