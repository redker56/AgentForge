/**
 * Integration test: Import workflow
 *
 * Tests skill discovery from project scanning using real temp directories
 * and a mocked storage layer.
 */

import os from 'os';
import path from 'path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScanService } from '../../src/app/scan-service.js';
import type { Storage } from '../../src/infra/storage.js';

const TEST_DIR = path.join(os.tmpdir(), 'agentforge-integration-import');

describe('import integration workflow', () => {
  let scanService: ScanService;
  let projectPath: string;
  let storage: ReturnType<typeof vi.fn> & Partial<Storage>;
  let agentConfig: {
    id: string;
    name: string;
    basePath: string;
    skillsDirName: string;
  };

  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);

    projectPath = path.join(TEST_DIR, 'test-project');
    await fs.ensureDir(projectPath);
    await fs.ensureDir(TEST_DIR, 'af-skills');

    agentConfig = {
      id: 'codex',
      name: 'Codex',
      basePath: '/tmp/codex',
      skillsDirName: 'agents',
    };

    storage = {
      listAgents: vi.fn(() => [agentConfig]),
      getAgent: vi.fn(() => agentConfig),
    } as unknown as typeof storage;

    scanService = new ScanService(storage as unknown as Storage);
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  it('discovers skills in project agent directory', () => {
    const agentSkillsDir = path.join(projectPath, '.agents', 'skills', 'discovered-skill');
    fs.ensureDirSync(agentSkillsDir);
    fs.writeFileSync(path.join(agentSkillsDir, 'SKILL.md'), '# Discovered Skill');

    const result = scanService.scanProject(projectPath);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('discovered-skill');
    expect(result[0].hasSkillMd).toBe(true);
    expect(result[0].agentId).toBe('codex');
  });

  it('handles empty project gracefully', () => {
    const result = scanService.scanProject(projectPath);
    expect(result).toEqual([]);
  });

  it('does not discover directories without SKILL.md', () => {
    const emptyDir = path.join(projectPath, '.agents', 'skills', 'not-a-skill');
    fs.ensureDirSync(emptyDir);

    const result = scanService.scanProject(projectPath);
    const found = result.find((s) => s.name === 'not-a-skill');
    expect(found).toBeUndefined();
  });

  it('discovers nested skills in agent subdirectories', () => {
    const nestedSkillDir = path.join(projectPath, '.agents', 'skills', 'nested-skill', 'subdir');
    fs.ensureDirSync(nestedSkillDir);
    fs.writeFileSync(
      path.join(projectPath, '.agents', 'skills', 'nested-skill', 'SKILL.md'),
      '# Nested'
    );

    const result = scanService.scanProject(projectPath);
    const found = result.find((s) => s.name === 'nested-skill');
    expect(found).toBeDefined();
  });
});
