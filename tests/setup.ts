/**
 * Test environment setup
 */

import { afterEach, beforeEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Test temp directory
export const TEST_DIR = path.join(os.tmpdir(), 'agentforge-test');

// Create test environment
export async function createTestEnv(): Promise<string> {
  const testId = Date.now().toString(36) + Math.random().toString(36).slice(2);
  const testDir = path.join(TEST_DIR, testId);
  await fs.ensureDir(testDir);

  // Create necessary subdirectories
  await fs.ensureDir(path.join(testDir, 'skills'));

  return testDir;
}

// Cleanup test environment
export async function cleanupTestEnv(testDir: string): Promise<void> {
  await fs.remove(testDir);
}

// Create test skill
export async function createTestSkill(testDir: string, name: string): Promise<string> {
  const skillDir = path.join(testDir, 'skills', name);
  await fs.ensureDir(skillDir);

  const skillContent = `# ${name}\n\nThis is a test skill.\n`;
  await fs.writeFile(path.join(skillDir, 'skill.md'), skillContent);

  return skillDir;
}

// Global setup
beforeEach(async () => {
  // Ensure test directory exists
  await fs.ensureDir(TEST_DIR);
});

// Global cleanup
afterEach(async () => {
  // Cleanup all test directories
  try {
    await fs.remove(TEST_DIR);
  } catch {
    // Ignore errors
  }
});
