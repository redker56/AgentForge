/**
 * Custom ESLint Plugin: Layer Rules
 *
 * Enforces architecture layer boundaries:
 * - types.ts can be imported by anyone
 * - infra/ can only import from types.ts
 * - app/ can import from infra/, types.ts
 * - commands/ can import from app/, types.ts
 * - tui/ can import from app/, types.ts
 */

const noCrossLayerImports = require('./no-cross-layer-imports.cjs');

module.exports = {
  rules: {
    'no-cross-layer-imports': noCrossLayerImports,
  },
};
