import { cleanup, render } from 'ink-testing-library';
import React, { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CategoryForm } from '../../../src/tui/components/CategoryForm.js';

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

const ENTER = '\r';
const DOWN = '\u001B[B';

function createSkill(name: string, categories: string[] = []) {
  return {
    name,
    categories,
    source: { type: 'local' as const },
    createdAt: '2026-01-01T00:00:00.000Z',
    syncedTo: [],
    syncedProjects: [],
    exists: true,
  };
}

function createMockStore(
  overrides: {
    skillNames?: string[];
    skills?: ReturnType<typeof createSkill>[];
    categorizeSkills?: ReturnType<typeof vi.fn>;
  } = {}
) {
  const skillNames = overrides.skillNames ?? ['target-skill'];
  const state = {
    shellState: {
      formState: {
        formType: 'categorizeSkills' as const,
        data: { skillNames: JSON.stringify(skillNames) },
      },
    },
    skills: overrides.skills ?? [
      createSkill('target-skill', ['writing']),
      createSkill('other-skill', ['docs']),
    ],
    setFormDirty: vi.fn(),
    setFormState: vi.fn(),
    categorizeSkills:
      overrides.categorizeSkills ??
      vi.fn(() =>
        Promise.resolve(
          skillNames.map((skillName) => ({
            skillName,
            success: true,
            categories: ['docs'],
          }))
        )
      ),
  };

  return {
    state,
    store: {
      getState: () => state,
      subscribe: vi.fn(() => () => {}),
    },
  };
}

async function sendInput(instance: ReturnType<typeof render>, input: string): Promise<void> {
  await act(async () => {
    instance.stdin.write(input);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function renderCategoryForm(store: unknown): Promise<ReturnType<typeof render>> {
  let instance: ReturnType<typeof render> | undefined;
  await act(async () => {
    instance = render(<CategoryForm store={store as never} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  if (!instance) {
    throw new Error('CategoryForm did not render');
  }

  return instance;
}

describe('CategoryForm', () => {
  afterEach(async () => {
    await act(async () => {
      cleanup();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  it('shows categories from the full skill library in set mode', async () => {
    const { store } = createMockStore();
    const instance = await renderCategoryForm(store);

    await sendInput(instance, ENTER);
    const frame = instance.lastFrame() ?? '';

    expect(frame).toContain('Showing categories from the full skill library.');
    expect(frame).toContain('docs (1)');
    expect(frame).toContain('writing (1)');
  });

  it('selects an existing category in add mode and shows it on confirm', async () => {
    const { store } = createMockStore();
    const instance = await renderCategoryForm(store);

    await sendInput(instance, DOWN);
    await sendInput(instance, ENTER);
    await sendInput(instance, ' ');
    await sendInput(instance, ENTER);
    const frame = instance.lastFrame() ?? '';

    expect(frame).toContain('Confirm changes');
    expect(frame).toContain('Mode: Add categories');
    expect(frame).toContain('Categories: docs');
  });

  it('merges typed new categories with selected existing categories', async () => {
    const { store } = createMockStore();
    const instance = await renderCategoryForm(store);

    await sendInput(instance, ENTER);
    await sendInput(instance, ' ');
    await sendInput(instance, 'n');
    await sendInput(instance, 'frontend');
    await sendInput(instance, ENTER);
    const frame = instance.lastFrame() ?? '';

    expect(frame).toContain('Confirm changes');
    expect(frame).toContain('Categories: docs, frontend');
  });

  it('limits remove mode choices to categories on the target skill', async () => {
    const { store } = createMockStore();
    const instance = await renderCategoryForm(store);

    await sendInput(instance, DOWN);
    await sendInput(instance, DOWN);
    await sendInput(instance, ENTER);
    const frame = instance.lastFrame() ?? '';

    expect(frame).toContain('Showing categories currently used by the selected skill(s).');
    expect(frame).toContain('writing (1)');
    expect(frame).not.toContain('docs (1)');
  });

  it('allows typing a new category when no existing categories are available', async () => {
    const { store } = createMockStore({
      skills: [createSkill('target-skill', [])],
    });
    const instance = await renderCategoryForm(store);

    await sendInput(instance, ENTER);
    expect(instance.lastFrame() ?? '').toContain('No existing categories yet.');

    await sendInput(instance, 'n');
    await sendInput(instance, 'docs');
    await sendInput(instance, ENTER);
    const frame = instance.lastFrame() ?? '';

    expect(frame).toContain('Confirm changes');
    expect(frame).toContain('Categories: docs');
  });
});
