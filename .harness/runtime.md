---
working_directory: .
install_command: npm install
build_command: npm run build
start_command: npx vitest run
access_url: none
healthcheck_method: test-suite
healthcheck_url: none
---

# Runtime Notes

## Prerequisites

- Node.js 18+
- npm

## Startup Steps

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Run CLI commands:
   ```bash
   node dist/cli.js --help
   node dist/cli.js list agents
   node dist/cli.js list skills
   ```

## Verification Commands

### Sprint 4 Test Suite

```bash
# Run full test suite (should report 0 failures, 519+ tests)
npx vitest run

# Generate coverage report (should show 80%+ for app/ and commands/)
npm run test:coverage

# ESLint (should report 0 errors, 0 warnings)
npm run lint

# Prettier check
npm run format:check

# TypeScript compilation
npx tsc --noEmit

# Build the project
npm run build

# Architecture boundary tests
npx vitest run tests/architecture/layer-boundaries.test.ts
```

## Current Status (Post-Sprint 4)

- ESLint errors: 0
- ESLint warnings: 0
- Layer violations: 0
- `src/app/` line coverage: 85.77% (target 80% -- PASSED)
- `src/commands/` line coverage: 81.11% (target 80% -- PASSED)
- Architecture tests: 12 passed
- Tests: 519 passed, 0 failures
- Build: succeeds
- CLI: runs successfully (exit code 0)

## Sprint 4 Changes

### New Test Files
- `tests/cli.test.ts` -- tests for `cli.ts` entry point (`isFirstRun`, `showWelcome`)
- `tests/app/file-operations.test.ts` -- tests for `FileOperationsService` (11 methods)
- `tests/app/cli-formatting.test.ts` -- tests for pure formatting functions
- `tests/integration/add-skill-workflow.test.ts` -- integration test for add skill workflow
- `tests/integration/sync-workflow.test.ts` -- integration test for sync/unsync workflows
- `tests/integration/import-workflow.test.ts` -- integration test for import workflow
- `tests/helpers/mock-context.ts` -- shared mock factory for `CommandContext` and `FileOperationsService`

### Modified Test Files
- `tests/commands/import.test.ts` -- expanded to 21 tests; refactored to use shared helper
- `tests/commands/sync.test.ts` -- expanded to 19 tests; refactored to use shared helper
- `tests/commands/list.test.ts` -- expanded to 12 tests; refactored to use shared helper
- `tests/commands/unsync.test.ts` -- refactored to use shared helper
- `tests/commands/show.test.ts` -- refactored to use shared helper
- `tests/commands/completion.test.ts` -- refactored to use shared helper
- `tests/commands/remove.test.ts` -- refactored to use shared helper
- `tests/app/file-operations.test.ts` -- lint fix (removed unused `vi`, refactored non-null assertion)
- `tests/app/cli-formatting.test.ts` -- lint fix (removed unused `beforeEach`)
- `tests/cli.test.ts` -- removed unused `os` import, removed unused `launchCLI` import

### Source File Changes
- No source files modified. `src/cli.ts` already exports `isFirstRun` and `showWelcome` (added in prior work).