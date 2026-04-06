/**
 * Custom ESLint Rule: No Cross-Layer Imports
 *
 * Enforces the three-layer architecture:
 * - types.ts can be imported by anyone
 * - infra/ can only import from types.ts
 * - app/ can import from infra/, types.ts
 * - commands/ can import from app/, types.ts
 * - tui/ can import from app/, types.ts
 */

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce layer boundary rules - no cross-layer imports',
      recommended: true,
    },
    messages: {
      infraImportFromApp:
        'Layer violation: infra/ cannot import from app/ or commands/. infra/ should only import from types.ts',
      infraImportFromTui:
        'Layer violation: infra/ cannot import from tui/. infra/ should only import from types.ts',
      appImportFromCommands:
        'Layer violation: app/ cannot import from commands/ or tui/. app/ can only import from infra/ and types.ts',
      appImportFromTui:
        'Layer violation: app/ cannot import from tui/. app/ can only import from infra/ and types.ts',
      commandsImportFromInfra:
        'Layer violation: commands/ cannot import directly from infra/. Use FileOperationsService from app/ instead',
      commandsImportFromTui:
        'Layer violation: commands/ cannot import from tui/. commands/ can only import from app/ and types.ts',
      tuiImportFromInfra:
        'Layer violation: tui/ cannot import directly from infra/. Use CommandContext to access services from app/ instead',
      tuiImportFromCommands:
        'Layer violation: tui/ cannot import from commands/. tui/ can only import from app/ and types.ts',
      typesImportFromLayers:
        'Layer violation: types.ts should not import from any layer. types.ts should have no runtime dependencies',
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();
    const normalizedFilename = filename.replace(/\\/g, '/');

    // Determine the layer of the current file
    function getLayer(filePath) {
      if (filePath.endsWith('src/types.ts') || filePath.includes('/types.ts')) {
        return 'types';
      }
      if (filePath.includes('/infra/')) {
        return 'infra';
      }
      if (filePath.includes('/app/')) {
        return 'app';
      }
      if (filePath.includes('/commands/')) {
        return 'commands';
      }
      if (filePath.includes('/tui/')) {
        return 'tui';
      }
      // Check for top-level files like cli.ts, tui.ts, entry.ts
      if (filePath.includes('/src/cli.ts') || filePath.includes('/src/tui.ts') || filePath.includes('/src/entry.ts')) {
        return 'root';
      }
      return null;
    }

    // Determine the layer being imported
    function getImportLayer(importPath) {
      if (importPath.includes('/types') || importPath.endsWith('types.js') || importPath.endsWith('types.ts')) {
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

    // Check if import is relative (internal to project)
    function isInternalImport(importPath) {
      return importPath.startsWith('.') || importPath.startsWith('..');
    }

    const currentLayer = getLayer(normalizedFilename);

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;

        // Only check internal imports
        if (!isInternalImport(importPath)) {
          return;
        }

        const importLayer = getImportLayer(importPath);

        // Skip if we can't determine layers
        if (!currentLayer || !importLayer) {
          return;
        }

        // Skip root layer files (cli.ts, tui.ts, entry.ts) - they can import from any layer
        if (currentLayer === 'root') {
          return;
        }

        // Same layer imports are allowed
        if (currentLayer === importLayer) {
          return;
        }

        // types.ts can be imported by anyone
        if (importLayer === 'types') {
          return;
        }

        // Define allowed import rules per layer
        const allowedImports = {
          types: [], // types.ts should not import from any layer
          infra: ['types'],
          app: ['types', 'infra'],
          commands: ['types', 'app'],
          tui: ['types', 'app'],
        };

        // Check if import is allowed
        const allowed = allowedImports[currentLayer] || [];
        if (allowed.includes(importLayer)) {
          return;
        }

        // Generate appropriate error message
        let messageId;

        if (currentLayer === 'infra') {
          if (importLayer === 'app') {
            messageId = 'infraImportFromApp';
          } else if (importLayer === 'commands') {
            messageId = 'infraImportFromApp';
          } else if (importLayer === 'tui') {
            messageId = 'infraImportFromTui';
          }
        } else if (currentLayer === 'app') {
          if (importLayer === 'commands') {
            messageId = 'appImportFromCommands';
          } else if (importLayer === 'tui') {
            messageId = 'appImportFromTui';
          }
        } else if (currentLayer === 'commands') {
          if (importLayer === 'infra') {
            messageId = 'commandsImportFromInfra';
          } else if (importLayer === 'tui') {
            messageId = 'commandsImportFromTui';
          }
        } else if (currentLayer === 'tui') {
          if (importLayer === 'infra') {
            messageId = 'tuiImportFromInfra';
          } else if (importLayer === 'commands') {
            messageId = 'tuiImportFromCommands';
          }
        } else if (currentLayer === 'types') {
          messageId = 'typesImportFromLayers';
        }

        if (messageId) {
          context.report({
            node,
            messageId,
          });
        }
      },
    };
  },
};
