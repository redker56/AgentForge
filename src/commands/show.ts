/**
 * show command - Unified show details command
 * af show agents <id> | projects <id> | skills <name>
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import type { Command } from 'commander';
import type { CommandContext } from './index.js';
import { formatProjectSkillList } from '../app/formatters/project-formatter.js';
import { formatSourceLabel } from '../app/formatters/skill-formatter.js';

async function showAgent(ctx: CommandContext, agentId: string): Promise<void> {
  const agent = ctx.storage.getAgent(agentId);
  if (!agent) {
    console.error(chalk.red(`Agent not found: ${agentId}`));
    console.log(chalk.dim('Run "af list agents" to see available Agents'));
    process.exit(1);
  }

  console.log(chalk.bold(`\n${agent.name} (${agent.id})\n`));
  console.log(chalk.dim(`Path: ${agent.basePath}`));

  // List user-level skills (in Agent directory)
  let skillDirs: string[] = [];
  try {
    skillDirs = fs.readdirSync(agent.basePath).filter(f => {
      try {
        const p = path.join(agent.basePath, f);
        return fs.statSync(p).isDirectory() && !f.startsWith('.');
      } catch {
        return false;
      }
    });
  } catch {
    skillDirs = [];
  }

  console.log(chalk.dim(`\nUser-level skills (${skillDirs.length}):\n`));
  if (skillDirs.length === 0) {
    console.log(chalk.dim('  (none)'));
  } else {
    for (const skill of skillDirs) {
      const skillPath = path.join(agent.basePath, skill);
      const hasSkillMd = fs.existsSync(path.join(skillPath, 'SKILL.md')) ||
                        fs.existsSync(path.join(skillPath, 'skill.md'));
      const icon = hasSkillMd ? '📦' : '📁';
      console.log(`  ${icon} ${chalk.cyan(skill)}`);
    }
  }

  // Get project-level skills
  const projectSkills = await ctx.scan.getAgentProjectSkills(agentId);
  console.log(chalk.dim(`\nProject-level skills (${projectSkills.length}):\n`));
  if (projectSkills.length === 0) {
    console.log(chalk.dim('  (none)'));
  } else {
    // Group by project
    const byProject = new Map<string, typeof projectSkills>();
    for (const skill of projectSkills) {
      const existing = byProject.get(skill.projectId!) || [];
      existing.push(skill);
      byProject.set(skill.projectId!, existing);
    }

    for (const [projectId, skills] of byProject) {
      console.log(chalk.dim(`  ${projectId}:`));
      for (const s of skills) {
        let icon: string;
        let statusText: string;
        if (s.isImported) {
          icon = '✅';
          statusText = 'imported';
        } else if (s.isDifferentVersion) {
          icon = '⚠️';
          statusText = 'different version';
        } else {
          icon = '❌';
          statusText = 'not imported';
        }
        console.log(`    ${icon} ${chalk.cyan(s.name)} ${chalk.dim(`(${statusText})`)}`);
      }
    }
  }
  console.log();
}

async function showProject(ctx: CommandContext, projectId: string): Promise<void> {
  const project = ctx.storage.getProject(projectId);
  if (!project) {
    console.error(chalk.red(`Project not found: ${projectId}`));
    console.log(chalk.dim('Run "af list projects" to see registered projects'));
    process.exit(1);
  }

  console.log(chalk.bold(`\nProject: ${projectId}\n`));
  console.log(chalk.dim(`Path: ${project.path}`));
  console.log(chalk.dim(`Added: ${project.addedAt}`));

  // Get project skills and their import status
  const skills = await ctx.scan.getProjectSkillsWithStatus(projectId);
  console.log(chalk.dim(`\nSkills (${skills.length}):\n`));
  console.log(formatProjectSkillList(skills));
  console.log();
}

function showSkill(ctx: CommandContext, skillName: string): void {
  const skill = ctx.skills.get(skillName);
  if (!skill) {
    console.error(chalk.red(`Skill not found: ${skillName}`));
    console.log(chalk.dim('Run "af list skills" to see all skills'));
    process.exit(1);
  }

  const meta = ctx.storage.getSkill(skillName);
  if (!meta) return;

  console.log(chalk.bold(`\n${skillName}\n`));
  console.log(chalk.dim(`Path: ${skill.path}`));

  // Source (only show git or local)
  console.log(chalk.dim('\nSource:'));
  console.log(`  ${formatSourceLabel(meta.source)}`);
  if (meta.source.type === 'git') {
    console.log(chalk.dim(`  URL: ${meta.source.url}`));
  } else if (meta.source.type === 'project') {
    console.log(chalk.dim(`  From project: ${meta.source.projectId}`));
  }

  // Sync status
  console.log(chalk.dim('\nSynced to:'));
  if (meta.syncedTo.length === 0) {
    console.log(chalk.dim('  (not synced to any Agent)'));
  } else {
    for (const r of meta.syncedTo) {
      const modeIcon = r.mode === 'symlink' ? '🔗' : '📦';
      const agent = ctx.storage.getAgent(r.agentId);
      const agentName = agent?.name || r.agentId;
      console.log(`  ${agentName} ${modeIcon} ${chalk.dim(`(${r.mode})`)}`);
    }
  }

  // Project distribution
  const distribution = ctx.scan.getSkillProjectDistribution(skillName);
  if (distribution.length > 0) {
    console.log(chalk.dim('\nSame-name skills in projects:'));
    for (const d of distribution) {
      const isSource = meta.source.type === 'project' && meta.source.projectId === d.projectId;
      const sourceMark = isSource ? chalk.dim(' (source)') : '';
      const agentNames = d.agents.map(a => a.name).join(', ');
      console.log(chalk.dim(`  ${d.projectId}${sourceMark}`) + chalk.green(` (${agentNames})`));
    }
  }

  // SKILL.md preview
  const skillMdPath = path.join(skill.path, 'SKILL.md');
  if (fs.existsSync(skillMdPath)) {
    const content = fs.readFileSync(skillMdPath, 'utf-8');
    const preview = content.split('\n').slice(0, 5).join('\n');
    console.log(chalk.dim('\nSKILL.md preview:'));
    console.log(chalk.dim(preview));
    if (content.split('\n').length > 5) {
      console.log(chalk.dim('...'));
    }
  }

  console.log();
}

export function register(program: Command, ctx: CommandContext): void {
  program
    .command('show <target> <id>')
    .description('Show resource details (agents/projects/skills)')
    .action(async (target: string, id: string) => {
      switch (target) {
        case 'agents':
          await showAgent(ctx, id);
          break;
        case 'projects':
          await showProject(ctx, id);
          break;
        case 'skills':
          showSkill(ctx, id);
          break;
        default:
          console.error(chalk.red(`Invalid target: ${target}`));
          console.log(chalk.dim('Available targets: agents, projects, skills'));
          console.log(chalk.dim('Example: af show agents claude'));
      }
    });
}
