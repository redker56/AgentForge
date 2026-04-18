/**
 * @module App/SyncCheckService
 * @layer app
 * @allowed-imports infra/, types
 * @responsibility Same-name skill conflict detection during add/import operations.
 *
 * Detects existing skills with the same name in agent directories and provides
 * resolution options (link as synced, skip, or cancel).
 *
 * @architecture Separates conflict detection (pure function) from resolution
 * (user interaction). `detectConflicts()` and `resolveConflicts()` are pure
 * synchronous functions suitable for both CLI and TUI paths.
 * `resolveAndRecordSyncLinks()` is the CLI entry point with interactive prompts.
 */

import { select } from '@inquirer/prompts';
import chalk from 'chalk';

import type { RegistryRepository } from '../infra/registry-repository.js';
import type { SyncRecord } from '../types.js';

import { AgentSyncService } from './sync/agent-sync-service.js';

// --- Exported types for conflict data ---

export interface SyncConflict {
  agentId: string;
  agentName: string;
  sameContent: boolean;
}

export type ConflictResolution = 'link' | 'skip' | 'cancel';

export class SyncCheckService {
  constructor(
    private readonly storage: RegistryRepository,
    private readonly sync: AgentSyncService
  ) {}

  /**
   * Detect same-name skill conflicts without prompting.
   * Returns conflict information for the caller to present to the user.
   * Pure synchronous function -- no side effects, no I/O.
   *
   * Note: checkSyncStatus is inherited by AgentSyncService from BaseSyncService.
   */
  detectConflicts(skillName: string): SyncConflict[] {
    const results = this.sync.checkSyncStatus(skillName);
    const conflicts = results.filter((r) => r.exists);

    return conflicts.map((conflict) => {
      const agentId = conflict.target;
      const agent = this.storage.getAgent(agentId);
      const agentName = agent?.name || agentId;
      return {
        agentId,
        agentName,
        sameContent: conflict.sameContent ?? false,
      };
    });
  }

  /**
   * Apply conflict resolutions chosen by the caller.
   * Returns list of agent IDs to mark as synced.
   * Pure synchronous function -- only reads the resolutions map.
   *
   * Throws an error if any resolution is 'cancel' (caller should handle
   * cancellation before calling this method, but the throw is a safety net).
   */
  resolveConflicts(skillName: string, resolutions: Map<string, ConflictResolution>): string[] {
    const toMarkAsSynced: string[] = [];

    for (const [agentId, resolution] of resolutions) {
      if (resolution === 'cancel') {
        throw new Error('Operation cancelled');
      }
      if (resolution === 'link') {
        toMarkAsSynced.push(agentId);
      }
      // 'skip' -- do nothing
    }

    return toMarkAsSynced;
  }

  /**
   * CLI entry point: detect conflicts, prompt user via @inquirer/prompts,
   * apply resolutions, and update storage.
   */
  async resolveAndRecordSyncLinks(
    skillName: string,
    seedAgentIds: string[] = []
  ): Promise<string[]> {
    const skill = this.storage.getSkill(skillName);
    if (!skill) {
      throw new Error(`Skill not found: ${skillName}`);
    }

    // Use detect + @inquirer/prompts resolution for CLI mode
    const conflicts = this.detectConflicts(skillName);
    const resolutions = new Map<string, ConflictResolution>();

    if (conflicts.length > 0) {
      console.log(
        chalk.yellow(
          `\nDetected ${conflicts.length} Agent(s) with same-name skill "${skillName}":\n`
        )
      );
    }

    for (const conflict of conflicts) {
      if (conflict.sameContent) {
        // Same content, auto-mark as synced
        console.log(chalk.dim(`  ${conflict.agentName} (${conflict.agentId})`));
        console.log(chalk.green(`    \u2713 Same content, auto-linked as synced`));
        resolutions.set(conflict.agentId, 'link');
      } else {
        // Different content, ask user
        console.log(chalk.dim(`  ${conflict.agentName} (${conflict.agentId})`));
        console.log(chalk.yellow(`    \u26A0 Different content`));

        try {
          const action = await select({
            message: `How to handle same-name skill for ${conflict.agentName}?`,
            choices: [
              { name: 'Link as synced (keep Agent version)', value: 'link' },
              { name: 'Skip (do not link, manually sync later to overwrite)', value: 'skip' },
              { name: 'Cancel entire operation', value: 'cancel' },
            ],
          });
          resolutions.set(conflict.agentId, action as ConflictResolution);
        } catch {
          // User pressed Ctrl+C -- treat as cancel
          console.log(chalk.yellow('\nOperation cancelled'));
          process.exit(0);
        }
      }
    }

    // Apply resolutions (may throw on 'cancel', caught above)
    let linkedAgentIds: string[];
    try {
      linkedAgentIds = this.resolveConflicts(skillName, resolutions);
    } catch {
      console.log(chalk.yellow('\nOperation cancelled'));
      process.exit(0);
    }

    // Merge with existing records + seed agents
    const merged = new Map<string, SyncRecord>();

    for (const record of skill.syncedTo) {
      merged.set(record.agentId, record);
    }

    for (const agentId of [...seedAgentIds, ...linkedAgentIds]) {
      merged.set(agentId, { agentId, mode: 'copy' });
    }

    const records = Array.from(merged.values());
    this.storage.updateSkillSync(skillName, records);
    return records.map((record) => record.agentId);
  }
}
