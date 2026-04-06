/**
 * @module App/FileOperationsService
 * @layer app
 * @allowed-imports infra/, types
 * @responsibility Provides file system operations for the command layer via Dependency Injection.
 *
 * This service acts as the DI bridge so that commands never import from `infra/` directly.
 * Every method here delegates to either `fs-extra` or the `infra/files.ts` module.
 * Commands layer receives this service through CommandContext.
 *
 * @architecture DI pattern — commands layer gets file capabilities through this
 * app-layer adapter instead of reaching into infra, preserving the commands -> app
 * -> infra dependency direction.
 */

import path from 'path';

import fs from 'fs-extra';

import { files } from '../infra/files.js';

export class FileOperationsService {
  /**
   * Check if a path exists
   */
  pathExists(target: string): boolean {
    return fs.existsSync(target);
  }

  /**
   * List all subdirectories in a directory (excluding hidden ones)
   */
  listSubdirectories(dirPath: string): string[] {
    if (!fs.existsSync(dirPath)) return [];
    try {
      return fs.readdirSync(dirPath).filter((f) => {
        try {
          const p = path.join(dirPath, f);
          return fs.statSync(p).isDirectory() && !f.startsWith('.');
        } catch {
          return false;
        }
      });
    } catch {
      return [];
    }
  }

  /**
   * Scan directory for skill directories (containing SKILL.md or skill.md)
   */
  scanSkillsInDirectory(dirPath: string): string[] {
    if (!fs.existsSync(dirPath)) return [];
    const skills: string[] = [];
    try {
      const items = fs.readdirSync(dirPath);
      for (const item of items) {
        const p = path.join(dirPath, item);
        try {
          if (!fs.statSync(p).isDirectory() || item.startsWith('.')) continue;
          const dirFiles = fs.readdirSync(p);
          if (dirFiles.some((file) => file.toLowerCase() === 'skill.md')) {
            skills.push(item);
          }
        } catch {
          continue;
        }
      }
    } catch {
      // Directory read failed
    }
    return skills;
  }

  /**
   * Check if a file exists
   */
  fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Read file content
   */
  readFile(filePath: string): string | null {
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Ensure directory exists
   */
  async ensureDir(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
  }

  /**
   * Get directory hash for comparison
   */
  async getDirectoryHash(dirPath: string): Promise<string | null> {
    return files.getDirectoryHash(dirPath);
  }

  /**
   * Write file content
   */
  writeFileSync(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Read file content synchronously
   */
  readFileSync(filePath: string): string | null {
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Create directory recursively
   */
  mkdirSync(dirPath: string): void {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
