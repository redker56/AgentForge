import os from 'os';
import path from 'path';

import fs from 'fs-extra';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DefaultWorkbenchQueries } from '../../src/app/workbench-queries.js';
import type { RegistryRepository } from '../../src/infra/registry-repository.js';

describe('DefaultWorkbenchQueries', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => fs.remove(dir)));
    tempDirs.length = 0;
  });

  it('normalizes CRLF in SKILL.md preview lines', async () => {
    const skillName = 'crlf-skill';
    const skillDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentforge-workbench-queries-'));
    tempDirs.push(skillDir);
    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      '# Title\r\n> quoted line\r\nfinal line\r\n',
      'utf-8'
    );

    const storage: RegistryRepository = {
      listSkills: vi.fn(() => []),
      listAgents: vi.fn(() => []),
      listProjects: vi.fn(() => []),
      listAllDefinedAgents: vi.fn(() => []),
      getAgent: vi.fn(() => undefined),
      getProject: vi.fn(() => undefined),
      getSkill: vi.fn(() => ({
        name: skillName,
        source: { type: 'local' as const },
        createdAt: '2026-04-19T00:00:00.000Z',
        updatedAt: '2026-04-19T00:00:00.000Z',
        categories: [],
        syncedTo: [],
        syncedProjects: [],
      })),
      getSkillsDir: vi.fn(() => path.dirname(skillDir)),
      getSkillPath: vi.fn(() => skillDir),
      saveSkill: vi.fn(),
      saveSkillMeta: vi.fn(),
      deleteSkill: vi.fn(),
      addAgent: vi.fn(),
      removeAgent: vi.fn(),
      addProject: vi.fn(),
      removeProject: vi.fn(),
      updateSkillSync: vi.fn(),
      updateSkillProjectSync: vi.fn(),
      runBatch: vi.fn(),
      snapshot: vi.fn(),
    };

    const scanService = {
      getSkillProjectDistributionWithStatus: vi.fn(() => Promise.resolve([])),
      getAgentProjectSkills: vi.fn(() => Promise.resolve([])),
      getProjectSkillsWithStatus: vi.fn(() => Promise.resolve([])),
      scanProject: vi.fn(() => []),
    };

    const fileOps = {
      pathExists: vi.fn(() => true),
      listSubdirectories: vi.fn(() => []),
      fileExists: vi.fn(() => false),
    };

    const queries = new DefaultWorkbenchQueries(storage, scanService as never, fileOps);
    const detail = await queries.loadSkillDetail(skillName);

    expect(detail?.skillMdPreview).toBe('# Title\n> quoted line\nfinal line\n');
    expect(detail?.skillMdPreview).not.toContain('\r');
  });
});
