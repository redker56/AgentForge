/**
 * TUI Mode Bootstrap
 */

import { render } from 'ink';
import { createElement } from 'react';

import { FileOperationsService } from './app/file-operations.js';
import { ProjectStorage } from './app/project-storage.js';
import { ReconcileService } from './app/reconcile-service.js';
import { ScanService } from './app/scan-service.js';
import { SkillService } from './app/skill-service.js';
import { AgentSyncService } from './app/sync/agent-sync-service.js';
import { ProjectSyncService } from './app/sync/project-sync-service.js';
import { SyncCheckService } from './app/sync-check-service.js';
import { DefaultWorkbenchCommands } from './app/workbench-commands.js';
import { DefaultWorkbenchQueries } from './app/workbench-queries.js';
import { Storage } from './infra/storage.js';
import { App } from './tui/App.js';
import { createAppStore } from './tui/store/index.js';
import type { WorkbenchContext } from './tui/store/workbenchContext.js';

export function launchTUI(): void {
  const storage = new Storage();
  const projectStorage = new ProjectStorage();
  const skillService = new SkillService(storage);
  const syncService = new AgentSyncService(storage);
  const scanService = new ScanService(storage);
  const projectSyncService = new ProjectSyncService(storage, projectStorage);
  const fileOps = new FileOperationsService();
  const syncCheck = new SyncCheckService(storage, syncService);
  const reconcileService = new ReconcileService(storage, scanService, projectStorage);
  const queries = new DefaultWorkbenchQueries(storage, scanService, fileOps, reconcileService);
  const commands = new DefaultWorkbenchCommands(
    storage,
    skillService,
    scanService,
    syncService,
    projectSyncService,
    syncCheck,
    fileOps
  );

  const ctx: WorkbenchContext = {
    queries,
    commands,
  };

  const store = createAppStore(ctx);

  void store.getState().loadAllData();

  const instance = render(createElement(App, { store }));
  void instance.waitUntilExit().then(() => process.exit(0));
}
