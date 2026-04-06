/**
 * __complete command - Provide data for shell completion (internal command)
 * af __complete <type> [target]
 */

import type { Command } from 'commander';

import type { CommandContext } from './index.js';

export function register(program: Command, ctx: CommandContext): void {
  program
    .command('__complete <type>')
    .argument('[target]', 'Target type (for synced-agents/synced-projects filtering)')
    .description('') // Empty description
    .action((type: string, _target?: string) => {
      switch (type) {
        case 'commands':
          // First level commands
          console.log('list');
          console.log('show');
          console.log('import');
          console.log('remove');
          console.log('sync');
          console.log('add');
          console.log('unsync');
          console.log('update');
          console.log('completion');
          break;

        case 'list-targets':
        case 'show-targets':
        case 'import-targets':
          console.log('agents');
          console.log('projects');
          console.log('skills');
          break;

        case 'remove-targets':
          console.log('skills');
          console.log('projects');
          console.log('agents');
          break;

        case 'add-targets':
          console.log('skills');
          console.log('agents');
          console.log('projects');
          break;

        case 'sync-targets':
        case 'unsync-targets':
          console.log('agents');
          console.log('projects');
          break;

        case 'skills':
          ctx.skills.list().forEach((s) => console.log(s.name));
          break;

        case 'synced-skills':
          // Only show skills synced to Agents
          ctx.skills
            .list()
            .filter((s) => (s.syncedTo || []).length > 0)
            .forEach((s) => console.log(s.name));
          break;

        case 'synced-projects-skills':
          // Only show skills synced to projects
          ctx.skills
            .list()
            .filter((s) => (s.syncedProjects || []).length > 0)
            .forEach((s) => console.log(s.name));
          break;

        case 'agents':
          ctx.storage.listAgents().forEach((a) => console.log(a.id));
          break;

        case 'projects':
          ctx.storage.listProjects().forEach((p) => console.log(p.id));
          break;

        default:
          // Handle synced-agents:<skill> and synced-projects:<skill> format
          if (type.startsWith('synced-agents:')) {
            const skillName = type.substring('synced-agents:'.length);
            const skill = ctx.skills.get(skillName);
            if (skill && skill.syncedTo) {
              skill.syncedTo.forEach((r) => console.log(r.agentId));
            }
          } else if (type.startsWith('synced-projects:')) {
            const skillName = type.substring('synced-projects:'.length);
            const skill = ctx.skills.get(skillName);
            if (skill && skill.syncedProjects) {
              // Output projectId:agentType format
              skill.syncedProjects.forEach((r) => console.log(`${r.projectId}:${r.agentType}`));
            }
          }
          break;
      }
    });
}
