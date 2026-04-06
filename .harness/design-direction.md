# Design Direction

## Code Quality Principles

### Single Responsibility
- Each module should have one reason to change
- Services in `app/` layer should focus on single domain concerns
- Commands in `commands/` layer should only handle CLI interaction

### Dependency Direction
- Dependencies flow downward: commands → app → infra
- Never import upward (infra should never know about app or commands)
- Use dependency injection for cross-layer access (FileOperationsService pattern)

### Explicit Over Implicit
- Import paths should clearly indicate layer boundaries
- Avoid re-exporting from intermediate modules
- Type dependencies should be declared explicitly in `types.ts`

### No Hidden State
- Singleton pattern (like Storage) should be well-documented
- Service instantiation should be visible in cli.ts
- Avoid implicit global state mutations

## Architecture Enforcement Strategy

### ESLint Layer Rules

Custom rule `no-cross-layer-imports` will enforce:

```
Layer hierarchy:
1. types.ts      - Can be imported by anyone, imports nothing
2. infra/        - Can import types only
3. app/          - Can import infra, types
4. commands/     - Can import app, types
5. tui/          - Can import app, types

Forbidden patterns:
- commands/*.ts importing from infra/
- tui/*.ts importing from infra/
- app/*.ts importing from commands/
- infra/*.ts importing from app/ or commands/
```

### Architecture Boundary Tests

Tests in `tests/architecture/layer-boundaries.test.ts` will:

1. **Import Graph Analysis**
   - Parse all source files
   - Build dependency graph
   - Verify no forbidden edges exist

2. **Layer Isolation Tests**
   - Verify infra modules only import from types
   - Verify commands modules only import from app/types
   - Verify app modules only import from infra/types

3. **Test File Placement**
   - Test files mirror source structure
   - `tests/app/*.test.ts` for `src/app/*.ts`
   - `tests/infra/*.test.ts` for `src/infra/*.ts`

## Testing Strategy

### Unit Tests (Primary)

**Location**: `tests/` directory mirroring source structure

**Patterns**:
```typescript
// Standard test file structure
describe('ModuleName', () => {
  describe('functionName', () => {
    it('should do X when Y', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

**Mocking Strategy**:
- Use `vi.fn()` for function mocks
- Use `vi.mock()` for module mocks
- Create factory functions for complex mock objects
- Keep mocks minimal and focused

### Architecture Boundary Tests

**Location**: `tests/architecture/`

**Approach**:
- Use static analysis to verify import patterns
- Fail fast on layer violations
- Generate readable violation reports

### Integration Tests

**Scope**: Critical workflows (import, sync, update)

**Approach**:
- Test full command execution paths
- Use temporary directories for file operations
- Mock external dependencies (git, network)

### Test Organization

```
tests/
├── architecture/
│   └── layer-boundaries.test.ts
├── app/
│   ├── skill-service.test.ts
│   ├── file-operations.test.ts
│   ├── sync-check-service.test.ts
│   └── sync/
│       ├── agent-sync-service.test.ts
│       ├── project-sync-service.test.ts
│       └── base-sync-service.test.ts
├── commands/
│   ├── list.test.ts
│   ├── import.test.ts
│   └── ...
├── infra/
│   ├── storage.test.ts
│   ├── files.test.ts
│   └── git.test.ts
├── tui/
│   └── ...
└── cli.test.ts
```

## Tooling Configuration

### Prettier Configuration

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

**Scripts**:
```json
{
  "format": "prettier --write \"src/**/*.ts\" \"tests/**/*.ts\"",
  "format:check": "prettier --check \"src/**/*.ts\" \"tests/**/*.ts\""
}
```

### ESLint Configuration

```javascript
// .eslintrc.cjs
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'import'],
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

    // Import rules
    'import/order': ['error', {
      'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
      'alphabetize': { 'order': 'asc' }
    }],
    'import/no-duplicates': 'error',
    'import/no-cycle': 'error',

    // Custom layer rule (Sprint 1)
    'no-cross-layer-imports': 'error',
  },
  settings: {
    'import/resolver': {
      typescript: {},
    },
  },
};
```

### TypeScript Strict Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false
  }
}
```

## Code Review Checklist

### Layer Compliance
- [ ] Does this PR introduce any cross-layer imports?
- [ ] Are commands only importing from app/ and types?
- [ ] Are app services only importing from infra/ and types?
- [ ] Is infra only importing from types?

### Code Quality
- [ ] Does the code pass `npm run lint` with zero errors/warnings?
- [ ] Is the code formatted according to Prettier?
- [ ] Are there any `any` types that should be typed?
- [ ] Are async functions properly awaiting promises?

### Test Quality
- [ ] Are there tests for new functionality?
- [ ] Do tests follow the arrange-act-assert pattern?
- [ ] Are mocks minimal and focused?
- [ ] Do all existing tests still pass?

### Documentation
- [ ] Are complex functions documented with JSDoc?
- [ ] Are architecture decisions documented?
- [ ] Is the code review checklist followed?

## Anti-Patterns to Avoid

### 1. Cross-Layer Imports

**Bad**:
```typescript
// commands/sync.ts - WRONG: direct infra import
import { files } from '../infra/files.js';
```

**Good**:
```typescript
// commands/sync.ts - CORRECT: use app layer abstraction
import { FileOperationsService } from '../app/file-operations.js';
```

### 2. God Services

**Bad**: A single service handling skill management, sync, and import logic.

**Good**: Separate services with focused responsibilities:
- `SkillService` - skill CRUD operations
- `AgentSyncService` - sync to user-level agents
- `ProjectSyncService` - sync to projects

### 3. Singleton Abuse

**Bad**: Accessing `Storage.getInstance()` throughout the codebase.

**Good**: Inject storage dependency via constructor, assemble in cli.ts.

### 4. Test File Mismatch

**Bad**: Tests in `tests/commands/` testing `src/app/` code.

**Good**: Tests mirror source structure, testing the same module they mirror.

### 5. Implicit State Dependencies

**Bad**: Functions that rely on global state without parameters.

**Good**: Functions receive all dependencies as parameters or instance state.

### 6. Worm Pattern (Duplicate Calls)

**Bad**:
```typescript
await ctx.skills.importFromPath(sourcePath, name, source);
storage.saveSkill(name, source); // Duplicate! importFromPath already saves
```

**Good**: Single source of truth for state mutations.

### 7. Missing Error Types

**Bad**: `catch (e)` without type narrowing.

**Good**:
```typescript
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  // handle error
}
```

### 8. Console Logging in Business Logic

**Bad**: Service methods calling `console.log()` directly.

**Good**: Services return results/errors, commands handle output formatting.

## Migration Notes

### Phase 1: Setup (Sprint 1)
- Add Prettier and ESLint configs
- Create custom layer rule
- Run formatter on all files (single commit)

### Phase 2: Layer Fixes (Sprint 2)
- One commit per module for import fixes
- Test after each module fix
- Document any necessary FileOperationsService extensions

### Phase 3: Quality (Sprint 3)
- Fix technical debt
- Address all lint warnings
- One commit per issue type

### Phase 4: Testing (Sprint 4)
- Add tests incrementally
- One test file per commit
- Maintain green test suite throughout

### Phase 5: Finalize (Sprint 5)
- Complete architecture tests
- Update documentation
- Final review and cleanup
