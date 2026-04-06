/**
 * @module Infra/Files
 * @layer infra
 * @allowed-imports types
 * @responsibility File system utilities — copy, remove, symlink, hash, cleanup.
 *
 * Low-level file system helpers used by the application and infrastructure
 * layers. All operations are async unless explicitly named with a `Sync`
 * suffix.
 *
 * @architecture Infrastructure layer — must only import from `types.ts` (currently
 * imports none, which is the correct pattern for pure infra modules). Uses `fs-extra`
 * and Node's `crypto` module.
 */

import crypto from 'crypto';
import os from 'os';
import path from 'path';

import fs from 'fs-extra';

export const files = {
  async copy(src: string, dest: string): Promise<void> {
    await fs.ensureDir(path.dirname(dest));
    await fs.copy(src, dest, { overwrite: true });
  },

  async remove(target: string): Promise<void> {
    await fs.remove(target);
  },

  exists(target: string): boolean {
    return fs.existsSync(target);
  },

  async ensureDir(dir: string): Promise<void> {
    await fs.ensureDir(dir);
  },

  /**
   * Create symbolic link
   * @param src Source path
   * @param dest Target path
   * @returns Success status
   */
  async symlink(src: string, dest: string): Promise<boolean> {
    try {
      // Ensure target directory exists
      await fs.ensureDir(path.dirname(dest));

      // If target exists, remove it first
      if (fs.existsSync(dest)) {
        await fs.remove(dest);
      }

      // Use junction type on Windows (doesn't require admin privileges)
      const type = os.platform() === 'win32' ? 'junction' : 'dir';

      await fs.symlink(src, dest, type);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if path is a symbolic link
   */
  isSymlink(target: string): boolean {
    try {
      if (!fs.existsSync(target)) return false;
      const stats = fs.lstatSync(target);
      return stats.isSymbolicLink();
    } catch {
      return false;
    }
  },

  /**
   * Get real path that symbolic link points to
   */
  readSymlink(target: string): string | null {
    try {
      if (!fs.existsSync(target)) return null;
      return fs.readlinkSync(target);
    } catch {
      return null;
    }
  },

  /**
   * Clean up unnecessary files in skill directory
   * Deletes: .git/, .gitignore, .github/, LICENSE, README.md (if SKILL.md exists)
   */
  async cleanupSkillDir(skillPath: string): Promise<void> {
    const toRemove: string[] = [];

    // Directories to remove
    const excludeDirs = ['.git', '.github', '.gitlab'];

    // Files to remove (case-insensitive)
    const excludePatterns = [
      /^\.gitignore$/i,
      /^license$/i,
      /^license\.md$/i,
      /^license\.txt$/i,
      /^contributing$/i,
      /^contributing\.md$/i,
      /^changelog$/i,
      /^changelog\.md$/i,
      /^code.?of.?conduct$/i,
      /^code.?of.?conduct\.md$/i,
      /^security$/i,
      /^security\.md$/i,
      /^\.env\.example$/i,
    ];

    // Check if SKILL.md exists
    const entries = fs.existsSync(skillPath) ? fs.readdirSync(skillPath) : [];
    const hasSkillMd = entries.some((e) => e.toUpperCase() === 'SKILL.MD');

    // If SKILL.md exists, also delete README
    if (hasSkillMd) {
      excludePatterns.push(
        /^readme$/i,
        /^readme\.md$/i,
        /^readme\.txt$/i,
        /^readme\.[a-z]{2}(-[a-z]{2})?\.md$/i
      );
    }

    // Collect items to remove
    for (const entry of entries) {
      const entryPath = path.join(skillPath, entry);
      const entryStat = fs.statSync(entryPath);

      if (entryStat.isDirectory()) {
        if (excludeDirs.some((d) => d.toLowerCase() === entry.toLowerCase())) {
          toRemove.push(entryPath);
        }
      } else {
        if (excludePatterns.some((p) => p.test(entry))) {
          toRemove.push(entryPath);
        }
      }
    }

    // Remove
    for (const p of toRemove) {
      await fs.remove(p);
    }
  },

  /**
   * Calculate MD5 hash of a file
   */
  fileHash(filePath: string): string | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      const content = fs.readFileSync(filePath);
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return null;
    }
  },

  /**
   * Calculate hash of directory contents
   * Recursively reads all files in directory and computes combined hash
   */
  async getDirectoryHash(dirPath: string): Promise<string | null> {
    try {
      if (!fs.existsSync(dirPath)) return null;

      const getFilesHash = async (dir: string, base: string = ''): Promise<string[]> => {
        const hashes: string[] = [];
        const entries = await fs.readdir(dir);

        for (const entry of entries) {
          if (entry.startsWith('.')) continue;

          const fullPath = path.join(dir, entry);
          const relativePath = base ? `${base}/${entry}` : entry;
          const entryStat = await fs.stat(fullPath);

          if (entryStat.isDirectory()) {
            hashes.push(...(await getFilesHash(fullPath, relativePath)));
          } else {
            const content = await fs.readFile(fullPath);
            const hash = crypto
              .createHash('md5')
              .update(relativePath)
              .update(content)
              .digest('hex');
            hashes.push(hash);
          }
        }
        return hashes;
      };

      const hashes = await getFilesHash(dirPath);
      // Combine all file hashes and hash again
      hashes.sort(); // Ensure consistent order
      const combined = hashes.join('');
      return crypto.createHash('md5').update(combined).digest('hex');
    } catch {
      return null;
    }
  },

  /**
   * Compare two directories for content equality
   * Returns: 'same' | 'different' | 'target-empty' | 'source-empty'
   */
  compareDirs(
    sourcePath: string,
    targetPath: string
  ): 'same' | 'different' | 'target-empty' | 'source-empty' {
    if (!fs.existsSync(sourcePath)) return 'source-empty';
    if (!fs.existsSync(targetPath)) return 'target-empty';

    // Get all files in source directory (excluding hidden files)
    const getSourceFiles = (dir: string, base: string = ''): string[] => {
      const result: string[] = [];
      const entries = fs.readdirSync(dir);

      for (const entry of entries) {
        if (entry.startsWith('.')) continue;

        const fullPath = path.join(dir, entry);
        const relativePath = base ? `${base}/${entry}` : entry;
        const entryStat = fs.statSync(fullPath);

        if (entryStat.isDirectory()) {
          result.push(...getSourceFiles(fullPath, relativePath));
        } else {
          result.push(relativePath);
        }
      }
      return result;
    };

    const sourceFiles = getSourceFiles(sourcePath);
    const targetFiles = getSourceFiles(targetPath);

    // Different file count
    if (sourceFiles.length !== targetFiles.length) return 'different';

    // Different file names
    const sourceSet = new Set(sourceFiles);
    const targetSet = new Set(targetFiles);
    for (const f of sourceSet) {
      if (!targetSet.has(f)) return 'different';
    }

    // Compare file contents
    for (const file of sourceFiles) {
      const sourceHash = this.fileHash(path.join(sourcePath, file));
      const targetHash = this.fileHash(path.join(targetPath, file));
      if (sourceHash !== targetHash) return 'different';
    }

    return 'same';
  },
};
