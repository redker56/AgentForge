# Contributing to AgentForge

Thanks for your interest in contributing to AgentForge.

## Before You Start

- Use Node.js 18 or newer.
- Make sure `git` is available in `PATH`.
- Read [README.md](README.md) for the user-facing behavior we want to preserve.
- Keep the project policy in mind: remove obsolete code instead of keeping compatibility layers around.

## Local Setup

```bash
npm install
npm run build
npm test
```

Recommended full verification before opening a PR:

```bash
npm run verify
```

## Project Structure

- `src/cli.ts`: CLI entry point
- `src/commands/`: command parsing and user-facing output
- `src/app/`: application services
- `src/app/sync/`: sync implementations for user-level and project-level targets
- `src/infra/`: filesystem, git, and registry helpers
- `tests/`: Vitest test suite

## Contribution Guidelines

- Keep changes focused and cohesive.
- Prefer deleting outdated code over keeping aliases, wrappers, or compatibility shims.
- Update `README.md` and `AGENTS.md` when behavior or architecture changes.
- Add or update tests when behavior changes.
- Keep command descriptions and empty-state hints aligned with the actual CLI syntax.

## Pull Request Checklist

- `npm run build` passes
- `npm test` passes
- `npm pack --dry-run` looks correct
- Documentation is updated when needed
- No leftover dead files, stale build output assumptions, or deprecated command paths remain

## Release Process

Releases are tag-driven.

1. Update `package.json` version.
2. Update [CHANGELOG.md](CHANGELOG.md).
3. Run `npm run verify`.
4. Commit and push the release commit.
5. Create and push a tag like `v0.1.0`.

The GitHub release workflow will:

- verify the tag matches `package.json`
- run tests
- pack and smoke-test the tarball
- publish to npm
- create a GitHub Release

## Reporting Security Issues

Please do not open public issues for security-sensitive reports.

See [SECURITY.md](SECURITY.md) for the preferred disclosure process.
