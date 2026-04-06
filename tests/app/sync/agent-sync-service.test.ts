/**
 * AgentSyncService Tests
 */

import os from 'os';
import path from 'path';

import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const TEST_DIR = path.join(os.tmpdir(), 'agentforge-agent-sync-test');

describe('AgentSyncService', () => {
  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(path.join(TEST_DIR, '.agentforge', 'skills'));
    await fs.ensureDir(path.join(TEST_DIR, '.claude', 'skills'));
    await fs.ensureDir(path.join(TEST_DIR, '.codex', 'skills'));
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  describe('Target path calculation', () => {
    it('should correctly calculate Agent target path', () => {
      const agent = {
        id: 'claude',
        name: 'Claude',
        basePath: path.join(TEST_DIR, '.claude', 'skills'),
      };
      const skillName = 'my-skill';
      const targetPath = path.join(agent.basePath, skillName);

      expect(targetPath).toBe(path.join(TEST_DIR, '.claude', 'skills', 'my-skill'));
    });
  });

  describe('Record merging', () => {
    it('should merge old and new records', () => {
      const existing = [
        { agentId: 'claude', mode: 'copy' as const },
        { agentId: 'codex', mode: 'symlink' as const },
      ];
      const newRecords = [
        { agentId: 'claude', mode: 'symlink' as const },
        { agentId: 'gemini', mode: 'copy' as const },
      ];

      const merged = new Map<string, (typeof existing)[0]>();
      existing.forEach((r) => merged.set(r.agentId, r));
      newRecords.forEach((r) => merged.set(r.agentId, r));

      const result = Array.from(merged.values());
      expect(result).toHaveLength(3);
      expect(result.find((r) => r.agentId === 'claude')?.mode).toBe('symlink');
    });
  });
});
