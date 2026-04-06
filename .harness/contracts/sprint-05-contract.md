# Sprint 5 Contract: Architecture Boundary Tests & Finalization

**Sprint Theme**: Lock in architecture quality with comprehensive tests and cleanup
**Sprint Number**: 5 of 5
**Status**: DRAFT

---

## Summary

Sprint 5 is the final sprint of the AgentForge architecture refactoring project. It focuses on making the existing architecture boundary tests strictly enforceable (zero violations = green, any violation = test failure), adding dependency analysis to the CI pipeline, documenting architecture decisions directly in code via JSDoc comments, conducting a final code review using the established checklist, cleaning up any remaining issues, and updating `CLAUDE.md` with the finalized architecture guidelines.

**Starting State** (confirming Sprint 4 completion):
- All tests pass (420+ tests, zero failures)
- Coverage: `app/` ~85.77%, `commands/` ~81.11%
- Zero ESLint errors and warnings
- Zero architecture layer boundary violations
- Build passing
- `eslint-rules/no-cross-layer-imports.js` custom rule installed
- `tests/architecture/layer-boundaries.test.ts` exists with baseline and violation-tracking tests

---

## Primary Path

1. Harden `tests/architecture/layer-boundaries.test.ts` -- transform baseline/logging tests into strict enforcement tests that fail on any violation
2. Add dependency analysis step to CI pipeline (`.github/workflows/ci.yml`) -- lint + architecture tests as a distinct check
3. Add JSDoc architecture documentation to key modules in `src/` (layer headers, key functions)
4. Execute final code review using the checklist from `design-direction.md`
5. Clean up any remaining lint warnings, dead code, or inconsistencies
6. Update `CLAUDE.md` with final architecture guidelines and layer responsibility documentation

---

## In Scope

- **Architecture test hardening**: Ensure `layer-boundaries.test.ts` fails on ANY detected violation (not just logging/counting)
- **CI pipeline enhancement**: Add dependency analysis job (lint + arch tests) to `.github/workflows/ci.yml`
- **Code documentation**: JSDoc comments on key functions in `app/`, `commands/`, and `infra/` layers documenting architecture role
- **Final code review**: Run through the complete review checklist from `design-direction.md` (Layer Compliance, Code Quality, Test Quality, Documentation)
- **Cleanup**: Remove any dead code, unused imports, or leftover comments from refactoring
- **CLAUDE.md update**: Add architecture guidelines, layer responsibilities, and anti-patterns to `.claude/CLAUDE.md`
- **npm script for dependency analysis**: Add `npm run deps:check` or `npm run arch:test` script to `package.json` for running architecture tests standalone

## Out Of Scope

