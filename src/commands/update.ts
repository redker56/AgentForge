/**
 * update command - Update skills
 */

import chalk from 'chalk';
import ora from 'ora';
import type { Command } from 'commander';
import type { CommandContext } from './index.js';

export function register(program: Command, ctx: CommandContext): void {
  program
    .command('update [name]')
    .description('Update skills (pull from Git and re-sync)')
    .action(async (name?: string) => {
      if (name) {
        const meta = ctx.skills.get(name);
        if (!meta) {
          console.error(chalk.red(`Skill not found: ${name}`));
          process.exit(1);
        }
        if (meta.source.type !== 'git') {
          console.log(chalk.dim('Local skills do not need updating'));
          return;
        }

        const spinner = ora(`Updating ${name}...`).start();
        await ctx.skills.update(name);
        await ctx.sync.resync(name);
        spinner.succeed('Update complete');
      } else {
        const list = ctx.skills.list().filter(s => s.source.type === 'git');

        if (list.length === 0) {
          console.log(chalk.dim('No skills from Git sources'));
          return;
        }

        for (const s of list) {
          const spinner = ora(`Updating ${s.name}...`).start();
          await ctx.skills.update(s.name);
          await ctx.sync.resync(s.name);
          spinner.succeed(`Updated ${s.name}`);
        }
      }
    });
}
