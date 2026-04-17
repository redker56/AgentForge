/**
 * update command - Update skills
 */

import chalk from 'chalk';
import type { Command } from 'commander';

import type { CommandContext } from './index.js';

export function register(program: Command, ctx: CommandContext): void {
  program
    .command('update [name]')
    .description('Update git-backed skills from source repositories and re-sync')
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

        console.log(chalk.cyan(`Updating ${name}...`));
        const updated = await ctx.skills.update(name);
        if (!updated) {
          console.log(chalk.dim('Local skills do not need updating'));
          return;
        }
        await ctx.sync.resync(name);
        await ctx.projectSync.resync(name);
        console.log(chalk.green(`Updated ${name}`));
      } else {
        const list = ctx.skills.list().filter((s) => s.source.type === 'git');

        if (list.length === 0) {
          console.log(chalk.dim('No skills from Git sources'));
          return;
        }

        for (const s of list) {
          console.log(chalk.cyan(`Updating ${s.name}...`));
          const updated = await ctx.skills.update(s.name);
          if (!updated) {
            console.log(chalk.dim(`Skipped ${s.name}: local skills do not need updating`));
            continue;
          }
          await ctx.sync.resync(s.name);
          await ctx.projectSync.resync(s.name);
          console.log(chalk.green(`Updated ${s.name}`));
        }
      }
    });
}
