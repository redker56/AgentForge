/**
 * Form overlay for adding skills, agents, or projects.
 * Context-aware based on formState.formType.
 */

import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import React, { useState, useCallback, useEffect } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import { BUILTIN_AGENTS } from '../../types.js';
import type { AppStore } from '../store/index.js';
import { validateUrl, validateSkillName, validateAgentId, validateNonEmpty } from '../utils/validators.js';

import { BlurValidatedInput } from './BlurValidatedInput.js';
import { ErrorMessage } from './ErrorMessage.js';


interface AddFormProps {
  store: StoreApi<AppStore>;
}

type FormPhase = 'input' | 'loading' | 'discover' | 'result';

interface FieldConfig {
  key: string;
  label: string;
  placeholder: string;
  validate?: (value: string) => string | null;
}

const FORM_TITLES: Record<string, string> = {
  addSkill: 'Add Skill',
  addAgent: 'Add Agent',
  addProject: 'Add Project',
};

const SKILL_FIELDS: FieldConfig[] = [
  { key: 'url', label: 'Git URL', placeholder: 'https://github.com/user/skills-repo', validate: validateUrl },
  { key: 'name', label: 'Skill Name', placeholder: '(optional, auto-detected)', validate: (v: string) => v.trim() ? validateSkillName(v) : null },
];

const AGENT_FIELDS: FieldConfig[] = [
  { key: 'id', label: 'Agent ID', placeholder: 'my-agent', validate: (v: string): string | null => {
    const base = validateAgentId(v);
    if (base) return base;
    if (BUILTIN_AGENTS.some(a => a.id === v.trim())) return 'Cannot use built-in agent ID';
    return null;
  }},
  { key: 'name', label: 'Display Name', placeholder: 'My Agent', validate: (v: string) => validateNonEmpty(v, 'Display name') },
  { key: 'basePath', label: 'Skills Path', placeholder: '~/.my-agent/skills', validate: (v: string) => validateNonEmpty(v, 'Skills path') },
  { key: 'skillsDirName', label: 'Dir Name', placeholder: '(optional)' },
];

const PROJECT_FIELDS: FieldConfig[] = [
  { key: 'id', label: 'Project ID', placeholder: 'my-project', validate: validateAgentId },
  { key: 'path', label: 'Project Path', placeholder: '/path/to/project', validate: (v: string) => validateNonEmpty(v, 'Project path') },
];

function getFields(formType: string): FieldConfig[] {
  if (formType === 'addSkill') return SKILL_FIELDS;
  if (formType === 'addAgent') return AGENT_FIELDS;
  return PROJECT_FIELDS;
}

