// @ts-check
/**
 * ESLint Configuration for AgentForge
 *
 * Enforces:
 * - TypeScript strict rules
 * - Import ordering
 * - Layer boundary rules (custom rule)
 */

const path = require('path');

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.eslint.json',
  },
  plugins: ['@typescript-eslint', 'import', 'layer-rules'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/strict',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  rules: {
    // TypeScript strict rules
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/require-await': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/no-floating-promises': 'error',

    // Import rules
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc' },
      },
    ],
    'import/no-duplicates': 'error',
    'import/no-cycle': 'error',

    // Custom layer boundary rule
    'layer-rules/no-cross-layer-imports': 'error',
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: path.join(__dirname, 'tsconfig.eslint.json'),
      },
    },
  },
  overrides: [
    {
      // Test files can have relaxed rules
      files: ['tests/**/*.ts', 'tests/**/*.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        'import/no-named-as-default-member': 'off',
      },
    },
    {
      // Custom rule files don't need strict checks
      files: ['eslint-rules/**/*.cjs'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
    {
      // fs-extra is a CommonJS package that does not support named ESM exports.
      // The default import pattern `import fs from 'fs-extra'` is the correct
      // ESM/CJS interop approach. Suppress the false-positive warning.
      files: ['src/**/*.ts', 'src/**/*.tsx'],
      rules: {
        'import/no-named-as-default-member': 'off',
      },
    },
  ],
};
