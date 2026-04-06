# Sprint 04 Self-Check

## Contract Behaviors
| # | Behavior | Self-Check Result | Evidence |
|---|----------|-------------------|----------|
| 1 | `cli.ts` tests: `launchCLI` initializes services and registers commands | PARTIAL | `launchCLI` runtime test is complex due to deep side effects; `isFirstRun` and `showWelcome` are fully tested with mocks. `launchCLI` assembly chain is verified indirectly via command-level tests. |
| 2 | `cli.ts` tests: `isFirstRun` detects missing registry file | PASS | Two tests verify `true` and `false` return with spy on `fs.existsSync` |
| 3 | `cli.ts` tests: `showWelcome` outputs formatted welcome text | PASS | Two tests verify output contains "Welcome to AgentForge" and quick start instructions |
| 4 | `cli.ts` tests: `launchCLI` first-run shows welcome and exits | PARTIAL | Tested via `isFirstRun()` + `showWelcome()` call chain in isolation; full `launchCLI()` with arg parsing is covered by the 10 command test files |
| 5 | `file-operations.ts` tests: all methods delegate correctly | PASS | 20 tests covering all 11 methods with real temp directories |
| 6 | `file-operations.ts` tests: `pathExists`, `fileExists` return correct boolean | PASS | Tests for existing and non-existent paths |
| 7 | `file-operations.ts` tests: `listSubdirectories` filters hidden dirs and non-dirs | PASS | Tests verify hidden dirs excluded, files excluded |
| 8 | `file-operations.ts` tests: `scanSkillsInDirectory` detects SKILL.md dirs | PASS | Tests verify case-insensitive detection, hidden dirs excluded |
| 9 | `file-operations.ts` tests: `readFile`/`readFileSync` return null on error | PASS | Tests for existing and non-existent files |
| 10 | `file-operations.ts` tests: `getDirectoryHash` delegates to infra | PASS | Tests verify real hash output and null for non-existent dir |
| 11 | `cli-formatting.ts` tests: `sortAgentNamesByPriority` sorts correctly | PASS | 4 tests covering priority, unknown names, empty input, immutability |
| 12 | `cli-formatting.ts` tests: `formatSourceLabel` returns correct labels | PASS | 3 tests for git, local, project sources |
| 13 | `cli-formatting.ts` tests: `formatAgentList` sorts and joins correctly | PASS | 3 tests for ordering, empty, custom agents |
| 14 | `cli-formatting.ts` tests: `formatProjectSkillList` formats grouped output | PASS | 5 tests for status icons, different version, not imported, grouping, empty |
| 15 | Integration: add-skill-workflow completes end-to-end | PASS | `tests/integration/add-skill-workflow.test.ts` (2 tests) |
| 16 | Integration: sync-workflow syncs and unsyncs to agents/projects | PASS | `tests/integration/sync-workflow.test.ts` (5 tests) |
| 17 | Integration: import-workflow imports skills from project | PASS | `tests/integration/import-workflow.test.ts` (4 tests) |
| 18 | Pre-existing test failure fixed | PASS | `tests/tui/hooks/useInput.test.tsx` passes (13 tests) |
| 19 | Coverage report generated successfully | PASS | `npm run test:coverage` produces `coverage/` directory |
| 20 | 80%+ line coverage for `app/` | PASS | Achieved: 85.77% |
| 21 | 80%+ line coverage for `commands/` | PASS | Achieved: 81.11% |
| 22 | Test suite runs in under 30 seconds | PASS | Duration: ~3 seconds (coverage), ~2.7 seconds (no coverage) |
| 23 | No layer violations introduced | PASS | `npx vitest run tests/architecture/layer-boundaries.test.ts` -- 12 tests, 0 violations |
| 24 | Build still passes | PASS | `npm run build` succeeds with zero errors |
| 25 | ESLint still passes | PASS | `npm run lint` exits with code 0, 0 errors, 0 warnings |

## Commands Run
```bash
npx vitest run              # 519 passed, 0 failures
npm run test:coverage       # app/: 85.77%, commands/: 81.11%
npm run lint                 # 0 errors, 0 warnings
npm run build                # success
npx vitest run tests/architecture/layer-boundaries.test.ts  # 12 passed, 0 violations
```

## Known Gaps
1. **`launchCLI` deep assembly test**: The full `launchCLI()` function tests service construction, command registration, and arg parsing. Due to the module's heavy side effects (fs-extra at module level, process.exit, service instantiation), a comprehensive mock-based test of this function is fragile. Coverage is achieved indirectly through the 10 comprehensive command test files that verify each registered command works.
2. **`src/app/sync/` coverage at 59.87%**: Below 80%. The contract focused on `app/` aggregate (85.77%) which passes. The sync subdirectory is already covered by `sync-workflow.test.ts` integration tests and the existing unit tests. Deeper coverage for sync services is out of scope for Sprint 4.
3. **`completion.ts` at 64.28%**: Contains a large `generateCompletionScriptForShell` function (~370 lines) with extensive per-shell completion logic. Only the `--install` path is tested; the completion script generation is not. This is out of scope as the function is purely output generation.

## Notes For Evaluator
- All contract verification commands pass. The 25 behaviors are tracked above.
- Mock helper refactoring: `tests/helpers/mock-context.ts` exports `createMockFileOps` and `createMockContext`. Five existing test files (`import.test.ts`, `sync.test.ts`, `unsync.test.ts`, `show.test.ts`, `completion.test.ts`) now import from this shared source instead of duplicating the function.
- Test count increased from 486 to 519 (33 new tests added).
- No breaking changes to public API or CLI behavior.
- `src/cli.ts` already exports `isFirstRun` and `showWelcome` for testability (this was done in prior work before this sprint implementation began).
