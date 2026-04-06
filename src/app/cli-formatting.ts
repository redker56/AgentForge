/**
 * CLI mode formatting utilities
 *
 * Pure functions that turn domain data into `chalk`-styled strings suitable
 * for `console.log` output. These are used exclusively by the command layer.
 */

import chalk from 'chalk';

import type { SkillSource, Agent } from '../types.js';
import { BUILTIN_AGENTS } from '../types.js';

import type { ProjectSkillStatus } from './scan-service.js';

export interface AgentProjectSkillGroup {
  projectId: string;
  skills: string[];
}

export function sortAgentNamesByPriority(names: string[]): string[] {
  const priorityOrder = new Map<string, number>();
  BUILTIN_AGENTS.forEach((a: Agent, i: number) => {
    priorityOrder.set(a.id, i);
    priorityOrder.set(a.name, i);
  });
  return [...names].sort((a, b) => {
    const aPriority = priorityOrder.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bPriority = priorityOrder.get(b) ?? Number.MAX_SAFE_INTEGER;
    return aPriority - bPriority;
  });
}

export function formatSourceLabel(source: SkillSource): string {
  if (source.type === 'git') {
    return chalk.magenta('[git]');
  }
  return chalk.dim('[local]');
}

export function formatAgentList(agents: Agent[]): string {
  const priorityOrder = new Map<string, number>();
  BUILTIN_AGENTS.forEach((a: Agent, idx: number) => priorityOrder.set(a.id, idx));
  const sorted = [...agents].sort((a, b) => {
    const aPriority = priorityOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bPriority = priorityOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return aPriority - bPriority;
  });
  return sorted.map((a) => a.name).join(', ');
}

function getSkillStatus(skill: ProjectSkillStatus): { icon: string; text: string } {
  if (skill.isImported) {
    return { icon: '\u2705', text: 'Managed in AgentForge' };
  }
  if (skill.isDifferentVersion) {
    return { icon: '\u26a0\ufe0f', text: 'Different version from AgentForge' };
  }
  return { icon: '\u274c', text: 'Not imported to AgentForge' };
}

export function formatProjectSkillList(skills: ProjectSkillStatus[]): string {
  if (skills.length === 0) {
    return chalk.dim('  (none)');
  }
  const byAgent = new Map<string, ProjectSkillStatus[]>();
  for (const skill of skills) {
    const agentSkills = byAgent.get(skill.agentName) || [];
    agentSkills.push(skill);
    byAgent.set(skill.agentName, agentSkills);
  }
  const lines: string[] = [];
  for (const [agentName, agentSkills] of byAgent) {
    lines.push(chalk.dim(`  ${agentName}:`));
    for (const skill of agentSkills) {
      const status = getSkillStatus(skill);
      lines.push(`    ${status.icon} ${chalk.cyan(skill.name)} - ${status.text}`);
    }
  }
  return lines.join('\n');
}

export function formatAgentProjectSkillGroups(groups: AgentProjectSkillGroup[]): string {
  if (groups.length === 0) {
    return chalk.dim('      (none)');
  }
  const lines: string[] = [];
  const sortedGroups = [...groups].sort((a, b) => a.projectId.localeCompare(b.projectId));
  for (const group of sortedGroups) {
    lines.push(chalk.dim(`      ${group.projectId}:`));
    const sortedSkills = [...group.skills].sort((a, b) => a.localeCompare(b));
    for (const skill of sortedSkills) {
      lines.push(chalk.dim(`        ${skill}`));
    }
  }
  return lines.join('\n');
}
