/**
 * SkillDetail component tests.
 * Verifies stable-height rendering for standard overlay mode.
 */

import { render, cleanup } from 'ink-testing-library';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('SkillDetail', () => {
  afterEach(() => {
    cleanup();
  });

  function makeMockStore(overrides?: Partial<Record<string, unknown>>) {
    const state = {
      focusedSkillIndex: 0,
      skills: [
        {
          name: 'architectural-coherence',
          source: { type: 'project' as const, projectId: 'AgentForge' },
          createdAt: '2026-03-28T08:02:43.934Z',
          syncedTo: [],
          exists: true,
        },
      ],
      skillDetails: {},
      ...overrides,
    };

    return {
      getState: () => state,
      subscribe: vi.fn(() => () => {}),
    };
  }

  it('exports SkillDetail component', async () => {
    const { SkillDetail } = await import('../../../src/tui/components/SkillDetail.js');
    expect(SkillDetail).toBeDefined();
    expect(typeof SkillDetail).toBe('function');
  });

  it('keeps standard overlay height stable between loading and loaded states', async () => {
    const { SkillDetail } = await import('../../../src/tui/components/SkillDetail.js');

    const loadingFrame =
      render(
        React.createElement(SkillDetail, {
          store: makeMockStore(),
          band: 'standard',
          columns: 100,
        })
      ).lastFrame() ?? '';

    const loadedStore = makeMockStore({
      skillDetails: {
        'architectural-coherence': {
          name: 'architectural-coherence',
          path: '/tmp/architectural-coherence',
          source: { type: 'project' as const, projectId: 'AgentForge' },
          createdAt: '2026-03-28T08:02:43.934Z',
          syncedTo: [
            { agentId: 'claude', mode: 'symlink' as const },
            { agentId: 'codex', mode: 'symlink' as const },
          ],
          syncedProjects: [],
          syncStatus: [
            { agentId: 'claude', agentName: 'Claude Code', mode: 'symlink' as const, status: 'synced' as const },
            { agentId: 'codex', agentName: 'Codex', mode: 'symlink' as const, status: 'synced' as const },
          ],
          projectDistribution: [
            {
              projectId: 'AgentForge',
              agents: [
                { id: 'claude', name: 'Claude Code', isDifferentVersion: false },
                { id: 'codex', name: 'Codex', isDifferentVersion: false },
              ],
            },
          ],
          skillMdPreview: '# Architectural Coherence\n- Remove compatibility layers\n- Keep naming consistent',
        },
      },
    });

    const loadedFrame =
      render(
        React.createElement(SkillDetail, {
          store: loadedStore,
          band: 'standard',
          columns: 100,
        })
      ).lastFrame() ?? '';

    expect(loadingFrame.split('\n').length).toBe(loadedFrame.split('\n').length);
  });
});
