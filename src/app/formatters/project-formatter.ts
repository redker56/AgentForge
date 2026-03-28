/**
 * Project display formatting utilities
 */

import chalk from 'chalk';
import type { ProjectSkillStatus } from '../scan-service.js';

export interface AgentProjectSkillGroup {
  projectId: string;
  skills: string[];
}

function getSkillStatus(skill: ProjectSkillStatus): { icon: string; text: string } {
  if (skill.isImported) {
    return { icon: '✅', text: 'Managed in AgentForge' };
  }

  if (skill.isDifferentVersion) {
    return { icon: '⚠️', text: 'Different version from AgentForge' };
  }

  return { icon: '❌', text: 'Not imported to AgentForge' };
}

/**
 * Format project skill list grouped by Agent.
 */
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

/**
 * Format project-level skills for a single Agent grouped by project.
 */
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
