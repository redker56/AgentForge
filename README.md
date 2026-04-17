# AgentForge

[English](README.md) | [简体中文](README.zh-CN.md)

A CLI for managing and syncing skills across Claude Code, Codex, Gemini CLI, OpenClaw, Cursor, OpenCode, Qoder, and project workspaces.

[![CI](https://github.com/redker56/agentforge/actions/workflows/ci.yml/badge.svg)](https://github.com/redker56/agentforge/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/%40redker56%2Fagentforge.svg)](package.json)

## Requirements

- Node.js 20 or newer
- `git` available in `PATH`
- CI currently covers Ubuntu and Windows on Node 20 / 22

## Installation

```bash
npm install -g @redker56/agentforge
```

Recommended next steps:

```bash
af --help
af completion --install
```

AgentForge does not automatically modify your shell configuration during installation.

To enable shell completion explicitly, run:

```bash
af completion --install
```

Re-running the same command updates the existing AgentForge completion block in place.

If shell auto-detection fails, specify it directly:

```bash
af completion powershell --install
af completion bash --install
```

## Commands

### View Commands

```bash
# List all skills (show user-level and project-level distribution)
af list skills

# List available Agents (show user-level and project-level skills)
af list agents

# List registered projects
af list projects

# List skill categories and counts
af list categories

# Filter skills by category
af list skills --category design

# Show only uncategorized skills
af list skills --uncategorized

# Show skill details
af show skills <name>

# Show Agent details (and installed skills)
af show agents <id>

# Show project details (and contained skills, mark import status)
af show projects <id>
```

`af list agents` groups project-level skills by project for easier scanning. The project-level count is the total number of skills across all grouped projects.

```text
claude - Claude Code
  Project-level (3):
    Obsidian:
      defuddle
      json-canvas
    Voice:
      frontend-design
```

### Add Commands

```bash
# Install skill from Git repository
af add skills <repo-url> [name]

# Install skill from Git subdirectory (supports GitHub/GitLab /tree/ URL)
af add skills https://github.com/user/repo/tree/main/skills/my-skill

# Install from multi-skill repository (auto-scan and list all skills, supports multi-select)
af add skills https://github.com/user/skills-collection

# Add custom Agent (interactive guide)
af add agents

# Add custom Agent with specified ID
af add agents my-agent

# Add project (interactive guide)
af add projects

# Add project with specified ID and path
af add projects my-project /path/to/project
```

#### af add skills Features

- **Single-skill repository**: Auto-detect and install directly
- **Root-level skill repository**: Supports repositories whose `SKILL.md` lives at the repository root
- **Multi-skill repository**: Auto-scan and list all directories containing `SKILL.md`, interactive multi-select installation
- **Specified subdirectory**: Supports `/tree/` URL format, directly install skill from specified subdirectory
- **Post-install detection**: If same-name skill exists in Agent directory, auto-link or prompt for handling

### Import Commands

```bash
# Import skill from project (interactive project and skill selection)
af import projects

# Import specified skill from project (interactive project selection)
af import projects <project-id>

# Import specified skill from project
af import projects <project-id> <skill-name>

# Import skill from Agent (interactive Agent and skill selection)
af import agents

# Import specified skill from Agent (interactive Agent selection)
af import agents <agent-id>

# Import specified skill from Agent
af import agents <agent-id> <skill-name>
```

### Sync Commands

```bash
# Sync skill to Agent (interactive skill and Agent selection)
af sync agents

# Sync specified skill (interactive Agent selection)
af sync agents <skill>

# Sync to specified Agent
af sync agents <skill> claude

# Sync to multiple Agents
af sync agents <skill> claude codex gemini

# Specify sync mode
af sync agents <skill> --mode copy      # Copy
af sync agents <skill> --mode symlink   # Symbolic link

# Remove Agent sync (interactive selection of synced skills)
af unsync agents

# Remove sync for specified skill
af unsync agents <skill>

# Remove sync for specified Agent
af unsync agents <skill> claude

# Sync skill to project (interactive skill and project selection)
af sync projects

# Sync specified skill to project (interactive project selection)
af sync projects <skill>

# Sync to specified project
af sync projects <skill> my-project

# Sync to multiple projects
af sync projects <skill> project1 project2

# Specify Agent type
af sync projects <skill> [projects...] --agent-types claude codex

# Specify sync mode
af sync projects <skill> [projects...] --mode symlink

# Remove project sync (interactive selection of synced skills)
af unsync projects

# Remove project sync for specified skill
af unsync projects <skill>

# Remove sync for specified project
af unsync projects <skill> <project-id>:<agent-type>
```

If a project does not already contain a known Agent skill directory, pass `--agent-types` explicitly. AgentForge no longer defaults a clean project to Claude.

### Remove Commands

```bash
# Remove skill
af remove skills <name> [-y skip confirmation]

# Remove project
af remove projects <project-id>

# Remove custom Agent configuration
af remove agents <agent-id>
```

`af remove skills` removes the AgentForge skill plus all managed sync copies. `af remove projects` only unregisters the project and clears recorded sync references; project files stay on disk. `af remove agents` only removes the custom Agent configuration and clears AgentForge's sync references; files stay on disk.

### Other Commands

```bash
# Set skill categories
af categorize skills <skill-name> design frontend

# Batch set categories for multiple skills
af categorize skills --skills docx xlsx pptx --categories office files

# Add categories without replacing existing ones
af categorize skills <skill-name> docs --add

# Remove specific categories
af categorize skills <skill-name> docs --remove

# Clear all categories
af categorize skills <skill-name> --clear

# Enable shell completion
af completion --install

# Print shell completion script without installing it
af completion bash

# Update skill (refresh from Git source and re-sync)
af update [skill-name]
```

### TUI Category Shortcuts

- `[` / `]`: Switch category filter in the Skills tab
- `c`: Open category editor for the selected skill(s)
- Skills tab category bar: browse `All`, `Uncategorized`, and every defined category

### TUI Context Skill Lists

- In the `Agents` and `Projects` tabs, press `Enter` to open a real skill list for the focused item
- Context skill lists support `Space` multi-select plus `i`, `x`, `u`, and `c` for import, unsync, update, and categorize
- `[` / `]` switches the context filter between `All`, `Imported`, and `Unimported`
- `Esc` returns to the master Agent / Project list, and `Enter` on an imported skill opens its detail view

## Skill Levels

AgentForge distinguishes two skill levels:

- **User-level skills**: Stored in `~/.agentforge/skills/`, synced to Agent via `af sync`
- **Project-level skills**: Stored in project's skill directory (e.g., `.claude/skills/`, `.agents/skills/`), independent of user-level

```text
af list skills output example:

  User-level: Skills synced to Agent
  Project-level: Same-name skills in project directory
  Unsynchronized: Not yet synced to any Agent

  my-skill [local]
    User-level: Claude Code, Codex
    Project-level: my-project
      Claude Code

  another-skill [git]
    Project-level: my-project
      Codex (different version from AgentForge)

  new-skill [local]
    Not synced to any Agent
```

## Sync Modes

- **Copy**: Creates independent copy, stable and reliable, but requires re-sync after updates
- **Symbolic link**: Links to source file, changes take effect immediately, ideal for developers

> **Note**: `~/.agentforge/skills/` always stores the actual copy of skills, Agent directories are synced from here.
>
> On Windows, `--mode symlink` may require Developer Mode or an elevated terminal session.

## Built-in Agents

| Agent | ID | User-level Path | Project-level Directory |
|-------|-----|-----------|-----------|
| Claude Code | `claude` | `~/.claude/skills` | `.claude/skills` |
| Codex | `codex` | `~/.codex/skills` | `.agents/skills` |
| Gemini CLI | `gemini` | `~/.gemini/skills` | `.gemini/skills` |
| OpenClaw | `openclaw` | `~/.openclaw/workspace/skills` | `.agents/skills` |
| Qoder | `qoder` | `~/.qoder/skills` | `.qoder/skills` |
| OpenCode | `opencode` | `~/.config/opencode/skills` | `.opencode/skills` |
| Cursor | `cursor` | `~/.cursor/skills` | `.cursor/skills` |

AgentForge treats OpenClaw project-level skills as `.agents/skills`, while user-level sync targets the default OpenClaw workspace at `~/.openclaw/workspace/skills`.

Qoder, OpenCode, and Cursor all use directory-per-skill layouts with `SKILL.md`, so they work with the same scanning and sync model as the existing built-in Agents.

Built-in agent availability is determined by the user-level skills directory. Project-level folders are scanned only for agents that already exist at the user level.

### Custom Agents

You can add custom agents via `af add agents`, supporting project-level skill directory name:

```bash
af add agents
```

Interactive guide will ask for:
- Agent ID (e.g., `my-agent`)
- Display name
- Skill storage path
- Project skill directory name (optional)

## Usage Examples

```bash
# Install skill from Git
af add skills https://github.com/user/awesome-skills.git

# Install single skill from Git subdirectory
af add skills https://github.com/user/skills-collection/tree/main/skills/my-skill

# Select and install from multi-skill repository
af add skills https://github.com/user/skills-collection
# Auto-lists available skills for interactive selection

# Add custom Agent
af add agents

# Add project
af add projects myproject /path/to/my/project

# View skill list
af list skills

# Import skill from project
af import projects myproject myskill

# Sync skill to Claude Code
af sync agents myskill claude

# Sync to multiple Agents
af sync agents myskill claude codex

# View Agent's skills
af show agents claude
```

## Shell Auto-Completion

Shell completion is opt-in. If you want it, install it explicitly:

```bash
af completion --install
```

Supports PowerShell, Bash, Zsh, Fish.
Running the install command again refreshes the existing AgentForge completion block instead of asking you to remove it first.
On PowerShell, completed commands such as `af list projects` also suppress the shell's fallback filesystem path completion.

## Skill Format

Each skill is a directory that must contain a `SKILL.md` file:

```text
~/.agentforge/skills/
`-- my-skill/
    |-- SKILL.md          # Main skill file (required)
    `-- examples/         # Optional example files
        `-- demo.md
```

## Data Storage

```text
~/.agentforge/
|-- skills/           # Skill storage directory
|   `-- my-skill/
|       `-- SKILL.md
`-- registry.json     # Registration info
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Pre-release verification
npm run verify
```

## License

MIT
