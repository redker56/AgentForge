/**
 * Command Registry
 */

import type { Storage } from '../infra/storage.js';
import type { SkillService } from '../app/skill-service.js';
import type { AgentSyncService } from '../app/sync/agent-sync-service.js';
import type { SyncCheckService } from '../app/sync-check-service.js';
import type { ScanService } from '../app/scan-service.js';
import type { ProjectSyncService } from '../app/sync/project-sync-service.js';
import type { FileOperationsService } from '../app/file-operations.js';

// Command context
export interface CommandContext {
  skills: SkillService;
  sync: AgentSyncService;
  syncCheck: SyncCheckService;
  storage: Storage;
  scan: ScanService;
  projectSync: ProjectSyncService;
  fileOps: FileOperationsService;
}

// Command module interface
export interface CommandModule {
  register: (program: any, ctx: CommandContext) => void;
}

// Import all commands
import { register as registerList } from './list.js';
import { register as registerShow } from './show.js';
import { register as registerImport } from './import.js';
import { register as registerRemove } from './remove.js';
import { register as registerSync } from './sync.js';
import { register as registerAdd } from './add.js';
import { register as registerCompletion } from './completion.js';
import { register as registerComplete } from './complete.js';
import { register as registerUnsync } from './unsync.js';
import { register as registerUpdate } from './update.js';

const commands: CommandModule[] = [
  { register: registerList },
  { register: registerShow },
  { register: registerImport },
  { register: registerRemove },
  { register: registerSync },
  { register: registerAdd },
  { register: registerCompletion },
  { register: registerComplete },
  { register: registerUnsync },
  { register: registerUpdate },
];

export function registerAll(program: any, ctx: CommandContext): void {
  // Register all commands
  for (const cmd of commands) {
    cmd.register(program, ctx);
  }

  // Hide internal commands
  const internalCommands = ['__complete'];
  for (const name of internalCommands) {
    const cmd = program.commands.find((c: any) => c.name() === name);
    if (cmd) {
      (cmd as any)._hidden = true;
    }
  }
}
