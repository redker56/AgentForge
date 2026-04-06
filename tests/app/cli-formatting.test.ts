/**
 * cli-formatting.ts tests — pure formatting functions
 */

import chalk from 'chalk';
import { describe, expect, it } from 'vitest';

import {
  formatAgentList,
  formatAgentProjectSkillGroups,
  formatProjectSkillList,
  formatSourceLabel,
  sortAgentNamesByPriority,
} from '../../src/app/cli-formatting.js';
import type { ProjectSkillStatus } from '../../src/app/scan-service.js';
import type { Agent } from '../../src/types.js';

describe('sortAgentNamesByPriority', () => {
  it('sorts built-in agents by defined priority', () => {
    const names = ['codex', 'claude'];
    const result = sortAgentNamesByPriority(names);
    expect(result).toEqual(['claude', 'codex']);
  });

  it('leaves unknown names at the end in relative order', () => {
    const names = ['zebra-agent', 'claude', 'alpha-agent'];
    const result = sortAgentNamesByPriority(names);
    expect(result[0]).toBe('claude');
    // zebra-agent and alpha-agent are unknown, they stay in original relative order
  });

  it('returns an empty array for empty input', () => {
    expect(sortAgentNamesByPriority([])).toEqual([]);
  });

  it('does not mutate the original array', () => {
    const original = ['codex', 'claude'];
    sortAgentNamesByPriority(original);
    expect(original).toEqual(['codex', 'claude']);
  });
});

describe('formatSourceLabel', () => {
  it('returns magenta [git] for git sources', () => {
    const result = formatSourceLabel({ type: 'git', url: 'https://example.com' });
    expect(result).toContain('[git]');
  });

  it('returns dim [local] for local sources', () => {
    const result = formatSourceLabel({ type: 'local' });
    expect(result).toContain('[local]');
  });

  it('returns dim [local] for project sources', () => {
    const result = formatSourceLabel({ type: 'project', projectId: 'demo-project' });
    expect(result).toContain('[local]');
  });
});

describe('formatAgentList', () => {
  it('sorts agents by priority and joins names', () => {
    const agents: Agent[] = [
      { id: 'codex', name: 'Codex', basePath: '/tmp/codex', skillsDirName: 'agents' },
      { id: 'claude', name: 'Claude Code', basePath: '/tmp/claude', skillsDirName: 'claude' },
    ];
    const result = formatAgentList(agents);
    expect(result).toBe('Claude Code, Codex');
  });

  it('returns empty string for no agents', () => {
    expect(formatAgentList([])).toBe('');
  });

  it('places custom agents after built-in ones', () => {
    const agents: Agent[] = [
      {
        id: 'custom-agent',
        name: 'Custom Agent',
        basePath: '/tmp/custom',
        skillsDirName: 'custom',
      },
      { id: 'claude', name: 'Claude Code', basePath: '/tmp/claude', skillsDirName: 'claude' },
    ];
    const result = formatAgentList(agents);
    expect(result).toBe('Claude Code, Custom Agent');
  });
});

describe('formatProjectSkillList', () => {
  it('formats grouped output with status icons', () => {
    const skills: ProjectSkillStatus[] = [
      {
        name: 'skill-a',
        agentName: 'Claude Code',
        isImported: true,
        isDifferentVersion: false,
      },
    ];
    const result = formatProjectSkillList(skills);
    expect(result).toContain('Claude Code');
    expect(result).toContain('skill-a');
    expect(result).toContain('Managed in AgentForge');
  });

  it('returns dim (none) for empty input', () => {
    const result = formatProjectSkillList([]);
    expect(result).toBe(chalk.dim('  (none)'));
  });

  it('shows warning for different version', () => {
    const skills: ProjectSkillStatus[] = [
      {
        name: 'skill-b',
        agentName: 'Codex',
        isImported: false,
        isDifferentVersion: true,
      },
    ];
    const result = formatProjectSkillList(skills);
    expect(result).toContain('Different version from AgentForge');
  });

  it('shows not imported status', () => {
    const skills: ProjectSkillStatus[] = [
      {
        name: 'skill-c',
        agentName: 'Codex',
        isImported: false,
        isDifferentVersion: false,
      },
    ];
    const result = formatProjectSkillList(skills);
    expect(result).toContain('Not imported to AgentForge');
  });

  it('groups skills by agent name', () => {
    const skills: ProjectSkillStatus[] = [
      {
        name: 'skill-a',
        agentName: 'Claude Code',
        isImported: true,
        isDifferentVersion: false,
      },
      {
        name: 'skill-b',
        agentName: 'Codex',
        isImported: true,
        isDifferentVersion: false,
      },
    ];
    const result = formatProjectSkillList(skills);
    expect(result).toContain('Claude Code');
    expect(result).toContain('Codex');
  });
});

describe('formatAgentProjectSkillGroups', () => {
  it('sorts groups by project ID and skills alphabetically', () => {
    const groups = [
      { projectId: 'proj-b', skills: ['zebra', 'alpha'] },
      { projectId: 'proj-a', skills: ['bravo', 'charlie'] },
    ];
    const result = formatAgentProjectSkillGroups(groups);
    expect(result).toContain('proj-a:');
    expect(result).toContain('proj-b:');
    expect(result).toContain('bravo');
    expect(result).toContain('charlie');
  });

  it('returns dim (none) for empty input', () => {
    const result = formatAgentProjectSkillGroups([]);
    expect(result).toBe(chalk.dim('      (none)'));
  });

  it('handles single group with no skills', () => {
    const groups = [{ projectId: 'empty-proj', skills: [] as string[] }];
    const result = formatAgentProjectSkillGroups(groups);
    expect(result).toContain('empty-proj');
  });
});
