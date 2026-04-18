/**
 * ReconcileService Tests
 */

import os from 'os';
import path from 'path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ProjectStorage } from '../../src/app/project-storage.js';
import { ReconcileService } from '../../src/app/reconcile-service.js';
import type {
  Agent,
  ProjectConfig,
  ProjectSyncRecord,
  SkillMeta,
  SkillSource,
  SyncMode,
} from '../../src/types.js';

const TEST_DIR = path.join(os.tmpdir(), 'agentforge-reconcile-test');

interface ReconcileStorage {
  deleteSkill(name: string): void;
  getSkillsDir(): string;
  listProjects(): ProjectConfig[];
  getProject(id: string): ProjectConfig | undefined;
  listSkills(): SkillMeta[];
  listAllDefinedAgents(): Agent[];
  saveSkill(name: string, source: SkillSource): void;
  updateSkillSync(name: string, records: Array<{ agentId: string; mode: SyncMode }>): void;
  updateSkillProjectSync(name: string, records: ProjectSyncRecord[]): void;
}

describe('ReconcileService', () => {
  let baseDir: string;
  let skillsDir: string;
  let projectDir: string;
  let projectStorage: ProjectStorage;
  let registry: Record<string, SkillMeta>;
  let storage: ReconcileStorage;
  let reconcileService: ReconcileService;

  beforeEach(async () => {
    baseDir = TEST_DIR;
    skillsDir = path.join(baseDir, 'skills');
    projectDir = path.join(baseDir, 'project-a');
    await fs.remove(baseDir);
    await fs.ensureDir(skillsDir);
    await fs.ensureDir(projectDir);
    projectStorage = new ProjectStorage();

    const agentPath = path.join(baseDir, '.agentforge-users', 'claude');
    await fs.ensureDir(agentPath);
    await fs.ensureDir(path.join(agentPath, 'alpha'));
    await fs.writeFile(path.join(agentPath, 'alpha', 'SKILL.md'), '# agent skill');

    await fs.ensureDir(path.join(projectDir, '.claude', 'skills', 'alpha'));
    await fs.writeFile(
      path.join(projectDir, '.claude', 'skills', 'alpha', 'SKILL.md'),
      '# alpha in project'
    );
    await fs.ensureDir(path.join(projectDir, '.claude', 'skills', 'beta'));
    await fs.writeFile(
      path.join(projectDir, '.claude', 'skills', 'beta', 'SKILL.md'),
      '# beta in project'
    );

    await fs.writeJson(
      path.join(projectDir, '.agentforge.json'),
      {
        syncedSkills: [
          {
            name: 'alpha',
            agentType: 'claude',
            mode: 'symlink',
            syncedAt: '2020-01-01T00:00:00.000Z',
          },
          {
            name: 'stale',
            agentType: 'claude',
            mode: 'copy',
            syncedAt: '2020-01-01T00:00:00.000Z',
          },
        ],
      },
      { spaces: 2 }
    );

    await fs.ensureDir(path.join(skillsDir, 'alpha'));
    await fs.writeFile(path.join(skillsDir, 'alpha', 'SKILL.md'), '# alpha skill');

    registry = {
      alpha: {
        name: 'alpha',
        source: { type: 'local' },
        createdAt: new Date().toISOString(),
        categories: ['core'],
        syncedTo: [
          { agentId: 'claude', mode: 'copy' },
          { agentId: 'codex', mode: 'copy' },
        ],
        syncedProjects: [{ projectId: 'project-a', agentType: 'claude', mode: 'copy' }],
      },
      orphaned: {
        name: 'orphaned',
        source: { type: 'local' },
        createdAt: new Date().toISOString(),
        categories: [],
        syncedTo: [{ agentId: 'claude', mode: 'copy' }],
      },
    };

    storage = {
      getSkillsDir: () => skillsDir,
      deleteSkill(name: string): void {
        Reflect.deleteProperty(registry, name);
      },
      listProjects: () => [
        { id: 'project-a', path: projectDir, addedAt: new Date().toISOString() },
      ],
      getProject: (id: string): ProjectConfig | undefined =>
        id === 'project-a'
          ? { id: 'project-a', path: projectDir, addedAt: '2020-01-01T00:00:00.000Z' }
          : undefined,
      listSkills: () => Object.values(registry),
      listAllDefinedAgents: () => [
        {
          id: 'claude',
          name: 'Claude',
          basePath: path.join(baseDir, '.agentforge-users', 'claude'),
        },
        { id: 'codex', name: 'Codex', basePath: path.join(baseDir, '.agentforge-users', 'codex') },
      ],
      saveSkill: (name: string, source: SkillSource): void => {
        registry[name] = {
          name,
          source,
          createdAt: new Date().toISOString(),
          categories: [],
          syncedTo: [],
        };
      },
      updateSkillSync: (name: string, records): void => {
        if (registry[name]) {
          registry[name] = { ...registry[name], syncedTo: records };
        }
      },
      updateSkillProjectSync: (name: string, records: ProjectSyncRecord[]): void => {
        if (registry[name]) {
          registry[name] = { ...registry[name], syncedProjects: records };
        }
      },
    };

    const scanService = {
      getSkillProjectDistributionWithStatus: (skillName: string) => {
        if (skillName === 'alpha' || skillName === 'beta') {
          return Promise.resolve([
            {
              projectId: 'project-a',
              agents: [{ id: 'claude', name: 'Claude', isDifferentVersion: false }],
            },
          ]);
        }
        return Promise.resolve([]);
      },
    };

    reconcileService = new ReconcileService(storage, scanService);
  });

  afterEach(async () => {
    await fs.remove(baseDir);
  });

  it('reconciles registry and local config with discovered filesystem state', async () => {
    const summary = await reconcileService.reconcile();
    const allSkills = storage.listSkills();

    const alpha = allSkills.find((skill) => skill.name === 'alpha');
    const orphaned = allSkills.find((skill) => skill.name === 'orphaned');
    const projectConfig = projectStorage.read(projectDir);

    expect(summary.registeredSkillsAdded).toBe(0);
    expect(summary.registeredSkillsRemoved).toBe(1);
    expect(alpha?.syncedTo).toEqual([{ agentId: 'claude', mode: 'copy' }]);
    expect(alpha?.syncedProjects).toEqual([
      { projectId: 'project-a', agentType: 'claude', mode: 'symlink' },
    ]);
    expect(orphaned).toBeUndefined();
    expect(projectConfig.syncedSkills).toHaveLength(1);
    expect(projectConfig.syncedSkills).toEqual(
      expect.arrayContaining([
        { name: 'alpha', agentType: 'claude', mode: 'symlink', syncedAt: expect.any(String) },
      ])
    );
    expect(projectConfig.syncedSkills.every((entry) => entry.name !== 'stale')).toBe(true);
    expect(projectConfig.syncedSkills.every((entry) => entry.name !== 'beta')).toBe(true);
  });
});
