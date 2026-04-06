/**
 * Form overlay for importing skills from a project or agent.
 */

import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import React, { useState, useEffect } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type { AppStore } from '../store/index.js';

interface ImportFormProps {
  store: StoreApi<AppStore>;
}

type ImportPhase = 'select-source' | 'select-skills' | 'loading' | 'result';

interface ScannedSkill {
  name: string;
  path: string;
  alreadyExists: boolean;
  hasSkillMd?: boolean;
}

export function ImportForm({ store }: ImportFormProps): React.ReactElement {
  const formState = useStore(store, s => s.formState);
  const projects = useStore(store, s => s.projects);
  const agents = useStore(store, s => s.agents);

  const [phase, setPhase] = useState<ImportPhase>('select-source');
  const [sourceIndex, setSourceIndex] = useState(0);
  const [scannedSkills, setScannedSkills] = useState<ScannedSkill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Set<number>>(new Set());
  const [skillFocusIndex, setSkillFocusIndex] = useState(0);
  const [resultMessages, setResultMessages] = useState<Array<{ name: string; ok: boolean; error?: string }>>([]);

  if (!formState || !formState.formType.startsWith('import')) return <></>;

  const formType = formState.formType;
  const isProject = formType === 'importProject';

  // If projectId is pre-set, skip to skill scanning
  useEffect(() => {
    if (isProject && formState.data.projectId) {
      const state = store.getState();
      const skills = state.scanProjectSkills(formState.data.projectId);
      setScannedSkills(skills);
      setPhase('select-skills');
    }
  }, [formState]);

  // Local input handler for the import form
  useInput((input, key) => {
    if (phase === 'select-source') {
      const sources = isProject ? projects : agents;
      if (key.upArrow) {
        setSourceIndex(prev => (prev > 0 ? prev - 1 : sources.length - 1));
        return;
      }
      if (key.downArrow) {
        setSourceIndex(prev => (prev < sources.length - 1 ? prev + 1 : 0));
        return;
      }
      if (key.return && sources.length > 0) {
        const selected = sources[sourceIndex];
        if (!selected) return;

        if (isProject) {
          const skills = store.getState().scanProjectSkills(selected.id);
          setScannedSkills(skills);
        } else {
          const skills = store.getState().scanAgentSkills(selected.id);
          setScannedSkills(skills);
        }
        setPhase('select-skills');
        setSelectedSkills(new Set());
        setSkillFocusIndex(0);
        return;
      }
    }

    if (phase === 'select-skills') {
      if (key.upArrow) {
        setSkillFocusIndex(prev => (prev > 0 ? prev - 1 : scannedSkills.length - 1));
        return;
      }
      if (key.downArrow) {
        setSkillFocusIndex(prev => (prev < scannedSkills.length - 1 ? prev + 1 : 0));
        return;
      }
      if (input === ' ') {
        const skill = scannedSkills[skillFocusIndex];
        if (skill && !skill.alreadyExists) {
          setSelectedSkills(prev => {
            const next = new Set(prev);
            if (next.has(skillFocusIndex)) next.delete(skillFocusIndex);
            else next.add(skillFocusIndex);
            return next;
          });
        }
        return;
      }
      if (key.return) {
        const state = store.getState();
        const names = scannedSkills
          .filter((_, i) => selectedSkills.has(i))
          .map(s => s.name);

        if (names.length === 0) return;

        setPhase('loading');

        const sourceId = formState.data.projectId
          || (isProject ? projects[sourceIndex]?.id : agents[sourceIndex]?.id)
          || '';

        const importPromise = isProject
          ? state.importFromProject(sourceId, names)
          : state.importFromAgent(sourceId, names);

        importPromise.then(() => {
          setResultMessages(names.map(n => ({ name: n, ok: true })));
          setPhase('result');
        }).catch((e: unknown) => {
          setResultMessages([{ name: 'import', ok: false, error: e instanceof Error ? e.message : String(e) }]);
          setPhase('result');
        });
        return;
      }
    }
  }, {
    isActive: (formState?.formType?.startsWith('import') ?? false) && phase !== 'loading',
  });

  const title = isProject ? 'Import from Project' : 'Import from Agent';

  return (
    <Box flexDirection="column" borderStyle="round" padding={1} width={60} marginTop={1}>
      <Text bold color="cyan">{title}</Text>
      <Text> </Text>

      {phase === 'select-source' && !formState.data.projectId && (
        <>
          <Text dimColor>Select a {isProject ? 'project' : 'agent'}:</Text>
          <Text> </Text>
          {(isProject ? projects : agents).map((item, i) => {
            const id = 'id' in item ? (item as { id: string }).id : '';
            const label = isProject
              ? `${(item as { id: string; path: string }).id} (${(item as { id: string; path: string }).path})`
              : `${(item as { id: string; name: string }).name} (${(item as { id: string; name: string }).id})`;
            return (
              <Text key={id} color={i === sourceIndex ? 'cyan' : 'gray'}>
                {i === sourceIndex ? '> ' : '  '}{label}
              </Text>
            );
          })}
          <Text> </Text>
          <Text dimColor>Up/Down:Navigate Enter:Select Esc:Cancel</Text>
        </>
      )}

      {phase === 'select-skills' && (
        <>
          <Text dimColor>Select skills to import:</Text>
          <Text> </Text>
          {scannedSkills.map((skill, i) => (
            <Text
              key={skill.name}
              color={skill.alreadyExists ? 'gray' : (selectedSkills.has(i) ? 'green' : (i === skillFocusIndex ? 'cyan' : undefined))}
            >
              {skill.alreadyExists ? '[x]' : (selectedSkills.has(i) ? '[x]' : '[ ]')} {skill.name}
              {skill.alreadyExists ? ' (already imported)' : ''}
            </Text>
          ))}
          <Text> </Text>
          <Text dimColor>Space:Toggle Enter:Import Esc:Cancel</Text>
        </>
      )}

      {phase === 'loading' && (
        <Box>
          <Text color="cyan"><Spinner type="dots" /></Text>
          <Text> Importing...</Text>
        </Box>
      )}

      {phase === 'result' && (
        <>
          {resultMessages.map(msg => (
            <Text key={msg.name} color={msg.ok ? 'green' : 'red'}>
              {msg.ok ? `[OK] ${msg.name}` : `[FAIL] ${msg.name}: ${msg.error}`}
            </Text>
          ))}
          <Text> </Text>
          <Text dimColor>Press Esc to close</Text>
        </>
      )}
    </Box>
  );
}
