/**
 * ProjectSyncService Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ProjectSyncService } from '../../../src/app/sync/project-sync-service.js';
import type { Agent, ProjectSyncRecord, SkillMeta } from '../../../src/types.js';

const TEST_DIR = path.join(os.tmpdir(), 'agentforge-project-sync-test');
const PROJECT_ID = 'demo-project';
const SKILL_NAME = 'demo-skill';

interface StorageMock {
  getSkill: (name: string) => SkillMeta | undefined;
  getSkillPath: (name: string) => string;
  getProject: (id: string) => { id: string; path: string; addedAt: string } | undefined;
  listAgents: () => Agent[];
  listAllDefinedAgents: () => Agent[];
  listProjects: () => Array<{ id: string; path: string; addedAt: string }>;
  updateSkillProjectSync: ReturnType<typeof vi.fn>;
}

function createStorageMock(projectPath: string, syncedProjects: ProjectSyncRecord[] = []): StorageMock {
  const project = { id: PROJECT_ID, path: projectPath, addedAt: new Date().toISOString() };
  const agents: Agent[] = [
    { id: 'claude', name: 'Claude Code', basePath: path.join(TEST_DIR, '.claude', 'skills'), skillsDirName: 'claude' },
    { id: 'codex', name: 'Codex', basePath: path.join(TEST_DIR, '.codex', 'skills'), skillsDirName: 'agents' },
  ];
  const skillMeta: SkillMeta = {
    name: SKILL_NAME,
    source: { type: 'local' },
    createdAt: new Date().toISOString(),
    syncedTo: [],
    syncedProjects: [...syncedProjects],
  };

  return {
    getSkill: (name: string) => name === SKILL_NAME ? skillMeta : undefined,
    getSkillPath: (name: string) => path.join(TEST_DIR, '.agentforge', 'skills', name),
    getProject: (id: string) => id === PROJECT_ID ? project : undefined,
    listAgents: () => agents,
    listAllDefinedAgents: () => agents,
    listProjects: () => [project],
    updateSkillProjectSync: vi.fn((name: string, records: ProjectSyncRecord[]) => {
      if (name === SKILL_NAME) {
        skillMeta.syncedProjects = [...records];
      }
    }),
  };
}

describe('ProjectSyncService', () => {
  let projectPath: string;

  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    projectPath = path.join(TEST_DIR, PROJECT_ID);
    await fs.ensureDir(projectPath);
    await fs.ensureDir(path.join(TEST_DIR, '.agentforge', 'skills', SKILL_NAME));
    await fs.writeFile(path.join(TEST_DIR, '.agentforge', 'skills', SKILL_NAME, 'SKILL.md'), '# Demo Skill');
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  it('detects only Agent directories that already exist in the project', async () => {
    await fs.ensureDir(path.join(projectPath, '.agents', 'skills'));

    const service = new ProjectSyncService(createStorageMock(projectPath) as never);

    expect(service.detectAgentTypes(projectPath)).toEqual(['codex']);
  });

  it('does not invent a default Agent type for a clean project', () => {
    const service = new ProjectSyncService(createStorageMock(projectPath) as never);

    expect(service.detectAgentTypes(projectPath)).toEqual([]);
  });

  it('requires explicit Agent types when a clean project has no detectable structure', async () => {
    const service = new ProjectSyncService(createStorageMock(projectPath) as never);

    await expect(service.syncToProject(SKILL_NAME, PROJECT_ID)).rejects.toThrow(
      'No Agent directories detected in project demo-project. Use --agent-types to specify sync targets.'
    );
  });

  it('syncs to an explicitly selected Agent on a clean project', async () => {
    const service = new ProjectSyncService(createStorageMock(projectPath) as never);

    await service.syncToProject(SKILL_NAME, PROJECT_ID, ['codex']);

    expect(await fs.pathExists(path.join(projectPath, '.agents', 'skills', SKILL_NAME, 'SKILL.md'))).toBe(true);
    expect(await fs.pathExists(path.join(projectPath, '.claude', 'skills', SKILL_NAME))).toBe(false);
  });

  it('removes detected on-disk project syncs even when no registry record exists', async () => {
    const storage = createStorageMock(projectPath);
    const service = new ProjectSyncService(storage as never);
    const targetPath = path.join(projectPath, '.agents', 'skills', SKILL_NAME);

    await fs.ensureDir(targetPath);
    await fs.writeFile(path.join(targetPath, 'SKILL.md'), '# Demo Skill');

    await service.unsyncFromProject(SKILL_NAME, PROJECT_ID);

    expect(await fs.pathExists(targetPath)).toBe(false);
    expect(storage.updateSkillProjectSync).toHaveBeenCalledWith(SKILL_NAME, []);
  });
});
