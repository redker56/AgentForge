import { Box, Text, useInput } from 'ink';
import React, { useMemo, useState } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type { ContextSkillRow } from '../contextTypes.js';
import { getTuiText } from '../i18n.js';
import type { AppStore } from '../store/index.js';
import type { OperationResult } from '../store/uiSlice.js';
import { inkColors } from '../theme.js';
import { truncateDisplayText } from '../utils/displayWidth.js';

interface ContextImportFormProps {
  store: StoreApi<AppStore>;
}

type Phase = 'preview' | 'executing' | 'results';

function truncateText(text: string, maxWidth = 64): string {
  return truncateDisplayText(text, maxWidth);
}

export function ContextImportForm({ store }: ContextImportFormProps): React.ReactElement {
  const formState = useStore(store, (s) => s.shellState.formState);
  const locale = useStore(store, (s) => s.shellState.locale);
  const text = getTuiText(locale);
  const [phase, setPhase] = useState<Phase>('preview');
  const [results, setResults] = useState<OperationResult[]>([]);

  if (!formState || formState.formType !== 'importContextSkills') {
    return <></>;
  }

  const rows = useMemo<ContextSkillRow[]>(() => {
    try {
      const parsed = JSON.parse(formState.data.rows ?? '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [formState.data.rows]);

  const requestedCount = rows.length;
  const alreadyImportedCount = rows.filter((row) => row.registrySkillName || row.isImported).length;

  useInput(
    (_input, key) => {
      if (phase === 'preview' && key.return) {
        setPhase('executing');
        void store
          .getState()
          .importContextSkills(rows)
          .then((nextResults) => {
            setResults(nextResults);
            setPhase('results');
          })
          .catch((error: unknown) => {
            setResults([
              {
                target: 'context-import',
                success: false,
                outcome: 'error',
                error: error instanceof Error ? error.message : String(error),
              },
            ]);
            setPhase('results');
          });
        return;
      }

      if ((phase === 'preview' || phase === 'results') && (key.escape || key.return)) {
        store.getState().setFormState(null);
      }
    },
    { isActive: formState.formType === 'importContextSkills' }
  );

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      padding={1}
      width={76}
      marginTop={1}
      borderColor={inkColors.borderActive}
    >
      <Text bold color={inkColors.accent}>
        {text.contextImport.title}
      </Text>
      <Text color={inkColors.muted}>
        {text.contextImport.summary(
          requestedCount,
          Math.max(requestedCount - alreadyImportedCount, 0)
        )}
      </Text>
      <Text> </Text>

      {phase === 'preview' && (
        <>
          {rows.length === 0 ? (
            <Text color={inkColors.warning}>{text.contextImport.noSelected}</Text>
          ) : (
            rows.map((row) => (
              <Text
                key={row.rowId}
                color={
                  row.registrySkillName || row.isImported ? inkColors.muted : inkColors.secondary
                }
              >
                {truncateText(
                  `${row.projectId ? `[${row.projectId}] ` : `[${row.agentName ?? row.agentId ?? 'agent'}] `}${row.name}${
                    row.registrySkillName || row.isImported
                      ? ` ${text.common.alreadyImportedSuffix}`
                      : ''
                  }`
                )}
              </Text>
            ))
          )}
          <Text> </Text>
          <Text color={inkColors.muted}>
            Enter:{text.status.labels.import} Esc:{text.common.cancel}
          </Text>
        </>
      )}

      {phase === 'executing' && (
        <Text color={inkColors.secondary}>{text.contextImport.executing}</Text>
      )}

      {phase === 'results' && (
        <>
          <Text color={inkColors.muted}>
            {text.contextImport.resultSummary(
              results.filter((result) => result.outcome === 'success').length,
              results.filter((result) => result.outcome === 'skipped').length,
              results.filter((result) => result.outcome === 'error').length
            )}
          </Text>
          <Text> </Text>
          {results.map((result, index) => {
            const color =
              result.outcome === 'success'
                ? inkColors.success
                : result.outcome === 'skipped'
                  ? inkColors.warning
                  : inkColors.error;
            return (
              <Text key={`${result.target}-${index}`} color={color}>
                {truncateText(
                  `[${result.outcome ?? (result.success ? text.common.success : text.common.error)}] ${
                    result.target
                  }${result.error ? ` - ${result.error}` : ''}`
                )}
              </Text>
            );
          })}
          <Text> </Text>
          <Text color={inkColors.muted}>{text.common.enterCloseEscClose}</Text>
        </>
      )}
    </Box>
  );
}
