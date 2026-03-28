/**
 * project-formatter tests
 */

import { describe, expect, it } from 'vitest';
import { formatAgentProjectSkillGroups, formatProjectSkillList } from '../../../src/app/formatters/project-formatter.js';

function stripAnsi(value: string): string {
  return value.replace(/\x1B\[[0-9;]*m/g, '');
}

describe('formatProjectSkillList', () => {
  it('groups skills by Agent with indented skill lines', () => {
    const output = stripAnsi(formatProjectSkillList([
      {
        name: 'frontend-design',
        path: '/tmp/frontend-design',
        agentId: 'claude',
        agentName: 'Claude Code',
        isImported: true,
        isDifferentVersion: false,
        subPath: '.claude/skills',
      },
      {
        name: 'frontend-design',
        path: '/tmp/frontend-design',
        agentId: 'codex',
        agentName: 'Codex',
        isImported: true,
        isDifferentVersion: false,
        subPath: '.agents/skills',
      },
    ]));

    expect(output).toContain('  Claude Code:');
    expect(output).toContain('    ✅ frontend-design - Managed in AgentForge');
    expect(output).toContain('  Codex:');
    expect(output).toContain('    ✅ frontend-design - Managed in AgentForge');
  });
});

describe('formatAgentProjectSkillGroups', () => {
  it('groups project-level skills under each project with nested indentation', () => {
    const output = stripAnsi(formatAgentProjectSkillGroups([
      { projectId: 'Obsidian', skills: ['json-canvas', 'defuddle'] },
      { projectId: 'Voice', skills: ['frontend-design'] },
    ]));

    expect(output).toContain('      Obsidian:');
    expect(output).toContain('        defuddle');
    expect(output).toContain('        json-canvas');
    expect(output).toContain('      Voice:');
    expect(output).toContain('        frontend-design');
  });
});
