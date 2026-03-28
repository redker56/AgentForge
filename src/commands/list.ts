/**
 * list command - Unified list command
 * af list agents | projects | skills
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import type { Command } from 'commander';
import type { CommandContext } from './index.js';
import { getAgentProjectSkillsDir, type Agent } from '../types.js';
import { formatAgentProjectSkillGroups } from '../app/formatters/project-formatter.js';
import { formatSourceLabel, formatAgentList, sortAgentNamesByPriority } from '../app/formatters/skill-formatter.js';
import { files } from '../infra/files.js';

/**
 * Check if user-level skill matches Agent directory skill content
 */
async function checkUserSkillSyncStatus(
  skillName: string,
  agentId: string,
  storage: CommandContext['storage']
): Promise<'synced' | 'different' | 'missing'> {
  const agent = storage.getAgent(agentId);
  if (!agent) return 'missing';

  const agentSkillPath = path.join(agent.basePath, skillName);
  if (!fs.existsSync(agentSkillPath)) return 'missing';

  const importedSkillPath = storage.getSkillPath(skillName);
  if (!fs.existsSync(importedSkillPath)) return 'missing';

  const [agentHash, importedHash] = await Promise.all([
    files.getDirectoryHash(agentSkillPath),
    files.getDirectoryHash(importedSkillPath),
  ]);

  if (agentHash !== null && importedHash !== null && agentHash === importedHash) {
    return 'synced';
  }
  return 'different';
}

async function listAgents(ctx: CommandContext): Promise<void> {
  const agents = ctx.storage.listAgents();
  if (agents.length === 0) {
    console.log(chalk.yellow('No Agents available'));
    console.log(chalk.dim('Run "af add agents" to add a custom Agent'));
    return;
  }

  console.log(chalk.bold('\nAgent List\n'));
  console.log(chalk.dim('  User-level: Skills synced from AgentForge'));
  console.log(chalk.dim('  Project-level: Independent skills in project directories\n'));

  for (const a of agents) {
    console.log(`  ${chalk.cyan(a.id)} - ${a.name}`);
    console.log(chalk.dim(`    Path: ${a.basePath}`));

    // Get user-level skills (synced to this Agent)
    const userSkillRecords = ctx.storage.listSkills()
      .filter(s => s.syncedTo.some(r => r.agentId === a.id));

    // Check each skill's actual sync status
    const syncedSkills: string[] = [];
    const differentSkills: string[] = [];

    for (const skill of userSkillRecords) {
      const status = await checkUserSkillSyncStatus(skill.name, a.id, ctx.storage);
      if (status === 'synced') {
        syncedSkills.push(skill.name);
      } else if (status === 'different') {
        differentSkills.push(skill.name);
      }
    }

    syncedSkills.sort();
    differentSkills.sort();

    // Get project-level skills
    const projectSkillsByProject = new Map<string, string[]>();

    for (const project of ctx.storage.listProjects()) {
      const projectSkillsPath = getAgentProjectSkillsDir(project.path, a);
      if (fs.existsSync(projectSkillsPath)) {
        const skills = fs.readdirSync(projectSkillsPath).filter(f => {
          const p = path.join(projectSkillsPath, f);
          try {
            if (!fs.statSync(p).isDirectory() || f.startsWith('.')) return false;
            const files = fs.readdirSync(p);
            return files.some(file => file.toLowerCase() === 'skill.md');
          } catch {
            return false;
          }
        });
        if (skills.length > 0) {
          projectSkillsByProject.set(project.id, skills);
        }
      }
    }

    const totalProjectSkills = Array.from(projectSkillsByProject.values())
      .reduce((count, skills) => count + skills.length, 0);

    // Display user-level skills
    console.log(chalk.dim(`    User-level (${syncedSkills.length + differentSkills.length}):`));
    if (syncedSkills.length === 0 && differentSkills.length === 0) {
      console.log(chalk.dim('      (none)'));
    } else {
      for (const s of syncedSkills) {
        console.log(chalk.dim(`      ${s}`));
      }
      for (const s of differentSkills) {
        console.log(chalk.yellow(`      ${s} (needs re-sync)`));
      }
    }

    // Display project-level skills
    console.log(chalk.dim(`    Project-level (${totalProjectSkills}):`));
    console.log(formatAgentProjectSkillGroups(
      Array.from(projectSkillsByProject.entries()).map(([projectId, skills]) => ({ projectId, skills }))
    ));

    console.log();
  }
}

