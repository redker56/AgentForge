/**
 * add command - Unified add command
 * af add skills <url> [name] - Install skills from a Git repository
 * af add agents [id] - Add a custom Agent configuration
 * af add projects [id] [path] - Add a project
 */

import os from 'os';
import path from 'path';

import { input, confirm, checkbox } from '@inquirer/prompts';
import chalk from 'chalk';
import type { Command } from 'commander';

import { BUILTIN_AGENTS } from '../types.js';

import type { CommandContext } from './index.js';

export function register(program: Command, ctx: CommandContext): void {
  const addCmd = program.command('add').description('Add resources (skills/agents/projects)');

  addCmd.action(() => {
    console.log(chalk.dim('Usage: af add <target> [arguments]'));
    console.log(chalk.dim('Targets: skills, agents, projects'));
    console.log(chalk.dim('Examples:'));
    console.log(chalk.dim('  af add skills https://github.com/user/skills.git'));
    console.log(chalk.dim('  af add agents'));
    console.log(chalk.dim('  af add projects'));
  });

  addCmd
    .command('skills <url> [name]')
    .description('Install skills from a Git repository')
    .action(async (url: string, name?: string) => {
      await addSkill(ctx, url, name);
    });

  addCmd
    .command('agents [id]')
    .description('Add a custom Agent configuration')
    .action(async (id?: string) => {
      await addAgent(ctx, id);
    });

  addCmd
    .command('projects [id] [path]')
    .description('Add a project')
    .action(async (id?: string, projectPath?: string) => {
      await addProject(ctx, id, projectPath);
    });
}

async function addSkill(ctx: CommandContext, url: string, name?: string): Promise<void> {
  try {
    if (name) {
      try {
        console.log(chalk.cyan('Installing...'));
        const skillName = await ctx.skills.install(url, name);
        console.log(chalk.green(`Installed: ${skillName}`));
        await postInstall(ctx, skillName);
      } catch (e: unknown) {
        console.log(chalk.red(e instanceof Error ? e.message : String(e)));
        process.exit(1);
      }
      return;
    }

    console.log(chalk.cyan('Scanning repository...'));
    let repoUrl = url;
    let explicitSubPath = '';

    if (url.includes('/tree/')) {
      const match = url.match(/(https?:\/\/[^/]+\/[^/]+\/[^/]+)\/tree\/[^/]+\/(.+)/);
      if (match) {
        repoUrl = match[1];
        explicitSubPath = match[2];
      }
    }

    if (explicitSubPath) {
      console.log(chalk.cyan('Installing...'));
      const skillName = await ctx.skills.install(repoUrl, undefined, explicitSubPath);
      console.log(chalk.green(`Installed: ${skillName}`));
      await postInstall(ctx, skillName);
      return;
    }

    const tempRepoPath = await ctx.skills.cloneRepoToTemp(repoUrl);

    try {
      const skills = ctx.skills.discoverSkillsInDirectory(tempRepoPath, repoUrl);

      if (skills.length === 0) {
        console.log(
          chalk.yellow('No skills found in repository (directories containing SKILL.md)')
        );
        process.exit(1);
      }

      if (skills.length === 1) {
        console.log(chalk.cyan('Installing...'));
        const sourceDir = skills[0].subPath
          ? path.join(tempRepoPath, skills[0].subPath)
          : tempRepoPath;
        const skillName = await ctx.skills.installFromDirectory(
          repoUrl,
          skills[0].name,
          sourceDir,
          skills[0].subPath
        );
        console.log(chalk.green(`Installed: ${skillName}`));
        await postInstall(ctx, skillName);
        return;
      }

      const selected = await checkbox({
        message: 'Multiple skills found, select to install:',
        choices: skills.map((s) => ({ name: s.name, value: s })),
      });

      if (selected.length === 0) {
        console.log(chalk.yellow('No skills selected'));
        return;
      }

      const results: string[] = [];
      for (const skill of selected) {
        try {
          const sourceDir = skill.subPath ? path.join(tempRepoPath, skill.subPath) : tempRepoPath;
          const installed = await ctx.skills.installFromDirectory(
            repoUrl,
            skill.name,
            sourceDir,
            skill.subPath
          );
          results.push(installed);
        } catch (e: unknown) {
          console.log(
            chalk.red(`  Failed ${skill.name}: ${e instanceof Error ? e.message : String(e)}`)
          );
        }
      }
      console.log(chalk.green(`Installed ${results.length} skills`));

      for (const skillName of results) {
        await postInstall(ctx, skillName, false);
      }
    } finally {
      await ctx.skills.removeTempRepo(tempRepoPath);
    }
  } catch (e: unknown) {
    console.error(chalk.red(e instanceof Error ? e.message : String(e)));
    process.exit(1);
  }
}

