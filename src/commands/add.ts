/**
 * add command - Unified add command
 * af add skills <url> [name] - Install skills from a Git repository
 * af add agents [id] - Add a custom Agent configuration
 * af add projects [id] [path] - Add a project
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import type { Command } from 'commander';
import type { CommandContext } from './index.js';
import { BUILTIN_AGENTS } from '../types.js';

export function register(program: Command, ctx: CommandContext): void {
  const addCmd = program
    .command('add')
    .description('Add resources (skills/agents/projects)');

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
      const spinner = ora('Installing...').start();
      try {
        const skillName = await ctx.skills.install(url, name);
        spinner.succeed(`Installed: ${skillName}`);
        await postInstall(ctx, skillName);
      } catch (e: any) {
        spinner.fail(e.message);
        process.exit(1);
      }
      return;
    }

    const spinner = ora('Scanning repository...').start();
    let repoUrl = url;
    let explicitSubPath = '';

    if (url.includes('/tree/')) {
      const match = url.match(/(https?:\/\/[^\/]+\/[^\/]+\/[^\/]+)\/tree\/[^\/]+\/(.+)/);
      if (match) {
        repoUrl = match[1];
        explicitSubPath = match[2];
      }
    }

    if (explicitSubPath) {
      spinner.text = 'Installing...';
      const skillName = await ctx.skills.install(url, explicitSubPath);
      spinner.succeed(`Installed: ${skillName}`);
      await postInstall(ctx, skillName);
      return;
    }

    const tempRepoPath = await ctx.skills.cloneRepoToTemp(repoUrl);

    try {
      const skills = ctx.skills.discoverSkillsInDirectory(tempRepoPath, repoUrl);
      spinner.stop();

      if (skills.length === 0) {
        console.log(chalk.yellow('No skills found in repository (directories containing SKILL.md)'));
        process.exit(1);
      }

      if (skills.length === 1) {
        const spinner2 = ora('Installing...').start();
        const sourceDir = skills[0].subPath ? path.join(tempRepoPath, skills[0].subPath) : tempRepoPath;
        const skillName = await ctx.skills.installFromDirectory(repoUrl, skills[0].name, sourceDir);
        spinner2.succeed(`Installed: ${skillName}`);
        await postInstall(ctx, skillName);
        return;
      }

      const { selected } = await inquirer.prompt([{
        type: 'checkbox',
        name: 'selected',
        message: 'Multiple skills found, select to install:',
        choices: skills.map(s => ({ name: s.name, value: s })),
        pageSize: 15,
      }]);

      if (selected.length === 0) {
        console.log(chalk.yellow('No skills selected'));
        return;
      }

      const spinner2 = ora('Installing...').start();
      const results: string[] = [];
      for (const skill of selected) {
        try {
          const sourceDir = skill.subPath ? path.join(tempRepoPath, skill.subPath) : tempRepoPath;
          const installed = await ctx.skills.installFromDirectory(repoUrl, skill.name, sourceDir);
          results.push(installed);
        } catch (e: any) {
          console.log(chalk.red(`  Failed ${skill.name}: ${e.message}`));
        }
      }
      spinner2.succeed(`Installed ${results.length} skills`);

      for (const skillName of results) {
        await postInstall(ctx, skillName, false);
      }
    } finally {
      await ctx.skills.removeTempRepo(tempRepoPath);
    }
  } catch (e: any) {
    console.error(chalk.red(e.message));
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

  const builtinIds = BUILTIN_AGENTS.map(a => a.id);

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'id',
      message: 'Agent ID (e.g., my-agent):',
      default: idArg,
      validate: (input: string) => {
        const trimmed = input.trim();
        if (!trimmed) return 'Agent ID cannot be empty';
        if (!/^[a-zA-Z0-9-_]+$/.test(trimmed)) return 'ID can only contain letters, numbers, hyphens, and underscores';
        if (builtinIds.includes(trimmed)) return 'Cannot use built-in Agent ID';
        if (ctx.storage.getAgent(trimmed)) return 'Agent ID already exists';
        return true;
      },
    },
    {
      type: 'input',
      name: 'name',
      message: 'Display name:',
      validate: (input: string) => input.trim() ? true : 'Name cannot be empty',
    },
    {
      type: 'input',
      name: 'basePath',
      message: 'Skills storage path (e.g., ~/.myagent/skills):',
      validate: (input: string) => {
        if (!input.trim()) return 'Path cannot be empty';
        return true;
      },
    },
    {
      type: 'input',
      name: 'skillsDirName',
      message: 'Skills directory name in projects (optional, leave empty to use ID):',
    },
  ]);

  const basePath = answers.basePath.replace(/^~/, os.homedir());

  if (!fs.existsSync(basePath)) {
    const { create } = await inquirer.prompt([{
      type: 'confirm',
      name: 'create',
      message: `Path "${basePath}" does not exist, create it?`,
      default: true,
    }]);

    if (create) {
      await fs.ensureDir(basePath);
    }
  }

  ctx.storage.addAgent(
    answers.id.trim(),
    answers.name.trim(),
    basePath,
    answers.skillsDirName?.trim() || undefined
  );

  console.log(chalk.green(`\nAgent added: ${answers.id} (${answers.name})`));
  console.log(chalk.dim(`  Path: ${basePath}`));
}

async function addProject(ctx: CommandContext, idArg?: string, pathArg?: string): Promise<void> {
  console.log(chalk.cyan('\nAdd Project\n'));

  const questions: any[] = [];

  if (!idArg) {
    questions.push({
      type: 'input',
      name: 'id',
      message: 'Project ID (alias, e.g., my-project):',
      validate: (input: string) => {
        const trimmed = input.trim();
        if (!trimmed) return 'Project ID cannot be empty';
        if (!/^[a-zA-Z0-9-_]+$/.test(trimmed)) return 'ID can only contain letters, numbers, hyphens, and underscores';
        if (ctx.storage.getProject(trimmed)) return 'Project ID already exists';
        return true;
      },
    });
  }

  if (!pathArg) {
    questions.push({
      type: 'input',
      name: 'path',
      message: 'Project path:',
      validate: (input: string) => {
        if (!input.trim()) return 'Path cannot be empty';
        const expanded = input.replace(/^~/, os.homedir());
        if (!fs.existsSync(expanded)) return 'Path does not exist';
        return true;
      },
    });
  }

  let answers: { id?: string; path?: string } = {};
  if (questions.length > 0) {
    answers = await inquirer.prompt(questions);
  }

  const finalId = idArg || answers.id!;
  const finalPath = (pathArg || answers.path!).replace(/^~/, os.homedir());

  ctx.storage.addProject(finalId.trim(), finalPath);

  console.log(chalk.green(`\nProject added: ${finalId}`));
  console.log(chalk.dim(`  Path: ${finalPath}`));
  console.log(chalk.dim(`\nTip: Run "af import projects ${finalId}" to import skills from the project`));
}
