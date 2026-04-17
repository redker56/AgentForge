/**
 * Category management overlay for skill classification from the Skills tab.
 */

import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import {
  normalizeSkillCategories,
  type SkillMeta,
} from '../../types.js';
import type { SkillCategoryUpdateMode } from '../../app/skill-service.js';
import type { AppStore } from '../store/index.js';
import { inkColors, renderFocusPrefix } from '../theme.js';

interface CategoryFormProps {
  store: StoreApi<AppStore>;
}

type CategoryPhase = 'select-mode' | 'edit-categories' | 'confirm' | 'executing' | 'results';

interface CategoryModeOption {
  id: SkillCategoryUpdateMode;
  label: string;
  description: string;
}

interface CategoryResult {
  skillName: string;
  success: boolean;
  categories: string[];
  error?: string;
}

const MODE_OPTIONS: CategoryModeOption[] = [
  { id: 'set', label: 'Set categories', description: 'Replace categories with the entered list' },
  { id: 'add', label: 'Add categories', description: 'Append entered categories to existing ones' },
  { id: 'remove', label: 'Remove categories', description: 'Remove entered categories from matching skills' },
  { id: 'clear', label: 'Clear categories', description: 'Remove all categories from selected skills' },
];

const MAX_VISIBLE_RESULT_ROWS = 8;

