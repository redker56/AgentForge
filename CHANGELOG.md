# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning as closely as practical during `0.x`.

## [0.2.4] - 2026-05-02

### Added

- TUI category editing can now select existing categories with `Space` and add new categories from the same flow

### Changed

- category suggestions in the TUI now come from the full skill library for set/add flows, while remove flows only show categories that can actually be removed from the selected skills
- category choices in the TUI show usage counts so existing categories are easier to reuse consistently

## [0.2.3] - 2026-04-27

### Added

- safer display handling for CJK and other wide-character text across fixed-width TUI rows, labels, and progress views

### Changed

- command cancellation and failure handling now uses a consistent CLI exit path
- registry and project-state persistence now writes through clearer repository boundaries

### Fixed

- prevent CJK skill names, paths, and progress labels from overflowing fixed-width TUI rows after truncation
- keep batch `af update` running after individual Git failures, then show a failed-skill summary with retry guidance
- allow TUI update results with per-skill failures to retry only the failed items
- reduce the risk of partially written registry or project-state files if an operation is interrupted

## [0.2.1] - 2026-04-19

### Added

- more reliable TUI navigation across shell, browser, overlay, and multi-step screens
- consistent workbench data views for skills, agents, projects, imports, updates, and sync previews
- safer persisted-state handling for registry and project-local sync metadata

### Changed

- TUI forms now keep form state outside presentation components, improving consistency when moving between steps
- skill, agent, and project detail screens now use the same row, section, badge, and filter logic across tabs

### Fixed

- show live per-skill progress during Git-backed updates, keep later tasks in view while the update list advances, and stop raw git clone/pull output from breaking the TUI surface
- fix Agent and Project skill detail overlays when scrolling long CJK or CRLF-based `SKILL.md` previews so borders and text layout stay stable
- route Import screen actions through the store/workbench path instead of bypassing it with raw service context calls

## [0.2.0] - 2026-04-18

### Added

- an Ink-based TUI for browsing and managing skills, agents, projects, sync flows, and imports from a single interactive interface
- local skill categories with CLI and TUI flows for assigning, filtering, and browsing categorized or uncategorized skills
- structured TUI update flows for selected skills and all Git-backed skills, including preview, execution, and result states
- project-level unsync flows in the TUI with project and agent-type targeting instead of agent-only removal
- contextual skill workbenches in the Agents and Projects tabs with `All`, `Imported`, and `Unimported` views plus direct import, unsync, update, and categorize actions
- reconcile support that refreshes persisted AgentForge skill metadata from the managed library on startup and reload
- `updatedAt` skill metadata with CLI and TUI display so the last successful update time is visible

### Changed

- redesigned the TUI around a cohesive Anthropic-inspired visual language with clearer hierarchy, stronger focus states, and more discoverable action hints
- clarified and expanded TUI affordances for update, unsync, categorize, search, and contextual skill actions in the help overlay, status bar, and screen summaries
- raised the supported runtime to Node.js 20 to match current dependency requirements

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
