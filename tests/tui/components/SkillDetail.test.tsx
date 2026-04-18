/**
 * SkillDetail component tests.
 * Verifies stable-height rendering for standard overlay mode.
 */

import { render, cleanup } from 'ink-testing-library';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ALL_SKILL_CATEGORY_FILTER } from '../../../src/types.js';
import { withLegacyUiState } from '../helpers/legacyUiState.js';

describe('SkillDetail', () => {
  afterEach(() => {
    cleanup();
  });

  function makeMockStore(overrides?: Partial<Record<string, unknown>>) {
    const state = {
      focusedSkillIndex: 0,
      loadSkillDetail: vi.fn(),
      skills: [
        {
          name: 'architectural-coherence',
          source: { type: 'project' as const, projectId: 'AgentForge' },
          createdAt: '2026-03-28T08:02:43.934Z',
          updatedAt: '2026-04-01T12:00:00.000Z',
          categories: ['architecture'],
          syncedTo: [],
          exists: true,
        },
      ],
      activeSkillCategoryFilter: ALL_SKILL_CATEGORY_FILTER,
      skillDetails: {},
      ...overrides,
    };

    withLegacyUiState(state);
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
          updatedAt: '2026-04-01T12:00:00.000Z',
          categories: ['architecture'],
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

  it('renders the updated timestamp when available', async () => {
    const { SkillDetail } = await import('../../../src/tui/components/SkillDetail.js');

    const store = makeMockStore({
      skillDetails: {
        'architectural-coherence': {
          name: 'architectural-coherence',
          path: '/tmp/architectural-coherence',
          source: { type: 'project' as const, projectId: 'AgentForge' },
          createdAt: '2026-03-28T08:02:43.934Z',
          updatedAt: '2026-04-01T12:00:00.000Z',
          categories: ['architecture'],
          syncedTo: [],
          syncedProjects: [],
          syncStatus: [],
          projectDistribution: [],
          skillMdPreview: null,
        },
      },
    });

    const frame =
      render(
        React.createElement(SkillDetail, {
          store,
          band: 'widescreen',
          columns: 100,
        })
      ).lastFrame() ?? '';

    expect(frame).toContain('Updated: 2026-04-01T12:00:00.000Z');
  });

  it('keeps standard overlay height stable for long CJK detail lines', async () => {
    const { SkillDetail } = await import('../../../src/tui/components/SkillDetail.js');

    const shortFrame =
      render(
        React.createElement(SkillDetail, {
          store: makeMockStore({
            skillDetails: {
              'architectural-coherence': {
                name: 'architectural-coherence',
                path: '/tmp/architectural-coherence',
                source: { type: 'project' as const, projectId: 'AgentForge' },
                createdAt: '2026-03-28T08:02:43.934Z',
                updatedAt: '2026-04-01T12:00:00.000Z',
                categories: ['architecture'],
                syncedTo: [],
                syncedProjects: [],
                syncStatus: [],
                projectDistribution: [],
                skillMdPreview: null,
              },
            },
          }),
          band: 'standard',
          columns: 100,
        })
      ).lastFrame() ?? '';

    const cjkFrame =
      render(
        React.createElement(SkillDetail, {
          store: makeMockStore({
            skillDetails: {
              'architectural-coherence': {
                name: 'architectural-coherence',
                path: '/tmp/architectural-coherence',
                source: { type: 'project' as const, projectId: 'AgentForge' },
                createdAt: '2026-03-28T08:02:43.934Z',
                updatedAt: '2026-04-01T12:00:00.000Z',
                categories: [
                  '数字生命卡兹克的长中文分类标签',
                  '这是一个会占用双倍显示宽度的测试分类标签',
                  '用来验证详情框不会因为中文长行而把边框撑坏',
                ],
                syncedTo: [],
                syncedProjects: [],
                syncStatus: [],
                projectDistribution: [],
                skillMdPreview: null,
              },
            },
          }),
          band: 'standard',
          columns: 100,
        })
      ).lastFrame() ?? '';

    expect(shortFrame.split('\n').length).toBe(cjkFrame.split('\n').length);
  });

  it('sanitizes CRLF preview content before rendering the standard overlay', async () => {
    const { SkillDetail } = await import('../../../src/tui/components/SkillDetail.js');

    const crlfFrame =
      render(
        React.createElement(SkillDetail, {
          store: makeMockStore({
            skillDetails: {
              'architectural-coherence': {
                name: 'architectural-coherence',
                path: '/tmp/architectural-coherence',
                source: { type: 'project' as const, projectId: 'AgentForge' },
                createdAt: '2026-03-28T08:02:43.934Z',
                updatedAt: '2026-04-01T12:00:00.000Z',
                categories: ['architecture'],
                syncedTo: [],
                syncedProjects: [],
                syncStatus: [],
                projectDistribution: [],
                skillMdPreview: '# Title\r\n> quoted line\r\nfinal line',
              },
            },
          }),
          band: 'standard',
          columns: 100,
        })
      ).lastFrame() ?? '';

    const lfFrame =
      render(
        React.createElement(SkillDetail, {
          store: makeMockStore({
            skillDetails: {
              'architectural-coherence': {
                name: 'architectural-coherence',
                path: '/tmp/architectural-coherence',
                source: { type: 'project' as const, projectId: 'AgentForge' },
                createdAt: '2026-03-28T08:02:43.934Z',
                updatedAt: '2026-04-01T12:00:00.000Z',
                categories: ['architecture'],
                syncedTo: [],
                syncedProjects: [],
                syncStatus: [],
                projectDistribution: [],
                skillMdPreview: '# Title\n> quoted line\nfinal line',
              },
            },
          }),
          band: 'standard',
          columns: 100,
        })
      ).lastFrame() ?? '';

    expect(crlfFrame).not.toContain('\r');
    expect(crlfFrame).toBe(lfFrame);
  });
});
