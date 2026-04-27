/**
 * remove command - Unified remove command
 * af remove skills <name>
 * af remove projects <projectId>
 * af remove agents <agentId>
 */

import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import type { Command } from 'commander';

import { BUILTIN_AGENTS, type Agent, type SkillMeta } from '../types.js';

import { exitCommand } from './errors.js';

import type { CommandContext } from './index.js';

function getProjectTargetId(projectId: string, agentType: string): string {
  return `${projectId}:${agentType}`;
}

function getRecordedProjectTargetIds(
  meta: SkillMeta,
  predicate?: (record: NonNullable<SkillMeta['syncedProjects']>[number]) => boolean
): string[] {
  const records = meta.syncedProjects || [];
  return records
    .filter((record) => (predicate ? predicate(record) : true))
    .map((record) => getProjectTargetId(record.projectId, record.agentType));
}

async function removeManagedSkillSyncs(
  ctx: CommandContext,
  skillName: string,
  meta: SkillMeta
): Promise<{ agentSyncCount: number; projectSyncCount: number }> {
  const agentIds = [...new Set(meta.syncedTo.map((record) => record.agentId))];
  const projectTargetIds = [...new Set(getRecordedProjectTargetIds(meta))];

  if (agentIds.length > 0) {
    await ctx.sync.unsync(skillName, agentIds);
  }

  if (projectTargetIds.length > 0) {
    await ctx.projectSync.unsync(skillName, projectTargetIds);
  }

  return {
    agentSyncCount: agentIds.length,
    projectSyncCount: projectTargetIds.length,
  };
}

function removeProjectSyncReferences(ctx: CommandContext, projectId: string): number {
  let removedCount = 0;

  for (const skill of ctx.storage.listSkills()) {
    const syncedProjects = skill.syncedProjects || [];
    const remaining = syncedProjects.filter((record) => record.projectId !== projectId);

    if (remaining.length !== syncedProjects.length) {
      removedCount += syncedProjects.length - remaining.length;
      ctx.storage.updateSkillProjectSync(skill.name, remaining);
    }
  }

  return removedCount;
}

function removeAgentSyncReferences(
  ctx: CommandContext,
  agentId: string
): { agentSyncCount: number; projectSyncCount: number } {
  let agentSyncCount = 0;
  let projectSyncCount = 0;

  for (const skill of ctx.storage.listSkills()) {
    const remainingAgentSyncs = skill.syncedTo.filter((record) => record.agentId !== agentId);
    if (remainingAgentSyncs.length !== skill.syncedTo.length) {
      agentSyncCount += skill.syncedTo.length - remainingAgentSyncs.length;
      ctx.storage.updateSkillSync(skill.name, remainingAgentSyncs);
    }

    const syncedProjects = skill.syncedProjects || [];
    const remainingProjectSyncs = syncedProjects.filter((record) => record.agentType !== agentId);
    if (remainingProjectSyncs.length !== syncedProjects.length) {
      projectSyncCount += syncedProjects.length - remainingProjectSyncs.length;
      ctx.storage.updateSkillProjectSync(skill.name, remainingProjectSyncs);
    }
  }

  return { agentSyncCount, projectSyncCount };
}

export async function removeSkill(
  ctx: CommandContext,
  skillName: string,
  options: { yes?: boolean }
): Promise<void> {
  if (!ctx.skills.exists(skillName)) {
    console.error(chalk.red(`Skill not found: ${skillName}`));
    exitCommand(1);
  }

  const meta = ctx.storage.getSkill(skillName);
  if (!meta) {
    console.error(chalk.red(`Skill metadata not found: ${skillName}`));
    exitCommand(1);
  }

  const agentSyncCount = meta.syncedTo.length;
  const projectSyncCount = (meta.syncedProjects || []).length;

  // Confirm deletion
  if (!options.yes && process.stdin.isTTY) {
    const confirmed = await confirm({
      message: `Delete skill "${skillName}" from AgentForge? This will remove ${agentSyncCount} user-level sync(s) and ${projectSyncCount} recorded project sync(s).`,
      default: false,
    });
    if (!confirmed) {
      console.log(chalk.yellow('Cancelled'));
      return;
    }
  }

  const removed = await removeManagedSkillSyncs(ctx, skillName, meta);

  if (removed.agentSyncCount > 0 || removed.projectSyncCount > 0) {
    console.log(
      chalk.dim(
        `Removed ${removed.agentSyncCount} user-level sync(s) and ${removed.projectSyncCount} project sync(s)`
      )
    );
  }

  // Delete skill
  await ctx.skills.delete(skillName);
  console.log(chalk.green(`Skill deleted: ${skillName}`));
}

