/**
 * Category management overlay for skill classification from the Skills tab.
 */

import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type { SkillCategoryUpdateMode } from '../../app/skill-service.js';
import {
  ALL_SKILL_CATEGORY_FILTER,
  getSkillCategoryCounts,
  normalizeSkillCategories,
  skillCategoryEquals,
  UNCATEGORIZED_SKILL_CATEGORY_FILTER,
  type SkillMeta,
} from '../../types.js';
import type { AppStore } from '../store/index.js';
import { inkColors, renderFocusPrefix, selectionMarkers } from '../theme.js';
import { truncateDisplayText } from '../utils/displayWidth.js';

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

interface CategoryOption {
  name: string;
  count: number;
}

const MODE_OPTIONS: CategoryModeOption[] = [
  { id: 'set', label: 'Set categories', description: 'Replace categories with the entered list' },
  { id: 'add', label: 'Add categories', description: 'Append entered categories to existing ones' },
  {
    id: 'remove',
    label: 'Remove categories',
    description: 'Remove entered categories from matching skills',
  },
  {
    id: 'clear',
    label: 'Clear categories',
    description: 'Remove all categories from selected skills',
  },
];

const MAX_VISIBLE_RESULT_ROWS = 8;
const MAX_VISIBLE_CATEGORY_ROWS = 7;
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

function padRows(rows: React.ReactNode[], prefix: string): React.ReactNode[] {
  const visible = rows.slice(0, MAX_VISIBLE_RESULT_ROWS);
  while (visible.length < MAX_VISIBLE_RESULT_ROWS) {
    visible.push(
      <Text key={`${prefix}-${visible.length}`} dimColor>
        {' '}
      </Text>
    );
  }
  return visible;
}

function formatCategories(categories: string[]): string {
  return categories.length > 0 ? categories.join(', ') : '(none)';
}

function formatCategoryOptions(categories: CategoryOption[]): string {
  return formatCategories(categories.map((category) => category.name));
}

function truncateText(text: string, maxWidth = CONTENT_WIDTH): string {
  return truncateDisplayText(text, maxWidth);
}

function getCategoryOptions(skills: Array<Pick<SkillMeta, 'categories'>>): CategoryOption[] {
  return getSkillCategoryCounts(skills)
    .filter(
      (entry) =>
        entry.key !== ALL_SKILL_CATEGORY_FILTER &&
        entry.key !== UNCATEGORIZED_SKILL_CATEGORY_FILTER &&
        entry.count > 0
    )
    .map((entry) => ({
      name: entry.label,
      count: entry.count,
    }));
}

function hasSelectedCategory(selectedCategories: Set<string>, categoryName: string): boolean {
  return Array.from(selectedCategories).some((selected) =>
    skillCategoryEquals(selected, categoryName)
  );
}

function getCategoryViewport<T>(
  items: T[],
  focusedIndex: number,
  maxVisible: number
): { visibleItems: T[]; startIndex: number; hiddenAboveCount: number; hiddenBelowCount: number } {
  if (items.length <= maxVisible) {
    return {
      visibleItems: items,
      startIndex: 0,
      hiddenAboveCount: 0,
      hiddenBelowCount: 0,
    };
  }

  const halfWindow = Math.floor(maxVisible / 2);
  const maxStart = Math.max(items.length - maxVisible, 0);
  const startIndex = Math.min(Math.max(focusedIndex - halfWindow, 0), maxStart);

  return {
    visibleItems: items.slice(startIndex, startIndex + maxVisible),
    startIndex,
    hiddenAboveCount: startIndex,
    hiddenBelowCount: Math.max(items.length - startIndex - maxVisible, 0),
  };
}

