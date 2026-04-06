# Sprint 03 QA Report

**Result**: FAIL

---

## Executive Summary

Sprint 3 set out to achieve zero ESLint errors/warnings, consistent Prettier formatting, JSDoc documentation, and elimination of technical debt. The static analysis toolchain passes cleanly: ESLint reports 0 errors and 0 warnings, Prettier check passes, `tsc --noEmit` succeeds, all 411 tests pass, and all 12 architecture boundary tests report zero violations.

However, the implementation introduces a **P0 runtime regression**: the CLI binary crashes at startup due to named ESM imports from `fs-extra`, a CommonJS package that does not expose named exports. Six source files were changed from `import fs from 'fs-extra'` to `import { existsSync, ... } from 'fs-extra'`. This change satisfies the `import/no-named-as-default-member` ESLint rule but breaks the built artifact at runtime with `SyntaxError: Named export 'existsSync' not found`. The committed HEAD (pre-Sprint-3) builds and runs correctly; the Sprint 3 working tree does not.

Because the primary user path (`node dist/cli.js --help`) cannot be completed, the sprint fails.

---

## Primary Path Exercise

- **Flow**: Build the project, then run `node dist/cli.js --help`
- **Result**: FAIL
- **Evidence**:
  1. `npm run build` succeeds (TypeScript compilation passes).
  2. `node dist/cli.js --help` crashes with:
     ```
     SyntaxError: Named export 'existsSync' not found. The requested module 'fs-extra'
     is a CommonJS module, which may not support all module.exports as named exports.
     ```
     at `dist/infra/files.js:11`.
  3. Verified the committed HEAD builds and runs the same command successfully (exit code 0, no crash).
  4. The crash originates from Sprint 3 changes converting `import fs from 'fs-extra'` to named imports in 6 files.

---

## Contract Behaviors

| # | Behavior | Result | Evidence |
|---|----------|--------|----------|
| 1 | Zero ESLint errors | PASS | `npm run lint` exits code 0, no output (0 errors, 0 warnings) |
| 2 | Zero ESLint warnings | PASS | `npm run lint` exits code 0, no output |
| 3 | All existing tests pass | PASS | 411 tests pass across 52 test files |
| 4 | Build succeeds | PASS | `npm run build` completes with exit code 0 |
| 5 | Code formatted consistently | PASS | `npm run format:check` reports "All matched files use Prettier code style!" |
| 6 | No layer violations introduced | PASS | Architecture boundary tests: 12 passed, 0 violations |
| 7 | CLI functionality preserved | **FAIL** | `node dist/cli.js --help` crashes with SyntaxError (exit code 1) |

---

## Bugs

| Bug ID | Severity | Summary | Reproduction | Notes |
|--------|----------|---------|--------------|-------|
| BUG-01 | P0 | CLI crashes at startup: named ESM imports from CJS `fs-extra` fail at runtime | `npm run build && node dist/cli.js --help` | Regression from Sprint 3 Step 11 (`import/no-named-as-default-member` fix). Affects 6 source files. |

### BUG-01 Details

**Root cause**: The Sprint 3 contract Step 11 instructed changing `import fs from 'fs-extra'` (default import) to `import { existsSync, ... } from 'fs-extra'` (named imports) to satisfy the `import/no-named-as-default-member` ESLint rule. However, `fs-extra` is a CommonJS package. Node.js ESM loader cannot resolve named exports from CJS packages unless the package explicitly provides an `exports` map with named entries. `fs-extra` does not.

**Files affected** (all changed from default to named `fs-extra` imports):

1. `src/infra/files.ts` -- `import { copy, ensureDir, existsSync, lstatSync, readlinkSync, readdir, readdirSync, readFile, readFileSync, remove, stat, statSync, symlink } from 'fs-extra'`
2. `src/infra/storage.ts` -- `import { ensureDirSync, existsSync, readFileSync, writeFileSync } from 'fs-extra'`
3. `src/app/file-operations.ts` -- `import { ensureDir, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs-extra'`
4. `src/app/project-storage.ts` -- `import { ensureDirSync, existsSync, readJsonSync, writeJsonSync } from 'fs-extra'`
5. `src/app/sync/project-sync-service.ts` -- `import { existsSync } from 'fs-extra'`
6. `src/tui/store/dataSlice.ts` -- `import { existsSync, readFileSync } from 'fs-extra'`