async function postInstall(ctx: CommandContext, skillName: string, showHint = true): Promise<void> {
  const syncedAgents = await ctx.syncCheck.resolveAndRecordSyncLinks(skillName);
  if (syncedAgents.length > 0) {
    console.log(chalk.dim('\nFound same-name skill in the following Agents, auto-linked:'));
    for (const agentId of syncedAgents) {
      const agent = ctx.storage.getAgent(agentId);
      console.log(chalk.dim(`  - ${agent?.name || agentId}`));
    }
  }

  if (showHint) {
    console.log(chalk.dim(`\nTip: Run "af sync agents ${skillName}" to sync skill to Agents`));
  }
}

async function addAgent(ctx: CommandContext, idArg?: string): Promise<void> {
  console.log(chalk.cyan('\nAdd Custom Agent Configuration\n'));

  const builtinIds = BUILTIN_AGENTS.map((a) => a.id);

  const agentId = await input({
    message: 'Agent ID (e.g., my-agent):',
    default: idArg,
    validate: (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return 'Agent ID cannot be empty';
      if (!/^[a-zA-Z0-9-_]+$/.test(trimmed))
        return 'ID can only contain letters, numbers, hyphens, and underscores';
      if (builtinIds.includes(trimmed)) return 'Cannot use built-in Agent ID';
      if (ctx.storage.getAgent(trimmed)) return 'Agent ID already exists';
      return true;
    },
  });

  const name = await input({
    message: 'Display name:',
    validate: (value: string) => (value.trim() ? true : 'Name cannot be empty'),
  });

  const basePathInput = await input({
    message: 'Skills storage path (e.g., ~/.myagent/skills):',
    validate: (value: string) => {
      if (!value.trim()) return 'Path cannot be empty';
      return true;
    },
  });

  const skillsDirName = await input({
    message: 'Skills directory name in projects (optional, leave empty to use ID):',
  });

  const basePath = basePathInput.replace(/^~/, os.homedir());

  if (!ctx.fileOps.pathExists(basePath)) {
    const shouldCreate = await confirm({
      message: `Path "${basePath}" does not exist, create it?`,
      default: true,
    });

    if (shouldCreate) {
      await ctx.fileOps.ensureDir(basePath);
    }
  }

  ctx.storage.addAgent(agentId.trim(), name.trim(), basePath, skillsDirName?.trim() || undefined);

  console.log(chalk.green(`\nAgent added: ${agentId} (${name})`));
  console.log(chalk.dim(`  Path: ${basePath}`));
}

async function addProject(ctx: CommandContext, idArg?: string, pathArg?: string): Promise<void> {
  console.log(chalk.cyan('\nAdd Project\n'));

  let finalId = idArg;
  let finalPath = pathArg;

  if (!finalId) {
    finalId = await input({
      message: 'Project ID (alias, e.g., my-project):',
      validate: (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return 'Project ID cannot be empty';
        if (!/^[a-zA-Z0-9-_]+$/.test(trimmed))
          return 'ID can only contain letters, numbers, hyphens, and underscores';
        if (ctx.storage.getProject(trimmed)) return 'Project ID already exists';
        return true;
      },
    });
  }

  if (!finalPath) {
    finalPath = await input({
      message: 'Project path:',
      validate: (value: string) => {
        if (!value.trim()) return 'Path cannot be empty';
        const expanded = value.replace(/^~/, os.homedir());
        if (!ctx.fileOps.pathExists(expanded)) return 'Path does not exist';
        return true;
      },
    });
  }

  const expandedPath = finalPath.replace(/^~/, os.homedir());

  ctx.storage.addProject(finalId.trim(), expandedPath);

  console.log(chalk.green(`\nProject added: ${finalId}`));
  console.log(chalk.dim(`  Path: ${expandedPath}`));
  console.log(
    chalk.dim(`\nTip: Run "af import projects ${finalId}" to import skills from the project`)
  );
}
