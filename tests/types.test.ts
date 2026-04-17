import os from 'os';
import path from 'path';

import { describe, expect, it } from 'vitest';

import {
  ALL_SKILL_CATEGORY_FILTER,
  UNCATEGORIZED_SKILL_CATEGORY_FILTER,
  BUILTIN_AGENTS,
  getAgentProjectSkillsRelativePath,
  getSkillCategoryCounts,
} from '../src/types.js';

describe('BUILTIN_AGENTS', () => {
  it('uses the correct OpenClaw user-level skills path', () => {
    const openclaw = BUILTIN_AGENTS.find((agent) => agent.id === 'openclaw');

    expect(openclaw).toBeDefined();
    expect(openclaw?.basePath).toBe(path.join(os.homedir(), '.openclaw', 'workspace', 'skills'));
  });

  it('uses .agents/skills as the OpenClaw project-level skills path', () => {
    const openclaw = BUILTIN_AGENTS.find((agent) => agent.id === 'openclaw');

    expect(openclaw).toBeDefined();
    expect(openclaw?.skillsDirName).toBe('agents');
    expect(openclaw ? getAgentProjectSkillsRelativePath(openclaw) : '').toBe('.agents/skills');
  });

  it('uses the correct built-in paths for Qoder, OpenCode, and Cursor', () => {
    const qoder = BUILTIN_AGENTS.find((agent) => agent.id === 'qoder');
    const opencode = BUILTIN_AGENTS.find((agent) => agent.id === 'opencode');
    const cursor = BUILTIN_AGENTS.find((agent) => agent.id === 'cursor');

    expect(qoder?.basePath).toBe(path.join(os.homedir(), '.qoder', 'skills'));
    expect(qoder ? getAgentProjectSkillsRelativePath(qoder) : '').toBe('.qoder/skills');

    expect(opencode?.basePath).toBe(path.join(os.homedir(), '.config', 'opencode', 'skills'));
    expect(opencode ? getAgentProjectSkillsRelativePath(opencode) : '').toBe('.opencode/skills');

    expect(cursor?.basePath).toBe(path.join(os.homedir(), '.cursor', 'skills'));
    expect(cursor ? getAgentProjectSkillsRelativePath(cursor) : '').toBe('.cursor/skills');
  });

  it('falls back to the Agent ID when a custom project directory name is not provided', () => {
    expect(getAgentProjectSkillsRelativePath({ id: 'custom-agent' })).toBe('.custom-agent/skills');
  });

  it('places Uncategorized after concrete categories in category counts', () => {
    const counts = getSkillCategoryCounts([
      { categories: ['用户级'] },
      { categories: ['文档'] },
      { categories: [] },
    ]);

    expect(counts.map((entry) => entry.key)).toEqual([
      ALL_SKILL_CATEGORY_FILTER,
      '文档',
      '用户级',
      UNCATEGORIZED_SKILL_CATEGORY_FILTER,
    ]);
  });
});
