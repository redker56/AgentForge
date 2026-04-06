# Sprint 3 Contract: Code Quality & Technical Debt

**Sprint Theme**: Improve code quality and eliminate known technical debt
**Sprint Number**: 3 of 5
**Status**: PENDING

---

## Summary

Sprint 3 focuses on eliminating ESLint warnings/errors and addressing technical debt identified in the codebase. The primary objectives are to fix all remaining ESLint issues (currently 96 errors and 458 warnings), eliminate duplicate code patterns, improve error handling, and add JSDoc documentation where helpful. This sprint builds on the successful layer compliance work from Sprint 2.

## Primary Path

1. Run `npm run lint` to identify all remaining issues
2. Fix issues systematically by category (grouped fixes)
3. Run `npm run format` to ensure consistent formatting
4. Run full test suite to verify no regressions
5. Verify build succeeds with strict TypeScript

---

## In Scope

- Fix duplicate `saveSkill` calls in import.ts (if applicable - needs verification)
- Eliminate all ESLint errors (currently 96)
- Eliminate all ESLint warnings (currently 458)
- Apply Prettier formatting to ensure consistency
- Fix TypeScript strict mode issues flagged by ESLint
- Add missing error handling patterns
- Add JSDoc documentation to complex functions
- Remove unused variables and imports
- Fix non-null assertion issues
- Fix floating promise issues

## Out Of Scope

- Adding new tests (Sprint 4)
- Architecture boundary tests (Sprint 5)
- Documentation updates to CLAUDE.md (Sprint 5)
- UI/interaction changes
- Performance optimization
- New features

---

## Locked Assumptions

1. **Architecture**: Three-layer pattern is locked and verified (Sprint 2 complete)
2. **Layer Violations**: Zero layer violations confirmed (Sprint 2 achievement)
3. **Test Coverage**: Current 411 tests provide sufficient regression protection
4. **Breaking Changes**: May introduce minor refactoring within layers; no public API changes

---

## Current ESLint Issues Analysis

### Error Categories (96 errors)

| Category | Count | Files Affected |
|----------|-------|----------------|
| `@typescript-eslint/no-explicit-any` | 5 | scan-service.ts, base-sync-service.ts, commands/index.ts |
| `@typescript-eslint/no-non-null-assertion` | 6 | import.ts, show.ts, AddForm.tsx |
| `@typescript-eslint/no-unused-vars` | 15 | Multiple files (unused imports, variables) |
| `@typescript-eslint/no-floating-promises` | 12 | tui.ts, TUI components, store actions |
| `@typescript-eslint/no-misused-promises` | 4 | CommandPalette.tsx, useInput.ts |
| `@typescript-eslint/require-await` | 3 | dataSlice.ts |
| `@typescript-eslint/no-dynamic-delete` | 5 | storage.ts, AddForm.tsx |
| `no-useless-escape` | 8 | skill-service.ts, add.ts, completion.ts |
| `no-case-declarations` | 1 | completion.ts |

### Warning Categories (458 warnings)

| Category | Count | Files Affected |
|----------|-------|----------------|
| `@typescript-eslint/explicit-function-return-type` | ~30 | Multiple TUI files, store actions |
| `import/no-named-as-default-member` | ~15 | file-operations.ts, project-storage.ts, files.ts, storage.ts, TUI files |

---

## Files Expected To Change