function validate(formType: string, data: Record<string, string>): Record<string, string> | null {
  const errors: Record<string, string> = {};

  if (formType === 'addSkill') {
    if (!data.url?.trim()) errors.url = 'Git URL is required';
  } else if (formType === 'addAgent') {
    if (!data.id?.trim()) errors.id = 'Agent ID is required';
    else if (!/^[a-zA-Z0-9-_]+$/.test(data.id)) errors.id = 'Only letters, numbers, hyphens, underscores';
    else if (BUILTIN_AGENTS.some(a => a.id === data.id)) errors.id = 'Cannot use built-in agent ID';
    if (!data.name?.trim()) errors.name = 'Display name is required';
    if (!data.basePath?.trim()) errors.basePath = 'Skills path is required';
  } else if (formType === 'addProject') {
    if (!data.id?.trim()) errors.id = 'Project ID is required';
    else if (!/^[a-zA-Z0-9-_]+$/.test(data.id)) errors.id = 'Only letters, numbers, hyphens, underscores';
    if (!data.path?.trim()) errors.path = 'Project path is required';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

export function AddForm({ store }: AddFormProps): React.ReactElement {
  const formState = useStore(store, s => s.formState);
  const [phase, setPhase] = useState<FormPhase>('input');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState(0);
  const [resultError, setResultError] = useState<string | null>(null);
  const [selectedDiscover, setSelectedDiscover] = useState<Set<number>>(new Set());
  const [discoverFocusedIndex, setDiscoverFocusedIndex] = useState(0);

  // Per-field blur validation states: fieldKey -> { isValid | null }
  const [fieldValidation, setFieldValidation] = useState<Record<string, { valid: boolean; error: string | null }>>({});

  // Local input handler for Tab (field switch), Space/Enter/Up/Down (discover phase)
  useInput((input, key) => {
    // Tab: switch field in input phase
    if (key.tab && phase === 'input') {
      const fields = getFields(formState?.formType || '');
      if (key.shift) {
        setFocusedField(prev => (prev > 0 ? prev - 1 : fields.length - 1));
      } else {
        setFocusedField(prev => (prev < fields.length - 1 ? prev + 1 : 0));
      }
      return;
    }

    // Discover phase: Up/Down navigate, Space toggle, Enter confirm
    if (phase === 'discover') {
      const state = store.getState();
      const discovered: Array<{ name: string; subPath: string }> = JSON.parse(
        state.formState?.data.discoveredSkills || '[]'
      );

      if (key.upArrow) {
        setDiscoverFocusedIndex(prev => (prev > 0 ? prev - 1 : discovered.length - 1));
        return;
      }
      if (key.downArrow) {
        setDiscoverFocusedIndex(prev => (prev < discovered.length - 1 ? prev + 1 : 0));
        return;
      }
      if (input === ' ') {
        setSelectedDiscover(prev => {
          const next = new Set(prev);
          if (next.has(discoverFocusedIndex)) next.delete(discoverFocusedIndex);
          else next.add(discoverFocusedIndex);
          return next;
        });
        return;
      }
      if (key.return) {
        handleDiscoverSubmit();
        return;
      }
    }
  }, {
    isActive: (formState?.formType?.startsWith('add') ?? false) && phase !== 'loading',
  });

  if (!formState || !formState.formType.startsWith('add')) return <></>;

  const formType = formState.formType;
  const fields = getFields(formType);
  const title = FORM_TITLES[formType] || 'Add';

  // Handle discovery phase from skillActions (multi-skill selection)
  useEffect(() => {
    if (formState.data.phase === 'discover' && formState.data.discoveredSkills) {
      setPhase('discover');
    } else if (formState.data.error) {
      setResultError(formState.data.error);
      setPhase('result');
    }
  }, [formState]);

  const handleSubmit = useCallback(() => {
    // Force-validate all fields with validators
    const blurErrors: Record<string, string> = {};
    for (const field of fields) {
      if (field.validate && fieldValidation[field.key]) {
        const validation = fieldValidation[field.key];
        if (!validation.valid && validation.error) {
          blurErrors[field.key] = validation.error;
        }
      }
    }

    // Run inline validation as well (covers fields without BlurValidatedInput validators)
    const inlineErrors = validate(formType, fieldValues);

    const allErrors = { ...blurErrors, ...(inlineErrors ?? {}) };
    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors);
      return;
    }

    setPhase('loading');
    setResultError(null);

    const state = store.getState();

    if (formType === 'addSkill') {
      state.addSkillFromUrl(fieldValues.url || '', fieldValues.name || undefined).then(() => {
        const currentState = store.getState();
        if (currentState.formState?.data.phase !== 'discover') {
          setPhase('result');
        }
      }).catch((e: unknown) => {
        setResultError(e instanceof Error ? e.message : String(e));
        setPhase('result');
      });
    } else if (formType === 'addAgent') {
      state.addAgent(
        fieldValues.id || '',
        fieldValues.name || '',
        fieldValues.basePath || '',
        fieldValues.skillsDirName || undefined,
      ).then(() => {
        store.getState().setFormState(null);
      }).catch((e: unknown) => {
        setResultError(e instanceof Error ? e.message : String(e));
        setPhase('result');
      });
    } else if (formType === 'addProject') {
      state.addProject(
        fieldValues.id || '',
        fieldValues.path || '',
      ).then(() => {
        store.getState().setFormState(null);
      }).catch((e: unknown) => {
        setResultError(e instanceof Error ? e.message : String(e));
        setPhase('result');
      });
    }
  }, [formType, fieldValues, store]);

  const handleDiscoverSubmit = useCallback(() => {
    const state = store.getState();
    const discovered: Array<{ name: string; subPath: string }> = JSON.parse(
      state.formState?.data.discoveredSkills || '[]'
    );
    const tempRepoPath = state.formState?.data.tempRepoPath || '';
    const url = state.formState?.data.url || '';

    const selected = discovered.filter((_: unknown, i: number) => selectedDiscover.has(i));
    if (selected.length === 0) {
      setResultError('No skills selected');
      return;
    }

    setPhase('loading');
    state.addSkillFromDiscovery(url, selected, tempRepoPath).catch((e: unknown) => {
      setResultError(e instanceof Error ? e.message : String(e));
      setPhase('result');
    });
  }, [selectedDiscover, store]);

  return (
    <Box flexDirection="column" borderStyle="round" padding={1} width={60} marginTop={1}>
      <Text bold color="cyan">{title}</Text>
      <Text> </Text>

      {phase === 'input' && (
        <>
          {Object.keys(fieldErrors).length > 0 && (
            <Text color="red">Please fix {Object.keys(fieldErrors).length} error(s) before submitting.</Text>
          )}
          {fields.map((field, i) => {
            const fieldHasFocus = i === focusedField;
            const hasValidator = !!field.validate;

            if (hasValidator) {
              return (
                <Box flexDirection="column" key={field.key} marginBottom={0}>
                  <Text>
                    <Text color={fieldHasFocus ? 'cyan' : 'gray'}>
                      {fieldHasFocus ? '> ' : '  '}
                    </Text>
                    <Text bold={fieldHasFocus}>{field.label}: </Text>
                  </Text>
                  <Box marginLeft={4}>
                    <BlurValidatedInput
                      value={fieldValues[field.key] || ''}
                      onChange={(value: string) => {
                        setFieldValues(prev => ({ ...prev, [field.key]: value }));
                        if (fieldErrors[field.key]) {
                          const next = { ...fieldErrors };
                          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                          delete next[field.key];
                          setFieldErrors(next);
                        }
                        if (fieldValidation[field.key]?.error) {
                          const next = { ...fieldValidation };
                          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                          delete next[field.key];
                          setFieldValidation(next);
                        }
                      }}
                      validate={field.validate ?? ((v: string): string | null => v.trim() ? null : 'Required')}
                      placeholder={field.placeholder}
                      label=""
                      hasFocus={fieldHasFocus}
                      onValidationResult={(isValid, error) => {
                        setFieldValidation(prev => ({
                          ...prev,
                          [field.key]: { valid: isValid, error },
                        }));
                      }}
                    />
                  </Box>
                </Box>
              );
            }

            // Fallback for fields without validators
            return (
              <Box flexDirection="column" key={field.key} marginBottom={0}>
                <Text>
                  <Text color={fieldHasFocus ? 'cyan' : 'gray'}>
                    {fieldHasFocus ? '> ' : '  '}
                  </Text>
                  <Text bold={fieldHasFocus}>{field.label}: </Text>
                </Text>
                <Box marginLeft={4}>
                  <TextInput
                    value={fieldValues[field.key] || ''}
                    placeholder={field.placeholder}
                    onChange={(value: string) => {
                      setFieldValues(prev => ({ ...prev, [field.key]: value }));
                      if (fieldErrors[field.key]) {
                        const next = { ...fieldErrors };
                        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                        delete next[field.key];
                        setFieldErrors(next);
                      }
                    }}
                    onSubmit={() => {
                      if (i < fields.length - 1) {
                        setFocusedField(i + 1);
                      } else {
                        handleSubmit();
                      }
                    }}
                    focus={fieldHasFocus}
                  />
                </Box>
                {fieldErrors[field.key] && (
                  <ErrorMessage message={fieldErrors[field.key]} />
                )}
              </Box>
            );
          })}
          <Text> </Text>
          <Text dimColor>Tab:Next Field Enter:Submit Esc:Cancel</Text>
        </>
      )}

      {phase === 'loading' && (
        <Box>
          <Text color="cyan"><Spinner type="dots" /></Text>
          <Text> Processing...</Text>
        </Box>
      )}

      {phase === 'result' && (
        <>
          {resultError ? (
            <ErrorMessage message={resultError} />
          ) : (
            <Text color="green">Operation completed successfully.</Text>
          )}
          <Text> </Text>
          <Text dimColor>Press Esc to close</Text>
        </>
      )}

      {phase === 'discover' && ((): React.ReactElement => {
        const state = store.getState();
        const discovered: Array<{ name: string; subPath: string }> = JSON.parse(
          state.formState?.data.discoveredSkills || '[]'
        );
        return (
          <>
            <Text dimColor>Multiple skills found in repository:</Text>
            <Text> </Text>
            {discovered.map((skill, i) => (
              <Text
                key={skill.name}
                color={selectedDiscover.has(i) ? 'green' : i === discoverFocusedIndex ? 'cyan' : 'gray'}
              >
                {selectedDiscover.has(i) ? '[x]' : '[ ]'} {skill.name}
              </Text>
            ))}
            <Text> </Text>
            <Text dimColor>Space:Toggle Enter:Confirm Esc:Cancel</Text>
          </>
        );
      })()}
    </Box>
  );
}
