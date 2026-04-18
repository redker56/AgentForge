/**
 * Agent action creators -- add and remove agent operations
 */

import type { StateCreator, StoreApi } from 'zustand';

import type { AppStore } from '../index.js';
import type { WorkbenchContext } from '../workbenchContext.js';

export interface AgentActions {
  addAgent: (id: string, name: string, basePath: string, skillsDirName?: string) => Promise<void>;
  removeAgent: (agentId: string) => Promise<void>;
  restoreAgent: (snapshot: Record<string, unknown>) => void;
}

function createAgentActionsImpl(
  _set: StoreApi<AppStore>['setState'],
  get: StoreApi<AppStore>['getState'],
  ctx: WorkbenchContext
): AgentActions {
  return {
    addAgent: async (id, name, basePath, skillsDirName): Promise<void> => {
      await ctx.commands.addAgent(id, name, basePath, skillsDirName);
      await get().refreshAgents();
    },

    removeAgent: async (agentId): Promise<void> => {
      await ctx.commands.removeAgent(agentId);
      await get().refreshAgents();
      await get().refreshSkills();
    },

    restoreAgent: (snapshot): void => {
      ctx.commands.restoreAgent(snapshot);
      void get().refreshAgents();
      void get().refreshSkills();
    },
  };
}

export function createAgentActions(store: StoreApi<AppStore>, ctx: WorkbenchContext): AgentActions {
  return createAgentActionsImpl(store.setState, store.getState, ctx);
}

export function createAgentActionsSlice(
  ctx: WorkbenchContext
): StateCreator<AppStore, [], [], AgentActions> {
  return (set, get) => createAgentActionsImpl(set, get, ctx);
}
