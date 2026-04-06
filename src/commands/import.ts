/**
 * import command - Unified import command
 * af import projects [projectId] [skillName]
 * af import agents [agentId] [skillName]
 */

import path from 'path';

import { checkbox, select } from '@inquirer/prompts';
import chalk from 'chalk';
import type { Command } from 'commander';

import type { CommandContext } from './index.js';

interface ImportResult {
  name: string;
  success: boolean;
  error?: string;
  syncedAgents?: string[];
}

interface InteractiveSkillChoice {
  name: string;
  value: string;
  disabled?: string;
}

export function register(program: Command, ctx: CommandContext): void {
  program
    .command('import <source> [id] [name]')
    .description('Import skills from source (projects | agents)')
    .action(async (source: string, id?: string, name?: string) => {
      if (!process.stdin.isTTY && !id) {
        console.error(chalk.red('ID must be specified in non-interactive mode'));
        console.log(chalk.dim('Example: af import projects myproject myskill'));
        process.exit(1);
      }

      switch (source) {
        case 'projects':
          await importFromProject(ctx, id, name);
          break;
        case 'agents':
          await importFromAgent(ctx, id, name);
          break;
        default:
          console.error(chalk.red(`Invalid source: ${source}`));
          console.log(chalk.dim('Available sources: projects, agents'));
          console.log(chalk.dim('Example: af import projects myproject myskill'));
      }
    });
}

async function finalizeImport(
  ctx: CommandContext,
  result: ImportResult,
  seedAgentIds: string[] = []
): Promise<void> {
  if (!result.success) return;

  try {
    result.syncedAgents = await ctx.syncCheck.resolveAndRecordSyncLinks(result.name, seedAgentIds);
  } catch (err) {
    result.success = false;
    result.error = (err as Error).message;
  }
}

function printImportResults(results: ImportResult[]): void {
  for (const result of results) {
    if (result.success) {
      console.log(chalk.green(`  [OK] ${result.name}`));
      if (result.syncedAgents && result.syncedAgents.length > 0) {
        console.log(chalk.dim(`    Linked: ${result.syncedAgents.join(', ')}`));
      }
    } else {
      console.log(chalk.red(`  [FAIL] ${result.name}: ${result.error}`));
    }
  }
}

function buildInteractiveSkillChoices(
  skills: Array<{ name: string; labelSuffix?: string; alreadyExists: boolean }>
): InteractiveSkillChoice[] {
  return skills.map((skill) => ({
    name: `${skill.name}${skill.labelSuffix ? ` ${skill.labelSuffix}` : ''}`,
    value: skill.name,
    disabled: skill.alreadyExists ? 'already in AgentForge' : undefined,
  }));
}

async function importFromProject(
  ctx: CommandContext,
  projectId?: string,
  skillName?: string
): Promise<void> {
  const projects = ctx.storage.listProjects();

  if (projects.length === 0) {
    console.log(chalk.yellow('No registered projects'));
    console.log(chalk.dim('Run "af add projects" to add a project'));
    return;
  }

  if (!projectId && process.stdin.isTTY) {
    projectId = await select({
      message: 'Select project:',
      choices: projects.map((p) => ({
        name: `${p.id} (${p.path})`,
        value: p.id,
      })),
    });
  }

  const project = projectId ? ctx.storage.getProject(projectId) : undefined;
  if (!project) {
    console.error(chalk.red(`Project not found: ${projectId ?? 'undefined'}`));
    console.log(chalk.dim('Run "af list projects" to see registered projects'));
    process.exit(1);
    return;
  }

  const skills = ctx.scan.scanProject(project.path);
  if (skills.length === 0) {
    console.log(chalk.yellow(`No skills found in project ${projectId}`));
    console.log(chalk.dim('Ensure the project contains a supported Agent skill directory'));
    return;
  }

  let toImport: string[];

  if (skillName) {
    if (!skills.find((s) => s.name === skillName)) {
      console.error(chalk.red(`Skill not found: ${skillName}`));
      console.log(chalk.dim('Available skills:'));
      for (const skill of skills) {
        console.log(chalk.dim(`  - ${skill.name}`));
      }
      process.exit(1);
    }
    toImport = [skillName];
  } else if (process.stdin.isTTY) {
    const choices = buildInteractiveSkillChoices(
      skills.map((skill) => ({
        name: skill.name,
        alreadyExists: ctx.skills.exists(skill.name),
      }))
    );

    if (choices.every((choice) => choice.disabled)) {
      console.log(chalk.yellow(`All skills from project ${projectId} are already in AgentForge`));
      return;
    }

    toImport = await checkbox({
      message: 'Select skills to import:',
      choices,
    });
  } else {
    console.error(chalk.red('Skill name must be specified in non-interactive mode'));
    process.exit(1);
  }

  if (toImport.length === 0) {
    console.log(chalk.yellow('No skills selected'));
    return;
  }

  console.log(chalk.cyan('Importing...'));
  const results: ImportResult[] = [];

  for (const name of toImport) {
    const skillInfo = skills.find((s) => s.name === name);
    if (!skillInfo) continue;
    const srcPath = skillInfo.path;

    try {
      if (ctx.skills.exists(name)) {
        results.push({ name, success: false, error: 'already exists' });
        continue;
      }

      const effectiveProjectId = projectId ?? '';
      await ctx.skills.importFromPath(srcPath, name, {
        type: 'project',
        projectId: effectiveProjectId,
      });
      results.push({ name, success: true });
    } catch (err) {
      results.push({ name, success: false, error: (err as Error).message });
    }
  }

  console.log(chalk.dim(''));

  for (const result of results) {
    await finalizeImport(ctx, result);
  }

  printImportResults(results);

  const successCount = results.filter((result) => result.success).length;
  console.log(chalk.dim(`\nSuccessfully imported ${successCount}/${results.length} skills`));
}

