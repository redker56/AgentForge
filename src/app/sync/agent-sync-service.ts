/**
 * User-level Agent sync service
 */

import path from 'path';
import { BaseSyncService, SyncResult } from './base-sync-service.js';
import type { Agent, SyncRecord, SyncMode } from '../../types.js';

export class AgentSyncService extends BaseSyncService<Agent, SyncRecord> {
  getAvailableTargets(): Agent[] {
    return this.storage.listAgents();
  }

  getTargetPath(agent: Agent, skillName: string): string {
    return path.join(agent.basePath, skillName);
  }

  getSyncRecords(skillName: string): SyncRecord[] {
    const meta = this.storage.getSkill(skillName);
    return meta?.syncedTo || [];
  }

  saveSyncRecords(skillName: string, records: SyncRecord[]): void {
    this.storage.updateSkillSync(skillName, records);
  }

  getRecordTarget(record: SyncRecord): string {
    return record.agentId;
  }

  protected getTargetPathFromRecord(record: SyncRecord, skillName: string): string | null {
    const agent = this.storage.getAgent(record.agentId);
    return agent ? path.join(agent.basePath, skillName) : null;
  }

  protected updateRecords(skillName: string, results: SyncResult[]): void {
    const existing = this.getSyncRecords(skillName);
    const newRecords: SyncRecord[] = results
      .filter(r => r.success)
      .map(r => ({ agentId: r.target, mode: r.mode }));

    const merged = new Map<string, SyncRecord>();
    existing.forEach(r => merged.set(r.agentId, r));
    newRecords.forEach(r => merged.set(r.agentId, r));

    this.saveSyncRecords(skillName, Array.from(merged.values()));
  }

  /**
   * Re-sync (based on saved records)
   */
  async resync(skillName: string): Promise<void> {
    const records = this.getSyncRecords(skillName);
    if (records.length === 0) return;

    for (const record of records) {
      const agent = this.storage.getAgent(record.agentId);
      if (!agent) continue;
      await this.sync(skillName, [agent], record.mode);
    }
  }

  /**
   * Get list of synced Agents
   */
  getSyncedAgents(skillName: string): Agent[] {
    const records = this.getSyncRecords(skillName);
    return records
      .map(r => this.storage.getAgent(r.agentId))
      .filter((a): a is Agent => a !== undefined);
  }
}
