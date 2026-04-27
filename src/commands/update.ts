/**
 * update command - Update skills
 */

import chalk from 'chalk';
import type { Command } from 'commander';

import { exitCommand } from './errors.js';

import type { CommandContext } from './index.js';

interface UpdateFailure {
  skillName: string;
  message: string;
}

type UpdateOutcome = 'updated' | 'skipped';

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function updateAndResync(ctx: CommandContext, skillName: string): Promise<UpdateOutcome> {
  const updated = await ctx.skills.update(skillName);
  if (!updated) {
    return 'skipped';
  }

  await ctx.sync.resync(skillName);
  await ctx.projectSync.resync(skillName);
  return 'updated';
}

function printFailureSummary(failures: UpdateFailure[]): void {
  if (failures.length === 0) {
    return;
  }

  console.error(chalk.red(`\n${failures.length} skill update(s) failed:`));
  for (const failure of failures) {
    console.error(chalk.red(`  ${failure.skillName}: ${failure.message}`));
  }
  console.error(chalk.dim('\nRetry a failed item with: af update <skill-name>'));
}

export function register(program: Command, ctx: CommandContext): void {
  program
    .command('update [name]')
    .description('Update git-backed skills from source repositories and re-sync')
    .action(async (name?: string) => {
      if (name) {
        const meta = ctx.skills.get(name);
        if (!meta) {
          console.error(chalk.red(`Skill not found: ${name}`));
          exitCommand(1);
        }
        if (meta.source.type !== 'git') {
          console.log(chalk.dim('Local skills do not need updating'));
          return;
        }

        console.log(chalk.cyan(`Updating ${name}...`));
        try {
          const outcome = await updateAndResync(ctx, name);
          if (outcome === 'skipped') {
            console.log(chalk.dim('Local skills do not need updating'));
            return;
          }
        } catch (error: unknown) {
          console.error(chalk.red(`Update failed for ${name}: ${formatError(error)}`));
          console.error(chalk.dim(`Retry with: af update ${name}`));
          exitCommand(1);
        }

        console.log(chalk.green(`Updated ${name}`));
      } else {
        const list = ctx.skills.list().filter((s) => s.source.type === 'git');

        if (list.length === 0) {
          console.log(chalk.dim('No skills from Git sources'));
          return;
        }

        const failures: UpdateFailure[] = [];

        for (const s of list) {
          console.log(chalk.cyan(`Updating ${s.name}...`));
          try {
            const outcome = await updateAndResync(ctx, s.name);
            if (outcome === 'skipped') {
              console.log(chalk.dim(`Skipped ${s.name}: local skills do not need updating`));
              continue;
            }
            console.log(chalk.green(`Updated ${s.name}`));
          } catch (error: unknown) {
            const message = formatError(error);
            failures.push({ skillName: s.name, message });
            console.error(chalk.red(`Failed ${s.name}: ${message}`));
          }
        }

        if (failures.length > 0) {
          printFailureSummary(failures);
          exitCommand(1);
        }
      }
    });
}
