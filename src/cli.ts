/**
 * CLI Entry Point
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { Storage } from './infra/storage.js';
import { SkillService } from './app/skill-service.js';
import { AgentSyncService } from './app/sync/agent-sync-service.js';
import { SyncCheckService } from './app/sync-check-service.js';
import { ScanService } from './app/scan-service.js';
import { ProjectSyncService } from './app/sync/project-sync-service.js';
import { registerAll, type CommandContext } from './commands/index.js';

// First run check
const REGISTRY_FILE = path.join(os.homedir(), '.agentforge', 'registry.json');

function isFirstRun(): boolean {
  return !fs.existsSync(REGISTRY_FILE);
}

function showWelcome(): void {
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
  console.log(chalk.dim('   More help: ') + chalk.cyan(' af --help') + chalk.dim(' or ') + chalk.cyan(' af <command> --help'));
  console.log();
}

// Initialize services
const storage = Storage.getInstance();
const skills = new SkillService(storage);
const sync = new AgentSyncService(storage);
const syncCheck = new SyncCheckService(storage, sync);
const scan = new ScanService(storage);
const projectSync = new ProjectSyncService(storage);

// Command context
const ctx: CommandContext = { skills, sync, syncCheck, storage, scan, projectSync };

// Create CLI
const program = new Command();

program
  .name('af')
  .description('Manage and sync skills across AI agents and project workspaces')
  .version('0.1.0')
  .addHelpText(
    'after',
    '\nNext steps:\n' +
      '  af completion --install     Enable shell completion\n' +
      '  af add skills <repo-url>    Install your first skill\n' +
      '  af add agents               Add a custom agent\n',
  );

// Register all commands
registerAll(program, ctx);

// Show welcome message on first run
const args = process.argv.slice(2);
const hasCommand = args.length > 0 && !args[0].startsWith('-');
if (!hasCommand && isFirstRun()) {
  showWelcome();
  // Exit after showing welcome message
  process.exit(0);
}

program.parse();