- New CLI commands or features
- TUI component changes or tests
- Performance optimization
- Changes to existing business logic or behavior
- New runtime or dev dependencies (beyond what's already installed)
- Changes to the public CLI interface

---

## Locked Assumptions

1. **Architecture**: Three-layer pattern is locked and verified through Sprints 1-4. No changes to layer structure or dependency direction.
2. **Code Quality**: Zero ESLint errors and warnings, Prettier formatting applied. Sprint 5 must maintain this invariant.
3. **Test Stability**: All 420+ tests pass consistently. Sprint 5 changes must not introduce test flakiness.
4. **Layer Violations**: Zero violations confirmed since Sprint 2. The architecture tests currently log violations but may not strictly fail on all of them -- Sprint 5 will enforce strict failure.
5. **Breaking Changes**: No breaking changes to public CLI behavior. Internal documentation and test hardening only.
6. **No New Dependencies**: All tooling uses already-installed packages (vitest, eslint, prettier, typescript).

---

## Files Expected To Change

### Modified Test Files

| File | Change Type | Description |
|------|-------------|-------------|
| `tests/architecture/layer-boundaries.test.ts` | MODIFY | Transform logging/baseline tests into strict enforcement; every violation causes failure |

### Modified Configuration Files

| File | Change Type | Description |
|------|-------------|-------------|
| `.github/workflows/ci.yml` | MODIFY | Add dependency analysis step (lint + architecture tests) as separate CI job |
| `package.json` | MODIFY | Add `arch:test` script for standalone architecture test execution |
| `.claude/CLAUDE.md` | MODIFY | Add architecture guidelines, layer responsibilities, anti-patterns section |

### Modified Source Files (Documentation Only)

| File | Change Type | Description |
|------|-------------|-------------|
| `src/cli.ts` | MODIFY | JSDoc: document CLI entry point, service assembly, layer responsibility |
| `src/app/skill-service.ts` | MODIFY | JSDoc: document service role, allowed imports, domain responsibility |
| `src/app/file-operations.ts` | MODIFY | JSDoc: document DI pattern, infra delegation |
| `src/app/sync/base-sync-service.ts` | MODIFY | JSDoc: document abstract base class, extension pattern |
| `src/app/sync/agent-sync-service.ts` | MODIFY | JSDoc: document user-level sync responsibility |
| `src/app/sync/project-sync-service.ts` | MODIFY | JSDoc: document project-level sync responsibility |
| `src/app/scan-service.ts` | MODIFY | JSDoc: document project scanning responsibility |
| `src/app/sync-check-service.ts` | MODIFY | JSDoc: document conflict detection responsibility |
| `src/app/project-storage.ts` | MODIFY | JSDoc: document project-local config responsibility |
| `src/infra/storage.ts` | MODIFY | JSDoc: document singleton pattern, JSON persistence |
| `src/infra/git.ts` | MODIFY | JSDoc: document git operations wrapper |
| `src/infra/files.ts` | MODIFY | JSDoc: document file utility functions |
| `src/types.ts` | MODIFY | JSDoc: document type system, layer import rules in file header |

---

## Testable Behaviors

| # | Behavior | Verification |
|---|----------|--------------|
| 1 | Architecture tests fail when a cross-layer import exists | Inject a test violation, run arch test, expect failure |
| 2 | Architecture tests pass with zero violations in current codebase | `npx vitest run tests/architecture/layer-boundaries.test.ts` passes |
| 3 | Architecture tests detect commands → infra direct imports | Verified by test case for commands-infra violation |
| 4 | Architecture tests detect infra → app imports | Verified by test case for infra-app violation |
| 5 | Architecture tests detect tui → infra direct imports | Verified by test case for tui-infra violation |
| 6 | `types.ts` isolation verified (no layer imports) | Test: `types.ts` should have zero internal layer imports |
| 7 | CI pipeline includes lint step | `.github/workflows/ci.yml` contains `npm run lint` step |
| 8 | CI pipeline includes architecture test step | `.github/workflows/ci.yml` contains arch test execution |
| 9 | `npm run arch:test` script exists and runs architecture tests | `npm run arch:test` exits with code 0 |
| 10 | Key `app/` modules have JSDoc documentation | Manual inspection of JSDoc on exported functions |
| 11 | Key `infra/` modules have JSDoc documentation | Manual inspection of JSDoc on exported functions |
| 12 | Key `commands/` modules have JSDoc documentation | Manual inspection of JSDoc on exported register functions |
| 13 | `CLAUDE.md` contains architecture guidelines | `.claude/CLAUDE.md` has layer diagram and rules |
| 14 | `CLAUDE.md` contains anti-patterns section | `.claude/CLAUDE.md` lists anti-patterns to avoid |
| 15 | `CLAUDE.md` contains code review checklist | `.claude/CLAUDE.md` includes review checklist |
| 16 | ESLint still passes after all changes | `npm run lint` exits with code 0, zero errors/warnings |
| 17 | All tests still pass after all changes | `npm test` reports 0 failures |
| 18 | Build still succeeds | `npm run build` succeeds |
| 19 | No dead code or unused imports remain | `npm run lint` with `no-unused-vars` passes |
| 20 | Test suite runs in < 30 seconds | `npx vitest run` Duration < 30s |

---

## Implementation Steps

### Step 1: Harden Architecture Boundary Tests

Modify `tests/architecture/layer-boundaries.test.ts` to make all tests strictly enforceable:

**Current issues to fix:**

1. The `should report current violation count (baseline)` test on line 304 only calls `expect(violations.length).toBeDefined()` -- this always passes regardless of violation count. **Change**: Make this test verify `violations.length === 0`.

2. The `should identify specific violation details` test on line 324 only checks that violation objects have complete fields but does NOT fail on violations. **Change**: Make this test assert `violations.length === 0` and list violations when they exist.

3. The `should verify infra/ only imports from types` test (line 374) and `should verify commands/ does not import directly from infra/` (line 406) and `should verify tui/ does not import directly from infra/` (line 438) only `console.log` violations but do NOT assert. **Change**: Add `expect(violations).toHaveLength(0)` assertions.

4. Add a new top-level test `should have zero layer boundary violations (strict)` that runs `analyzeImports()` and fails if `violations.length > 0`, with the full violation report in the error message.

**Approach**:
```typescript
// Replace logging-only tests with strict assertions
it('should have zero layer boundary violations', () => {
  const { violations } = analyzeImports();
  if (violations.length > 0) {
    const report = violations
      .map(v => `  ${v.file}:${v.lineNumber}: ${v.reason}`)
      .join('\n');
    throw new Error(`Layer boundary violations detected:\n${report}`);
  }
});
```

### Step 2: Add Dependency Analysis to CI Pipeline

Update `.github/workflows/ci.yml` to add a new job or step for dependency analysis:

```yaml
  architecture-check:
    needs: build-and-test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint (zero errors, zero warnings)
        run: npm run lint

      - name: Run architecture boundary tests
        run: npx vitest run tests/architecture/layer-boundaries.test.ts

      - name: Run format check
        run: npm run format:check
```

### Step 3: Add `arch:test` npm Script

Add to `package.json` scripts:

```json
"arch:test": "vitest run tests/architecture/layer-boundaries.test.ts"
```

### Step 4: Add JSDoc Documentation to Key Modules

Add JSDoc comments to key exported functions. The focus is on documenting **architecture role** and **layer responsibility**, not repeating what the code does (let the code speak for itself).

**File header pattern** (add to top of each file):
```typescript
/**
 * @module App/SkillService
 * @layer app
 * @allowed-imports infra/, types
 * @responsibility Skill CRUD operations and storage management
 */
```

**Function documentation pattern** (for complex public functions):
```typescript
/**
 * Installs a skill from the skills directory to a target agent.
 * @param skillName - Name of the skill to install
 * @param agentId - Target agent ID
 * @param mode - Sync mode: 'copy' or 'symlink'
 * @returns Array of created symlink/file paths
 * @architecture This is the app-layer orchestration point. File operations
 *   delegate to infra/files.ts via FileOperationsService.
 */
```

**Priority files for JSDoc** (in order):
1. `src/types.ts` -- Type system overview, layer import rules
2. `src/cli.ts` -- Entry point, service assembly
3. `src/app/file-operations.ts` -- DI pattern explanation
4. `src/app/skill-service.ts` -- Core skill management
5. `src/app/sync/base-sync-service.ts` -- Extension pattern
6. `src/infra/storage.ts` -- Singleton pattern documentation
7. `src/infra/files.ts` -- File utility functions
8. Remaining `app/` and `commands/` files -- brief role comment

### Step 5: Execute Final Code Review Using Checklist

Run through the complete checklist from `design-direction.md`:

**Layer Compliance**:
- [ ] Does the code have any cross-layer imports?
- [ ] Are commands only importing from app/ and types?
- [ ] Are app services only importing from infra/ and types?
- [ ] Is infra only importing from types?

**Code Quality**:
- [ ] Does the code pass `npm run lint` with zero errors/warnings?
- [ ] Is the code formatted according to Prettier?
- [ ] Are there any `any` types that should be typed?
- [ ] Are async functions properly awaiting promises?

**Test Quality**:
- [ ] Are there tests for all major functionality?
- [ ] Do tests follow the arrange-act-assert pattern?
- [ ] Are mocks minimal and focused?
- [ ] Do all existing tests still pass?

**Documentation**:
- [ ] Are complex functions documented with JSDoc?
- [ ] Are architecture decisions documented in code?
- [ ] Is the code review checklist followed?

### Step 6: Clean Up Remaining Issues

- Remove any TODO comments from previous refactoring sprints that are no longer relevant
- Remove any commented-out code blocks
- Verify no unused imports remain
- Verify all console.log statements in production code are intentional (only tests may use console.log for violation reporting)
- Run `npm run lint:fix` and `npm run format` to ensure final state is clean

### Step 7: Update CLAUDE.md

Update `D:\MySpace\01_Projects\AgentForge\.claude\CLAUDE.md` with:

1. **Architecture diagram** -- ASCII diagram showing the 4-layer + types structure
2. **Layer responsibilities** -- Clear import rules for each layer
3. **Anti-patterns** -- The 8 anti-patterns from `design-direction.md`, adapted for current codebase
4. **Code review checklist** -- The checklist from `design-direction.md`
5. **Adding new commands** -- Quick guide from existing spec
6. **Command structure** -- Current `af <verb> <target>` pattern
7. **Sync modes** -- Current sync modes documentation
8. **Agent configuration** -- Current built-in agents and `skillsDirName` pattern

The `CLAUDE.md` already exists with substantial content. **Merge** the new architecture documentation into the existing file rather than overwriting it entirely. Preserve the existing "Code Style" and "After writing code" sections.

### Step 8: Final Verification

```bash
# 1. All tests pass
npx vitest run

# 2. Architecture tests pass
npm run arch:test

# 3. ESLint passes (zero errors, zero warnings)
npm run lint

# 4. Prettier formatting verified
npm run format:check

# 5. Build succeeds
npm run build

# 6. Coverage maintained (app/ >= 80%, commands/ >= 80%)
npm run test:coverage

# 7. Test suite under 30 seconds
npx vitest run --reporter=verbose 2>&1 | grep -i duration
```

---

## Verification Commands

```bash
# 1. Run full test suite
npx vitest run

# 2. Run architecture boundary tests (strict enforcement)
npm run arch:test

# 3. Run ESLint (zero errors, zero warnings)
npm run lint

# 4. Run Prettier check
npm run format:check

# 5. Build the project
npm run build

# 6. Coverage report
npm run test:coverage

# 7. Verify CI workflow syntax
cat .github/workflows/ci.yml
```

**Success Criteria**:
- [ ] All tests pass (0 failures)
- [ ] Architecture tests strictly enforce zero violations
- [ ] `npm run lint` reports 0 errors, 0 warnings
- [ ] `npm run build` succeeds
- [ ] `npm run arch:test` passes
- [ ] `npm run format:check` passes
- [ ] Coverage maintained: `app/` >= 80%, `commands/` >= 80%
- [ ] Test suite runs in < 30 seconds
- [ ] CI pipeline includes architecture check job
- [ ] Key modules documented with JSDoc
- [ ] `CLAUDE.md` updated with architecture guidelines

---

## Risk Assessment

### Risk 1: Architecture Test Hardening May Surface Hidden Violations

**Impact**: Medium
**Likelihood**: Low
**Mitigation**: Sprints 1-4 already achieved zero violations. The hardening changes only the test assertion strategy (from logging to failing), not the detection logic. If any violations surface, they represent real regression and must be fixed before Sprint 5 completes.

### Risk 2: JSDoc Adds Import Lines That Violate Architecture Rules

**Impact**: Low
**Likelihood**: Low
**Mitigation**: JSDoc comments are pure annotations -- they do not introduce import statements. The file header `@allowed-imports` annotations are documentation only, not executed code. Run `npm run lint` after every JSDoc change.

### Risk 3: CLAUDE.md Update May Conflict With Existing Content

**Impact**: Low
**Likelihood**: Medium
**Mitigation**: The existing `CLAUDE.md` already has good content. Sprint 5 should **add/merge** new sections (architecture diagram, anti-patterns, review checklist) into the existing file, keeping the current code style guidelines and command documentation. Careful review of the merged result.

### Risk 4: CI Pipeline Change May Break Existing Workflow

**Impact**: Medium
**Likelihood**: Low
**Mitigation**: The new `architecture-check` job only adds steps; it does not modify the existing `build-and-test` job. The job runs on `ubuntu-latest` with Node 20 which is within the tested matrix.

### Risk 5: Dead Code Removal May Break Tests

**Impact**: Medium
**Likelihood**: Low
**Mitigation**: Only remove code that is demonstrably unused (no imports, no test references). Run the full test suite after each removal. Prefer `noUnusedLocals`/`noUnusedParameters` from TypeScript config to identify candidates rather than manual inspection.

---

## Dependencies

### Prerequisites (from Sprints 1-4)
- [x] Zero layer boundary violations (Sprints 1-2)
- [x] Zero ESLint errors and warnings (Sprint 3)
- [x] Prettier formatting applied (Sprint 3)
- [x] 80%+ coverage for `app/` and `commands/` (Sprint 4)
- [x] All tests passing (Sprint 4)
- [x] Shared mock helpers extracted (Sprint 4)
- [x] Build passing (Sprints 1-4)

### npm Dependencies
- No new dependencies needed
- `eslint-plugin-layer-rules` already installed (`file:./eslint-rules`)
- `@vitest/coverage-v8` already installed

### No New Runtime Dependencies Required

---

## Definition of Done

- [ ] Architecture tests strictly enforce zero violations (any violation fails the test)
- [ ] CI pipeline includes `architecture-check` job with lint + arch tests + format check
- [ ] `npm run arch:test` script added to `package.json`
- [ ] JSDoc documentation added to all key modules (types, cli, core services, infra)
- [ ] Final code review completed using checklist from `design-direction.md`
- [ ] All dead code, unused imports, and leftover comments removed
- [ ] `CLAUDE.md` updated with architecture guidelines, anti-patterns, and review checklist
- [ ] `npm run lint` reports 0 errors, 0 warnings
- [ ] `npm run test` passes with 0 failures
- [ ] `npm run build` succeeds
- [ ] Coverage maintained: `app/` >= 80%, `commands/` >= 80%
- [ ] Test suite runs in < 30 seconds
- [ ] `.github/workflows/ci.yml` validates correctly

---

## Notes

### Architecture Test Hardening Strategy

The current `layer-boundaries.test.ts` (1.5KB of test code, ~350 lines) contains several tests that log violations but do not assert. Sprint 5 converts these to strict assertions:

| Current Test | Current Behavior | Post-Sprint 5 Behavior |
|---|---|---|
| `should report current violation count` | `expect(violations.length).toBeDefined()` (always passes) | `expect(violations.length).toBe(0)` |
| `should identify specific violation details` | Only validates violation object fields | Also asserts `violations.length === 0` |
| `should verify infra/ only imports from types` | `console.log` violations only | `expect(violations).toHaveLength(0)` |
| `should verify commands/ does not import from infra/` | `console.log` violations only | `expect(infraImports).toHaveLength(0)` |
| `should verify tui/ does not import from infra/` | `console.log` violations only | `expect(infraImports).toHaveLength(0)` |

This makes the test suite self-enforcing. If a future commit introduces a cross-layer import, the tests will immediately fail.

### JSDoc Priority

Not every function needs JSDoc. Focus on:

1. **Module-level**: What is this module's role in the architecture?
2. **Complex orchestration**: Functions that coordinate multiple services
3. **Extension points**: Abstract methods, interfaces, patterns to follow
4. **Singletons**: Document the pattern and why it's used

Simple getters, pure functions, and thin wrappers do not need JSDoc beyond their self-documenting names.

### CLAUDE.md Merge Strategy

Current `CLAUDE.md` has:
- Code style guidelines (keep)
- Project overview (keep, update if needed)
- Architecture section (already present, update with sprint results)
- Command structure (keep)
- Layer responsibilities (already present, refine)
- Sync modes (keep)
- Skill levels (keep)
- Adding new commands (keep)
- Command style (keep)

New content to add:
- Anti-patterns section (from `design-direction.md`)
- Code review checklist (from `design-direction.md`)
- Architecture diagram ASCII art
