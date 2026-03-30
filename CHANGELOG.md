# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning as closely as practical during `0.x`.

## [0.1.1] - 2026-03-30

### Fixed

- reuse the scanned temporary clone during `af add skills` so installing a discovered skill does not reclone the same repository
- detect repositories with a root-level `SKILL.md` and install them correctly as single-skill repositories
- make the packed CLI smoke test validate the tarball for the current package version instead of reusing an older archive

### Changed

- clarify release wording and built-in agent naming copy in the docs
- document root-level skill repository support in the installation guide

## [0.1.0] - 2026-03-28

### Added

- initial public CLI for managing and syncing skills across AI agents and project workspaces
- support for Claude Code, Codex, Gemini CLI, OpenClaw, Qoder, OpenCode, Cursor, and custom agents
- user-level and project-level skill sync flows
- interactive add, import, list, show, sync, unsync, remove, update, and completion commands
- JSON registry storage and project-local sync metadata
- opt-in shell completion installation that does not auto-write shell config during npm install
- clean-build release verification and tarball smoke testing
- GitHub community health files: contributing guide, code of conduct, security policy, issue templates, and PR template
- Windows package smoke testing in CI
- tag-driven release workflow for npm and GitHub Releases
