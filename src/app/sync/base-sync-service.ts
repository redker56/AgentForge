/**
 * Sync service abstract base class
 *
 * Provides shared logic for user-level and project-level sync
 */

import path from 'path';
import { Storage } from '../../infra/storage.js';
import { files } from '../../infra/files.js';
import type { SyncMode } from '../../types.js';

export interface SyncResult {
  target: string;
  success: boolean;
  path: string;
  mode: SyncMode;
  error?: string;
}

export interface SyncCheckResult {
  target: string;
  exists: boolean;
  sameContent: boolean | null;
  isSymlink: boolean;
  linkTarget: string | null;
}

export abstract class BaseSyncService<TTarget, TRecord> {
  constructor(protected readonly storage: Storage) {}

  // ========== Abstract methods ==========

  /** Get all available targets */
  abstract getAvailableTargets(): TTarget[];

  /** Get target path */
  abstract getTargetPath(target: TTarget, skillName: string): string;

  /** Read sync records */
  abstract getSyncRecords(skillName: string): TRecord[];

  /** Save sync records */
  abstract saveSyncRecords(skillName: string, records: TRecord[]): void;

  /** Extract target identifier from record */
  abstract getRecordTarget(record: TRecord): string;

  /** Get target path from record */
  protected abstract getTargetPathFromRecord(record: TRecord, skillName: string): string | null;

  // ========== Shared methods ==========

  /**
   * Execute sync
   */
  async sync(skillName: string, targets: TTarget[], mode: SyncMode): Promise<SyncResult[]> {
    const skillPath = this.storage.getSkillPath(skillName);
    if (!files.exists(skillPath)) {
      throw new Error(`Skill not found: ${skillName}`);
    }

    const results: SyncResult[] = [];

    for (const target of targets) {
      const targetPath = this.getTargetPath(target, skillName);
      const targetId = this.getTargetId(target);

      try {
      // Target exists, remove first
      if (files.exists(targetPath)) {
        await files.remove(targetPath);
      }

        const actualMode = await this.doSync(skillPath, targetPath, mode);
        results.push({ target: targetId, success: true, path: targetPath, mode: actualMode });
      } catch (error: any) {
        results.push({ target: targetId, success: false, path: targetPath, mode, error: error.message });
      }
    }

    // Update records
    this.updateRecords(skillName, results);
    return results;
  }

  /**
   * Unsync
   */
  async unsync(skillName: string, targetIds?: string[]): Promise<void> {
    const records = this.getSyncRecords(skillName);
    const toRemove = targetIds || records.map(r => this.getRecordTarget(r));

    for (const targetId of toRemove) {
      const record = records.find(r => this.getRecordTarget(r) === targetId);
      if (!record) continue;

      const targetPath = this.getTargetPathFromRecord(record, skillName);
      if (targetPath && files.exists(targetPath)) {
        await files.remove(targetPath);
      }
    }

    const remaining = records.filter(r => !toRemove.includes(this.getRecordTarget(r)));
    this.saveSyncRecords(skillName, remaining);
  }

  /**
   * Check sync status
   */
  checkSyncStatus(skillName: string): SyncCheckResult[] {
    const skillPath = this.storage.getSkillPath(skillName);
    const targets = this.getAvailableTargets();

    return targets.map(target => {
      const targetPath = this.getTargetPath(target, skillName);
      const targetId = this.getTargetId(target);
      const exists = files.exists(targetPath);

      if (!exists) {
        return { target: targetId, exists: false, sameContent: null, isSymlink: false, linkTarget: null };
      }

      const isSymlink = files.isSymlink(targetPath);
      const linkTarget = isSymlink ? files.readSymlink(targetPath) : null;
      const compareResult = files.compareDirs(skillPath, targetPath);

      return {
        target: targetId,
        exists: true,
        sameContent: compareResult === 'same',
        isSymlink,
        linkTarget,
      };
    });
  }

  // ========== Helper methods ==========

  protected getTargetId(target: TTarget): string {
    if (typeof target === 'string') return target;
    if (typeof target === 'object' && target !== null && 'id' in target) {
      return (target as { id: string }).id;
    }
    return String(target);
  }

  protected async doSync(sourcePath: string, targetPath: string, mode: SyncMode): Promise<SyncMode> {
    if (mode === 'symlink') {
      const success = await files.symlink(sourcePath, targetPath);
      if (success) return 'symlink';
      // symlink failed, fallback to copy
    }
    await files.copy(sourcePath, targetPath);
    return 'copy';
  }

  protected abstract updateRecords(skillName: string, results: SyncResult[]): void;
}
