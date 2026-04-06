# Sprint 1 Contract: Architecture Boundaries & Linting Setup

**Sprint Theme**: Establish tooling and visibility for architecture enforcement
**Sprint Number**: 1 of 5
**Status**: PENDING

---

## Objectives

1. Set up Prettier with project-wide configuration
2. Set up ESLint with TypeScript and import rules
3. Create custom ESLint rule for layer boundary enforcement
4. Run initial lint and identify all violations
5. Add architecture boundary test framework

---

## Deliverables

### 1. Prettier Configuration

**File**: `.prettierrc`
- Semi-colons enabled
- Single quotes
- Trailing commas (ES5)
- 2-space indentation
- 100 character line width
- Bracket spacing enabled
- Arrow function parentheses always

**File**: `.prettierignore`
- Ignore `node_modules/`
- Ignore `dist/`
- Ignore `coverage/`
- Ignore `*.min.js`

**File**: `package.json` (scripts section)
- Add `format` script: `prettier --write "src/**/*.ts" "tests/**/*.ts"`
- Add `format:check` script: `prettier --check "src/**/*.ts" "tests/**/*.ts"`

### 2. ESLint Configuration

**File**: `.eslintrc.cjs`
- Parser: `@typescript-eslint/parser`
- Plugins: `@typescript-eslint`, `import`
- Extends:
  - `eslint:recommended`
  - `plugin:@typescript-eslint/recommended`
  - `plugin:@typescript-eslint/strict`
  - `plugin:import/recommended`
  - `plugin:import/typescript`
- Custom rule: `no-cross-layer-imports` (error)
- Import ordering rules
- TypeScript strict rules

**File**: `eslint-rules/no-cross-layer-imports.js`
- Custom ESLint rule implementation
- Enforces layer hierarchy:
  - `types.ts` can be imported by anyone
  - `infra/` can only import from `types.ts`
  - `app/` can import from `infra/`, `types.ts`
  - `commands/` can import from `app/`, `types.ts`
  - `tui/` can import from `app/`, `types.ts`
- Forbidden patterns:
  - `commands/*.ts` importing from `infra/`
  - `tui/*.ts` importing from `infra/`
  - `app/*.ts` importing from `commands/`
  - `infra/*.ts` importing from `app/` or `commands/`

**File**: `.eslintignore`
- Ignore `node_modules/`
- Ignore `dist/`
- Ignore `coverage/`
- Ignore `eslint-rules/*.js` (the custom rule itself)

### 3. Architecture Boundary Tests

**File**: `tests/architecture/layer-boundaries.test.ts`
- Import graph analysis using AST parsing
- Layer isolation verification tests
- Generate readable violation reports
- Test file structure validation

### 4. Documentation

**File**: `.harness/baseline-violations.md`
- Document current violation count
- List all cross-layer imports
- Track progress metrics

### 5. Package.json Updates

**File**: `package.json`
- Add `lint` script: `eslint src tests`
- Add `lint:fix` script: `eslint src tests --fix`
- Update dependencies (if needed):
  - `@typescript-eslint/parser`
  - `@typescript-eslint/eslint-plugin`
  - `eslint-plugin-import`
  - `eslint-import-resolver-typescript`
  - `prettier`

---

## Implementation Steps

### Step 1: Install Dependencies
```bash
npm install -D prettier eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-import eslint-import-resolver-typescript
```

### Step 2: Create Prettier Configuration
1. Create `.prettierrc` with specified settings
2. Create `.prettierignore` with ignore patterns
3. Add format scripts to `package.json`
4. Run `npm run format` to format all existing files

### Step 3: Create ESLint Configuration
1. Create `.eslintrc.cjs` with base configuration
2. Create `.eslintignore` with ignore patterns
3. Add lint scripts to `package.json`
4. Run `npm run lint` to verify configuration works (violations expected)

### Step 4: Create Custom Layer Rule
1. Create `eslint-rules/` directory
2. Implement `no-cross-layer-imports.js` custom rule
3. Register custom rule in `.eslintrc.cjs`
4. Test rule against known violations

### Step 5: Create Architecture Tests
1. Create `tests/architecture/` directory
2. Implement `layer-boundaries.test.ts`
3. Use TypeScript compiler API or regex to parse imports
4. Assert layer boundaries are enforced
5. Run tests to verify framework works

### Step 6: Document Baseline
1. Run full lint scan
2. Count violations by type
3. Create `.harness/baseline-violations.md` with metrics
4. Update `.harness/status.md` with Sprint 1 progress

---

## Files to Create

| File Path | Description |
|-----------|-------------|
| `.prettierrc` | Prettier configuration |
| `.prettierignore` | Prettier ignore patterns |
| `.eslintrc.cjs` | ESLint configuration |
| `.eslintignore` | ESLint ignore patterns |
| `eslint-rules/no-cross-layer-imports.js` | Custom layer boundary rule |
| `tests/architecture/layer-boundaries.test.ts` | Architecture test framework |
| `.harness/baseline-violations.md` | Violation baseline documentation |

## Files to Modify

| File Path | Changes |
|-----------|---------|
| `package.json` | Add scripts: format, format:check, lint, lint:fix; Add devDependencies |

---

## Verification Commands

```bash
# Install dependencies
npm install

# Run Prettier check (should show formatting issues)
npm run format:check

# Format all files
npm run format

# Run ESLint (violations expected, but should execute without errors)
npm run lint

# Run architecture boundary tests
npm test -- tests/architecture/layer-boundaries.test.ts

# Run full test suite (all tests should still pass)
npm test

# Build project (should succeed)
npm run build
```

**Success Criteria**:
- [ ] `npm run format` formats all files without errors
- [ ] `npm run lint` executes and reports violations (violations allowed)
- [ ] Architecture test runs and reports current state
- [ ] All existing tests still pass
- [ ] Build succeeds

---

## Risk Assessment

### Risk 1: ESLint Configuration Conflicts
**Impact**: Medium
**Likelihood**: Low
**Mitigation**: Use standard TypeScript ESLint configs, test incrementally

### Risk 2: Custom Rule Complexity
**Impact**: Medium
**Likelihood**: Medium
**Mitigation**: Start with simple regex-based rule, can enhance later

### Risk 3: Large Formatting Changes
**Impact**: Low
**Likelihood**: High
**Mitigation**: Format in separate commit, review diff carefully

### Risk 4: Test Framework Compatibility
**Impact**: Low
**Likelihood**: Low
**Mitigation**: Use existing Vitest framework, follow current patterns

---

## Dependencies

### Prerequisites
- Node.js 18+
- Existing TypeScript project with Vitest
- All current tests passing

### New npm Dependencies
- `prettier` (latest stable)
- `eslint` (v8.x for CommonJS config compatibility)
- `@typescript-eslint/parser` (compatible with TypeScript version)
- `@typescript-eslint/eslint-plugin` (compatible with parser)
- `eslint-plugin-import` (for import ordering)
- `eslint-import-resolver-typescript` (for TypeScript path resolution)

---

## Definition of Done

- [ ] Prettier configuration complete and working
- [ ] ESLint configuration complete with custom rule
- [ ] Architecture boundary test framework created
- [ ] Baseline violations documented
- [ ] All existing tests still pass
- [ ] Build succeeds
- [ ] No breaking changes to CLI functionality
- [ ] Contract updated with actual results

---

## Notes

This sprint focuses on **setup and visibility**. Violations are expected and allowed. The goal is to establish tooling that makes violations visible and measurable. Sprint 2 will address fixing the violations.

The custom ESLint rule should be functional but does not need to be perfect - it can be refined in later sprints based on real-world usage.
