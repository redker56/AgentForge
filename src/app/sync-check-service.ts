/**
 * Sync Status Check Service - Used during add/import to detect same-name skills
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { Storage } from '../infra/storage.js';
import { AgentSyncService } from './sync/agent-sync-service.js';
import type { SyncRecord } from '../types.js';

export class SyncCheckService {
  constructor(
    private readonly storage: Storage,
    private readonly sync: AgentSyncService
  ) {}

  async resolveAndRecordSyncLinks(skillName: string, seedAgentIds: string[] = []): Promise<string[]> {
    const skill = this.storage.getSkill(skillName);
    if (!skill) {
      throw new Error(`Skill not found: ${skillName}`);
    }

    const linkedAgentIds = await this.checkAndHandleConflicts(skillName);
    const merged = new Map<string, SyncRecord>();

    for (const record of skill.syncedTo) {
      merged.set(record.agentId, record);
    }

    for (const agentId of [...seedAgentIds, ...linkedAgentIds]) {
      merged.set(agentId, { agentId, mode: 'copy' });
    }

    const records = Array.from(merged.values());
    this.storage.updateSkillSync(skillName, records);
    return records.map(record => record.agentId);
  }

  /**
   * Detect and handle same-name skill conflicts
   * Returns list of Agents that need to be marked as synced
   */
  private async checkAndHandleConflicts(skillName: string): Promise<string[]> {
    const results = this.sync.checkSyncStatus(skillName);
    const conflicts = results.filter(r => r.exists);
    const toMarkAsSynced: string[] = [];

    if (conflicts.length === 0) {
      return toMarkAsSynced;
    }

    console.log(chalk.yellow(`\nDetected ${conflicts.length} Agent(s) with same-name skill "${skillName}":\n`));

    for (const conflict of conflicts) {
      // target is the agentId
      const agentId = conflict.target;
      const agent = this.storage.getAgent(agentId);
      const agentName = agent?.name || agentId;

      if (conflict.sameContent) {
        // Same content, auto-mark as synced
        console.log(chalk.dim(`  ${agentName} (${agentId})`));
        console.log(chalk.green(`    ✓ Same content, auto-linked as synced`));
        toMarkAsSynced.push(agentId);
      } else {
        // Different content, ask user
        console.log(chalk.dim(`  ${agentName} (${agentId})`));
        console.log(chalk.yellow(`    ⚠ Different content`));

        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: `How to handle same-name skill for ${agentName}?`,
            choices: [
              { name: 'Link as synced (keep Agent version)', value: 'link' },
              { name: 'Skip (do not link, manually sync later to overwrite)', value: 'skip' },
              { name: 'Cancel entire operation', value: 'cancel' },
            ],
          },
        ]);

        if (action === 'cancel') {
          console.log(chalk.yellow('\nOperation cancelled'));
          process.exit(0);
        } else if (action === 'link') {
          toMarkAsSynced.push(agentId);
        }
      }
    }

    return toMarkAsSynced;
  }
}