async function listProjects(ctx: CommandContext): Promise<void> {
  const projects = ctx.storage.listProjects();
  if (projects.length === 0) {
    console.log(chalk.yellow('\nNo registered projects'));
    console.log(chalk.dim('Run "af add projects" to add a project'));
    return;
  }

  console.log(chalk.bold('\nProject List\n'));
  for (const p of projects) {
    console.log(`  ${chalk.cyan(p.id)} ${chalk.dim(`- ${p.path}`)}`);

    // Get project skills
    const skills = await ctx.scan.getProjectSkillsWithStatus(p.id);
    if (skills.length === 0) {
      console.log(chalk.dim('    (no skills)'));
    } else {
      // Group by Agent
      const byAgent = new Map<string, typeof skills>();
      for (const skill of skills) {
        const existing = byAgent.get(skill.agentName) || [];
        existing.push(skill);
        byAgent.set(skill.agentName, existing);
      }

      for (const [agentName, agentSkills] of byAgent) {
        console.log(chalk.dim(`    ${agentName}:`));
        for (const s of agentSkills) {
          let icon: string;
          let statusText: string;
          if (s.isImported) {
            icon = '✅';
            statusText = 'imported';
          } else if (s.isDifferentVersion) {
            icon = '⚠️';
            statusText = 'different version';
          } else {
            icon = '❌';
            statusText = 'not imported';
          }
          console.log(`      ${icon} ${chalk.cyan(s.name)} ${chalk.dim(`(${statusText})`)}`);
        }
      }
    }
    console.log();
  }
}

async function listSkills(ctx: CommandContext): Promise<void> {
  const list = ctx.skills.list();

  if (list.length === 0) {
    console.log(chalk.yellow('\nNo skills yet'));
    console.log(chalk.dim('  Run "af add skills <git-url>" to install skills from a Git repository'));
    console.log(chalk.dim('  Run "af import projects <project>" to import skills from a project'));
    return;
  }

  console.log(chalk.bold('\nSkill List\n'));
  console.log(chalk.dim('  User-level: Skills synced to Agents'));
  console.log(chalk.dim('  Project-level: Same-name skills in project directories'));
  console.log(chalk.dim('  Not synced: Not synced to any Agent\n'));

  for (const s of list) {
    const meta = ctx.storage.getSkill(s.name);
    if (!meta) continue;

    const exists = s.exists ? '📦' : '💔';

    // Source: only show git or local (not project)
    const sourceInfo = formatSourceLabel(meta.source);
    console.log(`${exists} ${chalk.cyan(s.name)} ${sourceInfo}`);

    // User-level sync status (check actual content)
    const syncedTo = meta.syncedTo;
    if (syncedTo.length > 0) {
      const syncedAgents: Agent[] = [];
      const differentAgents: string[] = [];

      for (const r of syncedTo) {
        const status = await checkUserSkillSyncStatus(s.name, r.agentId, ctx.storage);
        const agent = ctx.storage.getAgent(r.agentId);
        if (status === 'synced' && agent) {
          syncedAgents.push(agent);
        } else if (status === 'different' && agent) {
          differentAgents.push(agent.name);
        }
      }

      if (syncedAgents.length > 0) {
        const agentList = formatAgentList(syncedAgents);
        console.log(chalk.dim(`    User-level: ${agentList}`));
      }
      if (differentAgents.length > 0) {
        const sortedDifferent = sortAgentNamesByPriority(differentAgents);
        console.log(chalk.yellow(`    User-level: ${sortedDifferent.join(', ')} (needs re-sync)`));
      }
    }

    // Project-level distribution (real-time scan with version status)
    const distribution = await ctx.scan.getSkillProjectDistributionWithStatus(s.name);
    if (distribution.length > 0) {
      for (const d of distribution) {
        // Group: same version and different version
        const sameVersion = d.agents.filter(a => !a.isDifferentVersion);
        const diffVersion = d.agents.filter(a => a.isDifferentVersion);

        if (sameVersion.length > 0 || diffVersion.length > 0) {
          console.log(chalk.dim(`    Project-level: ${d.projectId}`));

          if (sameVersion.length > 0) {
            const names = sortAgentNamesByPriority(sameVersion.map(a => a.name)).join(', ');
            console.log(chalk.dim(`      ${names}`));
          }
          if (diffVersion.length > 0) {
            const names = sortAgentNamesByPriority(diffVersion.map(a => a.name)).join(', ');
            console.log(chalk.yellow(`      ${names} (different from AgentForge version)`));
          }
        }
      }
    }

    // Only show "not synced" when neither user-level nor project-level
    if (syncedTo.length === 0 && distribution.length === 0) {
      console.log(chalk.yellow(`    Not synced to any Agent`));
    }

    console.log();
  }
}

export function register(program: Command, ctx: CommandContext): void {
  program
    .command('list <target>')
    .description('List resources (agents/projects/skills)')
    .action(async (target: string) => {
      switch (target) {
        case 'agents':
          await listAgents(ctx);
          break;
        case 'projects':
          await listProjects(ctx);
          break;
        case 'skills':
          await listSkills(ctx);
          break;
        default:
          console.error(chalk.red(`Invalid target: ${target}`));
          console.log(chalk.dim('Available targets: agents, projects, skills'));
          console.log(chalk.dim('Example: af list agents'));
      }
    });
}
