/**
 * sync command - Sync skills
 * af sync agents <skill> [agents...]
 * af sync projects <skill> [projects...]
 */

import chalk from 'chalk';
import { checkbox, select } from '@inquirer/prompts';
import type { Command } from 'commander';
import type { CommandContext } from './index.js';
import type { SyncMode, AgentId } from '../types.js';

/**
 * Filter Agents that have existing directories
 */
function filterExistingAgents(
  agents: Array<{ id: string; name: string; basePath: string }>,
  fileOps: CommandContext['fileOps']
): Array<{ id: string; name: string; basePath: string }> {
  return agents.filter(agent => fileOps.pathExists(agent.basePath));
}

function validateExistingAgentTypes(ctx: CommandContext, agentTypes: AgentId[]): void {
  const existingAgentIds = new Set(ctx.storage.listAgents().map(agent => agent.id));
  const invalidAgentTypes = agentTypes.filter(agentType => !existingAgentIds.has(agentType));

  if (invalidAgentTypes.length > 0) {
    console.error(chalk.red(`Agent not available: ${invalidAgentTypes.join(', ')}`));
    console.log(chalk.dim('Agent availability is determined by the user-level skills directory.'));
    console.log(chalk.dim('Run "af list agents" to see available Agents.'));
    process.exit(1);
  }
}

export function register(program: Command, ctx: CommandContext): void {
  program
    .command('sync <target> [name] [targets...]')
    .description('Sync skills (agents | projects)')
    .option('-m, --mode <mode>', 'Sync mode (copy or symlink)')
    .option('-a, --agent-types <types...>', 'Agent types for project sync')
    .action(async (target: string, name: string | undefined, targets: string[], options: { mode?: string; agentTypes?: string[] }) => {
      const skillName = name || '';
      if (target === 'agents') {
        await syncToAgents(ctx, skillName, targets, options);
      } else if (target === 'projects') {
        await syncToProjects(ctx, skillName, targets, options);
      } else {
        console.error(chalk.red(`Invalid target: ${target}`));
        console.log(chalk.dim('Supported: agents, projects'));
        process.exit(1);
      }
    });
}

async function syncToAgents(ctx: CommandContext, name: string, agentIds: string[], options: { mode?: string }): Promise<void> {
  // Interactive skill selection
  let skillNames: string[] = [];
  if (!name) {
    if (!process.stdin.isTTY) {
      console.error(chalk.red('Please specify skill name: af sync agents <skill-name>'));
      process.exit(1);
    }
    const skills = ctx.skills.list();
    if (skills.length === 0) {
      console.log(chalk.yellow('No skills available'));
      return;
    }
    skillNames = await checkbox({
      message: 'Select skills to sync:',
      choices: skills.map(s => ({ name: s.name, value: s.name })),
    });
  } else {
    skillNames = [name];
  }

  if (skillNames.length === 0) {
    console.log(chalk.yellow('No skills selected'));
    return;
  }

  // Verify skills exist
  for (const skillName of skillNames) {
    if (!ctx.skills.exists(skillName)) {
      console.error(chalk.red(`Skill not found: ${skillName}`));
      process.exit(1);
    }
  }

  // Interactive Agent selection
  if (agentIds.length === 0 && process.stdin.isTTY) {
    const agents = ctx.storage.listAgents();
    const selected = await checkbox({
      message: 'Select Agents to sync to:',
      choices: agents.map((a: { id: string; name: string }) => ({
        name: `${a.name} (${a.id})`,
        value: a.id,
      })),
    });
    agentIds = selected;
  }

  if (agentIds.length === 0) {
    console.log(chalk.yellow('No Agents selected'));
    return;
  }

  // Determine sync mode
  let mode: SyncMode = 'copy';
  if (options.mode) {
    if (options.mode !== 'copy' && options.mode !== 'symlink') {
      console.error(chalk.red(`Invalid sync mode: ${options.mode}, use copy or symlink`));
      process.exit(1);
    }
    mode = options.mode;
  } else if (process.stdin.isTTY) {
    mode = await select({
      message: 'Select sync mode:',
      choices: [
        { name: 'Copy - Independent copy, stable and reliable', value: 'copy' },
        { name: 'Symlink - Link to source, updates automatically', value: 'symlink' },
      ],
    }) as SyncMode;
  }

  const agents = ctx.storage.listAgents().filter(a => agentIds.includes(a.id));

  for (const skillName of skillNames) {
    console.log(chalk.bold(`\nSyncing ${skillName}:`));
    console.log(chalk.dim(`Mode: ${mode}`));

    try {
      const results = await ctx.sync.sync(skillName, agents, mode);

      for (const r of results) {
        if (r.success) {
          const modeIcon = r.mode === 'symlink' ? '\uD83D\uDD17' : '\uD83D\uDCE6';
          const modeText = r.mode === 'symlink' ? '(symlink)' : '(copy)';
          console.log(chalk.green(`  \u2713 ${r.target}: ${r.path} ${modeIcon} ${modeText}`));
        } else {
          console.log(chalk.red(`  \u2717 ${r.target}: Failed - ${r.error}`));
        }
      }
    } catch (e: unknown) {
      console.log(chalk.red(`Sync failed: ${e instanceof Error ? e.message : String(e)}`));
      process.exit(1);
    }
  }
}