| File | Change Type | Description |
|------|-------------|-------------|
| `src/app/scan-service.ts` | MODIFY | Fix `any` type |
| `src/app/skill-service.ts` | MODIFY | Fix useless escapes in regex |
| `src/app/sync/agent-sync-service.ts` | MODIFY | Remove unused `SyncMode` import |
| `src/app/sync/base-sync-service.ts` | MODIFY | Remove unused `path` import, fix `any` type |
| `src/app/sync/project-sync-service.ts` | MODIFY | Add return type annotation |
| `src/commands/add.ts` | MODIFY | Fix useless escapes in regex |
| `src/commands/complete.ts` | MODIFY | Prefix unused `target` parameter with `_` |
| `src/commands/completion.ts` | MODIFY | Fix case declarations, useless escapes |
| `src/commands/import.ts` | MODIFY | Fix non-null assertions |
| `src/commands/index.ts` | MODIFY | Fix `any` types |
| `src/commands/show.ts` | MODIFY | Fix non-null assertions |
| `src/infra/files.ts` | MODIFY | Fix import/no-named-as-default-member warnings |
| `src/infra/storage.ts` | MODIFY | Fix dynamic deletes, import warnings |
| `src/tui.ts` | MODIFY | Fix floating promises |
| `src/tui/App.tsx` | MODIFY | Remove unused `rows` variable |
| `src/tui/components/AddForm.tsx` | MODIFY | Fix multiple issues (unused vars, dynamic delete, non-null) |
| `src/tui/components/BlurValidatedInput.tsx` | MODIFY | Prefix unused `width` parameter |
| `src/tui/components/CommandPalette.tsx` | MODIFY | Fix misused promises, floating promises |
| `src/tui/components/ImportChecklist.tsx` | MODIFY | Remove unused parameters and variables |
| `src/tui/components/ImportForm.tsx` | MODIFY | Remove unused imports |
| `src/tui/components/ImportFormTab.tsx` | MODIFY | Remove unused `SelectSkills` import |
| `src/tui/components/ProgressBar.tsx` | MODIFY | Remove unused `BAR_WIDTH`, prefix unused param |
| `src/tui/components/SkillList.tsx` | MODIFY | Remove unused variable |
| `src/tui/hooks/useInput.ts` | MODIFY | Fix floating promises, misused promises |
| `src/tui/hooks/useTerminalDimensions.ts` | MODIFY | Add return type annotations |
| `src/tui/screens/AgentsScreen.tsx` | MODIFY | Fix floating promise |
| `src/tui/screens/ProjectsScreen.tsx` | MODIFY | Fix floating promise |
| `src/tui/screens/SkillsScreen.tsx` | MODIFY | Fix floating promise |
| `src/tui/store/actions/agentActions.ts` | MODIFY | Add return type annotations |
| `src/tui/store/actions/importActions.ts` | MODIFY | Fix floating promise, add return types |
| `src/tui/store/actions/projectActions.ts` | MODIFY | Add return type annotations |
| `src/tui/store/actions/skillActions.ts` | MODIFY | Fix floating promise, add return types |
| `src/tui/store/actions/syncActions.ts` | MODIFY | Add return type annotations |
| `src/tui/store/dataSlice.ts` | MODIFY | Fix unused param, async without await, return types |

---

## Testable Behaviors

| # | Behavior | Verification |
|---|----------|--------------|
| 1 | Zero ESLint errors | `npm run lint` exits with code 0 and reports 0 errors |
| 2 | Zero ESLint warnings | `npm run lint` reports 0 warnings |
| 3 | All existing tests pass | `npm test` passes with 411+ tests |
| 4 | Build succeeds | `npm run build` completes without errors |
| 5 | Code formatted consistently | `npm run format:check` passes |
| 6 | No layer violations introduced | `npm test -- tests/architecture/layer-boundaries.test.ts` passes with 0 violations |
| 7 | CLI functionality preserved | Manual smoke test of key commands |

---

## Implementation Steps

### Step 1: Run Prettier First (Auto-format)

```bash
npm run format
```

This will auto-format all files consistently before manual fixes.

### Step 2: Fix Unused Variables and Imports

**Files to modify:**
- `src/app/sync/agent-sync-service.ts` - Remove unused `SyncMode` import
- `src/app/sync/base-sync-service.ts` - Remove unused `path` import
- `src/commands/complete.ts` - Prefix unused `target` with `_`
- `src/tui/components/AddForm.tsx` - Remove unused `TabId` import, `validation` variable
- `src/tui/components/BlurValidatedInput.tsx` - Prefix unused `width` with `_width`
- `src/tui/components/CommandPalette.tsx` - Remove unused `useStore` import
- `src/tui/components/ImportChecklist.tsx` - Prefix unused params with `_`, remove unused `nameColor`
- `src/tui/components/ImportForm.tsx` - Remove unused `useCallback`, `ErrorMessage` imports
- `src/tui/components/ImportFormTab.tsx` - Remove unused `SelectSkills` import
- `src/tui/components/ProgressBar.tsx` - Remove unused `BAR_WIDTH`, prefix unused `error` with `_`
- `src/tui/components/SkillList.tsx` - Remove unused `detailOverlayVisible`
- `src/tui/hooks/useInput.ts` - Remove unused `TabId` import
- `src/tui/store/dataSlice.ts` - Prefix unused `get` with `_`

**Pattern for unused parameters:**
```typescript
// Before
function handleToggle(onToggle: () => void) { ... }

// After
function handleToggle(_onToggle: () => void) { ... }
```

### Step 3: Fix `no-explicit-any` Errors

**Files to modify:**
- `src/app/scan-service.ts:185` - Replace `any` with proper type
- `src/app/sync/base-sync-service.ts:77` - Replace `any` with proper type
- `src/commands/index.ts:26,54,63,65` - Replace `any` with proper types

**Pattern:**
```typescript
// Before
const items: any[] = [];

// After
interface Item { name: string; value: string; }
const items: Item[] = [];
```

### Step 4: Fix `no-non-null-assertion` Errors