async function importFromAgent(
  ctx: CommandContext,
  agentId?: string,
  skillName?: string
): Promise<void> {
  const agents = ctx.storage.listAgents();

  if (agents.length === 0) {
    console.log(chalk.yellow('No Agents available'));
    return;
  }

  if (!agentId && process.stdin.isTTY) {
    agentId = await select({
      message: 'Select Agent:',
      choices: agents.map((agent) => ({
        name: `${agent.name} (${agent.id})`,
        value: agent.id,
      })),
    });
  }

  const agent = agentId ? ctx.storage.getAgent(agentId) : undefined;
  if (!agent) {
    console.error(chalk.red(`Agent not found: ${agentId ?? 'undefined'}`));
    console.log(chalk.dim('Run "af list agents" to see available Agents'));
    process.exit(1);
    return;
  }

  const skillDirs = ctx.fileOps.listSubdirectories(agent.basePath);

  if (skillDirs.length === 0) {
    console.log(chalk.yellow(`${agent.name} (${agent.id}) has no skills installed`));
    return;
  }

  let toImport: string[];

  if (skillName) {
    if (!skillDirs.includes(skillName)) {
      console.error(chalk.red(`Skill not found: ${skillName}`));
      console.log(chalk.dim('Available skills:'));
      for (const skill of skillDirs) {
        console.log(chalk.dim(`  - ${skill}`));
      }
      process.exit(1);
    }
    toImport = [skillName];
  } else if (process.stdin.isTTY) {
    const choices = buildInteractiveSkillChoices(
      skillDirs.map((skill) => {
        const skillPath = path.join(agent.basePath, skill);
        const hasSkillMd =
          ctx.fileOps.fileExists(path.join(skillPath, 'SKILL.md')) ||
          ctx.fileOps.fileExists(path.join(skillPath, 'skill.md'));

        return {
          name: skill,
          labelSuffix: hasSkillMd ? undefined : '(no SKILL.md)',
          alreadyExists: ctx.skills.exists(skill),
        };
      })
    );

    if (choices.every((choice) => choice.disabled)) {
      console.log(chalk.yellow(`${agent.name} (${agent.id}) has no new skills to import`));
      return;
    }

    toImport = await checkbox({
      message: 'Select skills to import:',
      choices,
    });
  } else {
    console.error(chalk.red('Skill name must be specified in non-interactive mode'));
    process.exit(1);
  }

  if (toImport.length === 0) {
    console.log(chalk.yellow('No skills selected'));
    return;
  }

  console.log(chalk.dim(`\nImporting to: ${ctx.storage.getSkillsDir()}\n`));

  const results: ImportResult[] = [];

  for (const skill of toImport) {
    const srcPath = path.join(agent.basePath, skill);

    try {
      if (ctx.skills.exists(skill)) {
        results.push({ name: skill, success: false, error: 'already exists' });
        continue;
      }

      await ctx.skills.importFromPath(srcPath, skill, {
        type: 'local',
        importedFrom: { agent: agent.id, path: srcPath },
      });

      const result: ImportResult = { name: skill, success: true };
      await finalizeImport(ctx, result, [agent.id]);
      results.push(result);
    } catch (err) {
      results.push({ name: skill, success: false, error: (err as Error).message });
    }
  }

  printImportResults(results);

  const successCount = results.filter((result) => result.success).length;
  console.log(chalk.dim(`\nSuccessfully imported ${successCount}/${results.length} skills`));
}
