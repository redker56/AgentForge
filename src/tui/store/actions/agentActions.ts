/**
 * Agent action creators -- add and remove agent operations
 */

import os from 'os';
import type { StoreApi } from 'zustand';
import type { ServiceContext } from '../dataSlice.js';
import type { AppStore } from '../index.js';
import { BUILTIN_AGENTS } from '../../../types.js';

export interface AgentActions {
  addAgent: (id: string, name: string, basePath: string, skillsDirName?: string) => Promise<void>;
  removeAgent: (agentId: string) => Promise<void>;
  restoreAgent: (snapshot: Record<string, unknown>) => void;
}

export function createAgentActions(store: StoreApi<AppStore>, ctx: ServiceContext): AgentActions {
  return {
    addAgent: async (id, name, basePath, skillsDirName) => {
      // Validate ID
      if (!id.trim()) throw new Error('Agent ID is required');
      if (!/^[a-zA-Z0-9-_]+$/.test(id)) throw new Error('Agent ID must contain only letters, numbers, hyphens, and underscores');

      // Check not a built-in ID
      if (BUILTIN_AGENTS.some(a => a.id === id)) throw new Error(`"${id}" is a built-in agent ID and cannot be used`);

      // Check not duplicate
      const allAgents = ctx.storage.listAllDefinedAgents();
      if (allAgents.some(a => a.id === id)) throw new Error(`Agent "${id}" already exists`);

      // Expand ~ in basePath
      const expandedPath = basePath.replace(/^~(?=[/\\])/, os.homedir());

      // Ensure directory exists
      if (!ctx.fileOps.pathExists(expandedPath)) {
        await ctx.fileOps.ensureDir(expandedPath);
      }

      ctx.storage.addAgent(id, name, expandedPath, skillsDirName);
      await store.getState().refreshAgents();
    },

    removeAgent: async (agentId) => {
      // Clean up sync references for all skills
      const skills = ctx.storage.listSkills();
      for (const skill of skills) {
        // Remove agent from syncedTo records
        const updatedSyncedTo = skill.syncedTo.filter(r => r.agentId !== agentId);
        if (updatedSyncedTo.length !== skill.syncedTo.length) {
          ctx.storage.updateSkillSync(skill.name, updatedSyncedTo);
        }

        // Remove agent from syncedProjects records
        const updatedSyncedProjects = (skill.syncedProjects || []).filter(r => r.agentType !== agentId);
        if (updatedSyncedProjects.length !== (skill.syncedProjects || []).length) {
          ctx.storage.updateSkillProjectSync(skill.name, updatedSyncedProjects);
        }
      }

      ctx.storage.removeAgent(agentId);
      await store.getState().refreshAgents();
      await store.getState().refreshSkills();
    },

    restoreAgent: (snapshot) => {
      const id = snapshot.id as string;
      const name = snapshot.name as string;
      const basePath = snapshot.basePath as string;
      const skillsDirName = snapshot.skillsDirName as string | undefined;
      if (!id || !name || !basePath) return;
      ctx.storage.addAgent(id, name, basePath, skillsDirName);
      void store.getState().refreshAgents();
      void store.getState().refreshSkills();
    },
  };
}
