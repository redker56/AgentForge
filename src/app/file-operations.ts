/**
 * File Operations Service - Provides file system operations for command layer
 * This service abstracts file system operations for commands to use
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
      return fs.readdirSync(dirPath).filter(f => {
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
          const files = fs.readdirSync(p);
          if (files.some(file => file.toLowerCase() === 'skill.md')) {
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
