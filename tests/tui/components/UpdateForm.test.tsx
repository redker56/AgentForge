import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  getProgressViewport,
  getRetryableUpdateSkillNames,
  UpdateForm,
} from '../../../src/tui/components/UpdateForm.js';

function createMockStore(overrides: Record<string, unknown> = {}) {
  const state = {
    shellState: {
      formState: {
        formType: 'updateSelected' as const,
        data: {
          skillNames: JSON.stringify(['git-skill', 'local-skill', 'project-skill']),
        },
      },
      updateProgressItems: [],
    },
    skills: [
      {
        name: 'git-skill',
        source: { type: 'git', url: 'https://example.com/repo' },
        syncedTo: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        exists: true,
      },
      {
        name: 'local-skill',
        source: { type: 'local' },
        syncedTo: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        exists: true,
      },
      {
        name: 'project-skill',
        source: { type: 'project', projectId: 'proj1' },
        syncedTo: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        exists: true,
      },
    ],
    setFormState: vi.fn(),
    updateSkills: vi.fn(() => Promise.resolve([])),
    ...overrides,
  };
  return {
    getState: () => state,
    subscribe: vi.fn(() => () => {}),
  };
}

describe('UpdateForm', () => {
  it('exports UpdateForm component', () => {
    expect(UpdateForm).toBeDefined();
    expect(typeof UpdateForm).toBe('function');
  });

  it('renders preview rows with source types and skip/update states', () => {
    const store = createMockStore();
    const { lastFrame } = render(<UpdateForm store={store as never} />);
    const frame = lastFrame() || '';

    expect(frame).toContain('Update Selected Skills');
    expect(frame).toContain('git-skill');
    expect(frame).toContain('local-skill');
    expect(frame).toContain('project-skill');
    expect(frame).toContain('Will update and re-sync');
    expect(frame).toContain('Skipped: not git-backed');
    expect(frame).toContain('Skipped: project-backed');
  });

  it('shows empty-state close guidance when there are no git-backed skills', () => {
    const store = createMockStore({
      shellState: {
        formState: {
          formType: 'updateAllGit' as const,
          data: {
            skillNames: JSON.stringify(['local-skill']),
          },
        },
        updateProgressItems: [],
      },
      skills: [
        {
          name: 'local-skill',
          source: { type: 'local' },
          syncedTo: [],
          createdAt: '2024-01-01T00:00:00.000Z',
          exists: true,
        },
      ],
    });
    const { lastFrame } = render(<UpdateForm store={store as never} />);
    const frame = lastFrame() || '';

    expect(frame).toContain('No git-backed skills to update');
    expect(frame).not.toContain('Preparing update tasks');
  });

  it('auto-scrolls the executing viewport to keep the running task visible', () => {
    const items = Array.from({ length: 8 }, (_, index) => ({
      id: `update-skill-${index + 1}`,
      label: `skill-${index + 1}`,
      progress: index < 6 ? 100 : index === 6 ? 30 : 0,
      status:
        index < 6
          ? ('success' as const)
          : index === 6
            ? ('running' as const)
            : ('pending' as const),
    }));

    const viewport = getProgressViewport(items, 6);

    expect(viewport.visibleItems.map((item) => item.label)).toEqual([
      'skill-2',
      'skill-3',
      'skill-4',
      'skill-5',
      'skill-6',
      'skill-7',
    ]);
    expect(viewport.hiddenAboveCount).toBe(1);
    expect(viewport.hiddenBelowCount).toBe(1);
  });

  it('selects only per-skill update failures for retry', () => {
    expect(
      getRetryableUpdateSkillNames([
        {
          skillName: 'git-skill',
          sourceType: 'git',
          outcome: 'error',
          detail: 'TLS handshake failed',
        },
        {
          skillName: 'update',
          sourceType: 'unknown',
          outcome: 'error',
          detail: 'Unexpected update failure',
        },
        {
          skillName: 'local-skill',
          sourceType: 'local',
          outcome: 'skipped',
          detail: 'Skipped',
        },
      ])
    ).toEqual(['git-skill']);
  });
});