function parseSkillNames(encoded: string | undefined): string[] {
  if (!encoded) return [];
  try {
    const parsed = JSON.parse(encoded) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function padRows(rows: React.ReactNode[], prefix: string): React.ReactNode[] {
  const visible = rows.slice(0, MAX_VISIBLE_RESULT_ROWS);
  while (visible.length < MAX_VISIBLE_RESULT_ROWS) {
    visible.push(<Text key={`${prefix}-${visible.length}`} dimColor> </Text>);
  }
  return visible;
}

function formatCategories(categories: string[]): string {
  return categories.length > 0 ? categories.join(', ') : '(none)';
}

export function CategoryForm({ store }: CategoryFormProps): React.ReactElement {
  const formState = useStore(store, (s) => s.formState);
  const skills = useStore(store, (s) => s.skills);

  const isVisible = formState?.formType === 'categorizeSkills';
  const [phase, setPhase] = useState<CategoryPhase>('select-mode');
  const [modeIndex, setModeIndex] = useState(0);
  const [categoryInput, setCategoryInput] = useState('');
  const [results, setResults] = useState<CategoryResult[]>([]);

  const requestedSkillNames = useMemo(
    () => parseSkillNames(formState?.data.skillNames),
    [formState?.data.skillNames]
  );

  const targetSkills = useMemo(
    () =>
      requestedSkillNames
        .map((skillName) => skills.find((skill) => skill.name === skillName))
        .filter((skill): skill is SkillMeta & { exists: boolean } => Boolean(skill)),
    [requestedSkillNames, skills]
  );

  const activeMode = MODE_OPTIONS[modeIndex] ?? MODE_OPTIONS[0];
  const normalizedInputCategories = useMemo(
    () => normalizeSkillCategories(categoryInput.split(',')),
    [categoryInput]
  );

  const knownCategories = useMemo(() => {
    const categorySet = new Set<string>();
    for (const skill of targetSkills) {
      for (const category of skill.categories) {
        categorySet.add(category);
      }
    }
    return Array.from(categorySet).sort((left, right) =>
      left.localeCompare(right, 'en', { sensitivity: 'base' })
    );
  }, [targetSkills]);

  useEffect(() => {
    if (!isVisible) return;
    setPhase('select-mode');
    setModeIndex(0);
    setCategoryInput('');
    setResults([]);
    store.getState().setFormDirty(false);
  }, [isVisible, formState?.data.skillNames, store]);

  useInput(
    (_input, key) => {
      if (!isVisible || phase === 'executing') return;

      if (key.escape) {
        store.getState().setFormDirty(false);
        store.getState().setFormState(null);
        return;
      }

      if (phase === 'select-mode') {
        if (key.upArrow) {
          setModeIndex((current) =>
            current > 0 ? current - 1 : MODE_OPTIONS.length - 1
          );
          return;
        }
        if (key.downArrow) {
          setModeIndex((current) =>
            current < MODE_OPTIONS.length - 1 ? current + 1 : 0
          );
          return;
        }
        if (key.return) {
          if (activeMode.id === 'clear') {
            setPhase('confirm');
          } else {
            setPhase('edit-categories');
          }
        }
        return;
      }

      if (phase === 'edit-categories') {
        if (key.return) {
          return;
        }
        return;
      }

      if (phase === 'confirm' && key.return) {
        setPhase('executing');
        void store
          .getState()
          .categorizeSkills(
            requestedSkillNames,
            activeMode.id,
            activeMode.id === 'clear' ? [] : normalizedInputCategories
          )
          .then((nextResults) => {
            setResults(nextResults);
            store.getState().setFormDirty(false);
            setPhase('results');
          });
        return;
      }

      if (phase === 'results' && key.return) {
        store.getState().setFormDirty(false);
        store.getState().setFormState(null);
      }
    },
    { isActive: isVisible }
  );

  if (!isVisible) {
    return <></>;
  }

  const modeRows = MODE_OPTIONS.map((option, index) => {
    const isFocused = index === modeIndex;
    return (
      <Text key={option.id}>
        <Text color={isFocused ? inkColors.accent : inkColors.muted}>
          {renderFocusPrefix(isFocused)}
        </Text>
        <Text bold={isFocused}>{option.label}</Text>
        <Text color={inkColors.muted}> - {option.description}</Text>
      </Text>
    );
  });

  const successCount = results.filter((result) => result.success).length;
  const errorCount = results.length - successCount;
  const resultRows = padRows(
    results.map((result) => (
      <Text
        key={result.skillName}
        color={result.success ? inkColors.success : inkColors.error}
      >
        {result.success ? '[updated]' : '[error]  '} {result.skillName}
        {result.success
          ? ` -> ${formatCategories(result.categories)}`
          : ` - ${result.error ?? 'Unknown error'}`}
      </Text>
    )),
    'category-result'
  );

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      padding={1}
      width={76}
      marginTop={1}
      borderColor={inkColors.border}
    >
      <Text bold color={inkColors.accent}>Categorize Skills</Text>
      <Text color={inkColors.muted}>
        {requestedSkillNames.length} target{requestedSkillNames.length !== 1 ? 's' : ''}
      </Text>
      <Text color={inkColors.muted}>
        Selected: {requestedSkillNames.join(', ')}
      </Text>
      <Text color={inkColors.muted}>
        Existing categories: {formatCategories(knownCategories)}
      </Text>
      <Text> </Text>

      {phase === 'select-mode' && (
        <>
          <Text dimColor>Select how to change categories:</Text>
          <Text> </Text>
          {modeRows}
          <Text> </Text>
          <Text dimColor>Up/Down:Choose Enter:Continue Esc:Cancel</Text>
        </>
      )}

      {phase === 'edit-categories' && (
        <>
          <Text>
            <Text bold>{activeMode.label}</Text>
            <Text color={inkColors.muted}> - comma separated</Text>
          </Text>
          <Box borderStyle="single" borderColor={inkColors.muted} paddingX={1}>
            <TextInput
              value={categoryInput}
              onChange={(value): void => {
                setCategoryInput(value);
                store.getState().setFormDirty(value.trim().length > 0);
              }}
              onSubmit={(): void => {
                setPhase('confirm');
              }}
              placeholder="research, docs, frontend"
              focus={true}
            />
          </Box>
          <Text> </Text>
          <Text color={inkColors.muted}>
            Parsed: {formatCategories(normalizedInputCategories)}
          </Text>
          <Text dimColor>Enter:Continue Esc:Cancel</Text>
        </>
      )}

      {phase === 'confirm' && (
        <>
          <Text bold>Confirm changes</Text>
          <Text color={inkColors.muted}>Mode: {activeMode.label}</Text>
          <Text color={inkColors.muted}>
            Categories:{' '}
            {activeMode.id === 'clear'
              ? '(clear all)'
              : formatCategories(normalizedInputCategories)}
          </Text>
          <Text> </Text>
          {requestedSkillNames.map((skillName) => (
            <Text key={`confirm-${skillName}`}>{skillName}</Text>
          ))}
          <Text> </Text>
          <Text dimColor>Enter:Apply Esc:Cancel</Text>
        </>
      )}

      {phase === 'executing' && (
        <>
          <Text dimColor>Applying category changes...</Text>
          <Text> </Text>
          {requestedSkillNames.map((skillName) => (
            <Text key={`running-${skillName}`} color={inkColors.muted}>
              ... {skillName}
            </Text>
          ))}
        </>
      )}

      {phase === 'results' && (
        <>
          <Text>
            <Text color={inkColors.success}>{successCount} updated</Text>
            <Text color={inkColors.muted}> | </Text>
            <Text color={errorCount > 0 ? inkColors.error : inkColors.muted}>
              {errorCount} errors
            </Text>
          </Text>
          <Text> </Text>
          {resultRows}
          {results.length > MAX_VISIBLE_RESULT_ROWS && (
            <Text dimColor>... {results.length - MAX_VISIBLE_RESULT_ROWS} more result(s)</Text>
          )}
          {results.length <= MAX_VISIBLE_RESULT_ROWS && <Text dimColor> </Text>}
          <Text dimColor>Enter:Close Esc:Close</Text>
        </>
      )}
    </Box>
  );
}
