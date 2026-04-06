# Sprint 2 Contract: Layer Compliance Refactoring

**Sprint Theme**: Eliminate cross-layer violations and establish clean boundaries
**Sprint Number**: 2 of 5
**Status**: PENDING

---

## Summary

Sprint 2 focuses on resolving all layer boundary violations identified in Sprint 1. The primary violation is in `src/commands/index.ts:5` which directly imports `Storage` type from `infra/`. This sprint will establish proper abstraction patterns and ensure all layers follow the dependency hierarchy: commands → app → infra.

## Primary Path

1. Move the `Storage` type definition from `infra/storage.ts` to `types.ts`
2. Update all imports that reference `Storage` from `infra/` to use `types.ts`
3. Run architecture boundary tests and ESLint to verify zero violations
4. Run full test suite to confirm no functional regressions

---

## In Scope

- Fix the single layer violation in `src/commands/index.ts` (commands importing from infra)
- Move `Storage` type to `types.ts` for proper layer access
- Update all affected import statements
- Enable the skipped architecture boundary test for zero violations
- Run `npm run lint:fix` to auto-fix import ordering issues
- Verify all existing tests pass

## Out Of Scope

- Refactoring other ESLint issues (warnings, strict mode) - Sprint 3
- Adding new tests - Sprint 4
- Documentation updates - Sprint 5
- Changes to TUI components
- Changes to business logic
- FileOperationsService extensions (not needed for this violation)

---

## Locked Assumptions

1. **Architecture**: Three-layer pattern (commands → app → infra) is locked
2. **Storage Type**: Moving `Storage` type to `types.ts` preserves functionality since `commands/index.ts` only uses it as a type annotation
3. **Test Coverage**: Current 410 tests provide sufficient regression protection
4. **Breaking Changes**: None - this is purely an internal refactoring

---

## Files Expected To Change

| File | Change Type | Description |
|------|-------------|-------------|
| `src/types.ts` | MODIFY | Add `Storage` type export |
| `src/infra/storage.ts` | MODIFY | Remove `Storage` type export, re-export from types |
| `src/commands/index.ts` | MODIFY | Update import to use `types.ts` |
| `src/cli.ts` | MODIFY | Update import to use `types.ts` (if needed) |
| `tests/architecture/layer-boundaries.test.ts` | MODIFY | Enable skipped test for zero violations |
| Various test files | MODIFY | Auto-fixed import ordering via `lint:fix` |

---

## Testable Behaviors

| # | Behavior | Verification |
|---|----------|--------------|
| 1 | Zero layer boundary violations in ESLint | `npm run lint` reports 0 layer violations |
| 2 | Zero layer boundary violations in architecture tests | `npm test -- tests/architecture/layer-boundaries.test.ts` passes all tests including previously skipped one |
| 3 | All existing tests pass | `npm test` passes with 410+ tests |
| 4 | Build succeeds | `npm run build` completes without errors |
| 5 | CLI functionality preserved | Manual smoke test of key commands |

---

## Implementation Steps

### Step 1: Analyze Storage Type Usage

1. Search codebase for all imports of `Storage` from `infra/storage.js`
2. Identify which files need type-only imports vs runtime imports
3. Confirm `Storage` is used as a type in `commands/index.ts` (not instantiated)

### Step 2: Move Storage Type to types.ts

1. Add type definition for `Storage` class interface to `src/types.ts`:
   ```typescript
   // Storage type for layer compliance (implementation in infra/storage.ts)
   export interface StorageInterface {
     getSkillsDir(): string;
     getSkillPath(name: string): string;
     listSkills(): SkillMeta[];
     getSkill(name: string): SkillMeta | undefined;
     saveSkill(name: string, source: SkillSource): void;
     saveSkillMeta(name: string, meta: SkillMeta): void;
     deleteSkill(name: string): void;
     updateSkillSync(name: string, records: SyncRecord[]): void;
     updateSkillProjectSync(name: string, records: ProjectSyncRecord[]): void;
     listAgents(): Agent[];
     getAgent(id: string): Agent | undefined;
     listAllDefinedAgents(): Agent[];
     addAgent(id: string, name: string, basePath: string, skillsDirName?: string): void;
     removeAgent(id: string): boolean;
     listProjects(): ProjectConfig[];
     getProject(id: string): ProjectConfig | undefined;
     addProject(id: string, projectPath: string, addedAt?: string): void;
     removeProject(id: string): boolean;
   }
   ```
2. Alternative: Simply export `Storage` class type from `types.ts` using:
   ```typescript
   export type { Storage } from './infra/storage.js';
   ```
   Note: This creates a re-export but keeps the type accessible from types.ts

### Step 3: Update imports in commands/index.ts

1. Change line 5 from:
   ```typescript
   import type { Storage } from '../infra/storage.js';
   ```
   To:
   ```typescript
   import type { Storage } from '../types.js';
   ```

### Step 4: Handle cli.ts Import

1. In `src/cli.ts`, the `Storage` is imported for both type and runtime use:
   ```typescript
   import { Storage } from './infra/storage.js';  // Runtime import needed
   ```
   This is correct because `cli.ts` is a root-level file that can import from any layer.

