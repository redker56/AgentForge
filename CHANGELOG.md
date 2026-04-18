# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning as closely as practical during `0.x`.

## [0.2.0] - 2026-04-18

### Added

- an Ink-based TUI for browsing and managing skills, agents, projects, sync workflows, and imports from a single interactive interface
- local skill categories with CLI and TUI flows for assigning, filtering, and browsing categorized or uncategorized skills
- structured TUI update workflows for selected skills and all Git-backed skills, including preview, execution, and result states
- project-level unsync flows in the TUI with project and agent-type targeting instead of agent-only removal
- contextual skill workbenches in the Agents and Projects tabs with `All`, `Imported`, and `Unimported` views plus direct import, unsync, update, and categorize actions
- reconcile support that refreshes persisted AgentForge skill metadata from the managed library on startup and reload
- `updatedAt` skill metadata with CLI and TUI display so the last successful update time is visible

### Changed

- redesigned the TUI around a cohesive Anthropic-inspired visual language with clearer hierarchy, stronger focus states, and more discoverable action hints
- clarified and expanded TUI affordances for update, unsync, categorize, search, and contextual skill actions in the help overlay, status bar, and screen summaries
- tightened architecture boundaries, linting, and test coverage across the CLI and TUI layers
- raised the supported runtime to Node.js 20 and aligned CI and release automation with the actual dependency requirements

### Fixed

- preserve skill names correctly when installing from GitHub tree URLs and other subpath-based Git sources
- restore agent sync mode selection in the TUI instead of silently defaulting to copy-only behavior
- make Add Skill submit correctly from the TUI form when pressing `Enter`
- prevent layout jump, multiline overflow, and repeated top-of-screen redraws in skill, sync, import, update, category, and confirmation views
- stabilize status bar hint truncation and de-duplicate back-navigation hints so narrow terminals remain readable
- make git-based skill updates work for installed skills that do not keep local `.git` metadata by re-fetching and replacing from the source repository

## [0.1.1] - 2026-03-30

### Fixed

- reuse the scanned temporary clone during `af add skills` so installing a discovered skill does not reclone the same repository
- detect repositories with a root-level `SKILL.md` and install them correctly as single-skill repositories
- make the packed CLI smoke test validate the tarball for the current package version instead of reusing an older archive

### Changed

- clarify release wording and built-in agent naming copy in the docs
- document root-level skill repository support in the installation guide
- let the release workflow fall back to npm trusted publishing when `NPM_TOKEN` is not configured
- align package repository metadata with the exact GitHub repository casing used for release provenance

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