export async function removeProject(
  ctx: CommandContext,
  projectId: string,
  options: { yes?: boolean }
): Promise<void> {
  const project = ctx.storage.getProject(projectId);
  if (!project) {
    console.error(chalk.red(`Project not found: ${projectId}`));
    exitCommand(1);
  }

  // Confirm deletion
  if (!options.yes && process.stdin.isTTY) {
    console.log(chalk.dim(`\nProject: ${projectId}`));
    console.log(chalk.dim(`Path: ${project.path}`));

    const confirmed = await confirm({
      message:
        'Remove this project from AgentForge? Project files stay on disk; AgentForge will just forget the project and its recorded sync references.',
      default: false,
    });

    if (!confirmed) {
      console.log(chalk.yellow('Cancelled'));
      return;
    }
  }

  const removedProjectSyncs = removeProjectSyncReferences(ctx, projectId);
  const success = ctx.storage.removeProject(projectId);
  if (success) {
    console.log(chalk.green(`Project removed: ${projectId}`));
    if (removedProjectSyncs > 0) {
      console.log(chalk.dim(`Removed ${removedProjectSyncs} recorded project sync reference(s)`));
    }
  }
}

export async function removeAgent(
  ctx: CommandContext,
  agentId: string,
  options: { yes?: boolean }
): Promise<void> {
  // Check if it's a built-in Agent
  const builtinIds = BUILTIN_AGENTS.map((a) => a.id);
  if (builtinIds.includes(agentId)) {
    console.error(chalk.red(`Built-in Agent "${agentId}" cannot be removed`));
    console.log(chalk.dim('Only custom Agent configurations can be removed'));
    exitCommand(1);
  }

  const agent = ctx.storage
    .listAllDefinedAgents()
    .find((definedAgent: Agent) => definedAgent.id === agentId);
  if (!agent) {
    console.error(chalk.red(`Agent configuration not found: ${agentId}`));
    console.log(chalk.dim('Run "af list agents" to see active Agents'));
    exitCommand(1);
  }

  const syncedSkills = ctx.storage
    .listSkills()
    .filter((skill) => skill.syncedTo.some((record) => record.agentId === agentId));
  const projectSyncCount = ctx.storage
    .listSkills()
    .flatMap((skill) => skill.syncedProjects || [])
    .filter((record) => record.agentType === agentId).length;

  // Confirm deletion
  if (!options.yes && process.stdin.isTTY) {
    console.log(chalk.dim(`\nAgent: ${agent.name} (${agentId})`));
    console.log(chalk.dim(`Path: ${agent.basePath}`));
    if (syncedSkills.length > 0) {
      console.log(chalk.yellow(`User-level sync references: ${syncedSkills.length}`));
    }
    if (projectSyncCount > 0) {
      console.log(chalk.yellow(`Project sync references: ${projectSyncCount}`));
    }

    const confirmed = await confirm({
      message:
        'Remove this custom Agent configuration? Files stay on disk; AgentForge will just forget sync references tied to this Agent.',
      default: false,
    });

    if (!confirmed) {
      console.log(chalk.yellow('Cancelled'));
      return;
    }
  }

  const removed = removeAgentSyncReferences(ctx, agentId);
  const success = ctx.storage.removeAgent(agentId);
  if (success) {
    console.log(chalk.green(`Agent configuration removed: ${agentId}`));
    if (removed.agentSyncCount > 0 || removed.projectSyncCount > 0) {
      console.log(
        chalk.dim(
          `Removed ${removed.agentSyncCount} user-level sync reference(s) and ${removed.projectSyncCount} project sync reference(s)`
        )
      );
    }
  }
}

export function register(program: Command, ctx: CommandContext): void {
  program
    .command('remove <target> <id>')
    .description('Remove resources (skills/projects/agents)')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (target: string, id: string, options: { yes?: boolean }) => {
      switch (target) {
        case 'skills':
          await removeSkill(ctx, id, options);
          break;
        case 'projects':
          await removeProject(ctx, id, options);
          break;
        case 'agents':
          await removeAgent(ctx, id, options);
          break;
        default:
          console.error(chalk.red(`Invalid target: ${target}`));
          console.log(chalk.dim('Available targets: skills, projects, agents'));
          console.log(chalk.dim('Example: af remove skills myskill'));
      }
    });
}
