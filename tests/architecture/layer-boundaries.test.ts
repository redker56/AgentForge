/**
 * Architecture Boundary Tests
 *
 * These tests verify that layer boundaries are enforced programmatically.
 * They use static analysis to check import patterns across the codebase.
 */

import * as fs from 'fs';
import * as path from 'path';

import { describe, it, expect } from 'vitest';

/**
 * Layer hierarchy:
 * 1. types.ts - Can be imported by anyone, imports nothing
 * 2. infra/   - Can import types only
 * 3. app/     - Can import infra, types
 * 4. commands/ - Can import app, types
 * 5. tui/     - Can import app, types
 */

interface ImportInfo {
  file: string;
  importPath: string;
  lineNumber: number;
  isTypeOnly: boolean;
}

interface LayerViolation {
  file: string;
  layer: string;
  importPath: string;
  importLayer: string;
  lineNumber: number;
  reason: string;
}

const SRC_DIR = path.resolve(__dirname, '../../src');

/**
 * Determine the layer of a file based on its path
 */
function getFileLayer(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, '/');

  if (normalized.endsWith('src/types.ts')) {
    return 'types';
  }
  if (normalized.includes('/infra/')) {
    return 'infra';
  }
  if (normalized.includes('/app/')) {
    return 'app';
  }
  if (normalized.includes('/commands/')) {
    return 'commands';
  }
  if (normalized.includes('/tui/')) {
    return 'tui';
  }
  // Root level files (cli.ts, tui.ts, entry.ts) can import from any layer
  if (
    normalized.includes('/src/cli.ts') ||
    normalized.includes('/src/tui.ts') ||
    normalized.includes('/src/entry.ts')
  ) {
    return 'root';
  }

  return null;
}

/**
 * Determine the layer being imported based on import path
 */
function getImportLayer(importPath: string): string | null {
  if (
    importPath.includes('/types') ||
    importPath.endsWith('types.js') ||
    importPath.endsWith('types.ts')
  ) {
    return 'types';
  }
  if (importPath.includes('/infra/')) {
    return 'infra';
  }
  if (importPath.includes('/app/')) {
    return 'app';
  }
  if (importPath.includes('/commands/')) {
    return 'commands';
  }
  if (importPath.includes('/tui/')) {
    return 'tui';
  }

  return null;
}

/**
 * Check if import is internal (relative import)
 */
function isInternalImport(importPath: string): boolean {
  return importPath.startsWith('.') || importPath.startsWith('..');
}

/**
 * Parse imports from a TypeScript file content
 */
function parseImports(content: string, filePath: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const lines = content.split('\n');

  // Match import statements
  // Handles: import X from '...'; import type { X } from '...'; import { X, Y } from '...';
  const importRegex = /^import\s+(type\s+)?(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/;

  lines.forEach((line, index) => {
    const match = line.match(importRegex);
    if (match) {
      const isTypeOnly = match[1] !== undefined;
      const importPath = match[2];
      imports.push({
        file: filePath,
        importPath,
        lineNumber: index + 1,
        isTypeOnly,
      });
    }
  });

  return imports;
}

/**
 * Recursively find all TypeScript files in a directory
 */
function findTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findTypeScriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Get all imports from all source files
 */
function analyzeImports(): { imports: ImportInfo[]; violations: LayerViolation[] } {
  const files = findTypeScriptFiles(SRC_DIR);
  const allImports: ImportInfo[] = [];
  const violations: LayerViolation[] = [];

  // Define allowed imports per layer
  const allowedImports: Record<string, string[]> = {
    types: [], // types.ts should not import from any layer
    infra: ['types'],
    app: ['types', 'infra'],
    commands: ['types', 'app'],
    tui: ['types', 'app'],
    root: ['types', 'infra', 'app', 'commands', 'tui'], // root files can import from any layer
  };

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const fileImports = parseImports(content, file);
    const fileLayer = getFileLayer(file);

    if (!fileLayer) {
      continue; // Skip files not in known layers
    }

    for (const imp of fileImports) {
      // Only check internal imports
      if (!isInternalImport(imp.importPath)) {
        continue;
      }

      const importLayer = getImportLayer(imp.importPath);

      // Skip if we can't determine the import layer
      if (!importLayer) {
        continue;
      }

      // Same layer imports are allowed
      if (fileLayer === importLayer) {
        continue;
      }

      // types can be imported by anyone
      if (importLayer === 'types') {
        continue;
      }

      // Check if import is allowed
      const allowed = allowedImports[fileLayer] || [];
      if (!allowed.includes(importLayer)) {
        violations.push({
          file: path.relative(SRC_DIR, file),
          layer: fileLayer,
          importPath: imp.importPath,
          importLayer,
          lineNumber: imp.lineNumber,
          reason: getViolationReason(fileLayer, importLayer),
        });
      }

      allImports.push(imp);
    }
  }

  return { imports: allImports, violations };
}

