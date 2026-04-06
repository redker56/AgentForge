# Sprint 4 Contract: Test Coverage & Quality

**Sprint Theme**: Achieve comprehensive test coverage
**Sprint Number**: 4 of 5
**Status**: DRAFT

---

## Summary

Sprint 4 focuses on achieving 80%+ line coverage for `app/` and `commands/` layers by adding tests for untested modules (`cli.ts`, `file-operations.ts`, `cli-formatting.ts`), improving existing test depth, adding integration tests for critical workflows, and standardizing test patterns across the suite. The sprint builds on the zero-violation architecture established in Sprints 1-3.

**Starting State**: 410/411 tests pass (1 pre-existing failure in `tests/tui/hooks/useInput.test.tsx` unrelated to this sprint's scope). Zero ESLint errors, zero layer violations, build passes.

**Coverage Tooling**: `@vitest/coverage-v8@^3.2.4` is already installed and aligned with `vitest@^3.0.0`. `vitest.config.ts` has `provider: 'v8'` but needs `scripts/` and `eslint-rules/` added to the coverage exclusion list.

## Primary Path

1. Update `vitest.config.ts` to add `scripts/` and `eslint-rules/` to coverage excludes
2. Generate baseline coverage report to identify exact gaps
3. Create shared mock helpers in `tests/helpers/mock-context.ts`
4. Add `tests/cli.test.ts` for CLI entry point (test `launchCLI`; refactor `isFirstRun`/`showWelcome` if needed)
5. Add `tests/app/file-operations.test.ts` for FileOperationsService
6. Add `tests/app/cli-formatting.test.ts` for formatting utilities
7. Fix the pre-existing test failure in `useInput.test.tsx`
8. Add integration tests for critical workflows
9. Improve coverage depth in existing test files where branches/lines are uncovered
10. Verify 80%+ coverage for `app/` and `commands/`

---

## In Scope

- Add tests for `cli.ts` entry point (`launchCLI`, and either refactor or mock-test `isFirstRun`/`showWelcome`)
- Add tests for `app/file-operations.ts` (FileOperationsService)
- Add tests for `app/cli-formatting.ts` (pure formatting functions)
- Improve test depth for command modules where branches/lines are uncovered
- Add integration tests for critical CLI workflows (add skill, sync, import, update)
- Fix the 1 pre-existing test failure in `tests/tui/hooks/useInput.test.tsx`
- Standardize mock helper patterns (extract shared `createMockFileOps`, `createMockContext`)
- Update `vitest.config.ts` coverage excludes to include `scripts/` and `eslint-rules/`
- Verify 80%+ line coverage for `app/` and `commands/` directories
- Ensure test suite runs in under 30 seconds

## Out Of Scope

- TUI component tests (already have substantial coverage)
- Architecture boundary tests (Sprint 5)
- Documentation updates to CLAUDE.md (Sprint 5)
- UI/interaction changes
- Performance optimization
- New features
- TUI store/actions tests (already tested via store.test.ts and uiSlice.test.ts)
- TUI screen tests (partially covered; full coverage deferred)

---

## Locked Assumptions

1. **Architecture**: Three-layer pattern is locked and verified (Sprints 1-2)
2. **Code Quality**: Zero ESLint errors, zero warnings, Prettier formatting applied (Sprint 3)
3. **Layer Violations**: Zero layer violations confirmed (maintained since Sprint 2)
4. **Test Stability**: 410/411 tests pass consistently; the 1 failure is pre-existing and unrelated to this sprint's work
5. **Breaking Changes**: No breaking changes to public CLI behavior. Minimal internal refactoring allowed for testability (e.g., exporting `isFirstRun`/`showWelcome` from `cli.ts`).
6. **Coverage Tool**: `@vitest/coverage-v8@^3.2.4` is already installed and version-aligned with vitest.

---

## Files Expected To Change

### New Test Files

| File | Description |
|------|-------------|
| `tests/cli.test.ts` | Tests for `cli.ts` entry point |
| `tests/app/file-operations.test.ts` | Tests for `FileOperationsService` |
| `tests/app/cli-formatting.test.ts` | Tests for formatting utility functions |
| `tests/integration/add-skill-workflow.test.ts` | Integration test: add skill from git |
| `tests/integration/sync-workflow.test.ts` | Integration test: sync/unsync to agents and projects |
| `tests/integration/import-workflow.test.ts` | Integration test: import from project |
| `tests/helpers/mock-context.ts` | Shared mock factory for CommandContext |

### Modified Source Files

| File | Change Type | Description |
|------|-------------|-------------|
| `src/cli.ts` | MODIFY | Export `isFirstRun` and `showWelcome` for testability (minimal change, no behavior change) |
| `vitest.config.ts` | MODIFY | Add `scripts/**` and `eslint-rules/**` to coverage excludes |

### Modified Test Files

| File | Change Type | Description |
|------|-------------|-------------|
| `tests/tui/hooks/useInput.test.tsx` | MODIFY | Fix pre-existing regex test failure (CRLF handling) |
| `tests/commands/import.test.ts` | MODIFY | Optionally add edge case tests for coverage |
| `tests/commands/sync.test.ts` | MODIFY | Optionally add edge case tests for coverage |
| `tests/commands/add.test.ts` | MODIFY | Optionally add edge case tests for coverage |
| Existing command test files | MODIFY | Refactor to use shared mock helpers from `tests/helpers/mock-context.ts` |

---

## Testable Behaviors

| # | Behavior | Verification |
|---|----------|--------------|
| 1 | `cli.ts` tests: `launchCLI` initializes services and registers commands | `npx vitest run tests/cli.test.ts` passes |
| 2 | `cli.ts` tests: `isFirstRun` detects missing registry file | Test spies on `fs.existsSync` and verifies return value |
| 3 | `cli.ts` tests: `showWelcome` outputs formatted welcome text | Test captures `console.log` output |
| 4 | `cli.ts` tests: `launchCLI` first-run shows welcome and exits | Mock `isFirstRun` returns true, verify `process.exit(0)` called |
| 5 | `file-operations.ts` tests: all methods delegate correctly | `npx vitest run tests/app/file-operations.test.ts` passes |
| 6 | `file-operations.ts` tests: `pathExists`, `fileExists` return correct boolean | Tests with temp directory |
| 7 | `file-operations.ts` tests: `listSubdirectories` filters hidden dirs and non-dirs | Tests with temp directory structure |
| 8 | `file-operations.ts` tests: `scanSkillsInDirectory` detects SKILL.md dirs | Tests with temp directory structure |
| 9 | `file-operations.ts` tests: `readFile`/`readFileSync` return null on error | Tests with non-existent paths |
| 10 | `file-operations.ts` tests: `getDirectoryHash` delegates to infra | Mock `files.getDirectoryHash` |
| 11 | `cli-formatting.ts` tests: `sortAgentNamesByPriority` sorts correctly | Unit tests with known agent names |
| 12 | `cli-formatting.ts` tests: `formatSourceLabel` returns correct labels | Unit tests for git and local sources |
| 13 | `cli-formatting.ts` tests: `formatAgentList` sorts and joins correctly | Unit tests |
| 14 | `cli-formatting.ts` tests: `formatProjectSkillList` formats grouped output | Unit tests |
| 15 | Integration: add-skill-workflow completes end-to-end | `npx vitest run tests/integration/add-skill-workflow.test.ts` passes |
| 16 | Integration: sync-workflow syncs and unsyncs to agents/projects | `npx vitest run tests/integration/sync-workflow.test.ts` passes |
| 17 | Integration: import-workflow imports skills from project | `npx vitest run tests/integration/import-workflow.test.ts` passes |
| 18 | Pre-existing test failure fixed | `npx vitest run` reports 0 failures (all 411+ pass) |
| 19 | Coverage report generated successfully | `npm run test:coverage` produces coverage/ directory |
| 20 | 80%+ line coverage for `app/` | `npm run test:coverage` shows >= 80% Lines for `src/app/` |
| 21 | 80%+ line coverage for `commands/` | `npm run test:coverage` shows >= 80% Lines for `src/commands/` |
| 22 | Test suite runs in under 30 seconds | `npx vitest run` Duration < 30s |
| 23 | No layer violations introduced | `npx vitest run tests/architecture/layer-boundaries.test.ts` passes |
| 24 | Build still passes | `npm run build` succeeds |
| 25 | ESLint still passes | `npm run lint` exits with code 0 |

---

## Implementation Steps

### Step 1: Verify Coverage Tooling

`@vitest/coverage-v8@^3.2.4` is already installed and aligned with `vitest@^3.0.0`. Confirm with:

```bash
npm run test:coverage 2>&1 | head -30
```

Update `vitest.config.ts` coverage excludes:

```diff
  coverage: {
    provider: 'v8',
-   reporter: ['text', 'json', 'html'],
+   reporter: ['text', 'json', 'html', 'text-summary'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'tests/**',
      'bin/**',
+     'scripts/**',
+     'eslint-rules/**',
    ],
  },
```

Run baseline:
```bash
npm run test:coverage 2>&1 | tee coverage-baseline.txt
```

### Step 2: Create Shared Test Helpers

Create `tests/helpers/mock-context.ts` to extract the repeated `createMockFileOps` and `createMockContext` factory functions currently duplicated across `import.test.ts`, `sync.test.ts`, `unsync.test.ts`, `show.test.ts`, and `completion.test.ts`.

```typescript
// tests/helpers/mock-context.ts
import { vi } from 'vitest';
import type { CommandContext } from '../../src/commands/index.js';

export function createMockFileOps(overrides: Record<string, unknown> = {}) {
  return {
    pathExists: vi.fn(() => false),
    fileExists: vi.fn(() => false),
    readFile: vi.fn(() => null),
    readFileSync: vi.fn(() => null),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    ensureDir: vi.fn().mockResolvedValue(undefined),
    listSubdirectories: vi.fn(() => []),
    scanSkillsInDirectory: vi.fn(() => []),
    getDirectoryHash: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

export function createMockContext(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    skills: {
      list: vi.fn(() => []),
      get: vi.fn(() => undefined),
      exists: vi.fn(() => false),
      delete: vi.fn().mockResolvedValue(undefined),
      install: vi.fn().mockResolvedValue('test-skill'),
      update: vi.fn().mockResolvedValue(undefined),
      importFromPath: vi.fn().mockResolvedValue(undefined),
    } as never,
    sync: {
      sync: vi.fn().mockResolvedValue([]),
      unsync: vi.fn().mockResolvedValue(undefined),
      resync: vi.fn().mockResolvedValue(undefined),
      checkSyncStatus: vi.fn(() => []),
    } as never,
    syncCheck: {
      resolveAndRecordSyncLinks: vi.fn().mockResolvedValue([]),
    } as never,
    storage: {
      listAgents: vi.fn(() => []),
      getAgent: vi.fn(() => undefined),
      listProjects: vi.fn(() => []),
      getProject: vi.fn(() => undefined),
      listSkills: vi.fn(() => []),
      getSkill: vi.fn(() => undefined),
      saveSkill: vi.fn(),
      updateSkillSync: vi.fn(),
      updateSkillProjectSync: vi.fn(),
      removeProject: vi.fn(() => true),
      removeAgent: vi.fn(() => true),
    } as never,
    scan: {
      scanProject: vi.fn(() => []),
      getSkillProjectDistributionWithStatus: vi.fn().mockResolvedValue([]),
    } as never,
    projectSync: {
      sync: vi.fn().mockResolvedValue([]),
      unsync: vi.fn().mockResolvedValue(undefined),
    } as never,
    fileOps: createMockFileOps(),
    ...overrides,
  } as CommandContext;
}
```

### Step 3: Add `tests/cli.test.ts`

**Important**: Currently `cli.ts` only exports `launchCLI`. `isFirstRun` and `showWelcome` are internal functions. To make them testable, export them in `src/cli.ts` (this is a minimal, non-breaking internal change):

```typescript
// src/cli.ts -- change
- function isFirstRun(): boolean {
+ export function isFirstRun(): boolean {

- function showWelcome(): void {
+ export function showWelcome(): void {
```

Test cases:

1. **`isFirstRun`**: Returns `true` when registry file does not exist, `false` when it does. Use `vi.spyOn(fs, 'existsSync')` to control the return value.
2. **`showWelcome`**: Outputs welcome text to console. Use `vi.spyOn(console, 'log')` to capture output and verify it contains expected strings (e.g., "Welcome to AgentForge").
3. **`launchCLI`**: Creates services, registers commands, and calls `program.parse()`. Mock `Storage`, `Command`, and service constructors. Verify the full assembly chain.
4. **`launchCLI` first-run**: When no args and first run, calls `showWelcome` and exits. Mock `isFirstRun` to return `true`, mock `process.argv` to have no subcommand, spy on `process.exit`.

The module has significant side effects at module level (defines `REGISTRY_FILE` constant). Use `vi.mock` for `fs-extra`, `commander`, and service modules.

### Step 4: Add `tests/app/file-operations.test.ts`

Test `FileOperationsService` with real temp directory operations using `os.tmpdir()` and `fs-extra`.

Key test cases:

1. **`pathExists`**: Returns `true` for existing path, `false` for non-existent
2. **`fileExists`**: Returns `true` for existing file, `false` for directory or non-existent
3. **`listSubdirectories`**: Returns subdirectory names, excludes hidden dirs and files
4. **`listSubdirectories`**: Returns empty array for non-existent directory
5. **`scanSkillsInDirectory`**: Returns dirs containing SKILL.md or skill.md (case-insensitive)
6. **`scanSkillsInDirectory`**: Excludes hidden directories
7. **`scanSkillsInDirectory`**: Returns empty array for non-existent directory
8. **`readFile`**: Returns file content for existing file, `null` for non-existent
9. **`readFileSync`**: Returns file content for existing file, `null` for non-existent
10. **`writeFileSync`**: Writes content to file, content is readable back
11. **`mkdirSync`**: Creates directory recursively
12. **`ensureDir`**: Creates directory (async)
13. **`getDirectoryHash`**: Delegates to `files.getDirectoryHash` -- mock `../infra/files.js`

### Step 5: Add `tests/app/cli-formatting.test.ts`

Test pure formatting functions. These are deterministic and easy to test.

Key test cases:

1. **`sortAgentNamesByPriority`**: Sorts built-in agent names by their defined order
2. **`sortAgentNamesByPriority`**: Places unknown names last, alphabetically among themselves
3. **`formatSourceLabel`**: Returns `[git]` magenta-styled label for git sources
4. **`formatSourceLabel`**: Returns `[local]` dim-styled label for local sources
5. **`formatAgentList`**: Sorts agents by priority and joins names with `, `
6. **`formatProjectSkillList`**: Groups skills by agent name and formats with status icons
7. **`formatProjectSkillList`**: Returns dim `(none)` for empty input
8. **`formatAgentProjectSkillGroups`**: Sorts groups by project ID, skills alphabetically
9. **`formatAgentProjectSkillGroups`**: Returns dim `(none)` for empty input

### Step 6: Fix Pre-existing Test Failure

The test at `tests/tui/hooks/useInput.test.tsx:71` fails because the regex does not handle Windows line endings (`\r\n`).

Fix:

```typescript
// tests/tui/hooks/useInput.test.tsx line 71
// Before
expect(source).toMatch(/showSearch.*\n.*escape/);

// After
expect(source).toMatch(/showSearch.*\r?\n.*escape/);
```

### Step 7: Add Integration Tests

#### `tests/integration/add-skill-workflow.test.ts`

Test the complete workflow of adding a skill from a git URL:

1. Mock `git.clone` to create a temporary directory with a SKILL.md file
2. Scan the cloned directory for skills
3. Install the skill to the skills directory
4. Verify storage records updated

Uses temp directories with cleanup in `afterEach`. Mocks `execa` for git operations.

#### `tests/integration/sync-workflow.test.ts`

Test sync and unsync workflows:

1. Sync a skill to specified agents (copy mode)
2. Verify files appear at target path
3. Sync a skill to specified agents (symlink mode)
4. Unsync from agents
5. Sync to project with agent types
6. Unsync from project

#### `tests/integration/import-workflow.test.ts`

Test import from project workflow:

1. Create a temp project directory with a skill (SKILL.md)
2. Scan the project directory
3. Import discovered skill
4. Verify skill saved and sync records updated

### Step 8: Improve Existing Test Coverage

After running coverage report, identify specific uncovered lines/branches in existing test files and add targeted tests. Likely areas:

- `commands/import.test.ts`: Error paths, edge cases in interactive selection
- `commands/sync.test.ts`: Error handling, mode selection
- `commands/add.test.ts`: Error cases, custom agent handling
- `app/skill-service.test.ts`: More method coverage (delete, update, etc.)

### Step 9: Refactor Duplicate Mock Helpers

Update existing test files to import from `tests/helpers/mock-context.ts` instead of defining `createMockFileOps` inline:

- `tests/commands/import.test.ts`
- `tests/commands/sync.test.ts`
- `tests/commands/unsync.test.ts`
- `tests/commands/show.test.ts`
- `tests/commands/completion.test.ts`

### Step 10: Final Verification

```bash
npm run test:coverage
npm run lint
npm run build
npx vitest run tests/architecture/layer-boundaries.test.ts
```

Verify:
- All tests pass (0 failures)
- Coverage >= 80% for `src/app/`
- Coverage >= 80% for `src/commands/`
- Duration < 30 seconds
- No ESLint errors
- Build succeeds
- Architecture tests pass

---

## Verification Commands

```bash
# 1. Run full test suite (should report 0 failures, 420+ tests)
npx vitest run

# 2. Generate coverage report (should show 80%+ for app/ and commands/)
npm run test:coverage

# 3. Run ESLint (should report 0 errors, 0 warnings)
npm run lint

# 4. Build the project (should succeed)
npm run build

# 5. Run architecture tests (should have 0 violations)
npx vitest run tests/architecture/layer-boundaries.test.ts

# 6. Check specific new test files
npx vitest run tests/cli.test.ts
npx vitest run tests/app/file-operations.test.ts
npx vitest run tests/app/cli-formatting.test.ts
npx vitest run tests/integration/
```

**Success Criteria**:
- [ ] All tests pass (0 failures)
- [ ] `src/app/` line coverage >= 80%
- [ ] `src/commands/` line coverage >= 80%
- [ ] Test suite runs in < 30 seconds
- [ ] `npm run lint` reports 0 errors and 0 warnings
- [ ] `npm run build` succeeds
- [ ] Architecture tests pass with 0 violations
- [ ] Pre-existing test failure fixed
- [ ] Shared mock helpers extracted and reused
- [ ] `src/cli.ts` exports `isFirstRun` and `showWelcome` for testability

---

## Risk Assessment

### Risk 1: CLI Entry Point Export Changes
**Impact**: Low
**Likelihood**: High (required change)
**Mitigation**: Exporting `isFirstRun` and `showWelcome` from `cli.ts` is a minimal change. These are already called internally; exporting them has no behavioral impact. They were previously internal functions, so no external consumers depend on their non-exported status.

### Risk 2: CLI Entry Point Testing Complexity
**Impact**: Medium
**Likelihood**: Medium
**Mitigation**: `cli.ts` has side effects (filesystem reads, `process.exit`). Use `vi.mock` to isolate. Test individual exported functions (`isFirstRun`, `showWelcome`) separately from `launchCLI`. For `launchCLI`, mock `Storage.getInstance()`, `Command`, and all service constructors. Verify the assembly chain (services created, context assembled, `registerAll` called, `parse` called).

### Risk 3: Integration Test Reliability
**Impact**: Medium
**Likelihood**: Low
**Mitigation**: Use temp directories (`os.tmpdir()`) with unique names and cleanup in `afterEach`. Mock git operations with `vi.mock('execa')`. Keep integration tests focused on the service orchestration path, not actual filesystem/network behavior.

### Risk 4: Pre-existing Test Fix May Be Fragile
**Impact**: Low
**Likelihood**: Low
**Mitigation**: The fix is a simple regex adjustment for Windows line endings (`\r?\n`). This is a safe, targeted fix.

### Risk 5: Coverage Target Not Reached
**Impact**: Medium
**Likelihood**: Low
**Mitigation**: The baseline report will identify exact gaps. If 80% is not achievable with the planned new tests, Step 8 identifies additional coverage areas. The `commands/` layer already has 10 comprehensive test files. The primary gaps are `cli.ts`, `file-operations.ts`, and `cli-formatting.ts` which this sprint specifically targets.

### Risk 6: Refactoring Mock Helpers Breaks Existing Tests
**Impact**: Low
**Likelihood**: Low
**Mitigation**: The `createMockFileOps` function is already duplicated identically across files. Importing from a shared location is a safe refactoring. Run full suite after refactoring to confirm.

---

## Dependencies

### Prerequisites (from Sprints 1-3)
- [x] Zero layer boundary violations
- [x] Zero ESLint errors and warnings
- [x] Architecture tests passing
- [x] All existing tests passing (410/411)
- [x] Build succeeds
- [x] Prettier formatting applied

### npm Dependencies
- No new dependencies needed. `@vitest/coverage-v8@^3.2.4` is already installed and aligned.

### No New Runtime Dependencies Required

---

## Definition of Done

- [ ] `tests/cli.test.ts` created and passing
- [ ] `tests/app/file-operations.test.ts` created and passing
- [ ] `tests/app/cli-formatting.test.ts` created and passing
- [ ] Integration tests in `tests/integration/` created and passing
- [ ] Shared mock helpers in `tests/helpers/mock-context.ts` created and reused across existing tests
- [ ] Pre-existing test failure in `useInput.test.tsx` fixed
- [ ] `src/cli.ts` exports `isFirstRun` and `showWelcome` for testability
- [ ] `npm run test:coverage` generates report showing 80%+ for `app/` and `commands/`
- [ ] All tests pass (0 failures)
- [ ] Test suite runs in < 30 seconds
- [ ] `npm run lint` reports 0 errors, 0 warnings
- [ ] `npm run build` succeeds
- [ ] No new layer violations introduced
- [ ] Coverage tooling properly configured with `scripts/` and `eslint-rules/` excluded

---

## Notes

### Coverage Scope Strategy

The spec targets 80%+ for `app/` and `commands/`. The `tui/` layer has extensive component tests already but full coverage of all React components is not required. The `infra/` layer has good coverage via existing tests. Focus effort on:

1. **Zero-coverage files**: `cli.ts`, `file-operations.ts`, `cli-formatting.ts`
2. **Low-coverage commands**: Add edge cases to existing command tests
3. **Integration paths**: Test full service orchestration

### Test Pattern Standardization

The codebase already follows a consistent pattern:
- `describe/it` blocks with clear descriptions
- `beforeEach`/`afterEach` for setup/cleanup
- `vi.fn()` for mocks, `vi.mock()` for module mocks
- `as never` for partial context mocks
- Arrange-Act-Assert structure

New tests should follow these established patterns. The shared `createMockFileOps` and `createMockContext` helpers formalize what already exists.

### Pre-existing Failure Details

The failing test at `tests/tui/hooks/useInput.test.tsx:71`:
```
expect(source).toMatch(/showSearch.*\n.*escape/);
```
This test reads the source file and checks for a regex pattern. On Windows, line endings are `\r\n`, so the `\n` in the regex does not match. The fix is to use `\r?\n` to handle both LF and CRLF.

### CLI Testability Note

`cli.ts` currently has three functions:
- `launchCLI()` -- exported, constructs all services, registers commands, parses args
- `isFirstRun()` -- not exported, checks `fs.existsSync` for registry file
- `showWelcome()` -- not exported, outputs formatted text via `console.log`

To unit test `isFirstRun` and `showWelcome`, they must be exported. This is a minimal change that does not alter behavior or break any public API. The `launchCLI` function must be tested with comprehensive mocking of `Storage`, `Command`, `SkillService`, `AgentSyncService`, `ProjectSyncService`, `SyncCheckService`, `ScanService`, and `FileOperationsService`.

### Integration Test Approach

Integration tests will NOT spin up actual git processes or network requests. They will:
1. Use temp directories with real filesystem operations (via `fs-extra`)
2. Mock `execa` to simulate git clone outcomes
3. Test the full path from service method call through storage writes
4. Verify side effects (files created, storage records updated)

This approach provides high confidence without flakiness.
