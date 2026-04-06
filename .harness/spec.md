# Product Spec

## Approval Snapshot
- product: AgentForge Architecture Refactoring
- selected_pack: refactor
- locked architecture: 3-layer (commands → app → infra)
- locked stack: TypeScript + Vitest + ESLint + Prettier
- total_sprints: 5

## Overview

This refactoring project aims to improve AgentForge's architecture quality, code quality, and test coverage while maintaining functional stability. The project focuses on enforcing strict layer boundaries (commands → app → infra), eliminating cross-layer violations, establishing consistent code style tooling, and achieving comprehensive test coverage including architecture boundary tests.

The codebase currently has 66 cross-module edges (out of 88 total) indicating significant architectural coupling. This refactoring will systematically address these issues through automated tooling, targeted refactoring, and comprehensive testing.

## Goals

### Architecture Quality (Priority 1)
- Reduce cross-module edges from 66 to < 20 (measured by dependency analysis)
- Establish ESLint rules that prevent cross-layer imports
- Achieve 100% layer compliance: commands → app → infra (no skipping)
- Document architecture decisions in code comments

### Code Quality (Priority 2)
- Enable Prettier formatting across all source files
- Enable ESLint with zero errors, zero warnings
- Enable all TypeScript strict mode checks
- Eliminate known technical debt (duplicate calls, missing tests)
- Achieve consistent code style across all modules

### Test Coverage & Quality (Priority 3)
- Achieve 80%+ line coverage for app/ and commands/ layers
- Add architecture boundary tests that verify layer import rules
- Add tests for cli.ts and file-operations.ts
- Improve test readability with consistent patterns

### Developer Experience (Priority 4)
- Document architecture decisions and layer responsibilities
- Create code review checklist for layer compliance
- Ensure fast test execution (< 30 seconds for full suite)

## Non-Goals

- No UI/interaction changes to TUI components
- No performance optimization (maintain current performance)
- No rewriting of existing business logic
- No adding new features or capabilities
- No changes to external API/CLI interface behavior

## Architecture

### Locked Decisions

1. **Layer Structure**: Three-layer architecture with strict dependency direction
   - `commands/` → `app/` → `infra/`
   - Each layer can only import from the layer directly below it
   - `types.ts` is shared across all layers

2. **FileOperationsService Pattern**: Continue using DI pattern for commands→infra access
   - Commands use `FileOperationsService` from `app/` layer
   - `FileOperationsService` wraps `infra/files.ts` operations
   - This pattern should be documented and consistently applied

3. **Testing Strategy**: Unit tests + architecture boundary tests
   - Unit tests for each module's functionality
   - Architecture tests verify import rules programmatically
   - Integration tests for critical workflows

### Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      commands/                               │
│  CLI argument parsing, user interaction, output formatting  │
│  - Imports from: app/, types                                 │
│  - Forbidden: Direct imports from infra/                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        app/                                  │
│  Business logic, orchestration, domain services             │
│  - Imports from: infra/, types                              │
│  - Forbidden: Imports from commands/                         │
│  - Contains: skill-service, sync-*, scan-service, etc.      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       infra/                                 │
│  External dependencies, file system, git, storage           │
│  - Imports from: types only                                  │
│  - Forbidden: Imports from app/, commands/                   │
│  - Contains: storage.ts, git.ts, files.ts                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       types.ts                               │
│  Shared type definitions, interfaces, constants             │
│  - Can be imported by any layer                              │
│  - No runtime dependencies                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        tui/                                  │
│  Terminal UI (React/Ink-based)                              │
│  - Imports from: app/, types                                 │
│  - Forbidden: Direct imports from infra/                     │
│  - Uses CommandContext pattern to access services           │
└─────────────────────────────────────────────────────────────┘
```

### Module Structure

#### commands/ (CLI Layer)
- `index.ts` - Command registry and context assembly
- `list.ts` - List resources command
- `show.ts` - Show details command
- `import.ts` - Import skills command
- `remove.ts` - Remove resources command
- `sync.ts` - Sync skills command
- `add.ts` - Add resources command
- `unsync.ts` - Unsync skills command
- `update.ts` - Update skills command
- `search.ts` - Search command
- `completion.ts` - Shell completion command
- `complete.ts` - Internal completion handler

#### app/ (Application Layer)
- `skill-service.ts` - Skill management operations
- `scan-service.ts` - Project scanning
- `sync-check-service.ts` - Conflict detection
- `project-storage.ts` - Project-local config
- `file-operations.ts` - File operations abstraction (DI for commands)
- `cli-formatting.ts` - Output formatting utilities
- `sync/` - Sync services
  - `base-sync-service.ts` - Abstract sync base
  - `agent-sync-service.ts` - User-level sync
  - `project-sync-service.ts` - Project-level sync

#### infra/ (Infrastructure Layer)
- `storage.ts` - JSON data persistence (singleton)
- `git.ts` - Git operations wrapper
- `files.ts` - File system utilities

#### tui/ (Terminal UI Layer)
- `components/` - Reusable React components
- `screens/` - Full-screen components
- `store/` - Zustand state management
- `hooks/` - Custom React hooks
- `utils/` - TUI-specific utilities

## Sprints

### Sprint 1: Architecture Boundaries & Linting Setup

**Theme**: Establish tooling and visibility for architecture enforcement

**Objectives**:
1. Set up Prettier with project-wide configuration
2. Set up ESLint with TypeScript and import rules
3. Create custom ESLint rule for layer boundary enforcement
4. Run initial lint and identify all violations
5. Add architecture boundary test framework

**Deliverables**:
- `.prettierrc` and `.prettierignore` configuration
- `.eslintrc.cjs` with TypeScript, import, and custom layer rules
- `eslint-rules/no-cross-layer-imports.js` custom rule
- `tests/architecture/layer-boundaries.test.ts` test file
- Documented baseline violation count

**Verification**:
- `npm run lint` executes successfully (with violations allowed)
- `npm run format` formats all source files
- Architecture test runs and reports current violations

### Sprint 2: Layer Compliance Refactoring

**Theme**: Eliminate cross-layer violations and establish clean boundaries

**Objectives**:
1. Fix all commands → infra direct imports (use FileOperationsService)
2. Ensure commands only import from app/ and types
3. Ensure app only imports from infra/ and types
4. Ensure infra only imports from types
5. Verify TUI layer compliance
6. Update FileOperationsService if new methods needed

**Deliverables**:
- All cross-layer import violations resolved
- FileOperationsService extended with necessary methods
- Updated imports in all command files
- Zero architecture boundary test failures

**Verification**:
- `npm run lint` passes with zero layer violations
- Architecture boundary tests pass
- All existing tests still pass

### Sprint 3: Code Quality & Technical Debt

**Theme**: Improve code quality and eliminate known technical debt

**Objectives**:
1. Fix duplicate `saveSkill` calls in import.ts
2. Eliminate all ESLint warnings
3. Apply Prettier formatting to all files
4. Review and fix any TypeScript strict mode errors
5. Add missing error handling patterns
6. Improve code documentation (JSDoc where helpful)

**Deliverables**:
- import.ts refactored with no duplicate calls
- Zero ESLint errors and warnings
- All files formatted per Prettier config
- TypeScript strict mode fully enabled
- Code review checklist document

**Verification**:
- `npm run lint` passes with zero issues
- `npm run build` succeeds with strict mode
- All existing tests still pass
- Manual code review approved

### Sprint 4: Test Coverage & Quality

**Theme**: Achieve comprehensive test coverage

**Objectives**:
1. Add tests for cli.ts entry point
2. Add tests for file-operations.ts
3. Improve test coverage in commands/ layer
4. Add integration tests for critical workflows
5. Standardize test patterns and organization
6. Achieve 80%+ line coverage

**Deliverables**:
- `tests/cli.test.ts`
- `tests/app/file-operations.test.ts`
- Coverage report showing 80%+ for app/ and commands/
- Consistent test patterns documented
- All tests pass reliably

**Verification**:
- `npm test` passes with all tests
- `npm run test:coverage` shows 80%+ coverage
- Tests run in < 30 seconds

### Sprint 5: Architecture Boundary Tests & Finalization

**Theme**: Lock in architecture quality with comprehensive tests

**Objectives**:
1. Complete architecture boundary tests
2. Add dependency analysis to CI pipeline
3. Document architecture decisions in code
4. Final code review using checklist
5. Clean up any remaining issues
6. Update CLAUDE.md with architecture guidelines

**Deliverables**:
- Complete architecture boundary test suite
- CI integration for lint and architecture tests
- Architecture documentation in code comments
- Updated CLAUDE.md with layer guidelines
- Code review checklist finalized

**Verification**:
- All architecture tests pass
- CI pipeline runs all checks
- Code review approved
- Documentation complete

## Success Metrics

### Architecture Quality
- [ ] Cross-module edges reduced from 66 to < 20
- [ ] Zero layer boundary violations in ESLint
- [ ] All architecture boundary tests pass
- [ ] FileOperationsService pattern documented and consistent

### Code Quality
- [ ] Zero ESLint errors
- [ ] Zero ESLint warnings
- [ ] All files formatted per Prettier
- [ ] TypeScript strict mode enabled with zero errors

### Test Quality
- [ ] 80%+ line coverage for app/ directory
- [ ] 80%+ line coverage for commands/ directory
- [ ] Tests for cli.ts and file-operations.ts
- [ ] Architecture boundary tests implemented
- [ ] Test suite runs in < 30 seconds

### Developer Experience
- [ ] Architecture documented in code comments
- [ ] Code review checklist created
- [ ] CLAUDE.md updated with architecture guidelines
- [ ] All existing functionality preserved

## Acceptance Notes

1. **Functional Preservation**: All existing CLI commands must work identically after refactoring
2. **Test Stability**: No test flakiness introduced, all tests pass consistently
3. **Build Time**: Build and test times should not significantly increase
4. **Documentation**: Architecture decisions and patterns must be documented in code
5. **CI Integration**: Linting and architecture tests integrated into CI pipeline