async function syncToProjects(ctx: CommandContext, name: string, projectIds: string[], options: { mode?: string; agentTypes?: string[] }): Promise<void> {
  // Interactive skill selection
  let skillNames: string[] = [];
  if (!name) {
    if (!process.stdin.isTTY) {
      console.error(chalk.red('Please specify skill name: af sync projects <skill-name>'));
      process.exit(1);
    }
    const skills = ctx.skills.list();
    if (skills.length === 0) {
      console.log(chalk.yellow('No skills available'));
      return;
    }
    skillNames = await checkbox({
      message: 'Select skills to sync:',
      choices: skills.map(s => ({ name: s.name, value: s.name })),
    });
  } else {
    skillNames = [name];
  }

  if (skillNames.length === 0) {
    console.log(chalk.yellow('No skills selected'));
    return;
  }

  // Verify skills exist
  for (const skillName of skillNames) {
    if (!ctx.skills.exists(skillName)) {
      console.error(chalk.red(`Skill not found: ${skillName}`));
      process.exit(1);
    }
  }

  const projects = ctx.storage.listProjects();

  // Interactive project selection
  if (projectIds.length === 0 && process.stdin.isTTY) {
    const selected = await checkbox({
      message: 'Select projects to sync to:',
      choices: projects.map(p => ({
        name: `${p.id} (${p.path})`,
        value: p.id,
      })),
    });
    projectIds = selected;
  }

  if (projectIds.length === 0) {
    console.log(chalk.yellow('No projects selected'));
    return;
  }

  // Determine sync mode
  let mode: SyncMode = 'copy';
  if (options.mode) {
    if (options.mode !== 'copy' && options.mode !== 'symlink') {
      console.error(chalk.red(`Invalid sync mode: ${options.mode}, use copy or symlink`));
      process.exit(1);
    }
    mode = options.mode as SyncMode;
  } else if (process.stdin.isTTY) {
    mode = await select({
      message: 'Select sync mode:',
      choices: [
        { name: 'Copy - Independent copy, stable and reliable', value: 'copy' },
        { name: 'Symlink - Link to source, updates automatically', value: 'symlink' },
      ],
    }) as SyncMode;
  }

  // Agent types
  let agentTypes: AgentId[] | undefined;
  if (options.agentTypes && options.agentTypes.length > 0) {
    agentTypes = options.agentTypes as AgentId[];
    validateExistingAgentTypes(ctx, agentTypes);
  } else if (process.stdin.isTTY) {
    const allAgents = filterExistingAgents(ctx.storage.listAgents(), ctx.fileOps);
    if (allAgents.length === 0) {
      console.log(chalk.yellow('No Agents available (directories do not exist)'));
      return;
    }
    const selectedTypes = await checkbox({
      message: 'Select Agent types to sync (leave empty to auto-detect existing project structure):',
      choices: allAgents.map(a => ({
        name: `${a.name} (${a.id})`,
        value: a.id,
      })),
    });
    agentTypes = selectedTypes.length > 0 ? selectedTypes : undefined;
  }

  for (const skillName of skillNames) {
    console.log(chalk.bold(`\nSyncing ${skillName}:`));

    const results: Array<{ projectId: string; results: unknown[] }> = [];

    for (const projectId of projectIds) {
      try {
        const projectResults = await ctx.projectSync.syncToProject(skillName, projectId, agentTypes, mode);
        results.push({ projectId, results: projectResults });
      } catch (e: unknown) {
        console.log(chalk.red(`  Failed for project ${projectId}: ${e instanceof Error ? e.message : String(e)}`));
        process.exit(1);
      }
    }

    for (const { projectId, results: projectResults } of results) {
      console.log(chalk.bold(`  Project ${projectId}:`));
      for (const r of projectResults as Array<{ success: boolean; target: string; path: string; mode: string; error?: string }>) {
        if (r.success) {
          const icon = r.mode === 'symlink' ? '\uD83D\uDD17' : '\uD83D\uDCE6';
          const agentType = r.target.split(':')[1];
          console.log(chalk.green(`    \u2713 ${agentType}: ${r.path} ${icon}`));
        } else {
          console.log(chalk.red(`    \u2717 ${r.target}: Failed - ${r.error}`));
        }
      }
    }
  }
}
