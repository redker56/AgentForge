/**
 * Shared search computation utility.
 *
 * Uses fzf-style fuzzy matching via fuzzy.ts.
 * Returns results with match indices for character-level highlighting.
 */

import { getTuiText, type TuiLocale } from '../i18n.js';
import type { TabId } from '../store/uiSlice.js';

import { fuzzyMatch } from './fuzzy.js';

export interface SearchResult {
  name: string;
  tabId: TabId;
  tabLabel: string;
  itemId: string;
  matchIndices: number[];
}

export function computeSearchResults(
  query: string,
  skills: Array<{ name: string }>,
  agents: Array<{ id: string; name: string }>,
  projects: Array<{ id: string; path: string }>,
  activeTab?: TabId,
  locale: TuiLocale = 'en'
): SearchResult[] {
  if (!query.trim()) return [];

  const tabLabels = getTuiText(locale).tabs;
  const searchSkills = !activeTab || activeTab === 'skills';
  const searchAgents = !activeTab || activeTab === 'agents';
  const searchProjects = !activeTab || activeTab === 'projects';

  // Search skills
  const skillResults = searchSkills
    ? fuzzyMatch(query, skills, (s) => s.name).map((r) => ({
        name: r.item.name,
        tabId: 'skills' as TabId,
        tabLabel: tabLabels.skills,
        itemId: r.item.name,
        matchIndices: r.matchIndices,
        score: r.score,
      }))
    : [];

  // Search agents -- context-aware: only name in agents tab, name+id globally
  const agentResults = searchAgents
    ? fuzzyMatch(query, agents, (a) => (activeTab === 'agents' ? a.name : `${a.name} ${a.id}`)).map(
        (r) => ({
          name: activeTab === 'agents' ? r.item.name : `${r.item.name} (${r.item.id})`,
          tabId: 'agents' as TabId,
          tabLabel: tabLabels.agents,
          itemId: r.item.id,
          matchIndices:
            activeTab === 'agents'
              ? r.matchIndices
              : remapAgentIndices(r.matchIndices, r.item.name, r.item.id),
          score: r.score,
        })
      )
    : [];

  // Search projects -- context-aware: only id in projects tab, id+path globally
  const projectResults = searchProjects
    ? fuzzyMatch(query, projects, (p) =>
        activeTab === 'projects' ? p.id : `${p.id} ${p.path}`
      ).map((r) => ({
        name: activeTab === 'projects' ? r.item.id : `${r.item.id} (${r.item.path})`,
        tabId: 'projects' as TabId,
        tabLabel: tabLabels.projects,
        itemId: r.item.id,
        matchIndices:
          activeTab === 'projects'
            ? r.matchIndices
            : remapProjectIndices(r.matchIndices, r.item.id, r.item.path),
        score: r.score,
      }))
    : [];

  // Merge, sort by score descending, limit to 10
  const allResults = [...skillResults, ...agentResults, ...projectResults];
  allResults.sort((a, b) => b.score - a.score);

  return allResults.slice(0, 10).map(({ score: _s, ...rest }) => rest);
}

/**
 * Remap fuzzy match indices from "name id" search text back to "name (id)" display text.
 *
 * The display format is: "{name} ({id})"
 * The search text is:   "{name} {id}"
 *
 * Characters at or below name.length - 1 stay at same position.
 * Characters past name.length (the space) shift by +1 for the "(", and
 * positions inside id shift by +2 for "( " prefix.
 */
function remapAgentIndices(indices: number[], name: string, _id: string): number[] {
  const nameLen = name.length;
  // Display format: "name (id)"
  // Search format:  "name id"
  // Search index < nameLen -> display index same
  // Search index == nameLen -> space, maps to nameLen + 1 (the opening paren)
  // Search index > nameLen -> shift by +2 (for "( ")
  return indices.map((idx) => {
    if (idx < nameLen) return idx;
    if (idx === nameLen) return nameLen + 1; // space -> '('
    return idx + 2; // offset for "( "
  });
}

/**
 * Remap fuzzy match indices from "id path" search text back to "id (path)" display text.
 */
function remapProjectIndices(indices: number[], id: string, _path: string): number[] {
  const idLen = id.length;
  return indices.map((idx) => {
    if (idx < idLen) return idx;
    if (idx === idLen) return idLen + 1;
    return idx + 2;
  });
}
