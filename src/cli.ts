/**
 * @module CLI Entry
 * @layer root
 * @responsibility Entry point — assembles all services, builds the CommandContext, and launches the CLI.
 *
 * This is the only file in the entire codebase that has the authority to import from
 * every layer (infra, app, commands, tui). All other files must follow the strict
 * dependency direction: commands -> app -> infra.
 *
 * @architecture Service assembly hub: instantiates Storage singleton, creates service
 * instances, wires the CommandContext, and delegates command registration.
 */

import os from 'os';
import path from 'path';

import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs-extra';

import { FileOperationsService } from './app/file-operations.js';
import { ProjectStorage } from './app/project-storage.js';
import { ScanService } from './app/scan-service.js';
import { SkillService } from './app/skill-service.js';
import { AgentSyncService } from './app/sync/agent-sync-service.js';
import { ProjectSyncService } from './app/sync/project-sync-service.js';
import { SyncCheckService } from './app/sync-check-service.js';
import { registerAll, type CommandContext } from './commands/index.js';
import { Storage } from './infra/storage.js';

// First run check
const REGISTRY_FILE = path.join(os.homedir(), '.agentforge', 'registry.json');

export function isFirstRun(): boolean {
  return !fs.existsSync(REGISTRY_FILE);
}

export function showWelcome(): void {
  console.log();
  console.log(chalk.cyan.bold('=============================================================='));
  console.log(chalk.cyan.bold('  Welcome to AgentForge! Skills for AI agents           '));
  console.log(chalk.cyan.bold('=============================================================='));
  console.log();
  console.log(chalk.dim('   Quick Start:'));
  console.log();
  console.log(chalk.green('   1. Install skills from a Git repository'));
  console.log(chalk.dim('      af add skills https://github.com/user/skills.git'));
  console.log();
  console.log(chalk.green('   2. Add a custom Agent'));
  console.log(chalk.dim('      af add agents'));
  console.log();
  console.log(chalk.green('   3. Add a project'));
  console.log(chalk.dim('      af add projects'));
  console.log();
  console.log(chalk.green('   4. View available Agents'));
  console.log(chalk.dim('      af list agents'));
  console.log();
  console.log(chalk.green('   5. Enable shell completion (recommended)'));
  console.log(chalk.dim('      af completion --install'));
  console.log();
  console.log(
    chalk.dim('   More help: ') +
      chalk.cyan(' af --help') +
      chalk.dim(' or ') +
      chalk.cyan(' af <command> --help')
  );
  console.log();
}

export function launchCLI(): void {
  // Initialize services
  const storage = new Storage();
  const projectStorage = new ProjectStorage();
  const skills = new SkillService(storage);
  const sync = new AgentSyncService(storage);
  const syncCheck = new SyncCheckService(storage, sync);
  const scan = new ScanService(storage);
  const projectSync = new ProjectSyncService(storage, projectStorage);
  const fileOps = new FileOperationsService();

  // Command context
  const ctx: CommandContext = { skills, sync, syncCheck, storage, scan, projectSync, fileOps };

  // Create CLI
  const program = new Command();

  program
    .name('af')
    .description('Manage and sync skills across AI agents and project workspaces')
    .version('0.2.0')
    .addHelpText(
      'after',
      '\nNext steps:\n' +
        '  af completion --install     Enable shell completion\n' +
        '  af add skills <repo-url>    Install your first skill\n' +
        '  af add agents               Add a custom agent\n'
    );

  // Register all commands
  registerAll(program, ctx);

  // Inline startup detection: args.length === 0 means no CLI command was specified
  const args = process.argv.slice(2);
  if (args.length === 0 && isFirstRun()) {
    showWelcome();
    process.exit(0);
  }

  program.parse();
}
