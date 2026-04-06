# Product Intake

## Original Brief
"我想要改善现在项目得代码质量，以及架构质量"

## Selected Pack
- selected_pack: refactor

## Current Project Analysis

### Project Overview
AgentForge is a CLI tool for managing and syncing AI coding assistant skills across multiple agents (Claude Code, Codex, Gemini CLI, OpenClaw, Cursor, OpenCode, Qoder) and project workspaces.

**Tech Stack:**
- Language: TypeScript (ES2022, NodeNext modules)
- Runtime: Node.js 18+
- CLI Framework: Commander
- TUI Framework: Ink (React-based terminal UI)
- State Management: Zustand
- Test Framework: Vitest
- Dependencies: fs-extra, execa, chalk, @inquirer/prompts

**Architecture:**
```
src/
├── types.ts              # Type definitions
├── cli.ts                # CLI entry point
├── tui/                  # Terminal UI (React/Ink-based)
│   ├── components/       # React components
│   ├── screens/          # Screen components
│   ├── store/            # Zustand state slices
│   ├── hooks/            # Custom hooks
│   └── utils/            # TUI utilities
├── app/                  # Application layer
│   ├── skill-service.ts
│   ├── scan-service.ts
│   ├── sync-check-service.ts
│   ├── project-storage.ts
│   ├── file-operations.ts
│   ├── cli-formatting.ts
│   └── sync/
├── infra/                # Infrastructure layer
│   ├── storage.ts
│   ├── git.ts
│   └── files.ts
└── commands/             # Command layer
    ├── index.ts
    └── [verb].ts         # Individual command files
```

**Current Quality Status:**
- Test Coverage: 169 tests passing (no coverage percentage available)
- No ESLint/Prettier configuration detected
- Sentrux scan score: 3957/10000 modularity (66 cross-module edges / 88 total)
- Known technical debt: Duplicate `saveSkill` calls in import.ts
- `cli.ts` and `file-operations.ts` lack dedicated tests
- Layering: commands → app → infra pattern defined, but enforcement is manual

**Known Issues (from memory):**
1. Command layer sometimes bypasses app layer to access infra directly
2. `FileOperationsService` introduced as DI layer for commands→infra
3. Test files sometimes not updated when command code changes
4. Duplicate `saveSkill` call in import.ts (worm pattern)

## Clarification Questionnaire

### Product and Scope

1. **Refactor Goals Priority**: 您最想改善哪些方面？请按优先级排序：
   - 代码质量（可读性、可维护性、代码风格一致性）
   - 架构质量（分层边界、模块化、依赖方向）
   - 测试覆盖率与测试质量
   - 开发体验（构建速度、调试体验、文档）
   - 其他（请说明）

2. **Current Pain Points**: 目前开发过程中遇到的最大痛点是什么？例如：
   - 添加新功能时需要在多个文件间跳转
   - 难以定位某个功能的实现位置
   - 测试失败时难以定位问题
   - 代码审查时难以判断是否符合架构规范
   - 其他（请说明）

3. **Feature Stability**: 重构期间是否需要继续添加新功能，还是专注于改善现有代码？如果需要同时进行，如何平衡？

### Architecture and Quality Goals

4. **Layering Enforcement**: 您希望如何强化分层架构？
   - 静态分析工具（如 ESLint 规则检测跨层导入）
   - 代码审查清单
   - 架构决策记录（ADR）
   - 自动化测试验证架构边界
   - 其他方式？

5. **Code Style Standards**: 是否需要引入代码格式化和 linting 工具？
   - Prettier（代码格式化）
   - ESLint（代码质量检查）
   - TypeScript strict 模式增强
   - 是否有已有的团队代码风格指南？

6. **Test Quality Improvement**: 对于测试改进，您更倾向于：
   - 提高单元测试覆盖率
   - 添加集成测试
   - 改进测试可读性和组织
   - 添加架构边界测试（如依赖方向测试）
   - 所有以上？

7. **Technical Debt Prioritization**: 已知技术债包括：
   - `import.ts` 中的重复 `saveSkill` 调用
   - `cli.ts` 和 `file-operations.ts` 缺少专属测试
   - 66 条跨模块边（Sentrux 扫描结果）
   是否有其他您已知但未记录的技术债？

### Constraints and Non-Goals

8. **Timeline Constraints**: 这次改善是否有时间限制？期望在什么时间内完成？

9. **Breaking Changes**: 是否允许引入破坏性变更（如修改公开 API、调整文件结构），还是需要保持向后兼容？

10. **Tool Preferences**: 您对以下工具的偏好：
    - ESLint 配置风格：推荐规则集（如 standard、airbnb）或自定义？
    - 是否愿意引入新的开发依赖（如依赖分析工具、架构验证工具）？
    - CI/CD 是否需要调整？

11. **Non-Goals**: 明确说明哪些方面**不在**这次改善范围内：

## User Clarifications

### 1. 重构目标优先级
- 架构质量（最高优先）
- 代码质量
- 测试覆盖率与质量
- 开发体验

### 2. 当前痛点
未明确提及具体痛点

### 3. 功能稳定性
只重构，不添加新功能

### 4. 分层强制
- ESLint 规则检测跨层导入
- 自动化测试验证架构边界
- 代码审查清单

### 5. 代码风格标准
需要 Prettier + ESLint + TypeScript strict

### 6. 测试质量改进
全部（单元测试覆盖率、集成测试、测试可读性、架构边界测试）

### 7. 技术债优先级
无新增（已知：import.ts 重复调用、cli.ts/file-operations.ts 缺测试、66 条跨模块边）

### 8. 时间约束
未明确

### 9. 破坏性变更
允许（可控范围内）

### 10. 工具偏好
ESLint 标准严格规则，可引入新依赖

### 11. 非目标
- UI/交互改动
- 性能优化
- 重写业务逻辑

## Locked Decisions

1. **Refactor Focus**: Architecture quality is the highest priority, followed by code quality, then test coverage/quality, then developer experience.

2. **Scope**: Pure refactoring only - no new features will be added during this project.

3. **Layering Enforcement Strategy**:
   - ESLint rules to detect and prevent cross-layer imports
   - Automated architecture boundary tests
   - Code review checklist for layer compliance

4. **Code Style Tooling**: Prettier + ESLint + TypeScript strict mode enabled.

5. **Test Improvement Scope**: All aspects - unit test coverage, integration tests, test readability, and architecture boundary tests.

6. **Breaking Changes**: Allowed within controlled scope - can modify public APIs and file structure if needed.

7. **Non-Goals**: No UI/interaction changes, no performance optimization, no business logic rewrites.

## Open Questions
- 具体测试覆盖率目标百分比（建议：80%+）
- ESLint 规则集选择（建议：eslint-plugin-import + 自定义层级规则）
