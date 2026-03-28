# AgentForge

[English](README.md) | [简体中文](README.zh-CN.md)

一个用于在 Claude Code、Codex、Gemini CLI、OpenClaw、Cursor、OpenCode、Qoder 与项目工作区之间管理和同步技能的 CLI 工具。

[![CI](https://github.com/redker56/agentforge/actions/workflows/ci.yml/badge.svg)](https://github.com/redker56/agentforge/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/%40redker56%2Fagentforge.svg)](package.json)

## 依赖要求

- Node.js 18 或更高版本
- 系统 `PATH` 中可用的 `git`
- 当前 CI 覆盖 Ubuntu 和 Windows，Node 18 / 20 / 22

## 安装

```bash
npm install -g @redker56/agentforge
```

推荐安装后的下一步：

```bash
af --help
af completion --install
```

AgentForge 在安装期间不会自动修改你的 shell 配置。

如果你想启用 shell 自动补全，请显式执行：

```bash
af completion --install
```

重复执行同一条命令会原地更新已有的 AgentForge completion block。

如果 shell 自动识别失败，也可以手动指定：

```bash
af completion powershell --install
af completion bash --install
```

## 命令

### 查看命令

```bash
# 列出全部技能（展示用户级和项目级分布）
af list skills

# 列出可用 Agent（展示用户级和项目级技能）
af list agents

# 列出已注册项目
af list projects

# 查看技能详情
af show skills <name>

# 查看 Agent 详情（以及已安装技能）
af show agents <id>

# 查看项目详情（以及项目中的技能，并标记是否已导入）
af show projects <id>
```

`af list agents` 会按项目分组显示项目级技能，方便快速浏览。`Project-level (N)` 中的数量是所有项目分组里的技能总数。

```text
claude - Claude Code
  Project-level (3):
    Obsidian:
      defuddle
      json-canvas
    Voice:
      frontend-design
```

### 添加命令

```bash
# 从 Git 仓库安装技能
af add skills <repo-url> [name]

# 从 Git 子目录安装技能（支持 GitHub/GitLab /tree/ URL）
af add skills https://github.com/user/repo/tree/main/skills/my-skill

# 从多技能仓库安装（自动扫描并列出全部技能，支持多选）
af add skills https://github.com/user/skills-collection

# 添加自定义 Agent（交互式引导）
af add agents

# 使用指定 ID 添加自定义 Agent
af add agents my-agent

# 添加项目（交互式引导）
af add projects

# 使用指定 ID 和路径添加项目
af add projects my-project /path/to/project
```

#### af add skills 特性

- **单技能仓库**：自动识别并直接安装
- **多技能仓库**：自动扫描所有包含 `SKILL.md` 的目录，并支持交互式多选安装
- **指定子目录**：支持 `/tree/` URL 格式，可直接从指定子目录安装技能
- **安装后检测**：如果 Agent 目录中已存在同名技能，会自动关联或提示你如何处理

### 导入命令

```bash
# 从项目导入技能（交互式选择项目和技能）
af import projects

# 从指定项目导入技能（交互式选择技能）
af import projects <project-id>

# 从指定项目导入指定技能
af import projects <project-id> <skill-name>

# 从 Agent 导入技能（交互式选择 Agent 和技能）
af import agents

# 从指定 Agent 导入技能（交互式选择技能）
af import agents <agent-id>

# 从指定 Agent 导入指定技能
af import agents <agent-id> <skill-name>
```

### 同步命令

```bash
# 同步技能到 Agent（交互式选择技能和 Agent）
af sync agents

# 同步指定技能（交互式选择 Agent）
af sync agents <skill>

# 同步到指定 Agent
af sync agents <skill> claude

# 同步到多个 Agent
af sync agents <skill> claude codex gemini

# 指定同步方式
af sync agents <skill> --mode copy      # 复制
af sync agents <skill> --mode symlink   # 符号链接

# 取消 Agent 同步（交互式选择已同步技能）
af unsync agents

# 取消指定技能的同步
af unsync agents <skill>

# 取消指定 Agent 的同步
af unsync agents <skill> claude

# 同步技能到项目（交互式选择技能和项目）
af sync projects

# 同步指定技能到项目（交互式选择项目）
af sync projects <skill>

# 同步到指定项目
af sync projects <skill> my-project

# 同步到多个项目
af sync projects <skill> project1 project2

# 指定 Agent 类型
af sync projects <skill> [projects...] --agent-types claude codex

# 指定同步方式
af sync projects <skill> [projects...] --mode symlink

# 取消项目同步（交互式选择已同步技能）
af unsync projects

# 取消指定技能的项目同步
af unsync projects <skill>

# 取消指定项目的同步
af unsync projects <skill> <project-id>:<agent-type>
```

如果一个项目中还不存在已知的 Agent 技能目录，需要显式传入 `--agent-types`。AgentForge 不会再把一个干净项目默认当成 Claude 项目。

### 删除命令

```bash
# 删除技能
af remove skills <name> [-y skip confirmation]

# 删除项目注册
af remove projects <project-id>

# 删除自定义 Agent 配置
af remove agents <agent-id>
```

`af remove skills` 会删除 AgentForge 中的技能本体以及所有受管同步副本。`af remove projects` 只会注销项目并清理已记录的同步引用，项目文件仍保留在磁盘上。`af remove agents` 只会删除自定义 Agent 配置并清理 AgentForge 记录中的同步引用，不会删除磁盘上的文件。

### 其他命令

```bash
# 启用 shell 自动补全
af completion --install

# 仅输出补全脚本，不安装
af completion bash

# 更新技能（从 Git 拉取）
af update [skill-name]
```

## 技能层级

AgentForge 区分两种技能层级：

- **用户级技能**：存放在 `~/.agentforge/skills/`，通过 `af sync` 同步到 Agent
- **项目级技能**：存放在项目中的技能目录里（如 `.claude/skills/`、`.agents/skills/`），独立于用户级技能

```text
af list skills 输出示例：

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

## 同步模式

- **Copy**：创建独立副本，稳定可靠，但技能更新后需要重新同步
- **Symbolic link**：创建符号链接，源目录更新后立即生效，更适合开发场景

> **注意**：`~/.agentforge/skills/` 始终保存技能的真实副本，Agent 目录中的内容都是从这里同步出去的。
>
> 在 Windows 上，`--mode symlink` 可能需要启用 Developer Mode 或使用提升权限的终端。

## 内置 Agent

| Agent | ID | 用户级路径 | 项目级目录 |
|-------|-----|-----------|-----------|
| Claude Code | `claude` | `~/.claude/skills` | `.claude/skills` |
| Codex | `codex` | `~/.codex/skills` | `.agents/skills` |
| Gemini CLI | `gemini` | `~/.gemini/skills` | `.gemini/skills` |
| OpenClaw | `openclaw` | `~/.openclaw/workspace/skills` | `.agents/skills` |
| Qoder | `qoder` | `~/.qoder/skills` | `.qoder/skills` |
| OpenCode | `opencode` | `~/.config/opencode/skills` | `.opencode/skills` |
| Cursor (CLI/Agent) | `cursor` | `~/.cursor/skills` | `.cursor/skills` |

AgentForge 会把 OpenClaw 的项目级技能目录视为 `.agents/skills`，而用户级同步目标仍然是默认的 OpenClaw 工作区 `~/.openclaw/workspace/skills`。

Qoder、OpenCode 和 Cursor 都使用“每个技能一个目录 + `SKILL.md`”的布局，因此可以复用与现有内置 Agent 相同的扫描和同步模型。

内置 Agent 是否可用，取决于对应的用户级技能目录是否存在。项目级目录只会在该 Agent 已经在用户级存在时被扫描。

### 自定义 Agent

你可以通过 `af add agents` 添加自定义 Agent，并支持自定义项目级技能目录名：

```bash
af add agents
```

交互式引导会询问：

- Agent ID（例如 `my-agent`）
- 显示名称
- 技能存储路径
- 项目中的技能目录名（可选）

## 使用示例

```bash
# 从 Git 安装技能
af add skills https://github.com/user/awesome-skills.git

# 从 Git 子目录安装单个技能
af add skills https://github.com/user/skills-collection/tree/main/skills/my-skill

# 从多技能仓库中选择并安装
af add skills https://github.com/user/skills-collection
# 会自动列出可用技能供交互选择

# 添加自定义 Agent
af add agents

# 添加项目
af add projects myproject /path/to/my/project

# 查看技能列表
af list skills

# 从项目导入技能
af import projects myproject myskill

# 同步技能到 Claude Code
af sync agents myskill claude

# 同步到多个 Agent
af sync agents myskill claude codex

# 查看 Agent 的技能
af show agents claude
```

## Shell 自动补全

Shell 自动补全是 opt-in 的。如果你需要，请显式安装：

```bash
af completion --install
```

支持 PowerShell、Bash、Zsh、Fish。  
再次执行安装命令会刷新已有的 AgentForge completion block，而不需要你先手动删除。  
在 PowerShell 中，像 `af list projects` 这样已经补全完成的命令，也会抑制 shell 默认的文件路径补全。

## 技能格式

每个技能都是一个目录，目录中必须包含 `SKILL.md` 文件：

```text
~/.agentforge/skills/
`-- my-skill/
    |-- SKILL.md          # 主技能文件（必需）
    `-- examples/         # 可选示例文件
        `-- demo.md
```

## 数据存储

```text
~/.agentforge/
|-- skills/           # 技能存储目录
|   `-- my-skill/
|       `-- SKILL.md
`-- registry.json     # 注册信息
```

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 测试
npm test

# 发布前完整校验
npm run verify
```

## 许可证

MIT
