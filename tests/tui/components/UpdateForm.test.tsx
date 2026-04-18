import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { UpdateForm } from '../../../src/tui/components/UpdateForm.js';

function createMockStore(overrides: Record<string, unknown> = {}) {
  const state = {
    formState: {
      formType: 'updateSelected' as const,
      data: {
        skillNames: JSON.stringify(['git-skill', 'local-skill', 'project-skill']),
      },
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
    updateProgressItems: [],
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
      formState: {
        formType: 'updateAllGit' as const,
        data: {
          skillNames: JSON.stringify(['local-skill']),
        },
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
});