**Files to modify:**
- `src/commands/import.ts:115,172,181,222` - Replace `!` with proper null checks
- `src/commands/show.ts:52,54` - Replace `!` with proper null checks
- `src/tui/components/AddForm.tsx:285` - Replace `!` with proper null check

**Pattern:**
```typescript
// Before
const project = ctx.storage.getProject(projectId!);

// After
const project = ctx.storage.getProject(projectId);
if (!project) {
  console.error(`Project not found: ${projectId}`);
  process.exit(1);
}
```

### Step 5: Fix Floating Promises

**Files to modify:**
- `src/tui.ts:44,48` - Add `void` prefix or await
- `src/tui/components/CommandPalette.tsx:160` - Add `void` prefix
- `src/tui/hooks/useInput.ts:163,264,369,410,469` - Add `void` prefix
- `src/tui/screens/AgentsScreen.tsx:34` - Add `void` prefix
- `src/tui/screens/ProjectsScreen.tsx:34` - Add `void` prefix
- `src/tui/screens/SkillsScreen.tsx:36` - Add `void` prefix
- `src/tui/store/actions/importActions.ts:69` - Add `void` prefix
- `src/tui/store/actions/skillActions.ts:70` - Add `void` prefix

**Pattern:**
```typescript
// Before
someAsyncFunction();

// After (if we intentionally don't wait)
void someAsyncFunction();
```

### Step 6: Fix Misused Promises

**Files to modify:**
- `src/tui/components/CommandPalette.tsx:65,82,97` - Wrap async handlers
- `src/tui/hooks/useInput.ts:298,430,486` - Wrap async handlers

**Pattern:**
```typescript
// Before (React event handlers can't be async)
onClick={async () => { await doSomething(); }}

// After
onClick={() => { void doSomething(); }}
```

### Step 7: Fix `require-await` Errors

**Files to modify:**
- `src/tui/store/dataSlice.ts:234,316,326` - Either add await or remove async

**Pattern:**
```typescript
// Before
async loadAllData() {
  // no await
}

// After (if no async needed)
loadAllData() {
  // sync code
}
```

### Step 8: Fix Dynamic Delete Errors

**Files to modify:**
- `src/infra/storage.ts:89,168,196` - Use Map or explicit delete
- `src/tui/components/AddForm.tsx:276,281,318` - Use explicit property delete or Map

**Pattern:**
```typescript
// Before
delete obj[dynamicKey];

// After (option 1 - use Map)
const map = new Map<string, Value>();
map.delete(dynamicKey);

// After (option 2 - use object with known keys)
if (dynamicKey === 'knownKey') {
  delete obj.knownKey;
}
```

### Step 9: Fix Useless Escape Characters

**Files to modify:**
- `src/app/skill-service.ts:111` - Fix regex escapes
- `src/commands/add.ts:73` - Fix regex escapes
- `src/commands/completion.ts:623,627` - Fix string escapes

**Pattern:**
```typescript
// Before
const regex = /https?:\/\/[^\/]+/;

// After
const regex = /https?:\/\/[^/]+/;
// Or use raw string where needed
```

### Step 10: Fix Case Declarations

**File to modify:**
- `src/commands/completion.ts:71` - Wrap in block

**Pattern:**
```typescript
// Before
switch (x) {
  case 'a':
    const y = 1;
    break;
}

// After
switch (x) {
  case 'a': {
    const y = 1;
    break;
  }
}
```

### Step 11: Fix Import/Named-As-Default-Member Warnings

**Files to modify:**
- `src/app/file-operations.ts` - Change `fs.ensureDir` to `{ ensureDir }`
- `src/app/project-storage.ts` - Change `fs.readJsonSync` to `{ readJsonSync }`
- `src/infra/files.ts` - Change multiple `fs.` calls to named imports
- `src/infra/storage.ts` - Change `fs.ensureDirSync` to `{ ensureDirSync }`
- `src/tui/App.tsx` - Change `React.useEffect` to `{ useEffect }`
- `src/tui/components/AddForm.tsx` - Change `React.useEffect` to `{ useEffect }`
- `src/tui/components/ImportForm.tsx` - Change `React.useEffect` to `{ useEffect }`
- `src/tui.ts` - Change `React.createElement` to `{ createElement }`

**Pattern:**
```typescript
// Before
import fs from 'fs-extra';
fs.ensureDir(path);

// After
import { ensureDir } from 'fs-extra';
ensureDir(path);
```

### Step 12: Add Return Type Annotations