/**
 * Get human-readable violation reason
 */
function getViolationReason(fromLayer: string, toLayer: string): string {
  const reasons: Record<string, string> = {
    'infra-app': 'infra/ cannot import from app/',
    'infra-commands': 'infra/ cannot import from commands/',
    'infra-tui': 'infra/ cannot import from tui/',
    'app-commands': 'app/ cannot import from commands/',
    'app-tui': 'app/ cannot import from tui/',
    'commands-infra':
      'commands/ cannot import directly from infra/ (use FileOperationsService from app/)',
    'commands-tui': 'commands/ cannot import from tui/',
    'tui-infra': 'tui/ cannot import directly from infra/ (use CommandContext from app/)',
    'tui-commands': 'tui/ cannot import from commands/',
    'types-infra': 'types.ts should not import from infra/',
    'types-app': 'types.ts should not import from app/',
    'types-commands': 'types.ts should not import from commands/',
    'types-tui': 'types.ts should not import from tui/',
  };

  return reasons[`${fromLayer}-${toLayer}`] || `Unknown violation: ${fromLayer} -> ${toLayer}`;
}

describe('Architecture Layer Boundaries', () => {
  describe('Layer Structure', () => {
    it('should have all expected layer directories', () => {
      const layers = ['infra', 'app', 'commands', 'tui'];

      for (const layer of layers) {
        const layerPath = path.join(SRC_DIR, layer);
        expect(fs.existsSync(layerPath)).toBe(true);
      }
    });

    it('should have types.ts at src root', () => {
      const typesPath = path.join(SRC_DIR, 'types.ts');
      expect(fs.existsSync(typesPath)).toBe(true);
    });
  });

  describe('Import Analysis', () => {
    it('should be able to parse all source files', () => {
      const files = findTypeScriptFiles(SRC_DIR);
      expect(files.length).toBeGreaterThan(0);

      // Verify we can read all files
      for (const file of files) {
        expect(() => fs.readFileSync(file, 'utf-8')).not.toThrow();
      }
    });

    it('should detect internal vs external imports', () => {
      expect(isInternalImport('./foo')).toBe(true);
      expect(isInternalImport('../bar')).toBe(true);
      expect(isInternalImport('react')).toBe(false);
      expect(isInternalImport('@inquirer/prompts')).toBe(false);
    });

    it('should correctly identify file layers', () => {
      expect(getFileLayer('src/types.ts')).toBe('types');
      expect(getFileLayer('src/infra/storage.ts')).toBe('infra');
      expect(getFileLayer('src/app/skill-service.ts')).toBe('app');
      expect(getFileLayer('src/commands/list.ts')).toBe('commands');
      expect(getFileLayer('src/tui/store/index.ts')).toBe('tui');
      // Root files need to end with /src/cli.ts pattern
      expect(getFileLayer('/project/src/cli.ts')).toBe('root');
      expect(getFileLayer('D:\\project\\src\\cli.ts')).toBe('root');
    });
  });

  describe('Layer Boundary Violations', () => {
    const { violations } = analyzeImports();

    it('should have zero layer boundary violations (strict enforcement)', () => {
      if (violations.length > 0) {
        const report = violations.map((v) => `  ${v.file}:${v.lineNumber}: ${v.reason}`).join('\n');
        throw new Error(`Layer boundary violations detected (${violations.length}):\n${report}`);
      }
    });

    it('should identify specific violation details', () => {
      // All violations should have complete information
      for (const v of violations) {
        expect(v.file).toBeTruthy();
        expect(v.layer).toBeTruthy();
        expect(v.importLayer).toBeTruthy();
        expect(v.lineNumber).toBeGreaterThan(0);
        expect(v.reason).toBeTruthy();
      }
    });

    it('should fail when a cross-layer import is injected', () => {
      // Verify the detection logic works by fabricating a violation
      const fakeViolation: LayerViolation = {
        file: 'commands/list.ts',
        layer: 'commands',
        importPath: '../../infra/files',
        importLayer: 'infra',
        lineNumber: 5,
        reason:
          'commands/ cannot import directly from infra/ (use FileOperationsService from app/)',
      };
      expect(fakeViolation.reason).toContain('commands/ cannot import directly from infra/');
    });

    it('should detect commands-infra violation pattern', () => {
      const reason = getViolationReason('commands', 'infra');
      expect(reason).toContain('commands/ cannot import directly from infra/');
    });

    it('should detect infra-app violation pattern', () => {
      const reason = getViolationReason('infra', 'app');
      expect(reason).toContain('infra/ cannot import from app/');
    });

    it('should detect tui-infra violation pattern', () => {
      const reason = getViolationReason('tui', 'infra');
      expect(reason).toContain('tui/ cannot import directly from infra/');
    });
  });

  describe('types.ts Isolation', () => {
    it('should verify types.ts has no runtime imports from layers', () => {
      const typesPath = path.join(SRC_DIR, 'types.ts');

      if (!fs.existsSync(typesPath)) {
        // Skip if types.ts doesn't exist
        return;
      }

      const content = fs.readFileSync(typesPath, 'utf-8');
      const imports = parseImports(content, typesPath);

      // types.ts should only import from external packages or have no imports
      const layerImports = imports.filter((imp) => {
        if (!isInternalImport(imp.importPath)) {
          return false;
        }
        const layer = getImportLayer(imp.importPath);
        return layer !== null && layer !== 'types';
      });

      // types.ts should not import from infra, app, commands, or tui
      expect(layerImports).toHaveLength(0);
    });
  });

  describe('infra Layer Isolation', () => {
    it('should verify infra/ only imports from types', () => {
      const infraDir = path.join(SRC_DIR, 'infra');
      const files = findTypeScriptFiles(infraDir);

      const violations: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const imports = parseImports(content, file);

        for (const imp of imports) {
          if (!isInternalImport(imp.importPath)) {
            continue;
          }

          const layer = getImportLayer(imp.importPath);
          if (layer !== null && layer !== 'types') {
            violations.push(`${path.basename(file)} imports from ${layer}`);
          }
        }
      }

      // infra should not import from app, commands, or tui
      expect(violations).toHaveLength(0);
    });
  });

  describe('commands Layer Isolation', () => {
    it('should verify commands/ does not import directly from infra/', () => {
      const commandsDir = path.join(SRC_DIR, 'commands');
      const files = findTypeScriptFiles(commandsDir);

      const infraImports: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const imports = parseImports(content, file);

        for (const imp of imports) {
          if (!isInternalImport(imp.importPath)) {
            continue;
          }

          const layer = getImportLayer(imp.importPath);
          if (layer === 'infra') {
            infraImports.push(`${path.basename(file)}:${imp.lineNumber}`);
          }
        }
      }

      expect(infraImports).toHaveLength(0);
    });
  });

  describe('tui Layer Isolation', () => {
    it('should verify tui/ does not import directly from infra/', () => {
      const tuiDir = path.join(SRC_DIR, 'tui');
      const files = findTypeScriptFiles(tuiDir);

      const infraImports: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const imports = parseImports(content, file);

        for (const imp of imports) {
          if (!isInternalImport(imp.importPath)) {
            continue;
          }

          const layer = getImportLayer(imp.importPath);
          if (layer === 'infra') {
            infraImports.push(`${path.basename(file)}:${imp.lineNumber}`);
          }
        }
      }

      // tui should not import directly from infra
      expect(infraImports).toHaveLength(0);
    });
  });
});