2. Verify `cli.ts` layer classification: The architecture test treats root files (`cli.ts`, `tui.ts`, `entry.ts`) as `root` layer which can import from any layer. No changes needed.

### Step 5: Run ESLint Fix for Import Ordering

1. Run `npm run lint:fix` to auto-fix all import ordering issues
2. Verify this fixes the 394 auto-fixable issues mentioned in Sprint 1 QA

### Step 6: Enable Architecture Boundary Test

1. In `tests/architecture/layer-boundaries.test.ts`, change:
   ```typescript
   it.skip('should have zero layer boundary violations (Sprint 2 target)', () => {
     expect(violations).toHaveLength(0);
   });
   ```
   To:
   ```typescript
   it('should have zero layer boundary violations', () => {
     expect(violations).toHaveLength(0);
   });
   ```

### Step 7: Verify and Document

1. Run `npm run lint` - should report 0 layer violations
2. Run `npm test -- tests/architecture/layer-boundaries.test.ts` - all tests pass
3. Run `npm test` - all existing tests pass
4. Run `npm run build` - build succeeds
5. Manual smoke test: `node dist/cli.js --help` works correctly

---

## Verification Commands

```bash
# 1. Check for layer violations (should be 0)
npm run lint 2>&1 | grep -i "layer violation" || echo "No layer violations found"

# 2. Run architecture boundary tests (all should pass)
npm test -- tests/architecture/layer-boundaries.test.ts

# 3. Run full test suite (all should pass)
npm test

# 4. Build the project (should succeed)
npm run build

# 5. Quick smoke test
node dist/cli.js --help
node dist/cli.js list agents
```

**Success Criteria**:
- [ ] `npm run lint` reports zero layer violations
- [ ] Architecture boundary tests all pass (including previously skipped test)
- [ ] All existing tests pass (410+ tests)
- [ ] Build succeeds
- [ ] CLI functionality preserved

---

## Risk Assessment

### Risk 1: Type Import vs Runtime Import Confusion
**Impact**: Medium
**Likelihood**: Low
**Mitigation**: Carefully distinguish between `import type` (type-only) and `import` (runtime). The `Storage` in `commands/index.ts` is only used as a type in `CommandContext.storage: Storage`, so type-only import is sufficient.

### Risk 2: Circular Dependencies
**Impact**: Medium
**Likelihood**: Very Low
**Mitigation**: Moving `Storage` type to `types.ts` doesn't create circular deps because `types.ts` has minimal imports (only `os` and `path` for built-in agents).

### Risk 3: Test Mocks Breaking
**Impact**: Low
**Likelihood**: Low
**Mitigation**: Check test files for `vi.mock('../infra/storage.js')` patterns. These should continue to work since the actual `Storage` class implementation remains in `infra/storage.ts`.

### Risk 4: Import Auto-Fix Creating New Issues
**Impact**: Low
**Likelihood**: Low
**Mitigation**: Review git diff after `npm run lint:fix` before committing. The import/order rule only reorders imports, doesn't change semantics.

---

## Dependencies

### Prerequisites (from Sprint 1)
- [x] Prettier configuration complete
- [x] ESLint configuration with custom layer rule
- [x] Architecture boundary tests in place
- [x] All existing tests passing

### No New npm Dependencies Required

---

## Definition of Done

- [ ] Layer violation in `commands/index.ts` fixed
- [ ] `Storage` type accessible from `types.ts` (via re-export or interface)
- [ ] Zero layer boundary violations reported by ESLint
- [ ] Zero layer boundary violations reported by architecture tests
- [ ] All existing tests pass (410+)
- [ ] Build succeeds
- [ ] CLI commands work correctly
- [ ] Import ordering fixed via `npm run lint:fix`
- [ ] Contract updated with actual results

---

## Notes

### Why Move Storage Type Instead of Using FileOperationsService?

The Sprint 1 QA report suggested two options:
1. Move `Storage` type to `types.ts`
2. Access `Storage` via `CommandContext` interface

Option 1 is simpler because:
- `Storage` in `commands/index.ts` is only used as a **type annotation** in `CommandContext.storage: Storage`
- The actual `Storage` instance is created in `cli.ts` (root layer) and passed to commands via context
- No refactoring of the DI pattern is needed
- FileOperationsService is for file operations, not storage access

### Remaining ESLint Issues

After this sprint:
- Layer violations: 0 (fixed this sprint)
- Import ordering: ~0 (auto-fixed this sprint)
- TypeScript strict warnings: ~561 (Sprint 3 target)

The focus of Sprint 2 is strictly on layer compliance, not on all ESLint issues.

---

## Post-Sprint Metrics

Before Sprint 2:
- Layer violations: 1
- Total ESLint issues: 955 (497 errors, 458 warnings)
- Auto-fixable import ordering: 394

Expected After Sprint 2:
- Layer violations: 0
- Import ordering issues: 0 (fixed)
- Remaining ESLint issues: ~561 (TypeScript strictness - Sprint 3)
