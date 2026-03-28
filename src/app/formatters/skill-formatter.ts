/**
 * Skill display formatting utilities
 */

import chalk from 'chalk';
import type { SkillSource, Agent } from '../../types.js';
import { BUILTIN_AGENTS } from '../../types.js';

/**
 * Sort Agent list by BUILTIN_AGENTS order
 */
export function sortAgentsByPriority(agents: Agent[]): Agent[] {
  const priorityOrder = new Map<string, number>();
  BUILTIN_AGENTS.forEach((a, i) => priorityOrder.set(a.id, i));

  return [...agents].sort((a, b) => {
    const aPriority = priorityOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bPriority = priorityOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return aPriority - bPriority;
  });
}

/**
 * Sort Agent name list by BUILTIN_AGENTS order
 */
export function sortAgentNamesByPriority(names: string[]): string[] {
  const priorityOrder = new Map<string, number>();
  BUILTIN_AGENTS.forEach((a, i) => {
    priorityOrder.set(a.id, i);
    priorityOrder.set(a.name, i);
  });

  return [...names].sort((a, b) => {
    const aPriority = priorityOrder.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bPriority = priorityOrder.get(b) ?? Number.MAX_SAFE_INTEGER;
    return aPriority - bPriority;
  });
}

/**
 * Format source label (only show git or local)
 */
export function formatSourceLabel(source: SkillSource): string {
  if (source.type === 'git') {
    return chalk.magenta('[git]');
  }
  // local or project both show as local (per requirement, don't show project)
  return chalk.dim('[local]');
}

/**
 * Format Agent list (use displayName, sorted by built-in order)
 */
export function formatAgentList(agents: Agent[]): string {
  const sorted = sortAgentsByPriority(agents);
  return sorted.map(a => a.name).join(', ');
}

