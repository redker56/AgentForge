/**
 * ScanService Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ScanService } from '../../src/app/scan-service.js';
import { files } from '../../src/infra/files.js';
import type { Agent } from '../../src/types.js';

const TEST_DIR = path.join(os.tmpdir(), 'agentforge-scan-test');

describe('ScanService', () => {
  let testProjectDir: string;
  let storage: any;

  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);

    testProjectDir = path.join(TEST_DIR, 'project');
    await fs.ensureDir(testProjectDir);

    // Mock storage
    storage = {
      listAgents: vi.fn((): Agent[] => [
        { id: 'claude', name: 'Claude Code', basePath: '/tmp/.claude/skills', skillsDirName: 'claude' },
        { id: 'codex', name: 'Codex', basePath: '/tmp/.codex/skills', skillsDirName: 'agents' },
      ]),
      listProjects: vi.fn(() => [
        { id: 'test-project', path: testProjectDir, addedAt: new Date().toISOString() },
      ]),
      getSkillPath: vi.fn((name: string) => path.join(TEST_DIR, 'skills', name)),
      saveSkill: vi.fn(),
      listSkills: vi.fn(() => []),
      getProject: vi.fn((id: string) => {
        if (id === 'test-project') {
          return { id: 'test-project', path: testProjectDir, addedAt: new Date().toISOString() };
        }
        return undefined;
      }),
    };
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  describe('scanProject', () => {
    it('scans skills from agent directories in project', async () => {
      // Create skill directories with SKILL.md
      const claudeSkillsDir = path.join(testProjectDir, '.claude', 'skills');
      const codexSkillsDir = path.join(testProjectDir, '.agents', 'skills');

      await fs.ensureDir(claudeSkillsDir);
      await fs.ensureDir(path.join(claudeSkillsDir, 'test-skill-1'));
      await fs.writeFile(path.join(claudeSkillsDir, 'test-skill-1', 'SKILL.md'), '# Test Skill 1');

      await fs.ensureDir(codexSkillsDir);
      await fs.ensureDir(path.join(codexSkillsDir, 'test-skill-2'));
      await fs.writeFile(path.join(codexSkillsDir, 'test-skill-2', 'SKILL.md'), '# Test Skill 2');

      const service = new ScanService(storage);
      const skills = service.scanProject(testProjectDir);

      expect(skills).toHaveLength(2);
      expect(skills[0].name).toBe('test-skill-1');
      expect(skills[0].agentId).toBe('claude');
      expect(skills[1].name).toBe('test-skill-2');
      expect(skills[1].agentId).toBe('codex');
    });

    it('only keeps first occurrence when duplicate skill names exist', async () => {
      const claudeSkillsDir = path.join(testProjectDir, '.claude', 'skills');
      const codexSkillsDir = path.join(testProjectDir, '.agents', 'skills');

      await fs.ensureDir(claudeSkillsDir);
      await fs.ensureDir(path.join(claudeSkillsDir, 'duplicate-skill'));
      await fs.writeFile(path.join(claudeSkillsDir, 'duplicate-skill', 'SKILL.md'), '# Claude version');

      await fs.ensureDir(codexSkillsDir);
      await fs.ensureDir(path.join(codexSkillsDir, 'duplicate-skill'));
      await fs.writeFile(path.join(codexSkillsDir, 'duplicate-skill', 'SKILL.md'), '# Codex version');

      const service = new ScanService(storage);
      const skills = service.scanProject(testProjectDir);

      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('duplicate-skill');
      expect(skills[0].agentId).toBe('claude'); // First agent in priority
    });

    it('skips directories without SKILL.md', async () => {
      const claudeSkillsDir = path.join(testProjectDir, '.claude', 'skills');

      await fs.ensureDir(claudeSkillsDir);
      await fs.ensureDir(path.join(claudeSkillsDir, 'valid-skill'));
      await fs.writeFile(path.join(claudeSkillsDir, 'valid-skill', 'SKILL.md'), '# Valid');
      await fs.ensureDir(path.join(claudeSkillsDir, 'invalid-skill'));
      // No SKILL.md

      const service = new ScanService(storage);
      const skills = service.scanProject(testProjectDir);

      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('valid-skill');
    });

    it('accepts skill.md (lowercase) as valid', async () => {
      const claudeSkillsDir = path.join(testProjectDir, '.claude', 'skills');

      await fs.ensureDir(claudeSkillsDir);
      await fs.ensureDir(path.join(claudeSkillsDir, 'lowercase-skill'));
      await fs.writeFile(path.join(claudeSkillsDir, 'lowercase-skill', 'skill.md'), '# Lowercase');

      const service = new ScanService(storage);
      const skills = service.scanProject(testProjectDir);

      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('lowercase-skill');
      expect(skills[0].hasSkillMd).toBe(true);
    });

    it('handles empty project', () => {
      const service = new ScanService(storage);
      const skills = service.scanProject(testProjectDir);

      expect(skills).toEqual([]);
    });

    it('skips hidden directories', async () => {
      const claudeSkillsDir = path.join(testProjectDir, '.claude', 'skills');

      await fs.ensureDir(claudeSkillsDir);
      await fs.ensureDir(path.join(claudeSkillsDir, '.hidden-skill'));
      await fs.writeFile(path.join(claudeSkillsDir, '.hidden-skill', 'SKILL.md'), '# Hidden');

      const service = new ScanService(storage);
      const skills = service.scanProject(testProjectDir);

      expect(skills).toHaveLength(0);
    });

    it('sets correct subPath', async () => {
      const claudeSkillsDir = path.join(testProjectDir, '.claude', 'skills');

      await fs.ensureDir(claudeSkillsDir);
      await fs.ensureDir(path.join(claudeSkillsDir, 'test-skill'));
      await fs.writeFile(path.join(claudeSkillsDir, 'test-skill', 'SKILL.md'), '# Test');

      const service = new ScanService(storage);
      const skills = service.scanProject(testProjectDir);

      expect(skills[0].subPath).toBe('.claude/skills');
    });
  });

  describe('importSkill', () => {
    it('imports skill to AgentForge with default name', async () => {
      const sourceDir = path.join(TEST_DIR, 'source');
      await fs.ensureDir(sourceDir);
      await fs.writeFile(path.join(sourceDir, 'SKILL.md'), '# Test Skill');

      const existsSpy = vi.spyOn(files, 'exists').mockReturnValue(false);
      const copySpy = vi.spyOn(files, 'copy').mockResolvedValue();

      try {
        const service = new ScanService(storage);
        const result = await service.importSkill(sourceDir);

        expect(result).toBe('source');
        expect(copySpy).toHaveBeenCalledWith(sourceDir, path.join(TEST_DIR, 'skills', 'source'));
        expect(storage.saveSkill).toHaveBeenCalledWith('source', { type: 'local' });
      } finally {
        existsSpy.mockRestore();
        copySpy.mockRestore();
      }
    });

    it('imports skill with custom name', async () => {
      const sourceDir = path.join(TEST_DIR, 'source');
      await fs.ensureDir(sourceDir);
      await fs.writeFile(path.join(sourceDir, 'SKILL.md'), '# Test Skill');

      const existsSpy = vi.spyOn(files, 'exists').mockReturnValue(false);
      const copySpy = vi.spyOn(files, 'copy').mockResolvedValue();

      try {
        const service = new ScanService(storage);
        const result = await service.importSkill(sourceDir, 'custom-name');

        expect(result).toBe('custom-name');
        expect(copySpy).toHaveBeenCalledWith(sourceDir, path.join(TEST_DIR, 'skills', 'custom-name'));
        expect(storage.saveSkill).toHaveBeenCalledWith('custom-name', { type: 'local' });
      } finally {
        existsSpy.mockRestore();
        copySpy.mockRestore();
      }
    });

    it('imports skill with project source tracking', async () => {
      const sourceDir = path.join(TEST_DIR, 'source');
      await fs.ensureDir(sourceDir);
      await fs.writeFile(path.join(sourceDir, 'SKILL.md'), '# Test Skill');

      const existsSpy = vi.spyOn(files, 'exists').mockReturnValue(false);
      const copySpy = vi.spyOn(files, 'copy').mockResolvedValue();

      try {
        const service = new ScanService(storage);
        const result = await service.importSkill(sourceDir, 'test-skill', 'project-123');

        expect(result).toBe('test-skill');
        expect(storage.saveSkill).toHaveBeenCalledWith('test-skill', { type: 'project', projectId: 'project-123' });
      } finally {
        existsSpy.mockRestore();
        copySpy.mockRestore();
      }
    });

    it('throws error if skill already exists', async () => {
      const sourceDir = path.join(TEST_DIR, 'source');
      await fs.ensureDir(sourceDir);

      const existsSpy = vi.spyOn(files, 'exists').mockReturnValue(true);

      try {
        const service = new ScanService(storage);
        await expect(service.importSkill(sourceDir)).rejects.toThrow('Skill already exists: source');
      } finally {
        existsSpy.mockRestore();
      }
    });
  });

  describe('importSkills', () => {
    it('imports multiple skills successfully', async () => {
      const existsSpy = vi.spyOn(files, 'exists').mockReturnValue(false);
      const copySpy = vi.spyOn(files, 'copy').mockResolvedValue();

      try {
        const skills = [
          { name: 'skill1', path: '/tmp/skill1', agentId: 'claude', agentName: 'Claude Code', hasSkillMd: true, subPath: '.claude/skills' },
          { name: 'skill2', path: '/tmp/skill2', agentId: 'codex', agentName: 'Codex', hasSkillMd: true, subPath: '.agents/skills' },
        ];

        const service = new ScanService(storage);
        const results = await service.importSkills(skills);

        expect(results).toHaveLength(2);
        expect(results[0]).toEqual({ name: 'skill1', success: true });
        expect(results[1]).toEqual({ name: 'skill2', success: true });
      } finally {
        existsSpy.mockRestore();
        copySpy.mockRestore();
      }
    });

    it('continues on error and returns failed results', async () => {
      const existsSpy = vi.spyOn(files, 'exists').mockReturnValue(false);
      const copySpy = vi.spyOn(files, 'copy')
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Copy failed'));

      try {
        const skills = [
          { name: 'skill1', path: '/tmp/skill1', agentId: 'claude', agentName: 'Claude Code', hasSkillMd: true, subPath: '.claude/skills' },
          { name: 'skill2', path: '/tmp/skill2', agentId: 'codex', agentName: 'Codex', hasSkillMd: true, subPath: '.agents/skills' },
        ];

        const service = new ScanService(storage);
        const results = await service.importSkills(skills);

        expect(results).toHaveLength(2);
        expect(results[0]).toEqual({ name: 'skill1', success: true });
        expect(results[1]).toEqual({ name: 'skill2', success: false, error: 'Copy failed' });
      } finally {
        existsSpy.mockRestore();
        copySpy.mockRestore();
      }
    });

    it('includes projectId in source when provided', async () => {
      const existsSpy = vi.spyOn(files, 'exists').mockReturnValue(false);
      const copySpy = vi.spyOn(files, 'copy').mockResolvedValue();

      try {
        const skills = [
          { name: 'skill1', path: '/tmp/skill1', agentId: 'claude', agentName: 'Claude Code', hasSkillMd: true, subPath: '.claude/skills' },
        ];

        const service = new ScanService(storage);
        await service.importSkills(skills, 'project-456');

        expect(storage.saveSkill).toHaveBeenCalledWith('skill1', { type: 'project', projectId: 'project-456' });
      } finally {
        existsSpy.mockRestore();
        copySpy.mockRestore();
      }
    });
  });

  describe('getSkillProjectDistribution', () => {
    it('returns projects containing the skill', async () => {
      // Create skill in project
      const skillsDir = path.join(testProjectDir, '.claude', 'skills');
      await fs.ensureDir(skillsDir);
      await fs.ensureDir(path.join(skillsDir, 'test-skill'));
      await fs.writeFile(path.join(skillsDir, 'test-skill', 'SKILL.md'), '# Test');

      const service = new ScanService(storage);
      const result = service.getSkillProjectDistribution('test-skill');

      expect(result).toHaveLength(1);
      expect(result[0].projectId).toBe('test-project');
      expect(result[0].agents).toHaveLength(1);
      expect(result[0].agents[0].id).toBe('claude');
    });

    it('returns empty array when skill not found', () => {
      const service = new ScanService(storage);
      const result = service.getSkillProjectDistribution('non-existent');

      expect(result).toEqual([]);
    });

    it('includes multiple agents for same project', async () => {
      // Create skill in both agent directories
      const claudeSkillsDir = path.join(testProjectDir, '.claude', 'skills');
      const codexSkillsDir = path.join(testProjectDir, '.agents', 'skills');

      await fs.ensureDir(claudeSkillsDir);
      await fs.ensureDir(path.join(claudeSkillsDir, 'multi-skill'));
      await fs.writeFile(path.join(claudeSkillsDir, 'multi-skill', 'SKILL.md'), '# Test');

      await fs.ensureDir(codexSkillsDir);
      await fs.ensureDir(path.join(codexSkillsDir, 'multi-skill'));
      await fs.writeFile(path.join(codexSkillsDir, 'multi-skill', 'SKILL.md'), '# Test');

      const service = new ScanService(storage);
      const result = service.getSkillProjectDistribution('multi-skill');

      expect(result).toHaveLength(1);
      expect(result[0].agents).toHaveLength(2);
      expect(result[0].agents[0].id).toBe('claude');
      expect(result[0].agents[1].id).toBe('codex');
    });
  });

  describe('getSkillProjectDistributionWithStatus', () => {
    it('returns distribution with version status when imported skill exists', async () => {
      // Create imported skill
      const importedSkillDir = path.join(TEST_DIR, 'skills', 'test-skill');
      await fs.ensureDir(importedSkillDir);
      await fs.writeFile(path.join(importedSkillDir, 'SKILL.md'), '# Imported');

      // Create project skill with same content
      const projectSkillDir = path.join(testProjectDir, '.claude', 'skills', 'test-skill');
      await fs.ensureDir(projectSkillDir);
      await fs.writeFile(path.join(projectSkillDir, 'SKILL.md'), '# Imported');

      const service = new ScanService(storage);
      const result = await service.getSkillProjectDistributionWithStatus('test-skill');

      expect(result).toHaveLength(1);
      expect(result[0].projectId).toBe('test-project');
      expect(result[0].agents[0].isDifferentVersion).toBe(false);
    });

    it('detects different version when content differs', async () => {
      // Create imported skill
      const importedSkillDir = path.join(TEST_DIR, 'skills', 'diff-skill');
      await fs.ensureDir(importedSkillDir);
      await fs.writeFile(path.join(importedSkillDir, 'SKILL.md'), '# Imported Version');

      // Create project skill with different content
      const projectSkillDir = path.join(testProjectDir, '.claude', 'skills', 'diff-skill');
      await fs.ensureDir(projectSkillDir);
      await fs.writeFile(path.join(projectSkillDir, 'SKILL.md'), '# Different Version');

      const service = new ScanService(storage);
      const result = await service.getSkillProjectDistributionWithStatus('diff-skill');

      expect(result).toHaveLength(1);
      expect(result[0].agents[0].isDifferentVersion).toBe(true);
    });

    it('handles when imported skill does not exist', async () => {
      // Only create project skill
      const projectSkillDir = path.join(testProjectDir, '.claude', 'skills', 'no-import');
      await fs.ensureDir(projectSkillDir);
      await fs.writeFile(path.join(projectSkillDir, 'SKILL.md'), '# No Import');

      const service = new ScanService(storage);
      const result = await service.getSkillProjectDistributionWithStatus('no-import');

      expect(result).toHaveLength(1);
      expect(result[0].agents[0].isDifferentVersion).toBe(false);
    });

    it('returns empty array when skill not found in any project', async () => {
      const service = new ScanService(storage);
      const result = await service.getSkillProjectDistributionWithStatus('non-existent');

      expect(result).toEqual([]);
    });
  });

  describe('getProjectSkillsWithStatus', () => {
    it('returns all skills in project with status', async () => {
      const skillsDir = path.join(testProjectDir, '.claude', 'skills');
      await fs.ensureDir(skillsDir);
      await fs.ensureDir(path.join(skillsDir, 'project-skill'));
      await fs.writeFile(path.join(skillsDir, 'project-skill', 'SKILL.md'), '# Project Skill');

      const service = new ScanService(storage);
      const result = await service.getProjectSkillsWithStatus('test-project');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('project-skill');
      expect(result[0].agentId).toBe('claude');
      expect(result[0].isImported).toBe(false);
      expect(result[0].isDifferentVersion).toBe(false);
    });

    it('returns empty array for non-existent project', async () => {
      const service = new ScanService(storage);
      const result = await service.getProjectSkillsWithStatus('non-existent');

      expect(result).toEqual([]);
    });

    it('detects imported status correctly', async () => {
      // Create imported skill
      const importedSkillDir = path.join(TEST_DIR, 'skills', 'imported-skill');
      await fs.ensureDir(importedSkillDir);
      await fs.writeFile(path.join(importedSkillDir, 'SKILL.md'), '# Same Content');

      // Create project skill with same content
      const skillsDir = path.join(testProjectDir, '.claude', 'skills');
      await fs.ensureDir(skillsDir);
      await fs.ensureDir(path.join(skillsDir, 'imported-skill'));
      await fs.writeFile(path.join(skillsDir, 'imported-skill', 'SKILL.md'), '# Same Content');

      storage.listSkills = vi.fn(() => [{ name: 'imported-skill', source: { type: 'local' }, createdAt: '', syncedTo: [] }]);

      const service = new ScanService(storage);
      const result = await service.getProjectSkillsWithStatus('test-project');

      expect(result).toHaveLength(1);
      expect(result[0].isImported).toBe(true);
      expect(result[0].isDifferentVersion).toBe(false);
    });

    it('detects different version correctly', async () => {
      // Create imported skill
      const importedSkillDir = path.join(TEST_DIR, 'skills', 'different-skill');
      await fs.ensureDir(importedSkillDir);
      await fs.writeFile(path.join(importedSkillDir, 'SKILL.md'), '# Original');

      // Create project skill with different content
      const skillsDir = path.join(testProjectDir, '.claude', 'skills');
      await fs.ensureDir(skillsDir);
      await fs.ensureDir(path.join(skillsDir, 'different-skill'));
      await fs.writeFile(path.join(skillsDir, 'different-skill', 'SKILL.md'), '# Modified');

      storage.listSkills = vi.fn(() => [{ name: 'different-skill', source: { type: 'local' }, createdAt: '', syncedTo: [] }]);

      const service = new ScanService(storage);
      const result = await service.getProjectSkillsWithStatus('test-project');

      expect(result).toHaveLength(1);
      expect(result[0].isImported).toBe(false);
      expect(result[0].isDifferentVersion).toBe(true);
    });

    it('includes skills from multiple agents', async () => {
      const claudeSkillsDir = path.join(testProjectDir, '.claude', 'skills');
      const codexSkillsDir = path.join(testProjectDir, '.agents', 'skills');

      await fs.ensureDir(claudeSkillsDir);
      await fs.ensureDir(path.join(claudeSkillsDir, 'claude-skill'));
      await fs.writeFile(path.join(claudeSkillsDir, 'claude-skill', 'SKILL.md'), '# Claude Skill');

      await fs.ensureDir(codexSkillsDir);
      await fs.ensureDir(path.join(codexSkillsDir, 'codex-skill'));
      await fs.writeFile(path.join(codexSkillsDir, 'codex-skill', 'SKILL.md'), '# Codex Skill');

      const service = new ScanService(storage);
      const result = await service.getProjectSkillsWithStatus('test-project');

      expect(result).toHaveLength(2);
      expect(result.some(s => s.name === 'claude-skill' && s.agentId === 'claude')).toBe(true);
      expect(result.some(s => s.name === 'codex-skill' && s.agentId === 'codex')).toBe(true);
    });
  });

  describe('getAgentProjectSkills', () => {
    it('returns skills for specific agent across all projects', async () => {
      const skillsDir = path.join(testProjectDir, '.claude', 'skills');
      await fs.ensureDir(skillsDir);
      await fs.ensureDir(path.join(skillsDir, 'agent-skill'));
      await fs.writeFile(path.join(skillsDir, 'agent-skill', 'SKILL.md'), '# Agent Skill');

      const service = new ScanService(storage);
      const result = await service.getAgentProjectSkills('claude');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('agent-skill');
      expect(result[0].agentId).toBe('claude');
      expect(result[0].projectId).toBe('test-project');
    });

    it('returns empty array for non-existent agent', async () => {
      const service = new ScanService(storage);
      const result = await service.getAgentProjectSkills('non-existent');

      expect(result).toEqual([]);
    });

    it('only returns skills for specified agent', async () => {
      const claudeSkillsDir = path.join(testProjectDir, '.claude', 'skills');
      const codexSkillsDir = path.join(testProjectDir, '.agents', 'skills');

      await fs.ensureDir(claudeSkillsDir);
      await fs.ensureDir(path.join(claudeSkillsDir, 'claude-only'));
      await fs.writeFile(path.join(claudeSkillsDir, 'claude-only', 'SKILL.md'), '# Claude');

      await fs.ensureDir(codexSkillsDir);
      await fs.ensureDir(path.join(codexSkillsDir, 'codex-only'));
      await fs.writeFile(path.join(codexSkillsDir, 'codex-only', 'SKILL.md'), '# Codex');

      const service = new ScanService(storage);
      const result = await service.getAgentProjectSkills('claude');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('claude-only');
    });
  });
});
