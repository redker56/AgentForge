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
 * (caller-provided interaction). `detectConflicts()` and `resolveConflicts()`
 * are pure synchronous functions suitable for both CLI and TUI paths.
 */

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

export interface SyncConflictResolver {
  onConflicts?(skillName: string, conflicts: SyncConflict[]): void;
  onAutoLink?(conflict: SyncConflict): void;
  onDifferentContent?(conflict: SyncConflict): void;
  chooseResolution?(conflict: SyncConflict): ConflictResolution | Promise<ConflictResolution>;
}

export class SyncCheckService {
  constructor(
    private readonly storage: RegistryRepository,
    private readonly sync: AgentSyncService,
    private readonly resolver?: SyncConflictResolver
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
   * Detect conflicts, apply caller-provided resolutions, and update storage.
   * Without a resolver, same-content conflicts are linked and different-content
   * conflicts are skipped.
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
      this.resolver?.onConflicts?.(skillName, conflicts);
    }

    for (const conflict of conflicts) {
      if (conflict.sameContent) {
        this.resolver?.onAutoLink?.(conflict);
        resolutions.set(conflict.agentId, 'link');
        continue;
      }

      this.resolver?.onDifferentContent?.(conflict);
      const action = this.resolver?.chooseResolution
        ? await this.resolver.chooseResolution(conflict)
        : 'skip';
      resolutions.set(conflict.agentId, action);
    }

    const linkedAgentIds = this.resolveConflicts(skillName, resolutions);

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