export function CategoryForm({ store }: CategoryFormProps): React.ReactElement {
  const formState = useStore(store, (s) => s.shellState.formState);
  const skills = useStore(store, (s) => s.skills);

  const isVisible = formState?.formType === 'categorizeSkills';
  const [phase, setPhase] = useState<CategoryPhase>('select-mode');
  const [modeIndex, setModeIndex] = useState(0);
  const [categoryFocusIndex, setCategoryFocusIndex] = useState(0);
  const [selectedExistingCategories, setSelectedExistingCategories] = useState<Set<string>>(
    new Set()
  );
  const [categoryInputFocused, setCategoryInputFocused] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');
  const [categoryWarning, setCategoryWarning] = useState('');
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

  const globalCategoryOptions = useMemo(() => getCategoryOptions(skills), [skills]);
  const targetCategoryOptions = useMemo(() => getCategoryOptions(targetSkills), [targetSkills]);
  const categoryOptions =
    activeMode.id === 'remove' ? targetCategoryOptions : globalCategoryOptions;
  const selectedCategoryList = useMemo(
    () => normalizeSkillCategories(Array.from(selectedExistingCategories)),
    [selectedExistingCategories]
  );
  const combinedCategories = useMemo(
    () => normalizeSkillCategories([...selectedCategoryList, ...normalizedInputCategories]),
    [normalizedInputCategories, selectedCategoryList]
  );
  const canContinueCategoryEdit = combinedCategories.length > 0;
  const categoryViewport = getCategoryViewport(
    categoryOptions,
    categoryFocusIndex,
    MAX_VISIBLE_CATEGORY_ROWS
  );

  useEffect(() => {
    if (!isVisible) return;
    setPhase('select-mode');
    setModeIndex(0);
    setCategoryFocusIndex(0);
    setSelectedExistingCategories(new Set());
    setCategoryInputFocused(false);
    setCategoryInput('');
    setCategoryWarning('');
    setResults([]);
    store.getState().setFormDirty(false);
  }, [isVisible, formState?.data.skillNames, store]);

  useEffect(() => {
    if (!isVisible) return;

    setCategoryFocusIndex((current) => {
      if (categoryOptions.length === 0) return 0;
      return Math.min(current, categoryOptions.length - 1);
    });

    setSelectedExistingCategories((current) => {
      const next = new Set(
        Array.from(current).filter((selected) =>
          categoryOptions.some((option) => skillCategoryEquals(option.name, selected))
        )
      );
      return next.size === current.size ? current : next;
    });
  }, [categoryOptions, isVisible]);

  function resetCategoryEditState(): void {
    setCategoryFocusIndex(0);
    setSelectedExistingCategories(new Set());
    setCategoryInputFocused(false);
    setCategoryInput('');
    setCategoryWarning('');
    store.getState().setFormDirty(false);
  }

  function toggleFocusedCategory(): void {
    const focusedCategory = categoryOptions[categoryFocusIndex];
    if (!focusedCategory) {
      setCategoryWarning(
        activeMode.id === 'remove'
          ? 'No removable categories are available; press n to type one.'
          : 'No existing categories yet; press n to type a new one.'
      );
      return;
    }

    setSelectedExistingCategories((current) => {
      const next = new Set(current);
      const existing = Array.from(next).find((selected) =>
        skillCategoryEquals(selected, focusedCategory.name)
      );
      if (existing) {
        next.delete(existing);
      } else {
        next.add(focusedCategory.name);
      }
      store.getState().setFormDirty(next.size > 0 || categoryInput.trim().length > 0);
      return next;
    });
    setCategoryWarning('');
  }

  function continueFromCategoryEdit(): void {
    if (!canContinueCategoryEdit) {
      setCategoryWarning('Select an existing category or press n to type one.');
      return;
    }

    setCategoryWarning('');
    setPhase('confirm');
  }

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
          setModeIndex((current) => (current > 0 ? current - 1 : MODE_OPTIONS.length - 1));
          return;
        }
        if (key.downArrow) {
          setModeIndex((current) => (current < MODE_OPTIONS.length - 1 ? current + 1 : 0));
          return;
        }
        if (key.return) {
          resetCategoryEditState();
          if (activeMode.id === 'clear') {
            setPhase('confirm');
          } else {
            setPhase('edit-categories');
          }
        }
        return;
      }

      if (phase === 'edit-categories') {
        if (categoryInputFocused) {
          if (key.return) {
            continueFromCategoryEdit();
          }
          return;
        }

        if (key.upArrow) {
          setCategoryFocusIndex((current) =>
            categoryOptions.length === 0
              ? 0
              : current > 0
                ? current - 1
                : categoryOptions.length - 1
          );
          setCategoryWarning('');
          return;
        }
        if (key.downArrow) {
          setCategoryFocusIndex((current) =>
            categoryOptions.length === 0
              ? 0
              : current < categoryOptions.length - 1
                ? current + 1
                : 0
          );
          setCategoryWarning('');
          return;
        }
        if (_input === ' ') {
          toggleFocusedCategory();
          return;
        }
        if (_input === 'n') {
          setCategoryInputFocused(true);
          setCategoryWarning('');
          return;
        }
        if (key.return) {
          continueFromCategoryEdit();
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
            activeMode.id === 'clear' ? [] : combinedCategories
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
        <Text bold={isFocused}>{truncateText(option.label, 24)}</Text>
        <Text color={inkColors.muted}> - {truncateText(option.description, 44)}</Text>
      </Text>
    );
  });

  const categoryRows = categoryViewport.visibleItems.map((option, visibleIndex) => {
    const absoluteIndex = categoryViewport.startIndex + visibleIndex;
    const isFocused = absoluteIndex === categoryFocusIndex && !categoryInputFocused;
    const isSelected = hasSelectedCategory(selectedExistingCategories, option.name);
    const marker = isSelected ? selectionMarkers.selected : selectionMarkers.unselected;
    const label = truncateText(`${marker} ${option.name} (${option.count})`, CONTENT_WIDTH - 4);

    return (
      <Text key={option.name}>
        <Text color={isFocused ? inkColors.accent : inkColors.muted}>
          {renderFocusPrefix(isFocused)}
        </Text>
        <Text
          color={
            isFocused ? inkColors.focusText : isSelected ? inkColors.accent : inkColors.primary
          }
          backgroundColor={isFocused ? inkColors.paper : undefined}
          bold={isFocused || isSelected}
        >
          {label}
        </Text>
      </Text>
    );
  });

  const successCount = results.filter((result) => result.success).length;
  const errorCount = results.length - successCount;
  const resultRows = padRows(
    results.map((result) => (
      <Text key={result.skillName} color={result.success ? inkColors.success : inkColors.error}>
        {truncateText(
          `${result.success ? '[updated]' : '[error]  '} ${result.skillName}${
            result.success
              ? ` -> ${formatCategories(result.categories)}`
              : ` - ${result.error ?? 'Unknown error'}`
          }`
        )}
      </Text>
    )),
    'category-result'
  );

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
        Categorize Skills
      </Text>
      <Text color={inkColors.muted}>
        {requestedSkillNames.length} target{requestedSkillNames.length !== 1 ? 's' : ''}
      </Text>
      <Text color={inkColors.muted}>
        {truncateText(`Selected: ${requestedSkillNames.join(', ')}`)}
      </Text>
      <Text color={inkColors.muted}>
        {truncateText(`Available categories: ${formatCategoryOptions(categoryOptions)}`)}
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
            <Text color={inkColors.muted}> - select existing or add new</Text>
          </Text>
          <Text color={inkColors.muted}>
            {activeMode.id === 'remove'
              ? 'Showing categories currently used by the selected skill(s).'
              : 'Showing categories from the full skill library.'}
          </Text>
          <Text> </Text>

          {categoryViewport.hiddenAboveCount > 0 && (
            <Text dimColor>^ {categoryViewport.hiddenAboveCount} more above</Text>
          )}
          {categoryRows.length > 0 ? (
            categoryRows
          ) : (
            <Text dimColor>
              {activeMode.id === 'remove'
                ? 'No removable categories on the selected skill(s).'
                : 'No existing categories yet.'}
            </Text>
          )}
          {categoryViewport.hiddenBelowCount > 0 && (
            <Text dimColor>v {categoryViewport.hiddenBelowCount} more below</Text>
          )}
          <Text> </Text>

          <Text color={categoryInputFocused ? inkColors.accent : inkColors.muted}>
            New categories
            <Text color={inkColors.muted}> - comma separated</Text>
          </Text>
          <Box
            borderStyle="single"
            borderColor={categoryInputFocused ? inkColors.borderActive : inkColors.muted}
            paddingX={1}
          >
            {categoryInputFocused ? (
              <TextInput
                value={categoryInput}
                onChange={(value): void => {
                  setCategoryInput(value);
                  setCategoryWarning('');
                  store
                    .getState()
                    .setFormDirty(value.trim().length > 0 || selectedExistingCategories.size > 0);
                }}
                onSubmit={continueFromCategoryEdit}
                placeholder="research, docs, frontend"
                focus={true}
              />
            ) : (
              <Text color={categoryInput ? inkColors.primary : inkColors.muted}>
                {truncateText(categoryInput || 'Press n to type new categories')}
              </Text>
            )}
          </Box>
          <Text color={inkColors.muted}>
            {truncateText(`Selected: ${formatCategories(combinedCategories)}`)}
          </Text>
          {categoryWarning && (
            <Text color={inkColors.warning}>{truncateText(categoryWarning)}</Text>
          )}
          <Text dimColor>Up/Down:Move Space:Select n:New Enter:Continue Esc:Cancel</Text>
        </>
      )}

      {phase === 'confirm' && (
        <>
          <Text bold>Confirm changes</Text>
          <Text color={inkColors.muted}>{truncateText(`Mode: ${activeMode.label}`)}</Text>
          <Text color={inkColors.muted}>
            {truncateText(
              `Categories: ${
                activeMode.id === 'clear' ? '(clear all)' : formatCategories(combinedCategories)
              }`
            )}
          </Text>
          <Text> </Text>
          {requestedSkillNames.map((skillName) => (
            <Text key={`confirm-${skillName}`}>{truncateText(skillName)}</Text>
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
              {truncateText(`... ${skillName}`)}
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
