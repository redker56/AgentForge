/**
 * TUI Mode Bootstrap
 */

import React from 'react';
import { render } from 'ink';
import { Storage } from './infra/storage.js';
import { SkillService } from './app/skill-service.js';
import { AgentSyncService } from './app/sync/agent-sync-service.js';
import { SyncCheckService } from './app/sync-check-service.js';
import { ScanService } from './app/scan-service.js';
import { ProjectSyncService } from './app/sync/project-sync-service.js';
import { FileOperationsService } from './app/file-operations.js';
import { createAppStore } from './tui/store/index.js';
import type { ServiceContext } from './tui/store/index.js';
import { App } from './tui/App.js';

export function launchTUI(): void {
  // Initialize services (same instances as CLI mode)
  const storage = Storage.getInstance();
  const skillService = new SkillService(storage);
  const syncService = new AgentSyncService(storage);
  const scanService = new ScanService(storage);
  const projectSyncService = new ProjectSyncService(storage);
  const fileOps = new FileOperationsService();
  const syncCheck = new SyncCheckService(storage, syncService);

  // Build service context once, reuse for store and App
  const ctx: ServiceContext = {
    skillService,
    scanService,
    storage,
    syncService,
    projectSyncService,
    syncCheck,
    fileOps,
  };

  // Create Zustand store with service context
  const store = createAppStore(ctx);

  // Trigger initial data load
  store.getState().loadAllData();

  // Render Ink app
  const instance = render(React.createElement(App, { store, ctx }));
  instance.waitUntilExit().then(() => process.exit(0));
}