**Files to modify:**
- `src/app/sync/project-sync-service.ts:164`
- `src/tui/hooks/useTerminalDimensions.ts:47,79`
- `src/tui/store/actions/agentActions.ts:21,47,71`
- `src/tui/store/actions/importActions.ts:75,87,108,121`
- `src/tui/store/actions/projectActions.ts:23,44,59`
- `src/tui/store/actions/skillActions.ts:76,142,171,194`
- `src/tui/store/actions/syncActions.ts:107,154,200,249,298,360`
- `src/tui/store/dataSlice.ts:234,254,316,326`

**Pattern:**
```typescript
// Before
async loadAllData() {

// After
async loadAllData(): Promise<void> {
```

### Step 13: Add JSDoc Documentation

Add JSDoc to complex functions in key files:
- `src/app/skill-service.ts` - Key methods
- `src/app/scan-service.ts` - Scan methods
- `src/infra/storage.ts` - Storage methods
- `src/commands/*.ts` - Command handlers

### Step 14: Run Full Verification

```bash
npm run lint
npm run format:check
npm test
npm run build
npm test -- tests/architecture/layer-boundaries.test.ts
```

---

## Verification Commands

```bash
# 1. Run ESLint (should report 0 errors, 0 warnings)
npm run lint

# 2. Check Prettier formatting
npm run format:check

# 3. Run full test suite (all should pass)
npm test

# 4. Build the project (should succeed)
npm run build

# 5. Run architecture tests (should have 0 violations)
npm test -- tests/architecture/layer-boundaries.test.ts

# 6. Quick smoke test
node dist/cli.js --help
node dist/cli.js list agents
```

**Success Criteria**:
- [ ] `npm run lint` reports 0 errors and 0 warnings
- [ ] `npm run format:check` passes
- [ ] All tests pass (411+)
- [ ] Build succeeds
- [ ] Architecture tests pass with 0 violations
- [ ] CLI functionality preserved

---

## Risk Assessment

### Risk 1: Large Number of Changes
**Impact**: Medium
**Likelihood**: Medium
**Mitigation**: Group changes by category and commit incrementally. Run tests after each category of fixes.

### Risk 2: Floating Promise Fixes May Mask Errors
**Impact**: Low
**Likelihood**: Low
**Mitigation**: Only use `void` prefix for intentionally fire-and-forget promises. Review each case to ensure proper error handling exists.

### Risk 3: Type Changes May Cause Cascading Errors
**Impact**: Medium
**Likelihood**: Low
**Mitigation**: Fix types incrementally and verify build after each file. Use TypeScript's inference where appropriate.

### Risk 4: Dynamic Delete Refactoring May Change Behavior
**Impact**: Low
**Likelihood**: Low
**Mitigation**: The current code uses dynamic delete correctly; the fix is to satisfy ESLint while preserving behavior.

### Risk 5: React Hook Dependencies May Be Affected
**Impact**: Low
**Likelihood**: Low
**Mitigation**: Review useEffect hooks after changes to ensure dependency arrays are correct.

---

## Dependencies

### Prerequisites (from Sprint 2)
- [x] Zero layer boundary violations
- [x] Architecture tests passing
- [x] All existing tests passing

### No New npm Dependencies Required

---

## Definition of Done

- [ ] All ESLint errors fixed (currently 96)
- [ ] All ESLint warnings fixed (currently 458)
- [ ] `npm run lint` exits with code 0
- [ ] All files formatted per Prettier config
- [ ] TypeScript strict mode fully enabled (already done in Sprint 1)
- [ ] All existing tests pass (411+)
- [ ] Build succeeds
- [ ] CLI commands work correctly
- [ ] No new layer violations introduced
- [ ] Contract updated with actual results

---

## Notes

### Duplicate saveSkill Calls Issue

The Sprint 2 QA report and design-direction.md mention duplicate `saveSkill` calls in import.ts. After reviewing the current code:

- `commands/import.ts` calls `ctx.skills.importFromPath()` which internally calls `this.storage.saveSkill()`
- There is no duplicate call in the current code - the issue appears to have been resolved or was inaccurate

**Action**: Verify during implementation. If no duplicate exists, mark this item as complete.

### Import/Named-As-Default-Member Warnings

These warnings are about using `fs.method()` instead of `{ method } from 'fs-extra'`. While technically not wrong, the linter prefers named imports. This is a style preference that improves tree-shaking.

### Floating Promises in TUI

Many floating promises are intentional (fire-and-forget async operations in event handlers). These should be prefixed with `void` to indicate intent.

### Return Type Annotations

Adding return type annotations is a TypeScript strictness requirement. It improves type safety and documentation.

---

## Post-Sprint Metrics

Before Sprint 3:
- ESLint errors: 96
- ESLint warnings: 458
- Total issues: 554
- Layer violations: 0 (Sprint 2 achievement)

Expected After Sprint 3:
- ESLint errors: 0
- ESLint warnings: 0
- Total issues: 0
- Layer violations: 0 (maintained)
