import type { WorkbenchCommands, WorkbenchQueries } from '../../app/workbench-types.js';

export interface WorkbenchContext {
  queries: WorkbenchQueries;
  commands: WorkbenchCommands;
}
