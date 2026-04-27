/**
 * unsync command - Remove sync
 * af unsync agents <skill> [agents...]
 * af unsync projects <skill> [projects...]
 */

import { checkbox, select } from '@inquirer/prompts';
import chalk from 'chalk';
import type { Command } from 'commander';

import type { AgentId } from '../types.js';

import { exitCommand } from './errors.js';

import type { CommandContext } from './index.js';

export function register(program: Command, ctx: CommandContext): void {
  program
    .command('unsync <target> [name] [targets...]')
    .description('Remove sync (agents | projects)')
    .option('-a, --agent-types <types...>', 'Agent types when removing project sync')
    .action(
      async (
        target: string,
        name: string | undefined,
        targets: string[],
        options: { agentTypes?: string[] }
      ) => {
        const skillName = name || '';
        if (target === 'agents') {
          await unsyncFromAgents(ctx, skillName, targets);
        } else if (target === 'projects') {
          await unsyncFromProjects(ctx, skillName, targets, options);
        } else {
          console.error(chalk.red(`Invalid target: ${target}`));
          console.log(chalk.dim('Supported: agents, projects'));
          exitCommand(1);
        }
      }
    );
}

async function unsyncFromAgents(
  ctx: CommandContext,
  name: string,
  agentIds: string[]
): Promise<void> {
  // Interactive skill selection
  if (!name) {
    if (!process.stdin.isTTY) {
      console.error(chalk.red('Please specify skill name: af unsync agents <skill-name>'));
      exitCommand(1);
    }
    // Only show skills synced to Agents
    const skills = ctx.skills.list().filter((s) => (s.syncedTo || []).length > 0);
    if (skills.length === 0) {
      console.log(chalk.yellow('No skills synced to Agents'));
      return;
    }
    name = await select({
      message: 'Select skill to unsync:',
      choices: skills.map((s) => ({ name: s.name, value: s.name })),
    });
  }

  const skill = ctx.skills.get(name);
  if (!skill) {
    console.error(chalk.red(`Skill not found: ${name}`));
    exitCommand(1);
  }

  const syncedAgents = skill.syncedTo || [];

  if (syncedAgents.length === 0) {
    console.log(chalk.yellow('This skill is not synced to any Agent'));
    return;
  }

  // Interactive selection
  if (agentIds.length === 0 && process.stdin.isTTY) {
    const selected = await checkbox({
      message: 'Select Agents to unsync:',
      choices: syncedAgents.map((r) => {
        const agent = ctx.storage.getAgent(r.agentId);
        return {
          name: `${agent?.name || r.agentId} (${r.mode})`,
          value: r.agentId,
        };
      }),
    });
    agentIds = selected;
  }

  if (agentIds.length === 0) {
    console.log(chalk.yellow('No Agents selected'));
    return;
  }

  await ctx.sync.unsync(name, agentIds);
  console.log(chalk.green('Sync removed'));
}

