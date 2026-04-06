# Sprint 03 Fix Log

## Source QA Report
- report: `.harness/qa/sprint-03-qa-report.md`

## Fixes Applied

| Bug ID | Change | Files | Notes |
|--------|--------|-------|-------|
| BUG-01 | Reverted 6 files from named `fs-extra` ESM imports back to default import `import fs from 'fs-extra'` with `fs.method()` access pattern. `fs-extra` is CommonJS and does not expose named ESM exports, causing `SyntaxError: Named export 'existsSync' not found` at runtime. | `src/infra/files.ts`, `src/infra/storage.ts`, `src/app/file-operations.ts`, `src/app/project-storage.ts`, `src/app/sync/project-sync-service.ts`, `src/tui/store/dataSlice.ts` | All 6 files changed from `import { existsSync, ... } from 'fs-extra'` back to `import fs from 'fs-extra'`, with all call sites updated to `fs.existsSync()` etc. |
| BUG-01 | Added ESLint override to disable `import/no-named-as-default-member` rule for `src/**/*.ts` and `src/**/*.tsx`. | `.eslintrc.cjs` | The rule fires on every `fs.method()` call site for CJS packages. Since `fs-extra` is a known CJS package where default import is the correct ESM interop pattern, the rule is disabled project-wide for source files (test files already had it disabled). |
| BUG-01 | Ran Prettier on the 6 changed source files to ensure formatting consistency. | `src/infra/files.ts`, `src/infra/storage.ts`, `src/app/file-operations.ts`, `src/app/project-storage.ts`, `src/app/sync/project-sync-service.ts`, `src/tui/store/dataSlice.ts` | Sprint 3 changes had reformatted imports but not run Prettier afterward. |

## Deferred Or Unresolved Items

- **Pre-existing test failure**: `tests/tui/hooks/useInput.test.tsx` (1 test) fails with a regex mismatch (`showSearch.*\n.*escape`). This test reads the source of `useInput.ts` and matches against code patterns. It was broken by Sprint 3 refactoring of `useInput.ts` and is unrelated to the P0 `fs-extra` fix. Out of scope for this fix cycle.
- **Prettier formatting**: 69 other files have Prettier formatting warnings (pre-existing from Sprint 3 changes). Only the 6 files modified in this fix cycle were formatted. The remaining files are out of scope.

## Verification Notes

All verifications performed against the fixed working tree:

1. **`npm run build`** -- succeeds (exit code 0)
2. **`node dist/cli.js --help`** -- runs without error (exit code 0, no SyntaxError)
3. **`npm run lint`** -- 0 errors, 0 warnings
4. **`npm test`** -- 410/411 tests pass (1 pre-existing failure in `useInput.test.tsx`, unrelated to this fix)
5. **Prettier** -- the 6 changed files are formatted; 69 other files have pre-existing formatting issues from Sprint 3
