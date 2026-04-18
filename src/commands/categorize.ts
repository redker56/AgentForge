/**
 * categorize command
 * af categorize skills <name> [categories...]
 */

import chalk from 'chalk';
import type { Command } from 'commander';

import type { SkillCategoryUpdateMode } from '../app/skill-service.js';

import type { CommandContext } from './index.js';

interface CategorizeOptions {
  add?: boolean;
  remove?: boolean;
  clear?: boolean;
  skills?: string[];
  categories?: string[];
}

function resolveMode(options: CategorizeOptions): SkillCategoryUpdateMode {
  const enabledModes = [options.add, options.remove, options.clear].filter(Boolean).length;
  if (enabledModes > 1) {
    throw new Error('Use only one of --add, --remove, or --clear');
  }

  if (options.add) return 'add';
  if (options.remove) return 'remove';
  if (options.clear) return 'clear';
  return 'set';
}

function validateCategoryArgs(mode: SkillCategoryUpdateMode, categories: string[]): void {
  const hasCategories = categories.some((category) => category.trim().length > 0);

  if (mode === 'clear') {
    if (hasCategories) {
      throw new Error('--clear does not accept category arguments');
    }
    return;
  }

  if (!hasCategories) {
    throw new Error('At least one category is required unless using --clear');
  }
}

function expandListValues(values: string[] | undefined): string[] {
  return (values ?? [])
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function resolveTargetsAndCategories(
  items: string[],
  options: CategorizeOptions
): { names: string[]; categories: string[] } {
  const optionNames = expandListValues(options.skills);
  const optionCategories = expandListValues(options.categories);

  if (optionNames.length > 0) {
    if (optionCategories.length === 0 && !options.clear) {
      throw new Error('Batch categorize requires --categories unless using --clear');
    }

    return {
      names: optionNames,
      categories: optionCategories,
    };
  }

  if (items.length === 0) {
    throw new Error('Provide at least one skill name');
  }

  return {
    names: [items[0]],
    categories: items.slice(1),
  };
}

function categorizeSkills(
  ctx: CommandContext,
  names: string[],
  rawCategories: string[],
  options: CategorizeOptions
): void {
  const mode = resolveMode(options);
  validateCategoryArgs(mode, rawCategories);

  for (const name of names) {
    const updated = ctx.skills.updateCategories(name, rawCategories, mode);
    const label = updated.categories.length > 0 ? updated.categories.join(', ') : '(none)';

    console.log(chalk.green(`Updated categories for ${name}`));
    console.log(chalk.dim(`  Mode: ${mode}`));
    console.log(chalk.dim(`  Categories: ${label}`));
  }
}

export function register(program: Command, ctx: CommandContext): void {
  program
    .command('categorize <target> [items...]')
    .description('Assign or update skill categories')
    .option('--add', 'Add categories to the existing set')
    .option('--remove', 'Remove categories from the existing set')
    .option('--clear', 'Clear all categories from the skill')
    .option('--skills <names...>', 'Apply category changes to multiple skills')
    .option('--categories <names...>', 'Category names for batch updates')
    .action((target: string, items: string[], options: CategorizeOptions) => {
      try {
        if (target !== 'skills') {
          console.error(chalk.red(`Invalid target: ${target}`));
          console.log(chalk.dim('Available targets: skills'));
          console.log(chalk.dim('Example: af categorize skills my-skill docs reading'));
          process.exit(1);
        }

        const { names, categories } = resolveTargetsAndCategories(items, options);
        categorizeSkills(ctx, names, categories, options);
      } catch (error: unknown) {
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }
    });
}