**Files NOT affected** (kept default import, would still work at runtime):
- `src/cli.ts`, `src/infra/git.ts`, `src/app/scan-service.ts`, `src/app/skill-service.ts`

**Why tests still pass**: Tests mock `fs-extra` at the module level via `vi.mock('fs-extra')`, so the named import issue never surfaces during test execution.

**Recommended fix**: Revert all 6 files back to `import fs from 'fs-extra'` and access methods via `fs.existsSync(...)` etc. Then suppress the `import/no-named-as-default-member` rule for `fs-extra` imports (e.g., via an ESLint override or inline disable comment) since `fs-extra` is a known CJS package where default import is the correct ESM interop pattern.

---

## Hard-Fail Gates

| Gate | Status | Evidence |
|------|--------|----------|
| Locked architecture respected | PASS | 12 architecture tests pass, 0 layer violations |
| CLI functionality preserved (spec Non-Goals) | **FAIL** | `node dist/cli.js --help` crashes (BUG-01) |
| All existing tests pass | PASS | 411/411 tests pass |
| Build succeeds | PASS | `npm run build` exits 0 |
| No regressions in existing functionality | **FAIL** | Runtime crash is a regression from committed HEAD |

---

## Deduction Ledger

| Dimension | Rule | Deduction | Evidence | Notes |
|-----------|------|-----------|----------|-------|
| Functional correctness | P0 -- core behavior broken | Hard fail | `node dist/cli.js --help` crashes with SyntaxError | CLI binary is unusable after Sprint 3 changes |
| Functional correctness | P1 -- important behavior unreliable | -2 | Tests pass but cannot detect the CJS/ESM interop break because mocks replace `fs-extra` | The 411 tests give false confidence; the runtime is broken |
| Code quality | Architectural compliance -- new pattern introduces runtime failure | -1 | 6 files changed to named imports from CJS package per ESLint rule, without verifying runtime behavior | Fixing a lint warning should not break production |

---

## Scorecard

| Dimension | Score | Threshold | Pass? | Notes |
|-----------|-------|-----------|-------|-------|
| Product depth | 10 | 7 | PASS | All in-scope deliverables present: ESLint zero errors/warnings, Prettier formatting, JSDoc documentation, CommanderStatic fix, import ordering, duplicate saveSkill verified resolved. No product depth deductions apply. |
| Functional correctness | 0 | 8 | **FAIL** | P0 bug: CLI crashes at startup. Hard-fail gate triggered. |
| Visual design | N/A | 6 | PASS | N/A for this refactoring sprint (no UI changes) |
| Code quality | 9 | 7 | PASS | JSDoc comprehensive, import ordering consistent, type improvements (`Command` vs `any`), `StorageInterface` usage. Deducted 1 for runtime-breaking lint fix pattern (architectural compliance). |

---

## Verdict

- **FAIL** -- The sprint introduces a P0 runtime regression that makes the CLI binary completely unusable.
- Any FAIL in Hard-Fail Gates forces overall Result: FAIL.
- The static analysis improvements (zero ESLint, zero Prettier violations, JSDoc) are genuine and well-executed. However, the `import/no-named-as-default-member` fix applied to `fs-extra` imports trades a lint warning for a runtime crash, which is a net negative.
- The self-check correctly identified this issue but dismissed it as "pre-existing." This is inaccurate: the committed HEAD builds and runs correctly. The crash is a direct result of Sprint 3 changes.

## Recommendations

1. **Revert named `fs-extra` imports**: Change all 6 affected files back to `import fs from 'fs-extra'` and use `fs.method()` access pattern. This is the correct ESM/CJS interop pattern.
2. **Suppress the lint rule for `fs-extra`**: Add an ESLint override or disable the `import/no-named-as-default-member` rule for files importing from `fs-extra`, since it is a known CJS package.
3. **Add a runtime smoke test**: Include `node dist/cli.js --help` as a verification step (the contract listed it but the self-check noted it fails without flagging it as a blocker).
4. **Consider an ESM/CJS integration test**: A minimal test that imports the built entry point without mocking `fs-extra` would catch this class of regression.