async function unsyncFromProjects(
  ctx: CommandContext,
  name: string,
  projectIds: string[],
  options: { agentTypes?: string[] }
): Promise<void> {
  // Interactive skill selection
  if (!name) {
    if (!process.stdin.isTTY) {
      console.error(chalk.red('Please specify skill name: af unsync projects <skill-name>'));
      exitCommand(1);
    }
    // Show all skills, prioritize those with project sync records or project distribution
    const skills = ctx.skills.list();
    if (skills.length === 0) {
      console.log(chalk.yellow('No skills available'));
      return;
    }

    // Get project distribution for each skill
    const skillsWithProjects = await Promise.all(
      skills.map(async (s) => {
        const distribution = await ctx.scan.getSkillProjectDistributionWithStatus(s.name);
        return { ...s, distribution };
      })
    );

    // Filter skills with project distribution
    const skillsWithProjectDist = skillsWithProjects.filter((s) => s.distribution.length > 0);

    if (skillsWithProjectDist.length === 0) {
      console.log(chalk.yellow('No skills synced to any project'));
      return;
    }

    name = await select({
      message: 'Select skill to unsync:',
      choices: skillsWithProjectDist.map((s) => ({
        name: `${s.name} (${s.distribution.length} projects)`,
        value: s.name,
      })),
    });
  }

  const skill = ctx.skills.get(name);
  if (!skill) {
    console.error(chalk.red(`Skill not found: ${name}`));
    exitCommand(1);
  }

  // Get recorded sync projects
  const syncedProjects = skill.syncedProjects || [];

  // Get actual project distribution (by scanning)
  const actualDistribution = await ctx.scan.getSkillProjectDistributionWithStatus(name);

  // Merge: recorded + existing but unrecorded
  const allTargets: Array<{
    projectId: string;
    agentType: string;
    mode: string;
    fromRecord: boolean;
  }> = [];

  // Add recorded
  for (const r of syncedProjects) {
    allTargets.push({
      projectId: r.projectId,
      agentType: r.agentType,
      mode: r.mode,
      fromRecord: true,
    });
  }

  // Add existing but unrecorded
  for (const d of actualDistribution) {
    for (const a of d.agents) {
      const alreadyRecorded = syncedProjects.some(
        (r) => r.projectId === d.projectId && r.agentType === a.id
      );
      if (!alreadyRecorded) {
        allTargets.push({
          projectId: d.projectId,
          agentType: a.id,
          mode: 'unknown',
          fromRecord: false,
        });
      }
    }
  }

  if (allTargets.length === 0) {
    console.log(chalk.yellow('This skill is not synced to any project'));
    return;
  }

  // Interactive selection
  if (projectIds.length === 0 && process.stdin.isTTY) {
    const selected = await checkbox({
      message: 'Select projects to unsync:',
      choices: allTargets.map((t) => {
        const project = ctx.storage.getProject(t.projectId);
        const displayName = project
          ? `${project.id} (${t.agentType}${t.mode !== 'unknown' ? `, ${t.mode}` : ''})`
          : `${t.projectId} (${t.agentType}${t.mode !== 'unknown' ? `, ${t.mode}` : ''}) [project deleted]`;
        return { name: displayName, value: `${t.projectId}:${t.agentType}` };
      }),
    });
    // Extract projectId from "projectId:agentType"
    projectIds = [...new Set((selected as string[]).map((s) => s.split(':')[0]))];
    // If selection made, use full selection list
    if (selected.length > 0) {
      const targets = selected as string[];
      try {
        await ctx.projectSync.unsync(name, targets);
        console.log(chalk.green('Sync removed'));
      } catch (e: unknown) {
        console.log(chalk.red(e instanceof Error ? e.message : String(e)));
        exitCommand(1);
      }
      return;
    }
  }

  // Non-interactive mode without specified projects: show available projects
  if (projectIds.length === 0) {
    console.log(chalk.dim('This skill is synced to the following projects:'));
    for (const t of allTargets) {
      const project = ctx.storage.getProject(t.projectId);
      const displayName = project
        ? `${project.id} (${t.agentType})`
        : `${t.projectId} (${t.agentType}) [project deleted]`;
      console.log(chalk.dim(`  ${displayName}`));
    }
    console.log(
      chalk.dim(
        '\nUse "af unsync projects <skill> <projectId>:<agentType>" to remove specific sync'
      )
    );
    return;
  }

  // Handle command line arguments: support "projectId" or "projectId:agentType" format
  const targets: string[] = [];
  const plainProjectIds: string[] = [];

  for (const id of projectIds) {
    if (id.includes(':')) {
      // "projectId:agentType" format
      targets.push(id);
      plainProjectIds.push(id.split(':')[0]);
    } else {
      // Plain projectId format
      plainProjectIds.push(id);
    }
  }

  // If there are targets with colon, use unsync directly
  if (targets.length > 0) {
    try {
      await ctx.projectSync.unsync(name, targets);
      console.log(chalk.green('Sync removed'));
      return;
    } catch (e: unknown) {
      console.log(chalk.red(e instanceof Error ? e.message : String(e)));
      exitCommand(1);
    }
  }

  if (plainProjectIds.length === 0) {
    console.log(chalk.yellow('No projects selected'));
    return;
  }

  try {
    for (const projectId of plainProjectIds) {
      await ctx.projectSync.unsyncFromProject(
        name,
        projectId,
        options.agentTypes as AgentId[] | undefined
      );
    }
    console.log(chalk.green('Sync removed'));
  } catch (e: unknown) {
    console.log(chalk.red(e instanceof Error ? e.message : String(e)));
    exitCommand(1);
  }
}
