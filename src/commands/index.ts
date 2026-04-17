/**
 * @module Commands/Registry
 * @layer commands
 * @allowed-imports app/, types
 * @responsibility Central command registry — imports and registers all CLI command modules.
 *
 * Defines the CommandContext interface (the dependency container for all commands)
 * and the `registerAll()` function that wires every command with the shared context.
 *
 * @architecture Commands layer — may only import from `app/` and `types`. Each command
 * module exports a `register(program: Command, ctx: CommandContext)` function.
 * The CommandContext is assembled in `cli.ts` and injected here.
 */

import type { Command } from 'commander';

import type { FileOperationsService } from '../app/file-operations.js';
import type { ScanService } from '../app/scan-service.js';
import type { SkillService } from '../app/skill-service.js';
import type { AgentSyncService } from '../app/sync/agent-sync-service.js';
import type { ProjectSyncService } from '../app/sync/project-sync-service.js';
import type { SyncCheckService } from '../app/sync-check-service.js';
import type { StorageInterface } from '../types.js';

/**
 * Shared context passed to every command handler.
 *
 * Assembled in `cli.ts` and injected via the `register()` function
 * so commands stay decoupled from service construction.
 */
export interface CommandContext {
  skills: SkillService;
  sync: AgentSyncService;
  syncCheck: SyncCheckService;
  storage: StorageInterface;
  scan: ScanService;
  projectSync: ProjectSyncService;
  fileOps: FileOperationsService;
}

/** Shape of an individual command module's `register` export. */
export interface CommandModule {
  register: (program: Command, ctx: CommandContext) => void;
}

// Import all commands
import { register as registerAdd } from './add.js';
import { register as registerCategorize } from './categorize.js';
import { register as registerComplete } from './complete.js';
import { register as registerCompletion } from './completion.js';
import { register as registerImport } from './import.js';
import { register as registerList } from './list.js';
import { register as registerRemove } from './remove.js';
import { register as registerShow } from './show.js';
import { register as registerSync } from './sync.js';
import { register as registerUnsync } from './unsync.js';
import { register as registerUpdate } from './update.js';

const commands: CommandModule[] = [
  { register: registerList },
  { register: registerShow },
  { register: registerImport },
  { register: registerRemove },
  { register: registerSync },
  { register: registerAdd },
  { register: registerCategorize },
  { register: registerCompletion },
  { register: registerComplete },
  { register: registerUnsync },
  { register: registerUpdate },
];

/**
 * Register every command module with the given Commander program instance.
 *
 * After registration, internal commands (prefixed with `__`) are hidden
 * from the top-level help output.
 */
export function registerAll(program: Command, ctx: CommandContext): void {
  for (const cmd of commands) {
    cmd.register(program, ctx);
  }

  const internalCommands = ['__complete'];
  for (const name of internalCommands) {
    const cmd = program.commands.find((c) => c.name() === name);
    if (cmd) {
      (cmd as Command & { _hidden: boolean })._hidden = true;
    }
  }
}
