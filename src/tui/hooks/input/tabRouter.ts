import { handleAgentsTabInput } from './agents.js';
import { handleProjectsTabInput } from './projects.js';
import { handleSkillsTabInput } from './skills.js';
import type { InputRouteContext } from './types.js';

export function routeActiveTabInput(context: InputRouteContext): boolean {
  switch (context.state.shellState.activeTab) {
    case 'skills':
      return handleSkillsTabInput(context);
    case 'agents':
      return handleAgentsTabInput(context);
    case 'projects':
      return handleProjectsTabInput(context);
    default:
      return false;
  }
}
